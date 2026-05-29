const Message = require('../models/Message');
const Issue = require('../models/Issue');
const NGO = require('../models/NGO');
const NgoDocument = require('../models/NgoDocument');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to gather all dynamic NGO stats, achievements, timeline, and completion percentage
const getNGOFullDetails = async (ngo) => {
    // 1. Fetch related issues
    const allAssignedIssues = await Issue.find({ ngoId: ngo._id }).lean();
    
    const activeMissions = allAssignedIssues.filter(i => i.status === 'In Progress')
        .sort((a, b) => b.createdAt - a.createdAt);
    
    const resolutionHistory = allAssignedIssues.filter(i => i.status === 'Resolved')
        .sort((a, b) => (b.resolvedDate || b.updatedAt) - (a.resolvedDate || a.updatedAt));

    const totalIssuesClaimed = allAssignedIssues.length;
    const totalIssuesResolved = resolutionHistory.length;
    const activeCases = activeMissions.length;

    // Success Rate
    const resolutionSuccessRate = totalIssuesClaimed > 0 
        ? Math.round((totalIssuesResolved / totalIssuesClaimed) * 100)
        : ngo.resolutionSuccessRate || 0;

    // Average Response Time (in hours)
    let avgResponseTime = ngo.averageResponseTime || 1.8;
    if (totalIssuesResolved > 0) {
        let totalHours = 0;
        let count = 0;
        resolutionHistory.forEach(issue => {
            const start = issue.dateReported || issue.createdAt;
            const end = issue.resolvedDate || issue.updatedAt;
            if (start && end) {
                const diffMs = new Date(end) - new Date(start);
                const diffHrs = diffMs / (1000 * 60 * 60);
                if (diffHrs >= 0) {
                    totalHours += diffHrs;
                    count++;
                }
            }
        });
        if (count > 0) {
            avgResponseTime = Number((totalHours / count).toFixed(1));
        }
    }

    // Total Community Impact Score
    let totalCommunityImpactScore = 0;
    allAssignedIssues.forEach(issue => {
        if (issue.status === 'Resolved') {
            totalCommunityImpactScore += (issue.impactScore || 15);
        }
    });

    // Community Reach
    const uniqueReporters = new Set();
    allAssignedIssues.forEach(issue => {
        if (issue.userId) uniqueReporters.add(String(issue.userId));
        if (issue.reportedBy && Array.isArray(issue.reportedBy)) {
            issue.reportedBy.forEach(uid => uniqueReporters.add(String(uid)));
        }
    });
    const communityReach = uniqueReporters.size;

    // Achievements check
    const achievements = [
        {
            id: 'fast_responder',
            title: 'Fast Responder',
            description: 'Maintain average resolution time under 2 hours.',
            icon: 'electric_bolt',
            earned: avgResponseTime > 0 && avgResponseTime < 2,
            earnedDate: ngo.createdAt
        },
        {
            id: 'top_rated',
            title: 'Top Rated NGO',
            description: 'Achieve a rating of 4.8 or above from community reviews.',
            icon: 'workspace_premium',
            earned: (ngo.rating || 5.0) >= 4.8,
            earnedDate: ngo.createdAt
        },
        {
            id: 'community_champion',
            title: 'Community Champion',
            description: 'Successfully resolve 10 or more community issues.',
            icon: 'diversity_1',
            earned: totalIssuesResolved >= 10,
            earnedDate: resolutionHistory[9] ? (resolutionHistory[9].resolvedDate || resolutionHistory[9].updatedAt) : null
        },
        {
            id: 'impact_leader',
            title: 'Environmental Impact Leader',
            description: 'Accumulate a total community impact score of 500 or more.',
            icon: 'forest',
            earned: totalCommunityImpactScore >= 500,
            earnedDate: ngo.createdAt
        }
    ];

    // Profile Completion Percentage
    let filledFields = 0;
    const fieldsToCheck = [
        ngo.name,
        ngo.logo,
        ngo.missionStatement,
        ngo.registrationNumber,
        ngo.email,
        ngo.phone,
        ngo.website,
        ngo.location?.address,
        (ngo.operationalRegions && ngo.operationalRegions.length > 0) ? 'filled' : null,
        ngo.specialization
    ];
    fieldsToCheck.forEach(f => {
        if (f && String(f).trim().length > 0) filledFields++;
    });
    const profileCompletionPercentage = Math.round((filledFields / fieldsToCheck.length) * 100);

    // Documents
    const documents = await NgoDocument.find({ ngoId: ngo._id }).lean();

    // AI Insights
    const speedInsight = avgResponseTime < 2 ? "resolves issues highly efficiently, faster than average." : "maintains steady response times.";
    const aiInsights = [
        `${ngo.name} ${speedInsight}`,
        "Most incidents handled in the primary operating district.",
        `Demonstrates high success rate handling ${ngo.specialization} cases.`
    ];

    // Activity Timeline
    const activityTimeline = [];
    activityTimeline.push({
        type: 'join',
        title: 'Organization Authorized',
        description: `${ngo.name} joined CivicImpact network.`,
        date: ngo.createdAt
    });
    resolutionHistory.forEach(issue => {
        activityTimeline.push({
            type: 'resolution',
            title: `Resolved: ${issue.title || issue.category}`,
            description: `Successfully resolved case in ${issue.location}. Impact score: +${issue.impactScore || 15} pts.`,
            date: issue.resolvedDate || issue.updatedAt
        });
    });
    achievements.forEach(ach => {
        if (ach.earned && ach.earnedDate) {
            activityTimeline.push({
                type: 'achievement',
                title: `Unlocked Achievement: ${ach.title}`,
                description: ach.description,
                date: ach.earnedDate
            });
        }
    });
    activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
        profile: {
            ...ngo,
            registrationNumber: ngo.registrationNumber || '',
            phone: ngo.phone || '',
            createdAt: ngo.createdAt
        },
        activeMissions,
        resolutionHistory,
        documents,
        aiInsights,
        stats: {
            totalIssuesClaimed,
            totalIssuesResolved,
            activeCases,
            resolutionSuccessRate,
            averageResponseTime: avgResponseTime,
            ngoRating: ngo.rating || 5.0,
            totalCommunityImpactScore,
            communityReach
        },
        achievements,
        profileCompletionPercentage,
        activityTimeline
    };
};

exports.getMyNGOProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'authority') {
            return res.status(403).json({ error: "Only NGOs/Authorities can have an NGO profile." });
        }

        let ngo = await NGO.findOne({ email: user.email }).lean();

        if (!ngo) {
            const newNgo = new NGO({
                name: user.name || 'My NGO',
                email: user.email,
                specialization: 'General Civic Action',
                location: { latitude: 0, longitude: 0, address: user.location || 'HQ' },
                isVerified: false
            });
            await newNgo.save();
            ngo = newNgo.toObject();
        }

        const details = await getNGOFullDetails(ngo);
        res.json(details);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load NGO profile." });
    }
};

// Helper to simulate AI Keyword Detection
const detectEmergencyKeywords = (text) => {
    const keywords = ['gas leak', 'chemical spill', 'chemical leak', 'flood', 'fire hazard', 'explosion', 'toxic', 'collapsed structure'];
    const lower = text.toLowerCase();
    for (let k of keywords) {
        if (lower.includes(k)) return true;
    }
    return false;
};

// Simulated AI Summarization logic
const summarizeChatHeuristic = (messages) => {
    if (!messages || messages.length === 0) return "No messages to summarize yet.";
    // Mock summarization: we extract keywords or just provide a template placeholder based on recent text
    let summary = "AI Summary: Based on recent coordination, ";

    let isDispatched = messages.some(m => m.text.toLowerCase().includes('dispatch') || m.text.toLowerCase().includes('en route') || m.text.toLowerCase().includes('on site') || m.text.toLowerCase().includes('arrived'));
    let isConfirmed = messages.some(m => m.text.toLowerCase().includes('confirm') || m.text.toLowerCase().includes('verified'));

    if (isConfirmed && isDispatched) {
        summary += "multiple parties have confirmed the situation and teams are currently on-site attempting resolution.";
    } else if (isDispatched) {
        summary += "teams have been dispatched and are awaiting site verification.";
    } else if (isConfirmed) {
        summary += "the issue has been verified but active teams are not fully deployed yet.";
    } else {
        summary += "authorities and NGOs are actively discussing next steps and preliminary details.";
    }

    // append latest 2 active entities
    const activeEntities = [...new Set(messages.map(m => m.senderName))].slice(-2);
    if (activeEntities.length > 0) {
        summary += ` Leading coordination involves: ${activeEntities.join(', ')}.`;
    }

    return summary;
};

exports.sendMessage = async (req, res) => {
    try {
        const { text, attachments = [], priority = 'Normal', issueId = null } = req.body;

        // Always resolve the real NGO name from the database — never trust client-sent senderName
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        let ngo = await NGO.findOne({ email: user.email });
        if (!ngo) {
            // Auto-create NGO profile for new authority accounts
            ngo = new NGO({
                name: user.name || 'Unknown NGO',
                email: user.email,
                specialization: 'General Civic Action',
                location: { latitude: 0, longitude: 0, address: user.location || 'HQ' },
                isVerified: false
            });
            await ngo.save();
        }

        const realSenderName = ngo.name;
        const realSenderId = String(ngo._id);

        // 1. Detect Keywords
        const isEmergency = detectEmergencyKeywords(text);
        let finalPriority = isEmergency ? 'Emergency' : priority;
        let aiSystemAlert = null;

        if (isEmergency) {
            aiSystemAlert = {
                type: 'SYSTEM_ALERT',
                title: 'CRITICAL HAZARD DETECTED',
                message: `AI intercepted emergency keywords in comms regarding ${issueId || 'Global Network'}: "${text}"`
            };
        }

        const msgRecord = new Message({
            senderId: realSenderId,
            senderName: realSenderName,
            senderRole: 'NGO',
            text,
            attachments,
            priority: finalPriority,
            issueId
        });

        const savedMsg = await msgRecord.save();

        // 2. Broadcast
        if (req.app.locals.io) {
            const io = req.app.locals.io;
            const room = issueId ? `issue_${issueId}` : 'global_ngo_network';
            io.to(room).emit('chat_message', savedMsg);

            if (aiSystemAlert) {
                io.emit('system_alert', aiSystemAlert);
            }
        }

        res.status(201).json(savedMsg);
    } catch (err) {
        res.status(500).json({ error: "Failed to send message", details: err.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { msgId } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const ngo = await NGO.findOne({ email: user.email });
        const msg = await Message.findById(msgId);
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        // Only the original sender can delete
        const senderId = ngo ? String(ngo._id) : String(user._id);
        if (msg.senderId !== senderId) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        msg.deleted = true;
        msg.deletedAt = new Date();
        msg.text = 'Message deleted';
        await msg.save();

        // Broadcast deletion to the appropriate room
        if (req.app.locals.io) {
            const io = req.app.locals.io;
            const room = msg.issueId ? `issue_${msg.issueId}` : 'global_ngo_network';
            io.to(room).emit('delete_message', { msgId: String(msg._id) });
        }

        res.json({ success: true, msgId: String(msg._id) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete message', details: err.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: null }).sort({ createdAt: 1 });
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch global messages" });
    }
}

exports.getMessagesByIssue = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: req.params.issueId }).sort({ createdAt: 1 });
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch issue messages" });
    }
}

exports.getDirectory = async (req, res) => {
    try {
        const ngos = await NGO.find().sort({ rating: -1, totalIssuesHandled: -1 });
        res.json(ngos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch directory" });
    }
}

exports.smartTeamFormation = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.issueId);
        if (!issue) return res.status(404).json({ error: "Issue not found" });

        // Heuristic mapping: "Waste Management" + "Water Quality" etc.
        let requiredSpecializations = [issue.category];
        if (issue.title.toLowerCase().includes('water') || issue.description.toLowerCase().includes('water')) {
            requiredSpecializations.push('Water Quality');
            requiredSpecializations.push('Contamination Control');
        }

        // Fetch top NGOs matching any of these specializations
        const recommended = await NGO.find({
            specialization: {
                $in: requiredSpecializations.map(s => {
                    // Soft matching (Regex) for mock DB safety
                    return new RegExp(s, 'i')
                })
            }
        }).sort({ rating: -1 }).limit(2);

        res.json({
            issueId: issue._id,
            recommendationReason: `Based on the ${issue.category} requirement and context clues in the description, AI recommends a joint task force specializing in ${requiredSpecializations.join(' and ')}.`,
            recommendedNGOs: recommended
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate AI team formation" });
    }
}

exports.getChatSummary = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: req.params.issueId }).sort({ createdAt: 1 });
        const summary = summarizeChatHeuristic(msgs);
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: "Failed to summarize chat" });
    }
}

exports.getNGOProfile = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.ngoId).lean();
        if (!ngo) return res.status(404).json({ error: "NGO not found" });

        const details = await getNGOFullDetails(ngo);
        res.json(details);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch NGO profile" });
    }
}

exports.updateNGOProfile = async (req, res) => {
    try {
        const ngoId = req.params.ngoId;
        const user = await User.findById(req.user.id || req.user._id);

        if (!user || user.role !== 'authority') {
            return res.status(403).json({ error: "Only authorized NGOs/Authorities can update profile." });
        }

        const ngo = await NGO.findById(ngoId);
        if (!ngo) return res.status(404).json({ error: "NGO not found" });

        // Enforce ownership: logged-in user email must match NGO email
        if (ngo.email !== user.email) {
            return res.status(403).json({ error: "Unauthorized: You can only update your own NGO profile." });
        }

        const updatableFields = [
            'name', 'missionStatement', 'foundedYear', 'specialization',
            'areasOfExpertise', 'extendedExpertise', 'directorName',
            'emergencyContact', 'headquarters', 'email', 'website', 'logo',
            'operatingStatus', 'operationalRegions', 'registrationNumber', 'phone'
        ];

        let updateData = {};
        for (let field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (typeof updateData.extendedExpertise === 'string') {
            updateData.extendedExpertise = updateData.extendedExpertise.split(',').map(s => s.trim()).filter(s => s);
        }
        if (typeof updateData.areasOfExpertise === 'string') {
            updateData.areasOfExpertise = updateData.areasOfExpertise.split(',').map(s => s.trim()).filter(s => s);
        }
        if (typeof updateData.operationalRegions === 'string') {
            updateData.operationalRegions = updateData.operationalRegions.split(',').map(s => s.trim()).filter(s => s);
        }

        // Sync name and email back to the User collection if changed
        if (updateData.name && updateData.name !== ngo.name) {
            user.name = updateData.name;
        }
        if (updateData.email && updateData.email !== ngo.email) {
            // Check if email taken
            const emailExists = await User.findOne({ email: updateData.email }).select("_id").lean();
            if (emailExists && String(emailExists._id) !== String(user._id)) {
                return res.status(400).json({ error: "Email is already in use by another user." });
            }
            user.email = updateData.email;
        }
        await user.save();

        const updatedNgo = await NGO.findByIdAndUpdate(ngoId, updateData, { new: true });

        res.json({ message: "Profile updated successfully", profile: updatedNgo });

    } catch (err) {
        console.error("Update NGO Profile Error:", err);
        res.status(500).json({ error: "Failed to update NGO profile" });
    }
};

exports.uploadNGOLogo = async (req, res) => {
    try {
        const ngoId = req.params.ngoId;
        const { logo } = req.body;
        if (!logo) return res.status(400).json({ error: "Logo image data is required." });

        const user = await User.findById(req.user.id || req.user._id);
        const ngo = await NGO.findById(ngoId);
        if (!ngo) return res.status(404).json({ error: "NGO not found" });

        if (ngo.email !== user.email) {
            return res.status(403).json({ error: "Unauthorized: You can only update your own NGO logo." });
        }

        ngo.logo = logo;
        await ngo.save();

        res.json({ message: "Logo updated successfully", logo: ngo.logo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to upload logo." });
    }
};

exports.updateNGOSecurity = async (req, res) => {
    try {
        const ngoId = req.params.ngoId;
        const { action, currentPassword, newPassword, newEmail } = req.body;

        const user = await User.findById(req.user.id || req.user._id);
        const ngo = await NGO.findById(ngoId);
        if (!ngo) return res.status(404).json({ error: "NGO not found" });

        if (ngo.email !== user.email) {
            return res.status(403).json({ error: "Unauthorized: You can only access security settings for your own NGO." });
        }

        if (action === 'password') {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: "Current password and new password are required." });
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Incorrect current password." });
            }

            // Hash and save new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            return res.json({ message: "Password updated successfully." });

        } else if (action === 'email') {
            if (!newEmail) {
                return res.status(400).json({ error: "New email is required." });
            }

            // Verify email isn't already taken
            const emailExists = await User.findOne({ email: newEmail }).select("_id").lean();
            if (emailExists && String(emailExists._id) !== String(user._id)) {
                return res.status(400).json({ error: "Email is already taken by another account." });
            }

            // Update both collections
            user.email = newEmail;
            await user.save();

            ngo.email = newEmail;
            await ngo.save();

            // Generate new token with updated email
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({ message: "Email updated successfully.", token });

        } else if (action === 'session') {
            // Return session info
            const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'Unknown Device';
            const strength = user.password.length > 20 ? 'Strong' : 'Medium';
            
            return res.json({
                ip,
                userAgent,
                lastActive: new Date(),
                securityStatus: {
                    strength,
                    twoFactor: false,
                    verified: ngo.isVerified
                }
            });
        } else {
            return res.status(400).json({ error: "Invalid action." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Security update failed." });
    }
};
