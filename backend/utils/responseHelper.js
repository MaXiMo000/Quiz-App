/**
 * ✨ Standardized API Response Helper ✨
 * Provides consistent response formats across all endpoints
 */

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
    const response = {
        status: "success",
        statusCode,
        message,
        ...(data !== null && { data })
    };

    return res.status(statusCode).json(response);
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Additional error details (optional)
 */
export const sendError = (res, message = "Internal Server Error", statusCode = 500, errors = null) => {
    const response = {
        status: "error",
        statusCode,
        message,
        ...(errors && { errors })
    };

    return res.status(statusCode).json(response);
};

/**
 * Validation Error Response
 * @param {Object} res - Express response object
 * @param {Object|Array} errors - Validation errors
 * @param {string} message - Error message (default: "Validation failed")
 */
export const sendValidationError = (res, errors, message = "Validation failed") => {
    return sendError(res, message, 400, errors);
};

/**
 * Not Found Response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., "User", "Quiz")
 */
export const sendNotFound = (res, resource = "Resource") => {
    return sendError(res, `${resource} not found`, 404);
};

/**
 * Unauthorized Response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: "Unauthorized")
 */
export const sendUnauthorized = (res, message = "Unauthorized. Please authenticate.") => {
    return sendError(res, message, 401);
};

/**
 * Forbidden Response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: "Forbidden")
 */
export const sendForbidden = (res, message = "You don't have permission to perform this action.") => {
    return sendError(res, message, 403);
};

/**
 * Paginated Response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total, totalPages }
 * @param {string} message - Success message
 */
export const sendPaginated = (res, data, pagination, message = "Success") => {
    const response = {
        status: "success",
        statusCode: 200,
        message,
        data,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || Math.ceil((pagination.total || 0) / (pagination.limit || 10))
        }
    };

    return res.status(200).json(response);
};

/**
 * Created Response
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message (default: "Resource created successfully")
 */
export const sendCreated = (res, data, message = "Resource created successfully") => {
    return sendSuccess(res, data, message, 201);
};

/**
 * No Content Response
 * @param {Object} res - Express response object
 */
export const sendNoContent = (res) => {
    return res.status(204).send();
};
