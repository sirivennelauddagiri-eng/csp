const CommunityPost = require('../models/CommunityPost');
const Comment = require('../models/Comment');
const Issue = require('../models/Issue');

// Heuristic Moderation
const flagBadWords = (text) => {
    const badWords = ['spam', 'fake', 'idiot', 'scam', 'hate'];
    return badWords.some(word => text.toLowerCase().includes(word));
};

const predictImageLabel = (desc) => {
    const d = desc.toLowerCase();
    if (d.includes('trash') || d.includes('garbage')) return 'Garbage Dump — 95% confidence';
    if (d.includes('pothole') || d.includes('road')) return 'Road Damage — 92% confidence';
    if (d.includes('leak') || d.includes('water')) return 'Water Leak — 88% confidence';
    if (d.includes('tree') || d.includes('plant')) return 'Greening/Planting — 98% confidence';
    return '';
};

const generateSummary = (desc) => {
    if (!desc || desc.length <= 120) return '';
    return '📝 AI Preview: ' + desc.substring(0, 117) + '...';
};

// -----------------------------------------------------------------------
// 1. Get Feed — paginated, .lean(), field-projected
//    BEFORE: CommunityPost.find().populate(...).sort(...).limit(50)
//    AFTER:  paginated (page/limit), .lean(), only required fields selected
// -----------------------------------------------------------------------
exports.getPosts = async (req, res) => {
    try {
        const page  = Math.max(parseInt(req.query.page)  || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 50); // max 50
        const skip  = (page - 1) * limit;

        const posts = await CommunityPost
            .find()
            .select('userId postType title description imageUrl location latitude longitude category likes commentCount aiLabel aiSummary flagged createdAt')
            .populate('userId', 'name level xp')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({ success: true, posts, page, limit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching posts' });
    }
};

// -----------------------------------------------------------------------
// 2. Create Post
// -----------------------------------------------------------------------
exports.createPost = async (req, res) => {
    try {
        const { title, description, imageUrl, location, latitude, longitude, category } = req.body;

        const flagged   = flagBadWords(description || '');
        const aiLabel   = imageUrl ? predictImageLabel(description) : '';
        const aiSummary = generateSummary(description);

        const post = new CommunityPost({
            userId: req.user._id,
            postType: category === 'Issue Report' ? 'issue' : 'update',
            title: title || '',
            description,
            imageUrl,
            location,
            latitude,
            longitude,
            category: category || 'Civic Update',
            aiLabel,
            aiSummary,
            flagged
        });

        await post.save();
        await post.populate('userId', 'name level xp');

        if (req.app.locals.io) {
            req.app.locals.io.emit('new-community-post', post);
        }

        res.status(201).json({ success: true, post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error creating post' });
    }
};

// -----------------------------------------------------------------------
// 3. Like Post
// -----------------------------------------------------------------------
exports.likePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id).select('likes userId');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const uid = req.user._id.toString ? req.user._id.toString() : String(req.user._id);
        const index = post.likes.findIndex(id => id.toString() === uid);

        if (index === -1) {
            post.likes.push(req.user._id);
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-liked', { postId: post._id, likes: post.likes });
        }

        res.json({ success: true, likes: post.likes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error liking post' });
    }
};

// -----------------------------------------------------------------------
// 4. Add Comment
// -----------------------------------------------------------------------
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Comment text required' });

        // Use findByIdAndUpdate for atomic increment — avoids a full post fetch + save
        const post = await CommunityPost.findByIdAndUpdate(
            req.params.id,
            { $inc: { commentCount: 1 } },
            { new: false, select: '_id' }
        ).lean();

        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const comment = new Comment({ postId: post._id, userId: req.user._id, text });
        await comment.save();
        await comment.populate('userId', 'name');

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-commented', {
                postId: post._id,
                newComment: comment
            });
        }

        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error adding comment' });
    }
};

// -----------------------------------------------------------------------
// 5. Get Comments
// -----------------------------------------------------------------------
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment
            .find({ postId: req.params.id })
            .select('userId text createdAt')
            .populate('userId', 'name')
            .sort({ createdAt: 1 })
            .lean();
        res.json({ success: true, comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching comments' });
    }
};

// -----------------------------------------------------------------------
// 6. Get Nearby Issues
//    BEFORE: loads ALL unresolved issues, filters with JS Haversine
//    AFTER:  MongoDB bounding-box pre-filter (~5 km box) then JS Haversine
//            on the small result set only
// -----------------------------------------------------------------------
exports.getNearby = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ success: false, message: 'Lat and lng required' });

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const KM_RADIUS = 5.0;

        // ~1 degree of latitude ≈ 111 km  →  5 km ≈ 0.045 degrees
        const LAT_DELTA = KM_RADIUS / 111;
        const LNG_DELTA = KM_RADIUS / (111 * Math.cos(latNum * Math.PI / 180));

        // Pre-filter with bounding box in MongoDB (uses the lat/lng index)
        const issues = await Issue.find({
            status: { $ne: 'Resolved' },
            latitude:  { $gte: latNum - LAT_DELTA, $lte: latNum + LAT_DELTA },
            longitude: { $gte: lngNum - LNG_DELTA, $lte: lngNum + LNG_DELTA }
        })
        .select('category location latitude longitude')
        .lean();

        // Precise Haversine on the small subset
        const R = 6371;
        const nearby = issues.map(iss => {
            const dLat = (iss.latitude  - latNum) * Math.PI / 180;
            const dLon = (iss.longitude - lngNum) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(latNum * Math.PI / 180) * Math.cos(iss.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
            const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return { issue: iss.category, location: iss.location, distance: parseFloat(distance.toFixed(1)) };
        })
        .filter(i => i.distance <= KM_RADIUS)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

        res.json({ success: true, nearby });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching nearby issues' });
    }
};

// -----------------------------------------------------------------------
// 7. Get Trending
//    BEFORE: finds({}).limit(100) — fetches ALL fields of 100 posts
//    AFTER:  .select('description').lean() — only description strings
// -----------------------------------------------------------------------
exports.getTrending = async (req, res) => {
    try {
        const posts = await CommunityPost
            .find()
            .select('description')       // 🚀 only the field we read
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const tags = {};
        posts.forEach(p => {
            const words = p.description ? p.description.match(/#[a-zA-Z0-9]+/g) : null;
            if (words) words.forEach(w => { tags[w] = (tags[w] || 0) + 1; });
        });

        let sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        if (!sortedTags.length) sortedTags = ['#FixMyCity', '#EcoAction', '#CommunitySafety'];

        res.json({ success: true, trending: sortedTags.slice(0, 5) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching trending' });
    }
};

// -----------------------------------------------------------------------
// 8. Edit Post
// -----------------------------------------------------------------------
exports.editPost = async (req, res) => {
    try {
        const { title, description, category, location, imageUrl } = req.body;
        const post = await CommunityPost.findById(req.params.id);

        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        const ownerId = post.userId.toString ? post.userId.toString() : String(post.userId);
        const reqId   = req.user._id        ? String(req.user._id) : String(req.user.id);
        if (ownerId !== reqId) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this post' });
        }

        if (description) {
            post.flagged   = flagBadWords(description);
            post.aiSummary = generateSummary(description);
        }

        post.title       = title       || post.title;
        post.description = description || post.description;
        post.category    = category    || post.category;
        post.location    = location    || post.location;
        if (imageUrl) post.imageUrl = imageUrl;

        await post.save();
        await post.populate('userId', 'name level xp');

        if (req.app.locals.io) req.app.locals.io.emit('post-updated', post);

        res.json({ success: true, post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error editing post' });
    }
};

// -----------------------------------------------------------------------
// 9. Delete Post
// -----------------------------------------------------------------------
exports.deletePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id).select('userId');
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const ownerId = post.userId.toString ? post.userId.toString() : String(post.userId);
        const reqId   = req.user._id         ? String(req.user._id)   : String(req.user.id);
        if (ownerId !== reqId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
        }

        // Run both delete ops in parallel
        await Promise.all([
            post.deleteOne(),
            Comment.deleteMany({ postId: post._id })
        ]);

        if (req.app.locals.io) req.app.locals.io.emit('post-deleted', { postId: post._id });

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error deleting post' });
    }
};
