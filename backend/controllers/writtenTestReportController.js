import WrittenTestReport from "../models/WrittenTestReport.js";
import logger from "../utils/logger.js";

export async function getWrittenTestReports(req, res) {
    logger.info("Fetching all written test reports");
    try {
        const reports = await WrittenTestReport.find();
        logger.info(`Successfully fetched ${reports.length} written test reports`);
        res.json(reports);
    } catch (error) {
        logger.error({ message: "Error retrieving written test reports", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error retrieving reports", error });
    }
}

export async function createWrittenTestReport(req, res) {
    logger.info(`Creating written test report for user ${req.body.username} and test ${req.body.testName}`);
    try {
        const { username, testName, score, total, questions } = req.body;

        if (!username || !testName || !questions || questions.length === 0) {
            logger.warn("Missing required fields for written test report creation");
            return res.status(400).json({ message: "Missing required fields" });
        }

        const report = new WrittenTestReport({ username, testName, score, total, questions });
        await report.save();

        logger.info(`Successfully created written test report for user ${username} and test ${testName}`);
        res.status(201).json({ message: "Written test report saved successfully", report });
    } catch (error) {
        logger.error({ message: `Error creating written test report for user ${req.body.username}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error saving report", error });
    }
}

export const getWrittenTestReportsUser = async (req, res) => {
    logger.info(`Fetching written test reports for user ${req.query.username || "all users"}`);
    try {
        const username = req.query.username;
        const reports = await WrittenTestReport.find(username ? { username } : {}).lean();
        logger.info(`Successfully fetched ${reports.length} written test reports for user ${username || "all users"}`);
        res.json(reports);
    } catch (error) {
        logger.error({ message: `Error retrieving written test reports for user ${req.query.username || "all users"}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error retrieving user reports", error });
    }
};

export const getWrittenReportsUserID = async (req, res) => {
    logger.info(`Fetching written test report by ID: ${req.params.id}`);
    try {
        const { id } = req.params; // Get ID from URL params
        const report = await WrittenTestReport.findById(id);

        if (!report) {
            logger.warn(`Written test report not found: ${id}`);
            return res.status(404).json({ message: "Report not found" });
        }

        logger.info(`Successfully fetched written test report ${id}`);
        res.json(report);
    } catch (error) {
        logger.error({ message: `Error retrieving written test report ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error retrieving report", error });
    }
};

export const deleteWrittenTestReport = async (req, res) => {
    logger.info(`Attempting to delete written test report with ID: ${req.params.id}`);
    try {
            const { id } = req.params;

            if (!id) {
                logger.warn("Report ID is required for deletion");
                return res.status(400).json({ message: "Report ID is required" });
            }

            const reportItem = await WrittenTestReport.findById(id);

            if (!reportItem) {
                logger.warn(`Written test report not found for deletion with ID: ${id}`);
                return res.status(404).json({ message: "Report not found" });
            }

            await WrittenTestReport.findByIdAndDelete(id);
            logger.info(`Written test report with ID ${id} deleted successfully`);
            return res.status(200).json({ message: "Report deleted successfully!" });

        } catch (error) {
            logger.error({ message: `Error deleting written test report with ID: ${req.params.id}`, error: error.message, stack: error.stack });
            res.status(500).json({ message: "Error deleting Report", error: error.message });
        }
};
