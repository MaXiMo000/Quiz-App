import Joi from 'joi';
import AppError from '../utils/AppError.js';

/**
 * A middleware factory for validating request bodies against a Joi schema.
 * @param {Joi.Schema} schema - The Joi schema to validate against.
 * @returns {function} Express middleware.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false, // Return all errors
    stripUnknown: true, // Remove unknown fields
  });

  if (error) {
    // Map all validation errors to a single message string
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new AppError(errorMessage, 400));
  }

  next();
};

export default validate;
