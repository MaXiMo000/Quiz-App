/**
 * Utility functions for tracking quiz viewing history
 */

const STORAGE_KEY = 'quizHistory';
const MAX_HISTORY_ITEMS = 20; // Keep last 20 viewed quizzes

/**
 * Add a quiz to viewing history
 * @param {Object} quiz - Quiz object with at least _id, title, category
 */
export const addToQuizHistory = (quiz) => {
    try {
        const history = getQuizHistory();

        // Remove if already exists (to move to top)
        const filteredHistory = history.filter(item => item.quizId !== quiz._id);

        // Add to beginning
        const newHistory = [
            {
                quizId: quiz._id,
                title: quiz.title,
                category: quiz.category,
                viewedAt: new Date().toISOString(),
                duration: quiz.duration,
                questionsCount: quiz.questions?.length || 0
            },
            ...filteredHistory
        ].slice(0, MAX_HISTORY_ITEMS); // Keep only last 20

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        return newHistory;
    } catch (error) {
        console.error('Error adding to quiz history:', error);
        return [];
    }
};

/**
 * Get quiz viewing history
 * @returns {Array} Array of quiz history items
 */
export const getQuizHistory = () => {
    try {
        const history = localStorage.getItem(STORAGE_KEY);
        if (!history) return [];

        const parsed = JSON.parse(history);
        // Filter out items older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return parsed.filter(item => {
            const viewedDate = new Date(item.viewedAt);
            return viewedDate > thirtyDaysAgo;
        });
    } catch (error) {
        console.error('Error getting quiz history:', error);
        return [];
    }
};

/**
 * Clear quiz history
 */
export const clearQuizHistory = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing quiz history:', error);
        return false;
    }
};

/**
 * Remove a specific quiz from history
 * @param {string} quizId - Quiz ID to remove
 */
export const removeFromQuizHistory = (quizId) => {
    try {
        const history = getQuizHistory();
        const filtered = history.filter(item => item.quizId !== quizId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
    } catch (error) {
        console.error('Error removing from quiz history:', error);
        return [];
    }
};

/**
 * Get recently viewed quizzes (last N items)
 * @param {number} limit - Number of items to return (default: 6)
 * @returns {Array} Array of recent quiz history items
 */
export const getRecentQuizzes = (limit = 6) => {
    const history = getQuizHistory();
    return history.slice(0, limit);
};
