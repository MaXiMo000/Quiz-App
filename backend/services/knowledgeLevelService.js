/**
 * Derives recommended question difficulty from past quiz reports, level, prefs, and weak cross-topic signals.
 * Used by adaptive / intelligent quiz generation.
 *
 * **Algorithm overview (confidence, modes, blending):** see `docs/ADAPTIVE_DIFFICULTY_AND_CONFIDENCE.md`.
 */
import mongoose from "mongoose";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Quiz from "../models/Quiz.js";
import logger from "../utils/logger.js";
import { SCORE_THRESHOLDS, DIFFICULTY_CONFIG } from "./aiQuestionGenerator.js";
import {
    resolveQuizCategoryKey,
    getReportCategoryKey,
    normalizeCategoryKey,
    topicKeysAlign,
} from "../utils/categoryKey.js";

export {
    normalizeCategoryKey,
    resolveQuizCategoryKey,
    getReportCategoryKey,
    extractCategoryFromQuizName,
    topicKeysAlign,
} from "../utils/categoryKey.js";

/** @deprecated Use resolveQuizCategoryKey / normalizeCategoryKey */
export function resolveQuizIntelligenceCategory(quiz) {
    return resolveQuizCategoryKey(quiz);
}

// ─── Related topic groups (substring match on normalized keys) ─────────────
const RELATED_TOPIC_GROUPS = [
    ["mathematics", "math", "algebra", "calculus", "statistics", "geometry", "trigonometry"],
    ["programming", "program", "coding", "javascript", "python", "java", "software", "developer", "typescript", "react", "node"],
    ["science", "physics", "chemistry", "biology"],
    ["history", "historical"],
    ["literature", "english", "language", "writing", "grammar"],
    ["geography", "geo"],
    ["sport", "sports", "football", "basketball", "soccer", "athletic"],
];

/**
 * @param {string} categoryKey
 * @returns {string[] | null} group row or null
 */
function topicGroupForKey(categoryKey) {
    const k = (categoryKey || "").toLowerCase();
    if (!k || k === "general") return null;
    for (const group of RELATED_TOPIC_GROUPS) {
        if (group.some((token) => k.includes(token) || token.includes(k))) {
            return group;
        }
    }
    return null;
}

/**
 * Same cognitive “neighbourhood”, different specific topic (for cross-pollination).
 */
export function sharesRelatedTopicGroup(reportKey, topicKey) {
    const gR = topicGroupForKey(reportKey);
    const gT = topicGroupForKey(topicKey);
    return gR != null && gR === gT;
}

/**
 * Filter in-memory report pool for cross-topic neighbours (same RELATED group, not same topic).
 * @param {object[]} pool recent reports (newest first)
 * @param {string} topicKey
 */
export function filterRelatedReportsFromPool(pool, topicKey) {
    const key = (topicKey || "general").toLowerCase();
    if (!key || key === "general" || !Array.isArray(pool)) return [];

    const out = [];
    for (const r of pool) {
        if (out.length >= 5) break;
        const rk = getReportCategoryKey(r);
        if (rk === key || topicKeysAlign(rk, key)) continue;
        if (!sharesRelatedTopicGroup(rk, key)) continue;
        out.push(r);
    }
    return out;
}

/** @deprecated Use {@link filterRelatedReportsFromPool} or {@link getRelatedReports} */
export function getRelatedReportsFromPool(allReports, topicKey) {
    return filterRelatedReportsFromPool(allReports, topicKey);
}

/**
 * Related-topic reports: uses `pool` if provided, otherwise loads recent rows for `userName`.
 * @param {string} userName
 * @param {string} categoryKey
 * @param {object[] | null} [pool] pre-fetched reports (e.g. same query as allReports)
 */
export async function getRelatedReports(userName, categoryKey, pool = null) {
    const source =
        pool != null
            ? pool
            : await Report.find({ username: userName }).sort({ createdAt: -1 }).limit(25).lean();
    return filterRelatedReportsFromPool(source, categoryKey);
}

/**
 * UI / API contract for recommendation strength (thresholds live here only).
 * @param {number} confidence 0–1
 * @returns {"high" | "medium" | "low"}
 */
export function confidenceTier(confidence) {
    const c = Number(confidence);
    if (!Number.isFinite(c)) return "low";
    if (c >= 0.75) return "high";
    if (c >= 0.45) return "medium";
    return "low";
}

/**
 * Map XP level → 0–1 skill prior for cold / sparse blending.
 */
export function levelToSkillPrior(level = 1) {
    const lv = Number(level) || 1;
    if (lv >= 20) return 0.92;
    if (lv >= 15) return 0.82;
    if (lv >= 10) return 0.72;
    if (lv >= 7) return 0.62;
    if (lv >= 4) return 0.52;
    if (lv >= 2) return 0.42;
    return 0.32;
}

/**
 * Penalise scores slightly when the user took far longer than expected.
 * expectedSeconds = questions × 2 min × difficulty multiplier
 */
export function timeAdjustedScore(rawRatio, timeSpent, totalQuestions, difficulty = "medium") {
    if (!timeSpent || !totalQuestions) return rawRatio;
    const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    const expectedSeconds = totalQuestions * 120 * cfg.timeMultiplier;
    if (timeSpent <= expectedSeconds) return rawRatio;
    const overRatio = (timeSpent - expectedSeconds) / expectedSeconds;
    const penalty = Math.min(0.1, overRatio * 0.05);
    return Math.max(0, rawRatio - penalty);
}

function answersMatch(userAnswer, correctAnswer) {
    const u = String(userAnswer ?? "")
        .trim()
        .toLowerCase();
    const c = String(correctAnswer ?? "")
        .trim()
        .toLowerCase();
    return u === c && u.length > 0;
}

/** Wrong-answer penalty by item difficulty (easy wrong = strongest negative signal). */
const WRONG_PENALTY = { easy: 0.03, medium: 0.018, hard: 0.01 };

function perQuestionDifficulty(q, reportFallback = "medium") {
    const d = q?.difficulty;
    if (d === "easy" || d === "medium" || d === "hard") return d;
    return reportFallback && DIFFICULTY_CONFIG[reportFallback] ? reportFallback : "medium";
}

/**
 * Per-question timing adjustment from Report.questions[].
 * Uses per-question `difficulty` when set; wrong-on-easy penalised more than wrong-on-hard.
 * @returns {number} delta in about [-0.08, 0.05]
 */
export function analyseQuestionTiming(reportQuestions, difficulty = "medium") {
    if (!reportQuestions?.length) return 0;
    const reportDiff = difficulty && DIFFICULTY_CONFIG[difficulty] ? difficulty : "medium";

    let adjustment = 0;
    let counted = 0;

    for (const q of reportQuestions) {
        if (typeof q.answerTime !== "number" || !Number.isFinite(q.answerTime)) continue;
        const isCorrect = answersMatch(q.userAnswer, q.correctAnswer);
        const qDiff = perQuestionDifficulty(q, reportDiff);
        const cfgQ = DIFFICULTY_CONFIG[qDiff] || DIFFICULTY_CONFIG.medium;
        const expectedPerQ = 120 * cfgQ.timeMultiplier;
        const ratio = q.answerTime / expectedPerQ;

        if (isCorrect) {
            if (ratio > 2.5) adjustment -= 0.008;
        } else {
            const base = WRONG_PENALTY[qDiff] ?? 0.018;
            if (ratio < 0.3) adjustment -= base * 1.15;
            else adjustment -= base;
        }
        counted++;
    }

    return counted > 0 ? Math.max(-0.08, Math.min(0.05, adjustment)) : 0;
}

/**
 * @param {{ score: number, total: number, timeSpent?: number, difficulty?: string, questions?: unknown[] }} report
 */
export function enrichedScore(report) {
    if (!report?.total) return 0;
    const diff = report.difficulty && DIFFICULTY_CONFIG[report.difficulty] ? report.difficulty : "medium";
    const raw = report.score / report.total;
    const timeAdj = timeAdjustedScore(raw, report.timeSpent, report.total, diff);
    const timingAdj = analyseQuestionTiming(report.questions, diff);
    return Math.max(0, Math.min(1, timeAdj + timingAdj));
}

function scoreToDifficulty(weightedAvg, confidence, preferredDifficulty = "medium") {
    const pref = ["easy", "medium", "hard"].includes(preferredDifficulty) ? preferredDifficulty : "medium";
    let recommendedDifficulty;
    if (weightedAvg >= SCORE_THRESHOLDS.strongPass) {
        recommendedDifficulty = "hard";
    } else if (weightedAvg >= SCORE_THRESHOLDS.pass) {
        recommendedDifficulty = "medium";
    } else if (weightedAvg >= SCORE_THRESHOLDS.weak) {
        recommendedDifficulty = pref === "hard" ? "medium" : "easy";
    } else {
        recommendedDifficulty = "easy";
    }
    const conf = Math.round(confidence * 100) / 100;
    return {
        recommendedDifficulty,
        confidence: conf,
        confidenceTier: confidenceTier(conf),
        averageAdjustedScore: Math.round(weightedAvg * 100),
    };
}

/**
 * Prior from quizzes the user authored — only quizzes with real attempts and enough question mass.
 * @param {import("mongoose").Types.ObjectId | string | null | undefined} userId
 * @returns {Promise<{ score: number, totalQuestions: number, attemptedQuizzes: number } | null>}
 */
export async function difficultyPriorFromAuthoredQuizzes(userId) {
    if (userId == null || !mongoose.Types.ObjectId.isValid(userId)) return null;
    const uid = new mongoose.Types.ObjectId(userId);
    const quizzes = await Quiz.find({ "createdBy._id": uid })
        .select("difficultyDistribution totalAttempts")
        .limit(120)
        .lean();
    if (!quizzes.length) return null;

    const attempted = quizzes.filter((q) => (q.totalAttempts ?? 0) > 0);
    if (attempted.length === 0) return null;

    const dist = { easy: 0, medium: 0, hard: 0 };
    for (const q of attempted) {
        const d = q.difficultyDistribution || {};
        dist.easy += d.easy || 0;
        dist.medium += d.medium || 0;
        dist.hard += d.hard || 0;
    }
    const total = dist.easy + dist.medium + dist.hard;
    if (total < 10) return null;

    const score = (dist.easy * 0.35 + dist.medium * 0.55 + dist.hard * 0.8) / total;
    return {
        score,
        totalQuestions: total,
        attemptedQuizzes: attempted.length,
    };
}

/**
 * Cascading recommendation: rich same-topic → sparse + related + level → global → cold start.
 *
 * @param {Array<{ score: number, total: number, timeSpent?: number, difficulty?: string, questions?: unknown[] }>} categoryReports
 * @param {string} [preferredDifficulty]
 * @param {{
 *   userLevel?: number,
 *   allReports?: object[],
 *   relatedReports?: object[],
 *   authoredDifficultyPrior?: number | null,
 * }} [ctx]
 */
export function computeRecommendedDifficultyFromReports(
    categoryReports,
    preferredDifficulty = "medium",
    ctx = {}
) {
    const pref = ["easy", "medium", "hard"].includes(preferredDifficulty) ? preferredDifficulty : "medium";
    const {
        userLevel = 1,
        allReports = [],
        relatedReports = [],
        authoredDifficultyPrior = null,
    } = ctx;

    const coldStartScore = () => {
        const levelPrior = levelToSkillPrior(userLevel);
        const preferredRank = { easy: 0.35, medium: 0.55, hard: 0.8 };
        const prefScore = preferredRank[pref] ?? 0.55;
        let coldScore = levelPrior * 0.7 + prefScore * 0.3;
        if (authoredDifficultyPrior != null && Number.isFinite(authoredDifficultyPrior)) {
            coldScore = levelPrior * 0.55 + prefScore * 0.25 + authoredDifficultyPrior * 0.2;
        }
        return {
            ...scoreToDifficulty(coldScore, 0.2, pref),
            basedOnQuizzes: 0,
            dataSource: "cold_start",
        };
    };

    // ── 1. Rich: 3+ same-topic reports (recency-weighted) ─────────────────
    if (categoryReports.length >= 3) {
        const n = categoryReports.length;
        let weightedSum = 0;
        let totalWeight = 0;
        categoryReports.forEach((r, i) => {
            const weight = n - i;
            weightedSum += enrichedScore(r) * weight;
            totalWeight += weight;
        });
        const avg = weightedSum / totalWeight;
        const confidence = Math.min(0.95, 0.7 + (Math.min(categoryReports.length, 10) - 3) * 0.025);
        const tiered = scoreToDifficulty(avg, confidence, pref);
        return {
            ...tiered,
            basedOnQuizzes: categoryReports.length,
            dataSource: "category",
        };
    }

    // ── 2. Sparse: 1–2 same-topic (explicit weights sum to 1) ────────────
    if (categoryReports.length > 0) {
        const categoryAvg =
            categoryReports.reduce((s, r) => s + enrichedScore(r), 0) / categoryReports.length;
        const levelPrior = levelToSkillPrior(userLevel);

        const catWeight = 0.6;
        const relatedWeight = relatedReports.length > 0 ? 0.2 : 0;
        const levelWeight = 1 - catWeight - relatedWeight;

        const relatedAvg =
            relatedReports.length > 0
                ? relatedReports.reduce((s, r) => s + enrichedScore(r), 0) / relatedReports.length
                : 0;

        const blendedAvg =
            categoryAvg * catWeight + relatedAvg * relatedWeight + levelPrior * levelWeight;

        const confidence = Math.min(
            0.72,
            0.48 + (relatedReports.length > 0 ? 0.1 : 0) + categoryReports.length * 0.04
        );
        const tiered = scoreToDifficulty(blendedAvg, confidence, pref);
        return {
            ...tiered,
            basedOnQuizzes: categoryReports.length,
            dataSource: relatedReports.length > 0 ? "sparse_related_level" : "sparse_level",
        };
    }

    // ── 3. No same-topic rows: global history + level ─────────────────────
    if (allReports.length >= 3) {
        const globalAvg = allReports.reduce((s, r) => s + enrichedScore(r), 0) / allReports.length;
        const levelPrior = levelToSkillPrior(userLevel);
        const blended = globalAvg * 0.62 + levelPrior * 0.38;
        const confidence = 0.38 + Math.min(0.18, allReports.length * 0.012);
        const tiered = scoreToDifficulty(blended, confidence, pref);
        return {
            ...tiered,
            basedOnQuizzes: 0,
            dataSource: "global_level",
        };
    }

    if (allReports.length > 0) {
        const globalAvg = allReports.reduce((s, r) => s + enrichedScore(r), 0) / allReports.length;
        const levelPrior = levelToSkillPrior(userLevel);
        const blended = globalAvg * 0.42 + levelPrior * 0.58;
        const tiered = scoreToDifficulty(blended, 0.36, pref);
        return {
            ...tiered,
            basedOnQuizzes: 0,
            dataSource: "few_global_level",
        };
    }

    return coldStartScore();
}

/**
 * Quizzes that share the same `category` string (case-insensitive) as `quiz`, plus this quiz’s id/title.
 */
async function getSameTopicSiblingSets(quiz) {
    const categoryKey = resolveQuizCategoryKey(quiz);
    const idSet = new Set();
    const titleKeySet = new Set();

    if (quiz?._id) idSet.add(String(quiz._id));
    if (quiz?.title?.trim()) titleKeySet.add(normalizeCategoryKey(quiz.title));

    const catRaw = quiz?.category?.trim();
    if (!catRaw || categoryKey === "general") {
        return { categoryKey, siblingQuizIds: idSet, siblingTitleKeys: titleKeySet };
    }

    const escaped = catRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const siblings = await Quiz.find({
        category: new RegExp(`^\\s*${escaped}\\s*$`, "i"),
    })
        .select("_id title")
        .limit(400)
        .lean();

    for (const q of siblings) {
        idSet.add(String(q._id));
        if (q.title?.trim()) titleKeySet.add(normalizeCategoryKey(q.title));
    }

    return { categoryKey, siblingQuizIds: idSet, siblingTitleKeys: titleKeySet };
}

/**
 * @param {string} userName
 * @param {string} categoryKey normalized topic key (e.g. "ai")
 * @param {{
 *   quizId?: import("mongoose").Types.ObjectId | string,
 *   siblingQuizIds?: Set<string> | string[],
 *   siblingTitleKeys?: Set<string> | string[],
 * }} [options]
 */
export async function getCategoryReportsForUser(userName, categoryKey, options = {}) {
    const { quizId, siblingQuizIds, siblingTitleKeys } = options;
    const allReports = await Report.find({ username: userName }).sort({ createdAt: -1 }).lean();

    const key = (categoryKey || "general").toLowerCase();
    if (!categoryKey || key === "general") {
        return allReports.slice(0, 5);
    }

    const idStr = quizId != null && quizId !== "" ? String(quizId) : null;
    const idSet =
        siblingQuizIds instanceof Set ? siblingQuizIds : new Set(siblingQuizIds || []);
    const titleSet =
        siblingTitleKeys instanceof Set ? siblingTitleKeys : new Set(siblingTitleKeys || []);

    const seen = new Set();
    const out = [];
    for (const r of allReports) {
        if (out.length >= 5) break;
        const rid = r._id != null ? String(r._id) : null;
        if (rid && seen.has(rid)) continue;

        const rk = getReportCategoryKey(r);
        const topicMatch = rk === key || topicKeysAlign(rk, key);
        const quizMatch = Boolean(idStr) && r.quizId != null && String(r.quizId) === idStr;
        const siblingIdMatch = r.quizId != null && idSet.size > 0 && idSet.has(String(r.quizId));
        const legacyTitleMatch =
            Boolean(r.quizName?.trim()) &&
            titleSet.size > 0 &&
            titleSet.has(normalizeCategoryKey(r.quizName));

        if (topicMatch || quizMatch || siblingIdMatch || legacyTitleMatch) {
            if (rid) seen.add(rid);
            out.push(r);
        }
    }
    return out;
}

/**
 * Full profile for UI + generation (quiz-specific category).
 * @param {string} userId
 * @param {{ title?: string, category?: string, tags?: string[], _id?: import("mongoose").Types.ObjectId }} quiz
 */
export async function getKnowledgeProfileForQuiz(userId, quiz) {
    const user = await User.findById(userId).lean();
    if (!user) {
        return null;
    }

    const { categoryKey, siblingQuizIds, siblingTitleKeys } = await getSameTopicSiblingSets(quiz);

    const [categoryReports, allReports, authoredPrior] = await Promise.all([
        getCategoryReportsForUser(user.name, categoryKey, {
            quizId: quiz?._id,
            siblingQuizIds,
            siblingTitleKeys,
        }),
        Report.find({ username: user.name }).sort({ createdAt: -1 }).limit(25).lean(),
        difficultyPriorFromAuthoredQuizzes(userId),
    ]);

    const relatedReports = filterRelatedReportsFromPool(allReports, categoryKey);
    const preferred = user.preferences?.preferredDifficulty || "medium";
    const result = computeRecommendedDifficultyFromReports(categoryReports, preferred, {
        userLevel: user.level ?? 1,
        allReports,
        relatedReports,
        authoredDifficultyPrior: authoredPrior?.score ?? null,
    });

    return {
        ...result,
        category: categoryKey,
        quizCategory: quiz?.category || null,
        userLevel: user.level ?? 1,
        preferredDifficulty: preferred,
    };
}

/** @param {string} performance low | medium | high */
export function performanceToDifficulty(performance) {
    if (performance === "low") return "easy";
    if (performance === "high") return "hard";
    return "medium";
}

const RANK = { easy: 0, medium: 1, hard: 2 };

export function blendDifficulties(a, b) {
    const idx = Math.round(((RANK[a] ?? 1) + (RANK[b] ?? 1)) / 2);
    return Object.keys(RANK).find((k) => RANK[k] === idx) ?? "medium";
}

/**
 * Nudge difficulty slightly by XP level (optional refinement).
 */
export function applyLevelHint(difficulty, level) {
    if (!level || level < 1) return difficulty;
    const r = RANK[difficulty] ?? 1;
    if (level >= 15 && r < 2) return blendDifficulties(difficulty, "hard");
    if (level >= 8 && r < 1) return blendDifficulties(difficulty, "medium");
    return difficulty;
}

/**
 * Resolve final difficulty string for adaptive generation.
 */
export async function resolveAdaptiveDifficulty(opts, userId, quiz) {
    const { difficultyMode = "performance", performance = "medium" } = opts;

    if (difficultyMode === "performance") {
        return {
            difficulty: performanceToDifficulty(performance),
            source: "last_session",
            profile: null,
        };
    }

    if (!userId) {
        return {
            difficulty: performanceToDifficulty(performance),
            source: "fallback_no_user",
            profile: null,
        };
    }

    const profile = await getKnowledgeProfileForQuiz(userId, quiz);
    if (!profile) {
        logger.warn(`resolveAdaptiveDifficulty: no profile for user ${userId}, using performance fallback`);
        return {
            difficulty: performanceToDifficulty(performance),
            source: "fallback_performance",
            profile: null,
        };
    }

    let difficulty = applyLevelHint(profile.recommendedDifficulty, profile.userLevel);
    let source = profile.dataSource || "intelligent";

    if (difficultyMode === "blended") {
        if ((profile.basedOnQuizzes ?? 0) === 0 && profile.dataSource === "cold_start") {
            source = "blended_cold";
        } else {
            difficulty = blendDifficulties(difficulty, performanceToDifficulty(performance));
            source = "blended";
        }
    }

    return {
        difficulty,
        source,
        profile,
    };
}
