import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";
import { unlockThemesForLevel } from "../utils/themeUtils.js";
import logger from "../utils/logger.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

// Re-export the theme utility function for backward compatibility
export { unlockThemesForLevel };

// Register user
const _registerUser = async (req, res) => {
    const startTime = Date.now();
    const { name, email, password } = req.body;
    
    try {
        logger.info('User registration attempt', {
            email: email?.toLowerCase(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        // 🔒 SECURITY: Enhanced input validation
        if (!name || !email || !password) {
            logger.warn('Registration failed: Missing required fields', { email: email?.toLowerCase() });
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Validate name (letters, spaces, some special chars only)
        const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
        if (!nameRegex.test(name)) {
            logger.warn('Registration failed: Invalid name format', { email: email.toLowerCase(), name });
            return res.status(400).json({ success: false, message: "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email) || email.length > 100) {
            logger.warn('Registration failed: Invalid email format', { email: email.toLowerCase() });
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }

        // Validate password strength
        if (password.length < 8) {
            logger.warn('Registration failed: Password too short', { email: email.toLowerCase() });
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
            logger.warn('Registration failed: Weak password', { email: email.toLowerCase() });
            return res.status(400).json({ 
                success: false, 
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
            });
        }

        const existingUser = await UserQuiz.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            logger.warn('Registration failed: User already exists', { email: email.toLowerCase() });
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

        const duration = Date.now() - startTime;
        logger.performance('User registration', duration, {
            userId: newUser._id,
            email: newUser.email
        });

        logger.auth('User registration', newUser._id, true, {
            email: newUser.email,
            duration: `${duration}ms`
        });

        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Registration error', error, {
            email: email?.toLowerCase(),
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });
        
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const registerUser = withCachingAndLogging(_registerUser, {
    ...controllerConfigs.user,
    operation: 'Register User',
    cacheTTL: 0, // No caching for registration
    logFields: ['body.name', 'body.email']
});

// Login user
const _loginUser = async (req, res) => {
    const startTime = Date.now();
    const { email, password } = req.body;
    
    try {
        logger.info('User login attempt', {
            email: email?.toLowerCase(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        if (!email || !password) {
            logger.warn('Login failed: Missing credentials', { email: email?.toLowerCase() });
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await UserQuiz.findOne({ email: email.toLowerCase() });
        if (!user) {
            logger.warn('Login failed: User not found', { email: email.toLowerCase() });
            return res.status(400).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login failed: Invalid password', { 
                email: email.toLowerCase(),
                userId: user._id 
            });
            return res.status(400).json({ error: "Invalid credentials" });
        }

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

        const duration = Date.now() - startTime;
        
        // Log successful login
        logger.auth('User login', user._id, true, {
            email: user.email,
            level: user.level,
            loginStreak: user.loginStreak,
            duration: `${duration}ms`
        });

        logger.performance('User login', duration, {
            userId: user._id,
            email: user.email
        });

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
        const duration = Date.now() - startTime;
        logger.error('Login error', error, {
            email: email?.toLowerCase(),
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });
        
        res.status(500).json({ error: "Server Error" });
    }
};

export const loginUser = withCachingAndLogging(_loginUser, {
    ...controllerConfigs.user,
    operation: 'Login User',
    cacheTTL: 0, // No caching for login
    logFields: ['body.email']
});


// Get all users (admin-only)
const _getAllUsers = async (req, res) => {
    logger.info('Fetching all users', { 
        context: 'UserController', 
        operation: 'Get All Users',
        userId: req.user?.id,
        role: req.user?.role 
    });
    
    const users = await UserQuiz.find();
    
    logger.info('Successfully fetched all users', { 
        context: 'UserController', 
        operation: 'Get All Users',
        count: users.length,
        userId: req.user?.id 
    });
    
    res.json(users);
};

export const getAllUsers = withCachingAndLogging(_getAllUsers, {
    ...controllerConfigs.userAuth,
    operation: 'Get All Users',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: cacheKeyGenerators.roleBased
});

const _updateUserRole = async (req, res) => {
    const { userId, role } = req.body;
    
    logger.info('Updating user role', { 
        context: 'UserController', 
        operation: 'Update User Role',
        targetUserId: userId,
        newRole: role,
        adminUserId: req.user?.id 
    });
    
    const user = await UserQuiz.findById(userId);

    if (!user) {
        logger.warn('User not found for role update', { 
            context: 'UserController', 
            operation: 'Update User Role',
            targetUserId: userId,
            adminUserId: req.user?.id 
        });
        return res.status(404).json({ message: "User not found" });
    }
    
    const oldRole = user.role;
    user.role = role;
    await user.save();
    
    logger.info('User role updated successfully', { 
        context: 'UserController', 
        operation: 'Update User Role',
        targetUserId: userId,
        oldRole,
        newRole: role,
        adminUserId: req.user?.id 
    });
    
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
};

export const updateUserRole = withCachingAndLogging(_updateUserRole, {
    ...controllerConfigs.userAuth,
    operation: 'Update User Role',
    cacheTTL: 0, // No caching for update operations
    logFields: ['body.userId', 'body.role']
});

// ✅ Update selected theme
const _updateUserTheme = async (req, res) => {
    const { id } = req.params;
    const { theme } = req.body;

    logger.info('Updating user theme', { 
        context: 'UserController', 
        operation: 'Update User Theme',
        userId: id,
        newTheme: theme,
        requesterId: req.user?.id 
    });

    const user = await UserQuiz.findById(id);
    if (!user) {
        logger.warn('User not found for theme update', { 
            context: 'UserController', 
            operation: 'Update User Theme',
            userId: id,
            requesterId: req.user?.id 
        });
        return res.status(404).json({ error: "User not found" });
    }

    // Allow "Default" theme without validation, validate others
    if (theme !== "Default" && !user.unlockedThemes.includes(theme)) {
        logger.warn('Theme not unlocked for user', { 
            context: 'UserController', 
            operation: 'Update User Theme',
            userId: id,
            requestedTheme: theme,
            unlockedThemes: user.unlockedThemes,
            requesterId: req.user?.id 
        });
        return res.status(400).json({ error: "Theme not unlocked yet" });
    }

    const oldTheme = user.selectedTheme;
    user.selectedTheme = theme;
    await user.save();

    logger.info('User theme updated successfully', { 
        context: 'UserController', 
        operation: 'Update User Theme',
        userId: id,
        oldTheme,
        newTheme: theme,
        requesterId: req.user?.id 
    });

    res.json({ message: "Theme updated", selectedTheme: user.selectedTheme });
};

export const updateUserTheme = withCachingAndLogging(_updateUserTheme, {
    ...controllerConfigs.userAuth,
    operation: 'Update User Theme',
    cacheTTL: 0, // No caching for update operations
    logFields: ['params.id', 'body.theme']
});
