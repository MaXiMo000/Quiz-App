import {
    normalizeDifficultyMode,
    readLastQuizSession,
    scoreToPerformance,
} from "./adaptiveQuizSignals.js";

/**
 * @typedef {object} AdaptivePlan
 * @property {"performance"|"intelligent"|"blended"} difficultyMode
 * @property {"low"|"medium"|"high"} performance
 * @property {boolean} hasSessionSignal
 * @property {boolean} ignoreUrlPerformance
 * @property {"low"|"medium"|"high"|null} urlPerformanceFromLink
 * @property {string} title
 * @property {string} detail
 * @property {boolean} [explicitMode]
 * @property {boolean} [usedStoredSession]
 */

/**
 * Decide difficultyMode + performance for POST /api/adaptive.
 *
 * Priority:
 * 1. Explicit `difficultyMode` in URL (performance | intelligent | blended)
 * 2. Auto: session score from URL or sessionStorage + topic history (basedOnQuizzes)
 *
 * @param {{
 *   knowledgeProfile: object | null,
 *   searchParams: URLSearchParams,
 *   profileLoading: boolean,
 *   quizId: string | undefined,
 * }} args
 * @returns {AdaptivePlan}
 */
export function computeAdaptiveGenerationPlan({
    knowledgeProfile,
    searchParams,
    profileLoading,
    quizId,
}) {
    const perfParam = searchParams.get("performance");
    const urlPerformance =
        perfParam && ["low", "medium", "high"].includes(perfParam) ? perfParam : null;
    const explicitMode = normalizeDifficultyMode(searchParams.get("difficultyMode"));

    const n = knowledgeProfile?.basedOnQuizzes ?? 0;
    const last = readLastQuizSession();
    const sameQuizAsStored = Boolean(
        quizId && last && String(last.quizId) === String(quizId)
    );
    const storedPerf =
        last && (sameQuizAsStored || last.quizId)
            ? last.performance || scoreToPerformance(last.score, last.total)
            : null;

    const usedStoredSession = Boolean(!urlPerformance && storedPerf);

    /** Effective session signal: URL wins, else recent completed quiz (any quiz, TTL). */
    const effectivePerformance = urlPerformance ?? storedPerf ?? null;
    const hasSessionSignal = effectivePerformance != null;

    // ── Explicit URL mode (never overridden by auto rules) ───────────────
    if (explicitMode === "performance") {
        const performance = urlPerformance ?? "high";
        return {
            difficultyMode: "performance",
            performance,
            hasSessionSignal: true,
            ignoreUrlPerformance: false,
            urlPerformanceFromLink: urlPerformance,
            explicitMode: true,
            usedStoredSession,
            title: "This session only",
            detail:
                "Difficulty follows only your latest session result — long-term history is not used.",
        };
    }

    if (explicitMode === "intelligent") {
        return {
            difficultyMode: "intelligent",
            performance: "medium",
            hasSessionSignal: false,
            ignoreUrlPerformance: true,
            urlPerformanceFromLink: urlPerformance,
            explicitMode: true,
            usedStoredSession,
            title: "Smart focus (full profile)",
            detail:
                "Uses your topic history, level, preferences, and cold-start signals.",
        };
    }

    if (explicitMode === "blended") {
        const performance = effectivePerformance ?? "medium";
        return {
            difficultyMode: "blended",
            performance,
            hasSessionSignal: hasSessionSignal,
            ignoreUrlPerformance: false,
            urlPerformanceFromLink: urlPerformance,
            explicitMode: true,
            usedStoredSession,
            title: "Blended",
            detail: hasSessionSignal
                ? `Mixing your profile with your latest quiz result (${performance})${
                      usedStoredSession ? " — saved on this device" : ""
                  }.`
                : "Mixing your profile with a neutral session baseline",
        };
    }

    // ── Auto (no difficultyMode in URL) ─────────────────────────────────
    if (profileLoading) {
        return {
            difficultyMode: hasSessionSignal ? "blended" : "intelligent",
            performance: effectivePerformance ?? "medium",
            hasSessionSignal,
            ignoreUrlPerformance: false,
            urlPerformanceFromLink: null,
            title: "Resolving…",
            detail: "Loading your profile…",
        };
    }

    if (!hasSessionSignal) {
        if (n === 0) {
            return {
                difficultyMode: "intelligent",
                performance: "medium",
                hasSessionSignal: false,
                ignoreUrlPerformance: false,
                urlPerformanceFromLink: null,
                title: "Your profile & level",
                detail:
                    "No recent quiz score in this browser session — we use preferences and account level (and topic history when you have it).",
            };
        }
        return {
            difficultyMode: "intelligent",
            performance: "medium",
            hasSessionSignal: false,
            ignoreUrlPerformance: false,
            urlPerformanceFromLink: null,
            title: "Your history in this topic",
            detail: `Using ${n} past result(s) in this topic and your account preferences.`,
        };
    }

    // Has session signal (URL or stored): default to blended so profile + “just now” both count
    return {
        difficultyMode: "blended",
        performance: effectivePerformance,
        hasSessionSignal: true,
        ignoreUrlPerformance: false,
        urlPerformanceFromLink: urlPerformance,
        usedStoredSession,
        title: "Smart + your latest session",
        detail:
            (usedStoredSession
                ? `Blending your profile with your last completed quiz (${effectivePerformance}).`
                : `Blending your profile with this session’s result (${effectivePerformance}).`) +
            (n > 0
                ? ` ${n} past result(s) in this topic are in the mix.`
                : " Limited topic history — May weight your level and preferences more."),
    };
}
