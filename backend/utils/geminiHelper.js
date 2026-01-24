import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "./logger.js";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Model priority: gemini-2.5-pro first, then fallback to higher quota models
// Strategy: Try premium model first, fallback to high-quota models if quota exceeded
const MODEL_PRIORITY = [
    // Main model: Premium quality (tries first)
    "gemini-2.5-pro",         // 150 RPM, 2M TPM, 10K RPD - Premium model (MAIN)

    // Fallback Tier 1: Highest quota models (if premium quota exceeded)
    "gemini-2.5-flash-lite",  // 4K RPM, 4M TPM, Unlimited RPD - BEST fallback
    "gemini-2.0-flash-lite",  // 4K RPM, 4M TPM, Unlimited RPD - BEST fallback
    "gemini-2.0-flash",       // 2K RPM, 4M TPM, Unlimited RPD - Good fallback

    // Fallback Tier 2: Good quota models
    "gemini-2.5-flash",       // 1K RPM, 1M TPM, 10K RPD - Balanced
    "gemini-3-flash",         // 1K RPM, 1M TPM, 10K RPD - Latest flash

    // Fallback Tier 3: Other premium models
    "gemini-3-pro",           // 25 RPM, 1M TPM, 250 RPD - Latest premium

    // Fallback Tier 4: Legacy/fallback models
    "gemini-1.5-pro",         // Previous premium model
    "gemini-1.5-flash",       // Previous fast model
    "gemini-pro",             // Legacy model
    "gemini-1.0-pro"          // Legacy model
];

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a rate limit/quota error
 */
const isRateLimitError = (error) => {
    if (!error) return false;
    const errorMessage = error.message || error.toString();
    return errorMessage.includes("429") ||
           errorMessage.includes("quota") ||
           errorMessage.includes("rate limit") ||
           errorMessage.includes("Too Many Requests");
};

/**
 * Extract retry delay from error message if available
 */
const extractRetryDelay = (error) => {
    if (!error) return null;
    const errorMessage = error.message || error.toString();
    const match = errorMessage.match(/retry.*?(\d+(?:\.\d+)?)\s*s/i);
    if (match) {
        return Math.ceil(parseFloat(match[1]) * 1000); // Convert to milliseconds
    }
    return null;
};

/**
 * Generate content from Gemini API with retry logic and fallback models
 * @param {string} prompt - The prompt to send to the model
 * @param {Object} options - Configuration options
 * @param {string} options.preferredModel - Preferred model name (default: gemini-2.5-pro)
 * @param {number} options.maxRetries - Maximum number of retries per model (default: 2 for faster fallback)
 * @param {number} options.baseDelay - Base delay in ms for exponential backoff (default: 1000)
 * @returns {Promise<string>} The generated text response
 */
export const generateFromGemini = async (prompt, options = {}) => {
    if (!genAI) {
        // In test environment, return mock response
        if (process.env.NODE_ENV === "test") {
            return JSON.stringify({
                questions: [
                    {
                        question: "What is JavaScript?",
                        options: ["A programming language", "A database", "A framework", "An operating system"],
                        correctAnswer: "A",
                        difficulty: "medium",
                        category: "Programming"
                    }
                ]
            });
        }
        throw new Error("Gemini AI not initialized - API key missing");
    }

    const {
        preferredModel = "gemini-2.5-pro", // Default to premium model (will fallback if quota exceeded)
        maxRetries = 2, // Reduced to 2 retries for faster fallback when quota exceeded
        baseDelay = 1000
    } = options;

    // Determine which models to try (preferred first, then fallbacks)
    const modelsToTry = [];
    const preferredIndex = MODEL_PRIORITY.indexOf(preferredModel);
    if (preferredIndex >= 0) {
        modelsToTry.push(...MODEL_PRIORITY.slice(preferredIndex));
    } else {
        modelsToTry.push(preferredModel, ...MODEL_PRIORITY);
    }

    let lastError = null;

    // PERFORMANCE: Direct model usage - NO model checking/testing here!
    // This function directly uses models without any pre-checking phase.
    // Model checker (checkGeminiModels.js) is a separate utility script only.
    // Try each model in priority order
    for (const modelName of modelsToTry) {
        // SECURITY: Only log model name, never log prompt or response content
        logger.info(`Attempting to generate content with model: ${modelName}`);

        // Retry logic for current model
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Direct API call - no testing/checking, just use the model
                const model = genAI.getGenerativeModel({ model: modelName });

                // SECURITY: Ensure prompt doesn't contain sensitive data
                // Prompt is already sanitized by calling functions
                const result = await model.generateContent({
                    contents: [{ parts: [{ text: prompt }] }]
                });

                const responseText = result.response.text();

                // SECURITY: Only log model name, never log actual content
                if (modelName !== preferredModel) {
                    logger.info(`Successfully generated content using fallback model: ${modelName}`);
                }

                return responseText;

            } catch (error) {
                lastError = error;

                // Check if it's a rate limit error
                if (isRateLimitError(error)) {
                    // PERFORMANCE: Cap retry delay to max 5 seconds for faster fallback
                    const extractedDelay = extractRetryDelay(error);
                    const calculatedDelay = baseDelay * Math.pow(2, attempt);

                    // PERFORMANCE: If delay is too long (>10s), skip to next model immediately
                    // Don't waste time retrying if we know quota is exceeded
                    if (extractedDelay && extractedDelay > 10000) {
                        logger.warn(`Rate limit exceeded for model ${modelName} - delay too long (${Math.ceil(extractedDelay/1000)}s). Skipping to next model immediately...`);
                        break; // Skip to next model immediately
                    }

                    // Calculate retry delay (capped at 5 seconds max)
                    const retryDelay = Math.min(
                        extractedDelay || calculatedDelay,
                        5000 // Max 5 seconds - fallback faster instead of waiting long
                    );

                    // If this is the last attempt on this model, try next model
                    if (attempt === maxRetries - 1) {
                        logger.warn(`Rate limit exceeded for model ${modelName} after ${maxRetries} attempts. Trying next model...`);
                        break; // Break inner loop, continue to next model
                    }

                    logger.warn(`Rate limit error on attempt ${attempt + 1}/${maxRetries} for model ${modelName}. Retrying in ${retryDelay}ms...`);
                    await sleep(retryDelay);
                    continue; // Retry with same model
                }

                // For non-rate-limit errors, throw immediately
                // SECURITY: Only log error message, never log full error object (may contain sensitive data)
                const errorMessage = error.message || error.toString();
                logger.error(`Error generating content with model ${modelName}: ${errorMessage.substring(0, 200)}`);
                throw error;
            }
        }
    }

    // If we've exhausted all models and retries, throw the last error
    if (lastError) {
        if (isRateLimitError(lastError)) {
            const retryDelay = extractRetryDelay(lastError);
            const errorMessage = retryDelay
                ? `API quota exceeded. Please retry after ${Math.ceil(retryDelay / 1000)} seconds.`
                : "API quota exceeded. Please try again later or check your Google AI Studio quota limits.";

            logger.error(`All models exhausted due to rate limits. ${errorMessage}`);
            throw new Error(errorMessage);
        }
        throw lastError;
    }

    throw new Error("Failed to generate content: Unknown error");
};

/**
 * Generate content with a specific model (for backward compatibility)
 * @deprecated Use generateFromGemini with options.preferredModel instead
 */
export const generateFromGeminiWithModel = async (prompt, modelName = "gemini-2.5-pro") => {
    return generateFromGemini(prompt, { preferredModel: modelName });
};
