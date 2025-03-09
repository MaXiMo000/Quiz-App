import Report from "../models/Report.js";

export async function getReports(req, res) {
    const reports = await Report.find();
    res.json(reports);
}

export async function createReport(req, res) {
    try {
        const { username, quizName, score, total, questions } = req.body;

        if (!username || !quizName || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const report = new Report({ username, quizName, score, total, questions }); // ✅ Save questions
        await report.save();

        res.status(201).json({ message: "Report saved successfully", report });
    } catch (error) {
        console.error("Error saving report:", error);
        res.status(500).json({ message: "Error saving report", error: error.message });
    }
}

export const getReportsUser = async (req, res) => {
    try {
        const username = req.query.username;
        const reports = await Report.find(username ? { username } : {}).lean(); // Use .lean() for faster queries
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reports", error });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const { quizName } = req.query; // ✅ Get title from request body

        if (!quizName) {
            return res.status(400).json({ message: "Quiz Report is required" });
        }

        // Find the quiz by title
        const reportItem = await Report.findOne({ quizName });

        if (!reportItem) {
            return res.status(404).json({ message: "Report not found" });
        }

        // Delete the report
        await Report.deleteOne({ quizName });
        return res.status(200).json({ message: "Quiz Report successfully!" });

    } catch (error) {
        console.error("Error deleting Report:", error);
        res.status(500).json({ message: "Error deleting Report", error: error.message });
    }
};