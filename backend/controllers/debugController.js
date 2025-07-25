import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";

// Debug endpoint to check user XP and recent XP logs
export const debugUserXP = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user data
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get recent XP logs for this user
        const xpLogs = await XPLog.find({ user: userId })
            .sort({ date: -1 })
            .limit(10);

        // Calculate total XP from logs
        const totalXPFromLogs = await XPLog.aggregate([
            { $match: { user: userId } },
            { $group: { _id: null, totalXP: { $sum: "$xp" } } }
        ]);

        const calculatedTotalXP = totalXPFromLogs[0]?.totalXP || 0;

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                xp: user.xp,
                totalXP: user.totalXP,
                level: user.level,
                loginStreak: user.loginStreak,
                quizStreak: user.quizStreak,
                lastLogin: user.lastLogin,
                lastQuizDate: user.lastQuizDate
            },
            recentXPLogs: xpLogs,
            calculatedTotalXP,
            xpMismatch: calculatedTotalXP !== (user.totalXP || 0),
            debug: {
                currentTime: new Date(),
                userCreated: user.createdAt,
                xpLogsCount: xpLogs.length
            }
        });
    } catch (error) {
        console.error("Debug XP error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

// Reset user XP (for testing purposes only - remove in production)
export const resetUserXP = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Reset XP data
        user.xp = 0;
        user.totalXP = 0;
        user.level = 1;
        user.loginStreak = 0;
        user.quizStreak = 0;
        user.lastLogin = null;
        user.lastQuizDate = null;

        await user.save();

        // Optionally clear XP logs (uncomment if needed)
        // await XPLog.deleteMany({ user: userId });

        res.json({ message: "User XP reset successfully", user });
    } catch (error) {
        console.error("Reset XP error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};
