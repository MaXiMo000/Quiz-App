import WrittenTestReport from "../models/WrittenTestReport.js";
import logger from "../utils/logger.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendCreated } from "../utils/responseHelper.js";
import AppError from "../utils/AppError.js";

export async function getWrittenTestReports(req, res) {
    logger.info("Fetching all written test reports");
    try {
        const reports = await WrittenTestReport.find();
        logger.info(`Successfully fetched ${reports.length} written test reports`);
        return sendSuccess(res, reports, "Written test reports fetched successfully");
    } catch (error) {
        logger.error({ message: "Error retrieving written test reports", error: error.message, stack: error.stack });
        throw new AppError("Error retrieving reports", 500);
    }
}

export async function createWrittenTestReport(req, res) {
    logger.info(`Creating written test report for user ${req.body.username} and test ${req.body.testName}`);
    try {
        const { username, testName, score, total, questions } = req.body;

        if (!username || !testName || !questions || questions.length === 0) {
            logger.warn("Missing required fields for written test report creation");
            return sendValidationError(res, { username: "Username, testName, and questions are required" }, "Missing required fields");
        }

        const report = new WrittenTestReport({ username, testName, score, total, questions });
        await report.save();

        logger.info(`Successfully created written test report for user ${username} and test ${testName}`);
        return sendCreated(res, report, "Written test report saved successfully");
    } catch (error) {
        logger.error({ message: `Error creating written test report for user ${req.body.username}`, error: error.message, stack: error.stack });
        throw new AppError("Error saving report", 500);
    }
}

export const getWrittenTestReportsUser = async (req, res) => {
    logger.info(`Fetching written test reports for user ${req.query.username || "all users"}`);
    try {
        const username = req.query.username;
        const reports = await WrittenTestReport.find(username ? { username } : {}).lean();
        logger.info(`Successfully fetched ${reports.length} written test reports for user ${username || "all users"}`);
        return sendSuccess(res, reports, "Written test reports fetched successfully");
    } catch (error) {
        logger.error({ message: `Error retrieving written test reports for user ${req.query.username || "all users"}`, error: error.message, stack: error.stack });
        throw new AppError("Error retrieving user reports", 500);
    }
};

export const getWrittenReportsUserID = async (req, res) => {
    logger.info(`Fetching written test report by ID: ${req.params.id}`);
    try {
        const { id } = req.params; // Get ID from URL params
        const report = await WrittenTestReport.findById(id);

        if (!report) {
            logger.warn(`Written test report not found: ${id}`);
            return sendNotFound(res, "Report");
        }

        logger.info(`Successfully fetched written test report ${id}`);
        return sendSuccess(res, report, "Report fetched successfully");
    } catch (error) {
        logger.error({ message: `Error retrieving written test report ${req.params.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error retrieving report", 500);
    }
};

export const deleteWrittenTestReport = async (req, res) => {
    logger.info(`Attempting to delete written test report with ID: ${req.params.id}`);
    try {
            const { id } = req.params;

            if (!id) {
                logger.warn("Report ID is required for deletion");
                return sendValidationError(res, { id: "Report ID is required" }, "Report ID is required");
            }

            const reportItem = await WrittenTestReport.findById(id);

            if (!reportItem) {
                logger.warn(`Written test report not found for deletion with ID: ${id}`);
                return sendNotFound(res, "Report");
            }

            await WrittenTestReport.findByIdAndDelete(id);
            logger.info(`Written test report with ID ${id} deleted successfully`);
            return sendSuccess(res, null, "Report deleted successfully!");

        } catch (error) {
            logger.error({ message: `Error deleting written test report with ID: ${req.params.id}`, error: error.message, stack: error.stack });
            throw new AppError("Error deleting Report", 500);
        }
};
