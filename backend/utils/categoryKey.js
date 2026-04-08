/**
 * Dynamic topic bucketing for intelligence, reports, and recommendations.
 * No hardcoded subject list — uses quiz.category / tags / title and stored report fields.
 */

/**
 * Canonical comparison key: NFKC, trim, collapse whitespace, lowercase.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeCategoryKey(raw) {
    if (raw == null) return "general";
    if (typeof raw !== "string") return "general";
    const t = raw
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    return t || "general";
}

/**
 * Best-effort topic key for a quiz document (category first, then tag, then title).
 * @param {{ category?: string, tags?: string[], title?: string } | null | undefined} quiz
 */
export function resolveQuizCategoryKey(quiz) {
    if (!quiz) return "general";
    const c = quiz.category?.trim();
    if (c) return normalizeCategoryKey(c);
    const tags = quiz.tags;
    if (Array.isArray(tags)) {
        const tag = tags.find((t) => typeof t === "string" && t.trim());
        if (tag) return normalizeCategoryKey(tag);
    }
    const title = quiz.title?.trim();
    if (title) return normalizeCategoryKey(title);
    return "general";
}

/**
 * Topic key for a report row (prefers stored quizCategory, then quiz title).
 * @param {{ quizCategory?: string, quizName?: string } | null | undefined} report
 */
export function getReportCategoryKey(report) {
    if (!report) return "general";
    const qc = report.quizCategory?.trim();
    if (qc) return normalizeCategoryKey(qc);
    const name = report.quizName?.trim();
    if (name) return normalizeCategoryKey(name);
    return "general";
}

/**
 * Legacy titles often look like "AI Quiz" while the topic key is "ai" (from quiz.category).
 * True when the report's normalized key equals the topic key or starts with "topicKey + space".
 */
export function topicKeysAlign(reportKey, topicKey) {
    if (!topicKey || topicKey === "general") return false;
    if (reportKey === topicKey) return true;
    if (reportKey.startsWith(topicKey + " ")) return true;
    return false;
}

/**
 * @deprecated Use getReportCategoryKey / normalizeCategoryKey — kept for any legacy imports.
 * @param {string} quizName
 */
export function extractCategoryFromQuizName(quizName) {
    return normalizeCategoryKey(quizName);
}
