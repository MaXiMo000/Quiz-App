import Joi from 'joi';

// Schema for user registration
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.base': `"name" should be a type of 'text'`,
    'string.empty': `"name" cannot be an empty field`,
    'string.min': `"name" should have a minimum length of {#limit}`,
    'any.required': `"name" is a required field`
  }),
  email: Joi.string().email().required().messages({
    'string.email': `"email" must be a valid email`,
    'any.required': `"email" is a required field`
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is a required field'
    }),
});

// Schema for user login
export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

// Schema for updating user role
export const updateUserRoleSchema = Joi.object({
    userId: Joi.string().hex().length(24).required(), // Mongoose ObjectId
    role: Joi.string().valid('user', 'premium', 'admin').required(),
});

// Schema for updating user theme
export const updateUserThemeSchema = Joi.object({
    theme: Joi.string().min(2).max(30).required(),
});
