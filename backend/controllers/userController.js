import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";

export const registerUser = async (req, res) => {
    try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await UserQuiz.findOne({ email });
    if (existingUser) {
    return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(8);;
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new UserQuiz({
    name,
    email,
    password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ success: true, message: "User registered successfully!" });
} catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
}
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
    
        // Check if user exists
        const user = await UserQuiz.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });
    
        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    
        // Successful login
        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

export const getAllUsers = async(req, res) =>{
    try {
        const users = await UserQuiz.find();
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server Error" });
    }
};