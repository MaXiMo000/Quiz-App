import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeAdaptiveGenerationPlan } from "./adaptiveQuizPlan.js";

vi.mock("./adaptiveQuizSignals.js", () => ({
    normalizeDifficultyMode: (m) => {
        const s = (m || "").toLowerCase().trim();
        return ["performance", "intelligent", "blended"].includes(s) ? s : null;
    },
    readLastQuizSession: vi.fn(),
    scoreToPerformance: (s, t) => {
        const r = s / t;
        if (r >= 0.85) return "high";
        if (r >= 0.55) return "medium";
        return "low";
    },
}));

import { readLastQuizSession } from "./adaptiveQuizSignals.js";

describe("computeAdaptiveGenerationPlan", () => {
    beforeEach(() => {
        readLastQuizSession.mockReturnValue(null);
    });

    it("explicit performance uses URL performance", () => {
        const sp = new URLSearchParams("difficultyMode=performance&performance=low");
        const p = computeAdaptiveGenerationPlan({
            knowledgeProfile: { basedOnQuizzes: 5 },
            searchParams: sp,
            profileLoading: false,
            quizId: "x",
        });
        expect(p.difficultyMode).toBe("performance");
        expect(p.performance).toBe("low");
    });

    it("explicit intelligent ignores session blend", () => {
        const sp = new URLSearchParams("difficultyMode=intelligent&performance=high");
        const p = computeAdaptiveGenerationPlan({
            knowledgeProfile: { basedOnQuizzes: 3 },
            searchParams: sp,
            profileLoading: false,
            quizId: "x",
        });
        expect(p.difficultyMode).toBe("intelligent");
        expect(p.performance).toBe("medium");
        expect(p.ignoreUrlPerformance).toBe(true);
    });

    it("auto with stored session uses blended", () => {
        readLastQuizSession.mockReturnValue({
            quizId: "other",
            score: 2,
            total: 10,
            performance: "low",
            updatedAt: Date.now(),
        });
        const sp = new URLSearchParams("");
        const p = computeAdaptiveGenerationPlan({
            knowledgeProfile: { basedOnQuizzes: 2 },
            searchParams: sp,
            profileLoading: false,
            quizId: "current",
        });
        expect(p.difficultyMode).toBe("blended");
        expect(p.performance).toBe("low");
        expect(p.usedStoredSession).toBe(true);
    });

    it("auto no session and no history → intelligent", () => {
        const sp = new URLSearchParams("");
        const p = computeAdaptiveGenerationPlan({
            knowledgeProfile: { basedOnQuizzes: 0 },
            searchParams: sp,
            profileLoading: false,
            quizId: "q1",
        });
        expect(p.difficultyMode).toBe("intelligent");
        expect(p.hasSessionSignal).toBe(false);
    });
});
