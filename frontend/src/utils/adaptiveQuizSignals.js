/**
 * Shared signals for POST /api/adaptive — matches backend difficultyMode + performance contract.
 * @see backend/services/knowledgeLevelService.js — resolveAdaptiveDifficulty
 */

export const ADAPTIVE_MODES = /** @type {const} */ (["performance", "intelligent", "blended"]);

/** @param {string | null | undefined} m */
export function normalizeDifficultyMode(m) {
    const s = (m || "").toLowerCase().trim();
    return ADAPTIVE_MODES.includes(s) ? s : null;
}

/**
 * Map score / total (same scale, e.g. marks) → performance tier for adaptive API.
 * Aligns with strong/pass style thresholds (not the result-modal badge-only bands).
 */
export function scoreToPerformance(score, total) {
    const t = Number(total);
    const s = Number(score);
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(s)) return "medium";
    const ratio = s / t;
    if (ratio >= 0.85) return "high";
    if (ratio >= 0.55) return "medium";
    return "low";
}

const SESSION_KEY = "quiznest_last_quiz_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Persist last completed attempt (any quiz) for adaptive “blended / next quiz” flows.
 * @param {{ quizId: string, score: number, total: number, performance?: "low"|"medium"|"high" }} payload
 */
export function persistLastQuizSession(payload) {
    try {
        const quizId = String(payload.quizId);
        const score = Number(payload.score);
        const total = Number(payload.total);
        const performance =
            payload.performance && ["low", "medium", "high"].includes(payload.performance)
                ? payload.performance
                : scoreToPerformance(score, total);
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                quizId,
                score,
                total,
                performance,
                updatedAt: Date.now(),
            })
        );
    } catch {
        /* ignore quota / private mode */
    }
}

/**
 * @returns {{ quizId: string, score: number, total: number, performance: string, updatedAt: number } | null}
 */
export function readLastQuizSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o?.quizId || typeof o.updatedAt !== "number") return null;
        if (Date.now() - o.updatedAt > SESSION_TTL_MS) {
            sessionStorage.removeItem(SESSION_KEY);
            return null;
        }
        const performance =
            o.performance && ["low", "medium", "high"].includes(o.performance)
                ? o.performance
                : scoreToPerformance(Number(o.score), Number(o.total));
        return {
            quizId: String(o.quizId),
            score: Number(o.score),
            total: Number(o.total),
            performance,
            updatedAt: o.updatedAt,
        };
    } catch {
        return null;
    }
}

export function clearLastQuizSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * @param {string} quizId
 * @param {{ difficultyMode?: string, performance?: string }} [opts]
 */
/**
 * Performance tier for API when user only picks “session / performance” mode — not chosen on this screen.
 * Order: URL `performance` → last finished quiz in sessionStorage → medium.
 * @param {URLSearchParams} searchParams
 */
export function getEffectiveSessionPerformance(searchParams) {
    const p = searchParams.get("performance");
    if (p && ["low", "medium", "high"].includes(p)) return p;
    const last = readLastQuizSession();
    if (last?.performance && ["low", "medium", "high"].includes(last.performance)) {
        return last.performance;
    }
    return "medium";
}

export function buildAdaptiveGeneratorPath(quizId, opts = {}) {
    const q = new URLSearchParams();
    const mode = normalizeDifficultyMode(opts.difficultyMode);
    if (mode) q.set("difficultyMode", mode);
    if (opts.performance && ["low", "medium", "high"].includes(opts.performance)) {
        q.set("performance", opts.performance);
    }
    const s = q.toString();
    return s ? `/adaptive/${quizId}?${s}` : `/adaptive/${quizId}`;
}
