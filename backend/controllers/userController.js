import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";

const JWT_SECRET = process.env.JWT_SECRET || "yourSuperSecretKey";

export const unlockThemesForLevel = (user) => {
    const unlockThemeAtLevels = {
        2: "Light",
        3: "Dark",
        5: "Galaxy",
        7: "Forest",
        10: "Sunset",
        15: "Neon",
        4: "material-light",    
        6: "material-dark",
        8: "dracula",
        10: "nord",
        12: "solarized-light",
        14: "solarized-dark",
        16: "monokai",
        18: "one-dark",
        20: "gruvbox-dark",
        22: "gruvbox-light",
        24: "oceanic",
        26: "synthwave",
        28: "night-owl",
        30: "tokyo-night",
        32: "ayu-light"
    };

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};

// Register user
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await UserQuiz.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(8);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserQuiz({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserQuiz.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // ✅ Check daily login streak
        const today = new Date();
        const todayMidnight = new Date(today.setHours(0, 0, 0, 0));
        const lastLoginMidnight = user.lastLogin ? new Date(user.lastLogin).setHours(0, 0, 0, 0) : null;

        if (lastLoginMidnight !== todayMidnight.getTime()) {
            // New login today
            const oneDay = 24 * 60 * 60 * 1000;
            if (lastLoginMidnight === todayMidnight.getTime() - oneDay) {
                // Continued streak
                user.loginStreak += 1;
            } else {
                // Streak reset
                user.loginStreak = 1;
            }

            user.lastLogin = new Date();

            // ✅ Award XP bonus
            const loginBonusXP = 50;
            user.xp += loginBonusXP;
            await new XPLog({ user: user._id, xp: loginBonusXP }).save();

            // ✅ Level-up logic
            let xpForNext = user.level * 100;
            while (user.xp >= xpForNext) {
                user.xp -= xpForNext;
                user.level += 1;
                xpForNext = user.level * 100;

                unlockThemesForLevel(user);
            }
        }

        // ≫≫ THEME UNLOCKING ≪≪
        const unlockThemeAtLevels = {
            2:  "Light",
            3:  "Dark",
            5:  "Galaxy",
            7:  "Forest",
            10: "Sunset",
            15: "Neon",
        
            4:  "material-light",
            6:  "material-dark",
            8:  "dracula",
            10: "nord",             // note: 10 now unlocks both "Sunset" and "nord"
            12: "solarized-light",
            14: "solarized-dark",
            16: "monokai",
            18: "one-dark",
            20: "gruvbox-dark",
            22: "gruvbox-light",
            24: "oceanic",
            26: "synthwave",
            28: "night-owl",
            30: "tokyo-night",
            32: "ayu-light"
        };
        
        for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
            if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
            }
        }

        await user.save();

        // ✅ Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        // ✅ Return user with XP, level, streak
        res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp,
                level: user.level,
                loginStreak: user.loginStreak,
                badges: user.badges || [],
                unlockedThemes: user.unlockedThemes || [],
                selectedTheme: user.selectedTheme || "Default",
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};


// Get all users (admin-only)
export const getAllUsers = async (req, res) => {
    try {
        const users = await UserQuiz.find();
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        const user = await UserQuiz.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.role = role;
        await user.save();
        // Issue new token with updated role
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: `Role updated to ${role}`,
            token, // ✅ must be this
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Internal Server Error" });
}
};

// ✅ Update selected theme
export const updateUserTheme = async (req, res) => {
    try {
    const { id } = req.params;
    const { theme } = req.body;

    const user = await UserQuiz.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Optionally validate if theme is unlocked
    if (!user.unlockedThemes.includes(theme)) {
        return res.status(400).json({ error: "Theme not unlocked yet" });
    }

    user.selectedTheme = theme;
    await user.save();

    res.json({ message: "Theme updated", selectedTheme: user.selectedTheme });
    } catch (err) {
    console.error("Error updating theme:", err);
    res.status(500).json({ error: "Error updating theme" });
    }
};
