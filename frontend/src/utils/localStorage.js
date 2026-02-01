/**
 * Safe localStorage utilities to prevent JSON parsing errors
 */

/**
 * Safely parse JSON from localStorage
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {any} Parsed JSON value or defaultValue
 */
export const safeParseJSON = (key, defaultValue = null) => {
    try {
        // Check if localStorage is available
        if (typeof localStorage === 'undefined' || localStorage === null) {
            return defaultValue;
        }

        const item = localStorage.getItem(key);

        // Handle all falsy and invalid cases
        if (item === null ||
            item === undefined ||
            item === 'undefined' ||
            item === 'null' ||
            item === '') {
            return defaultValue;
        }

        // Additional check: if item is not a string, return default
        if (typeof item !== 'string') {
            return defaultValue;
        }

        // Try to parse JSON
        const parsed = JSON.parse(item);
        return parsed;
    } catch (error) {
        // Silently return default value - don't spam console in production
        if (process.env.NODE_ENV === 'development') {
            console.error(`Error parsing JSON for key "${key}":`, error);
        }
        return defaultValue;
    }
};

/**
 * Safely get user from localStorage
 * @returns {object|null} User object or null
 */
export const getUserFromStorage = () => {
    return safeParseJSON("user", null);
};

/**
 * Safely set item in localStorage with JSON stringification
 * @param {string} key - The localStorage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting item "${key}" in localStorage:`, error);
        return false;
    }
};

/**
 * Safely remove item from localStorage
 * @param {string} key - The localStorage key
 * @returns {boolean} Success status
 */
export const safeRemoveItem = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing item "${key}" from localStorage:`, error);
        return false;
    }
};
