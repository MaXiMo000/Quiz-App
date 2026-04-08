/** Set before navigating to `/user/test/:id` so TakeQuiz can prompt for fullscreen (needs a fresh user gesture on that page). */
export const QUIZ_FULLSCREEN_SESSION_KEY = "quizNest_beginFullscreen";

export function markQuizFullscreenOnLoad() {
    try {
        sessionStorage.setItem(QUIZ_FULLSCREEN_SESSION_KEY, "1");
    } catch {
        /* private mode / quota */
    }
}

export function consumeQuizFullscreenFlag() {
    try {
        if (sessionStorage.getItem(QUIZ_FULLSCREEN_SESSION_KEY) === "1") {
            sessionStorage.removeItem(QUIZ_FULLSCREEN_SESSION_KEY);
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}
