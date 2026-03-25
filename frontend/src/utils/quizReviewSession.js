/** Session payload for Quiz wrong-answer deep-dive page */
export const QUIZ_REVIEW_SESSION_KEY = "quiznest_quiz_review_v1";

/**
 * @param {object} payload
 * @param {string} payload.quizId
 * @param {string} payload.quizTitle
 * @param {string} [payload.category]
 * @param {number} payload.score
 * @param {number} payload.total
 * @param {Array<object>} payload.questions - detailed question rows from TakeQuiz
 */
export function saveQuizReviewSession(payload) {
    try {
        sessionStorage.setItem(QUIZ_REVIEW_SESSION_KEY, JSON.stringify({
            ...payload,
            savedAt: new Date().toISOString()
        }));
        return true;
    } catch (e) {
        console.error("saveQuizReviewSession failed", e);
        return false;
    }
}

export function loadQuizReviewSession() {
    try {
        const raw = sessionStorage.getItem(QUIZ_REVIEW_SESSION_KEY);
        if (!raw || raw === "undefined") return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearQuizReviewSession() {
    try {
        sessionStorage.removeItem(QUIZ_REVIEW_SESSION_KEY);
    } catch {
        /* ignore */
    }
}
