import WrittenTestReport from "../models/WrittenTestReport.js";

export async function getWrittenTestReports(req, res) {
    try {
        const reports = await WrittenTestReport.find();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reports", error });
    }
}

export async function createWrittenTestReport(req, res) {
    try {
        const { username, testName, score, total, questions } = req.body;

        if (!username || !testName || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const report = new WrittenTestReport({ username, testName, score, total, questions });
        await report.save();

        res.status(201).json({ message: "Written test report saved successfully", report });
    } catch (error) {
        res.status(500).json({ message: "Error saving report", error });
    }
}

export const getWrittenTestReportsUser = async (req, res) => {
    try {
        const username = req.query.username;
        const reports = await WrittenTestReport.find(username ? { username } : {}).lean();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving user reports", error });
    }
};

export const getWrittenReportsUserID = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL params
        const report = await WrittenTestReport.findById(id);

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving report", error });
    }
};

export const deleteWrittenTestReport = async (req, res) => {
    try {
            const { id } = req.params;
    
            if (!id) {
                return res.status(400).json({ message: "Report ID is required" });
            }
    
            const reportItem = await WrittenTestReport.findById(id);
    
            if (!reportItem) {
                return res.status(404).json({ message: "Report not found" });
            }
    
            await WrittenTestReport.findByIdAndDelete(id);
            return res.status(200).json({ message: "Report deleted successfully!" });
    
        } catch (error) {
            console.error("Error deleting Report:", error);
            res.status(500).json({ message: "Error deleting Report", error: error.message });
        }
};