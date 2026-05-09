const User = require("../models/User");
const PointTransaction = require("../models/PointTransaction");
const Reward = require("../models/Reward");
const Redemption = require("../models/Redemption");
const EcoTask = require("../models/EcoTask");
const aiGamificationController = require("./aiGamificationController");

// Calculate level based on logic: Level = floor(totalPoints / 1200) + 1
const getLevelInfo = (totalPoints) => {
    const level = Math.floor(totalPoints / 1200) + 1;
    const progressToNext = totalPoints % 1200;
    const progressPercent = Math.min(100, Math.round((progressToNext / 1200) * 100));
    return { level, progressPercent, progressToNext };
};

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const totalPoints = user.totalPointsEarned || 0;
        const currentPoints = user.points || 0;

        const { level, progressPercent } = getLevelInfo(totalPoints);

        // Find user global rank by counting how many users have strictly more totalPointsEarned
        const rankCount = await User.countDocuments({ totalPointsEarned: { $gt: totalPoints } });
        const globalRank = rankCount + 1;

        // Fetch top 3 leaderboard
        const leaderboard = await User.find()
            .sort({ totalPointsEarned: -1 })
            .limit(3)
            .select("name totalPointsEarned")
            .lean();

        // Check if user has generated daily tasks for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let activeTasks = await EcoTask.find({ userId, createdAt: { $gte: startOfDay } });

        if (activeTasks.length === 0) {
            // Generate tasks via AI logic
            const aiTasks = aiGamificationController.generateDailyChallenges(userId);
            const docsToInsert = aiTasks.map(t => ({ ...t, userId }));
            activeTasks = await EcoTask.insertMany(docsToInsert);
        }

        // Fetch redeemable rewards
        const rewards = await Reward.find().lean();

        // The 14 NEW Eco-Friendly Rewards requested by the user
        const allRewards = (rewards.length > 0 && rewards[0].pointsRequired !== undefined) ? rewards : [
            // CATEGORY 1: ECO MERCHANDISE
            { _id: "64a2b3c4d5e6f7g8h9i0j101", title: "EcoAction Sustainable T-Shirt", rewardType: "Physical", pointsRequired: 3500, description: "Organic cotton T-shirt made with eco-friendly dyes. Features the CivicAction logo and promotes climate awareness.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIaW7cvdDoC9k7O7os_KeriOc34dzT7QrUG3tOtClbrOnW2MMd_tjYywZD4Tt3Oo1Mqe2W2DZGbnbrZfGJmsnUv_a2dsCneQweVevamIxzxO2F8GBBw5WBmUjqqx9KFnis6CaSSKCAn39whVX-tm5hWfcesHCdRtzXfu3994vBnkq0ZZqpx8nJ6yBF0J14FKikA4ghS3I_nuvaqV3ZKNIHTWWhgLBx8RIjk4wMWgwBIHvNorK6H3BSiF68_zPxbn7YCL0I827ymTM", stock: 50, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j102", title: "EcoAction Hoodie", rewardType: "Physical", pointsRequired: 7000, description: "Sustainable cotton hoodie made from recycled fibers.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPCiW5ZSLTzeCNaVoeTaO0ZdVOtWS09to9-A9Vivgowt6IEAOkRIkOco5Eabdor3muIA00yuIL1lEL8Ivn-GUKrtBbC7j7ywdIz_T0QaspRs486x5j_5Tybq3U8oPZIUID7nIZLyZt1pJvjqg6hK-SSc8hMhJjKiAdUFVdG9J9iOyKi5ygf4kwYuG9sY6Q9Ve5x5aEVsxCj6IE42t94gLpFh18H1RBFsoAj18YXOO2y6p5cXiE0gqU7QyobxrdDWFCFfX7jKSx2tk", stock: 25, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j103", title: "Reusable Tote Bag", rewardType: "Physical", pointsRequired: 1500, description: "Plastic-free shopping bag made from recycled materials.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3o6gWAiwfwLtVC546vi-gEFAZIrT5Ghl0nn3Wm_HyxZGOfwRAbJuZOJ7AZOk5QjfU1iB9K7cyd-d9J_AyA7NlsbdFSHr8ddVeZxN_3oTFfmN2HDPSqtQz8i7tHAeT3D6fHC_sAEmid7qBrlL0DYalNT1pBBYkgAXVJNY9l_-8t7s8qOfZnuPOOguBiM9c8nD3ZcWZoQg9k7WxzGZx2Dh6mZ_iu8lca5egmOWyv2qmSoZaqpPDR1B1259RawppwoE0lZAuE4zpWOE", stock: 100, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j104", title: "Eco Stickers Pack", rewardType: "Physical", pointsRequired: 500, description: "Sustainability themed stickers to promote climate awareness.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCAzdwjP8Sls3ElVLZEDvUGfJ-LXl4KoNtBqniP5mY7suei_m7qZCO-NrCoWxyCJY28ofTJWzzpHlgCzSl8FEB7sKQMGDCRn6-rJkGSBArWZj_p6BqKVcoOILb8c8ZCyvvaq9URi2_d-mt5uYiAll6Z5y-J9Nb72eX8nJCt4AyaU8rbbJm_bxxpBO00bsPKhamYkmJEbMmKgkijUeZcuqPt4LUfnhoSGKifVZS6aAXH_TdzEOWYbBAOSEQ2yb6Nd2iALS5sgUp6_0", stock: 500, deliveryType: "Mail" },

            // CATEGORY 2: SUSTAINABLE PRODUCTS
            { _id: "64a2b3c4d5e6f7g8h9i0j105", title: "Bamboo Water Bottle", rewardType: "Physical", pointsRequired: 4000, description: "Reusable bamboo insulated bottle that reduces plastic usage.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIaW7cvdDoC9k7O7os_KeriOc34dzT7QrUG3tOtClbrOnW2MMd_tjYywZD4Tt3Oo1Mqe2W2DZGbnbrZfGJmsnUv_a2dsCneQweVevamIxzxO2F8GBBw5WBmUjqqx9KFnis6CaSSKCAn39whVX-tm5hWfcesHCdRtzXfu3994vBnkq0ZZqpx8nJ6yBF0J14FKikA4ghS3I_nuvaqV3ZKNIHTWWhgLBx8RIjk4wMWgwBIHvNorK6H3BSiF68_zPxbn7YCL0I827ymTM", stock: 30, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j106", title: "Solar Power Bank", rewardType: "Physical", pointsRequired: 8000, description: "Portable solar charger for phones and small devices.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPCiW5ZSLTzeCNaVoeTaO0ZdVOtWS09to9-A9Vivgowt6IEAOkRIkOco5Eabdor3muIA00yuIL1lEL8Ivn-GUKrtBbC7j7ywdIz_T0QaspRs486x5j_5Tybq3U8oPZIUID7nIZLyZt1pJvjqg6hK-SSc8hMhJjKiAdUFVdG9J9iOyKi5ygf4kwYuG9sY6Q9Ve5x5aEVsxCj6IE42t94gLpFh18H1RBFsoAj18YXOO2y6p5cXiE0gqU7QyobxrdDWFCFfX7jKSx2tk", stock: 15, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j107", title: "Reusable Coffee Cup", rewardType: "Physical", pointsRequired: 2000, description: "Eco-friendly travel mug to reduce disposable cups.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3o6gWAiwfwLtVC546vi-gEFAZIrT5Ghl0nn3Wm_HyxZGOfwRAbJuZOJ7AZOk5QjfU1iB9K7cyd-d9J_AyA7NlsbdFSHr8ddVeZxN_3oTFfmN2HDPSqtQz8i7tHAeT3D6fHC_sAEmid7qBrlL0DYalNT1pBBYkgAXVJNY9l_-8t7s8qOfZnuPOOguBiM9c8nD3ZcWZoQg9k7WxzGZx2Dh6mZ_iu8lca5egmOWyv2qmSoZaqpPDR1B1259RawppwoE0lZAuE4zpWOE", stock: 50, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j108", title: "Plant Seed Kit", rewardType: "Physical", pointsRequired: 2500, description: "Grow your own herbs or trees at home.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCAzdwjP8Sls3ElVLZEDvUGfJ-LXl4KoNtBqniP5mY7suei_m7qZCO-NrCoWxyCJY28ofTJWzzpHlgCzSl8FEB7sKQMGDCRn6-rJkGSBArWZj_p6BqKVcoOILb8c8ZCyvvaq9URi2_d-mt5uYiAll6Z5y-J9Nb72eX8nJCt4AyaU8rbbJm_bxxpBO00bsPKhamYkmJEbMmKgkijUeZcuqPt4LUfnhoSGKifVZS6aAXH_TdzEOWYbBAOSEQ2yb6Nd2iALS5sgUp6_0", stock: 40, deliveryType: "Shipping" },
            { _id: "64a2b3c4d5e6f7g8h9i0j109", title: "Eco-Friendly Stationery Kit", rewardType: "Physical", pointsRequired: 1800, description: "Notebook, bamboo pen, and recycled paper products.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLpugFTJ4HJPMjY8JIFk5BSMceb19RICXZRu5YAPoT5UpQNLmCKapnQTSLNvq_eK_vA2fHDSn6atbpRsLP0w2RppF_Ng-1BCJa7kMCDVOxrjRQ5qfZf1mBvXsATm6EfZnikPNikOzzxVnM7TU0H8mg79_Br7H2lHmgWH4nDOKucnGIRJT43ajrfm7pvS5HTwY9f-i67rS2DqnjpW0vkGOuXRDrcD585iLd7S-o8NuNxT9FyegB_uDrquOhgVxouSTo2eftFNU0es", stock: 60, deliveryType: "Shipping" },

            // CATEGORY 3: IMPACT REWARDS
            { _id: "64a2b3c4d5e6f7g8h9i0j110", title: "Plant 5 Trees", rewardType: "Impact", pointsRequired: 3000, description: "Dedicate 5 trees in your name. Provides habitat and CO2 reduction.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLpugFTJ4HJPMjY8JIFk5BSMceb19RICXZRu5YAPoT5UpQNLmCKapnQTSLNvq_eK_vA2fHDSn6atbpRsLP0w2RppF_Ng-1BCJa7kMCDVOxrjRQ5qfZf1mBvXsATm6EfZnikPNikOzzxVnM7TU0H8mg79_Br7H2lHmgWH4nDOKucnGIRJT43ajrfm7pvS5HTwY9f-i67rS2DqnjpW0vkGOuXRDrcD585iLd7S-o8NuNxT9FyegB_uDrquOhgVxouSTo2eftFNU0es", co2Impact: "-110 kg CO2/yr", deliveryType: "Digital Certificate" },
            { _id: "64a2b3c4d5e6f7g8h9i0j111", title: "Plant 10 Trees", rewardType: "Impact", pointsRequired: 5000, description: "Dedicate 10 trees in your name.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZLpugFTJ4HJPMjY8JIFk5BSMceb19RICXZRu5YAPoT5UpQNLmCKapnQTSLNvq_eK_vA2fHDSn6atbpRsLP0w2RppF_Ng-1BCJa7kMCDVOxrjRQ5qfZf1mBvXsATm6EfZnikPNikOzzxVnM7TU0H8mg79_Br7H2lHmgWH4nDOKucnGIRJT43ajrfm7pvS5HTwY9f-i67rS2DqnjpW0vkGOuXRDrcD585iLd7S-o8NuNxT9FyegB_uDrquOhgVxouSTo2eftFNU0es", co2Impact: "-220 kg CO2/yr", deliveryType: "Digital Certificate" },
            { _id: "64a2b3c4d5e6f7g8h9i0j112", title: "Clean 5kg Ocean Plastic", rewardType: "Impact", pointsRequired: 6000, description: "Fund the removal of 5kg of plastic waste from ocean boundaries.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIaW7cvdDoC9k7O7os_KeriOc34dzT7QrUG3tOtClbrOnW2MMd_tjYywZD4Tt3Oo1Mqe2W2DZGbnbrZfGJmsnUv_a2dsCneQweVevamIxzxO2F8GBBw5WBmUjqqx9KFnis6CaSSKCAn39whVX-tm5hWfcesHCdRtzXfu3994vBnkq0ZZqpx8nJ6yBF0J14FKikA4ghS3I_nuvaqV3ZKNIHTWWhgLBx8RIjk4wMWgwBIHvNorK6H3BSiF68_zPxbn7YCL0I827ymTM", co2Impact: "Protects Marine Life", deliveryType: "Digital Certificate" },
            { _id: "64a2b3c4d5e6f7g8h9i0j113", title: "Sponsor Solar Lamp", rewardType: "Impact", pointsRequired: 15000, description: "Provide a solar lamp for a rural home without electricity.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPCiW5ZSLTzeCNaVoeTaO0ZdVOtWS09to9-A9Vivgowt6IEAOkRIkOco5Eabdor3muIA00yuIL1lEL8Ivn-GUKrtBbC7j7ywdIz_T0QaspRs486x5j_5Tybq3U8oPZIUID7nIZLyZt1pJvjqg6hK-SSc8hMhJjKiAdUFVdG9J9iOyKi5ygf4kwYuG9sY6Q9Ve5x5aEVsxCj6IE42t94gLpFh18H1RBFsoAj18YXOO2y6p5cXiE0gqU7QyobxrdDWFCFfX7jKSx2tk", co2Impact: "Replaces Kerosene", deliveryType: "Impact Report" },
            { _id: "64a2b3c4d5e6f7g8h9i0j114", title: "Restore Coral Reef Area", rewardType: "Impact", pointsRequired: 20000, description: "Fund coral restoration fragments planted in damaged reef zones.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3o6gWAiwfwLtVC546vi-gEFAZIrT5Ghl0nn3Wm_HyxZGOfwRAbJuZOJ7AZOk5QjfU1iB9K7cyd-d9J_AyA7NlsbdFSHr8ddVeZxN_3oTFfmN2HDPSqtQz8i7tHAeT3D6fHC_sAEmid7qBrlL0DYalNT1pBBYkgAXVJNY9l_-8t7s8qOfZnuPOOguBiM9c8nD3ZcWZoQg9k7WxzGZx2Dh6mZ_iu8lca5egmOWyv2qmSoZaqpPDR1B1259RawppwoE0lZAuE4zpWOE", co2Impact: "Biodiversity Growth", deliveryType: "Impact Report" },

            // CATEGORY 4: EXCLUSIVE REWARDS
            { _id: "64a2b3c4d5e6f7g8h9i0j115", title: "Meet Climate Experts Webinar", rewardType: "Exclusive", pointsRequired: 8000, description: "Access a closed-door interactive webinar with climate scientists.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIaW7cvdDoC9k7O7os_KeriOc34dzT7QrUG3tOtClbrOnW2MMd_tjYywZD4Tt3Oo1Mqe2W2DZGbnbrZfGJmsnUv_a2dsCneQweVevamIxzxO2F8GBBw5WBmUjqqx9KFnis6CaSSKCAn39whVX-tm5hWfcesHCdRtzXfu3994vBnkq0ZZqpx8nJ6yBF0J14FKikA4ghS3I_nuvaqV3ZKNIHTWWhgLBx8RIjk4wMWgwBIHvNorK6H3BSiF68_zPxbn7YCL0I827ymTM", deliveryType: "Virtual Invite" },
            { _id: "64a2b3c4d5e6f7g8h9i0j116", title: "Early Access: Green Tech", rewardType: "Exclusive", pointsRequired: 10000, description: "Beta testing access to upcoming sustainable software products.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPCiW5ZSLTzeCNaVoeTaO0ZdVOtWS09to9-A9Vivgowt6IEAOkRIkOco5Eabdor3muIA00yuIL1lEL8Ivn-GUKrtBbC7j7ywdIz_T0QaspRs486x5j_5Tybq3U8oPZIUID7nIZLyZt1pJvjqg6hK-SSc8hMhJjKiAdUFVdG9J9iOyKi5ygf4kwYuG9sY6Q9Ve5x5aEVsxCj6IE42t94gLpFh18H1RBFsoAj18YXOO2y6p5cXiE0gqU7QyobxrdDWFCFfX7jKSx2tk", deliveryType: "Digital License" },
            { _id: "64a2b3c4d5e6f7g8h9i0j117", title: "Climate Champion Badge", rewardType: "Exclusive", pointsRequired: 12000, description: "A permanent digital badge displayed on your public profile.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3o6gWAiwfwLtVC546vi-gEFAZIrT5Ghl0nn3Wm_HyxZGOfwRAbJuZOJ7AZOk5QjfU1iB9K7cyd-d9J_AyA7NlsbdFSHr8ddVeZxN_3oTFfmN2HDPSqtQz8i7tHAeT3D6fHC_sAEmid7qBrlL0DYalNT1pBBYkgAXVJNY9l_-8t7s8qOfZnuPOOguBiM9c8nD3ZcWZoQg9k7WxzGZx2Dh6mZ_iu8lca5egmOWyv2qmSoZaqpPDR1B1259RawppwoE0lZAuE4zpWOE", deliveryType: "Profile Unlock" },
            { _id: "64a2b3c4d5e6f7g8h9i0j118", title: "VIP Eco Community", rewardType: "Exclusive", pointsRequired: 15000, description: "Lifetime membership to the private VIP environmental leaders group.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCAzdwjP8Sls3ElVLZEDvUGfJ-LXl4KoNtBqniP5mY7suei_m7qZCO-NrCoWxyCJY28ofTJWzzpHlgCzSl8FEB7sKQMGDCRn6-rJkGSBArWZj_p6BqKVcoOILb8c8ZCyvvaq9URi2_d-mt5uYiAll6Z5y-J9Nb72eX8nJCt4AyaU8rbbJm_bxxpBO00bsPKhamYkmJEbMmKgkijUeZcuqPt4LUfnhoSGKifVZS6aAXH_TdzEOWYbBAOSEQ2yb6Nd2iALS5sgUp6_0", deliveryType: "Digital Membership" }
        ];

        // Generate smart AI reward recommendation based on current point balance
        const aiRecommendation = aiGamificationController.recommendReward(currentPoints, allRewards);

        res.json({
            success: true,
            userPoints: currentPoints,
            totalPointsEarned: totalPoints,
            level,
            rank: globalRank,
            progress: progressPercent,
            dailyChallenges: activeTasks,
            aiRecommendation,
            leaderboard,
            rewards: allRewards
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const limit = 10;
        const skip = 0;

        const leaderboard = await User.find()
            .sort({ totalPointsEarned: -1 })
            .select("name totalPointsEarned level")
            .limit(limit)
            .lean();

        // Calculate levels dynamically since we don't store them directly on user model
        leaderboard.forEach(u => u.level = Math.floor(u.totalPointsEarned / 1200) + 1);

        res.json({ success: true, leaderboard });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.redeemReward = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { rewardId, deliveryAddress } = req.body;

        const user = await User.findById(userId);

        // Lookup reward from DB, or fallback to our simulated list to keep frontend working smoothly
        let reward = await Reward.findById(rewardId);
        if (!reward) {
            // Rebuild the fallback list locally to find the match
            const allFallbackRewards = [
                { _id: "64a2b3c4d5e6f7g8h9i0j101", title: "EcoAction Sustainable T-Shirt", rewardType: "Physical", pointsRequired: 3500 },
                { _id: "64a2b3c4d5e6f7g8h9i0j102", title: "EcoAction Hoodie", rewardType: "Physical", pointsRequired: 7000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j103", title: "Reusable Tote Bag", rewardType: "Physical", pointsRequired: 1500 },
                { _id: "64a2b3c4d5e6f7g8h9i0j104", title: "Eco Stickers Pack", rewardType: "Physical", pointsRequired: 500 },
                { _id: "64a2b3c4d5e6f7g8h9i0j105", title: "Bamboo Water Bottle", rewardType: "Physical", pointsRequired: 4000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j106", title: "Solar Power Bank", rewardType: "Physical", pointsRequired: 8000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j107", title: "Reusable Coffee Cup", rewardType: "Physical", pointsRequired: 2000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j108", title: "Plant Seed Kit", rewardType: "Physical", pointsRequired: 2500 },
                { _id: "64a2b3c4d5e6f7g8h9i0j109", title: "Eco-Friendly Stationery Kit", rewardType: "Physical", pointsRequired: 1800 },
                { _id: "64a2b3c4d5e6f7g8h9i0j110", title: "Plant 5 Trees", rewardType: "Impact", pointsRequired: 3000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j111", title: "Plant 10 Trees", rewardType: "Impact", pointsRequired: 5000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j112", title: "Clean 5kg Ocean Plastic", rewardType: "Impact", pointsRequired: 6000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j113", title: "Sponsor Solar Lamp", rewardType: "Impact", pointsRequired: 15000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j114", title: "Restore Coral Reef Area", rewardType: "Impact", pointsRequired: 20000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j115", title: "Meet Climate Experts Webinar", rewardType: "Exclusive", pointsRequired: 8000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j116", title: "Early Access: Green Tech", rewardType: "Exclusive", pointsRequired: 10000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j117", title: "Climate Champion Badge", rewardType: "Exclusive", pointsRequired: 12000 },
                { _id: "64a2b3c4d5e6f7g8h9i0j118", title: "VIP Eco Community", rewardType: "Exclusive", pointsRequired: 15000 }
            ];
            reward = allFallbackRewards.find(r => r._id === rewardId);
        }

        if (!reward) return res.status(404).json({ success: false, message: "Reward not found" });

        if (user.points < reward.pointsRequired) {
            return res.status(400).json({ success: false, message: "Insufficient points" });
        }

        // Enforce address block on physical goods
        if (reward.rewardType && reward.rewardType.toLowerCase() === 'physical' && !deliveryAddress) {
            return res.status(400).json({ success: false, message: "Delivery address is required for physical rewards." });
        }

        // Deduct points
        user.points -= reward.pointsRequired;
        await user.save();

        // Create Redemption record (ensure fallback DB items don't crash the query with invalid ObjectIds)
        let safeRewardId = String(reward._id);
        let redemption = null;
        if (safeRewardId.length === 24) {
            redemption = await Redemption.create({ userId, rewardId: safeRewardId, status: "pending", deliveryAddress });
        }

        // Log negative point transaction
        await PointTransaction.create({
            userId,
            pointsAdded: -reward.pointsRequired,
            sourceType: "redeem",
            sourceId: safeRewardId,
            description: `Redeemed reward: ${reward.title}`
        });

        res.json({ success: true, message: "Reward redeemed successfully!", remainingPoints: user.points, redemption });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.claimTask = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { taskId } = req.body;

        const task = await EcoTask.findOne({ _id: taskId, userId });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (task.status === "completed") {
            return res.status(400).json({ success: false, message: "Task already claimed" });
        }

        // Mark as completed
        task.status = "completed";
        await task.save();

        // Award points
        const points = task.points;
        await User.findByIdAndUpdate(userId, {
            $inc: { points: points, totalPointsEarned: points }
        });

        // Log transaction
        await PointTransaction.create({
            userId,
            pointsAdded: points,
            sourceType: "task",
            sourceId: task._id,
            description: `Completed AI Task: ${task.title}`
        });

        res.json({ success: true, message: `Earned ${points} points!`, pointsEarned: points });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
