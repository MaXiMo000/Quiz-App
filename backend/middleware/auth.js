import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("❌ No Bearer token provided");
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("✅ Token decoded successfully:", { id: decoded.id, email: decoded.email });
        req.user = decoded;
        next();
    } catch (err) {
        console.error("❌ JWT verification failed:", err.message);
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

