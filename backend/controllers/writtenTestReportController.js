import WrittenTestReport from "../models/WrittenTestReport.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

const _getWrittenTestReports = async (req, res) => {
    logger.info('Fetching all written test reports', { 
        context: 'WrittenTestReportController', 
        operation: 'Get Written Test Reports',
        userId: req.user?.id,
        role: req.user?.role 
    });
    
    const reports = await WrittenTestReport.find();
    
    logger.info('Successfully fetched written test reports', { 
        context: 'WrittenTestReportController', 
        operation: 'Get Written Test Reports',
        count: reports.length,
        userId: req.user?.id 
    });
    
    res.json(reports);
};

export const getWrittenTestReports = withCachingAndLogging(_getWrittenTestReports, {
    ...controllerConfigs.report,
    operation: 'Get Written Test Reports',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: cacheKeyGenerators.roleBased
});

const _createWrittenTestReport = async (req, res) => {
    const { username, testName, score, total, questions } = req.body;

    logger.info('Creating written test report', { 
        context: 'WrittenTestReportController', 
        operation: 'Create Written Test Report',
        username,
        testName,
        score,
        total,
        questionsCount: questions?.length,
        userId: req.user?.id 
    });

    if (!username || !testName || !questions || questions.length === 0) {
        logger.warn('Missing required fields for written test report', { 
            context: 'WrittenTestReportController', 
            operation: 'Create Written Test Report',
            username,
            testName,
            hasQuestions: !!questions,
            questionsCount: questions?.length,
            userId: req.user?.id 
        });
        return res.status(400).json({ message: "Missing required fields" });
    }

    const report = new WrittenTestReport({ username, testName, score, total, questions });
    await report.save();

    logger.info('Written test report created successfully', { 
        context: 'WrittenTestReportController', 
        operation: 'Create Written Test Report',
        reportId: report._id,
        username,
        testName,
        score,
        total,
        userId: req.user?.id 
    });

    res.status(201).json({ message: "Written test report saved successfully", report });
};

export const createWrittenTestReport = withCachingAndLogging(_createWrittenTestReport, {
    ...controllerConfigs.report,
    operation: 'Create Written Test Report',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.username', 'body.testName', 'body.score']
});

const _getWrittenTestReportsUser = async (req, res) => {
    const username = req.query.username;
    
    logger.info('Fetching user written test reports', { 
        context: 'WrittenTestReportController', 
        operation: 'Get User Written Test Reports',
        queryUsername: username,
        userId: req.user?.id 
    });
    
    const reports = await WrittenTestReport.find(username ? { username } : {}).lean();
    
    logger.info('Successfully fetched user written test reports', { 
        context: 'WrittenTestReportController', 
        operation: 'Get User Written Test Reports',
        queryUsername: username,
        count: reports.length,
        userId: req.user?.id 
    });
    
    res.json(reports);
};

export const getWrittenTestReportsUser = withCachingAndLogging(_getWrittenTestReportsUser, {
    ...controllerConfigs.report,
    operation: 'Get User Written Test Reports',
    cacheTTL: 180, // 3 minutes
    cacheKeyGenerator: (req) => `written-test-reports:user:${req.query.username || 'all'}`
});

const _getWrittenReportsUserID = async (req, res) => {
    const { id } = req.params; // Get ID from URL params
    
    logger.info('Fetching written test report by ID', { 
        context: 'WrittenTestReportController', 
        operation: 'Get Written Test Report by ID',
        reportId: id,
        userId: req.user?.id 
    });
    
    const report = await WrittenTestReport.findById(id);

    if (!report) {
        logger.warn('Written test report not found', { 
            context: 'WrittenTestReportController', 
            operation: 'Get Written Test Report by ID',
            reportId: id,
            userId: req.user?.id 
        });
        return res.status(404).json({ message: "Report not found" });
    }

    logger.info('Successfully fetched written test report by ID', { 
        context: 'WrittenTestReportController', 
        operation: 'Get Written Test Report by ID',
        reportId: id,
        username: report.username,
        testName: report.testName,
        userId: req.user?.id 
    });

    res.json(report);
};

export const getWrittenReportsUserID = withCachingAndLogging(_getWrittenReportsUserID, {
    ...controllerConfigs.report,
    operation: 'Get Written Test Report by ID',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `written-test-report:id:${req.params.id}`
});

const _deleteWrittenTestReport = async (req, res) => {
    const { id } = req.params;

    logger.info('Deleting written test report', { 
        context: 'WrittenTestReportController', 
        operation: 'Delete Written Test Report',
        reportId: id,
        userId: req.user?.id 
    });

    if (!id) {
        logger.warn('Report ID is required for deletion', { 
            context: 'WrittenTestReportController', 
            operation: 'Delete Written Test Report',
            userId: req.user?.id 
        });
        return res.status(400).json({ message: "Report ID is required" });
    }

    const reportItem = await WrittenTestReport.findById(id);

    if (!reportItem) {
        logger.warn('Written test report not found for deletion', { 
            context: 'WrittenTestReportController', 
            operation: 'Delete Written Test Report',
            reportId: id,
            userId: req.user?.id 
        });
        return res.status(404).json({ message: "Report not found" });
    }

    await WrittenTestReport.findByIdAndDelete(id);
    
    logger.info('Written test report deleted successfully', { 
        context: 'WrittenTestReportController', 
        operation: 'Delete Written Test Report',
        reportId: id,
        username: reportItem.username,
        testName: reportItem.testName,
        userId: req.user?.id 
    });
    
    return res.status(200).json({ message: "Report deleted successfully!" });
};

export const deleteWrittenTestReport = withCachingAndLogging(_deleteWrittenTestReport, {
    ...controllerConfigs.report,
    operation: 'Delete Written Test Report',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['params.id']
});