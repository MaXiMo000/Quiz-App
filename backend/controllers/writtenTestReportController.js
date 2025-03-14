import WrittenTestReport from "../models/WrittenTestReport.js";

// ✅ Get all reports
export async function getWrittenTestReports(req, res) {
    try {
        const reports = await WrittenTestReport.find();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reports", error });
    }
}

// ✅ Create a new report
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

// ✅ Get reports for a specific user
export const getWrittenTestReportsUser = async (req, res) => {
    try {
        const username = req.query.username;
        const reports = await WrittenTestReport.find(username ? { username } : {}).lean();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving user reports", error });
    }
};

// ✅ Delete a report by test name
export const deleteWrittenTestReport = async (req, res) => {
    try {
        const { testName } = req.query;

        if (!testName) {
            return res.status(400).json({ message: "Test name is required" });
        }

        const reportItem = await WrittenTestReport.findOne({ testName });

        if (!reportItem) {
            return res.status(404).json({ message: "Report not found" });
        }

        await WrittenTestReport.deleteOne({ testName });
        res.status(200).json({ message: "Written test report deleted successfully!" });

    } catch (error) {
        res.status(500).json({ message: "Error deleting report", error });
    }
};