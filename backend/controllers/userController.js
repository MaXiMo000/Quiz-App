import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

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
        12: "nord",
        14: "solarized-light",
        16: "solarized-dark",
        18: "monokai",
        20: "one-dark",
        22: "gruvbox-dark",
        24: "gruvbox-light",
        26: "oceanic",
        28: "synthwave",
        30: "night-owl",
        32: "tokyo-night",
        34: "ayu-light"
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

        // 🔒 SECURITY: Enhanced input validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Validate name (letters, spaces, some special chars only)
        const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({ success: false, message: "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email) || email.length > 100) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                success: false, 
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
            });
        }

        const existingUser = await UserQuiz.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserQuiz({ 
            name: name.trim(), 
            email: email.toLowerCase().trim(), 
            password: hashedPassword 
        });
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
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        const lastLoginMidnight = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;

        // Check if this is a new day (different from last login day)
        const isNewDay = !lastLoginMidnight || todayMidnight.getTime() !== lastLoginMidnight.getTime();

        if (isNewDay) {
            // Check if it's consecutive day for streak
            const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
            
            if (lastLoginMidnight && lastLoginMidnight.getTime() === oneDayAgo.getTime()) {
                // Continued streak
                user.loginStreak += 1;
            } else {
                // Reset streak or first login
                user.loginStreak = 1;
            }

            user.lastLogin = new Date();

            // ✅ Award XP bonus
            const loginBonusXP = 50;
            user.xp += loginBonusXP;
            user.totalXP = (user.totalXP || 0) + loginBonusXP;
            await new XPLog({ user: user._id, xp: loginBonusXP, source: 'login' }).save();

            // ✅ Level-up logic (keep total XP, only subtract current level XP)
            let currentLevelXP = user.xp;
            let xpForNext = user.level * 100;
            while (currentLevelXP >= xpForNext) {
                currentLevelXP -= xpForNext;
                user.level += 1;
                xpForNext = user.level * 100;
                unlockThemesForLevel(user);
            }
            user.xp = currentLevelXP; // Set remaining XP for current level
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
            12: "nord",
            14: "solarized-light",
            16: "solarized-dark",
            18: "monokai",
            20: "one-dark",
            22: "gruvbox-dark",
            24: "gruvbox-light",
            26: "oceanic",
            28: "synthwave",
            30: "night-owl",
            32: "tokyo-night",
            34: "ayu-light"
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
                xp: user.xp || 0,
                level: user.level || 0,
                loginStreak: user.loginStreak || 0,
                quizStreak: user.quizStreak || 0,
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
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    // Allow "Default" theme without validation, validate others
    if (theme !== "Default" && !user.unlockedThemes.includes(theme)) {
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
