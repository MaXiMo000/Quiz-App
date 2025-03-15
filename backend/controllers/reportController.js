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

export const getReportsUserID = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL params
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving report", error });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const { id } = req.params; // ✅ Get report ID from request parameters

        if (!id) {
            return res.status(400).json({ message: "Report ID is required" });
        }

        const reportItem = await Report.findById(id);

        if (!reportItem) {
            return res.status(404).json({ message: "Report not found" });
        }

        await Report.findByIdAndDelete(id);
        return res.status(200).json({ message: "Report deleted successfully!" });

    } catch (error) {
        console.error("Error deleting Report:", error);
        res.status(500).json({ message: "Error deleting Report", error: error.message });
    }
};