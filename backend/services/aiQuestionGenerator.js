import dotenv from "dotenv";
import { generateFromGemini } from "../utils/geminiHelper.js";

dotenv.config();

if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("🚫 GEMINI_API_KEY is missing from .env file!");
}

// ─── Centralised difficulty config (single source of truth) ────────────────
export const DIFFICULTY_CONFIG = {
    easy: {
        bloomLevels: ["remember", "understand"],
        timeMultiplier: 1.0,
        distractorComplexity: "simple",
    },
    medium: {
        bloomLevels: ["understand", "apply", "analyze"],
        timeMultiplier: 1.4,
        distractorComplexity: "moderate",
    },
    hard: {
        bloomLevels: ["analyze", "evaluate", "synthesize"],
        timeMultiplier: 1.8,
        distractorComplexity: "nuanced",
    },
};

// ─── Score thresholds (one place to tune) ──────────────────────────────────
export const SCORE_THRESHOLDS = {
    strongPass: 0.85,
    pass: 0.65,
    weak: 0.5,
    borderline: 0.6,
};

function normalizeDifficulty(d) {
    if (!d || d === "any" || !["easy", "medium", "hard"].includes(d)) return "medium";
    return d;
}

// ─── Parse & validate AI JSON response ─────────────────────────────────────
export const parseAIResponse = (aiText) => {
    try {
        const clean = aiText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim();
        const parsed = JSON.parse(clean);
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Missing 'questions' array in AI response");
        }
        return parsed;
    } catch (e) {
        throw new Error("AI returned invalid JSON: " + e.message);
    }
};

// ─── Semantic near-duplicate check ─────────────────────────────────────────
const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "in",
    "on",
    "at",
    "of",
    "to",
    "and",
    "or",
    "not",
    "what",
    "which",
    "who",
    "how",
    "when",
    "where",
    "does",
    "do",
    "it",
    "its",
]);

function tokenize(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function jaccardSimilarity(a, b) {
    const setA = new Set(tokenize(a));
    const setB = new Set(tokenize(b));
    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
}

export function isSemanticDuplicate(newQ, existingSet, threshold = 0.55) {
    for (const existing of existingSet) {
        if (jaccardSimilarity(newQ, existing) >= threshold) return true;
    }
    return false;
}

// ─── Question quality scorer ───────────────────────────────────────────────
export function scoreQuestion(q, type = "mcq") {
    const reasons = [];
    let score = 1.0;

    if (!q.question || q.question.trim().length < 10) {
        reasons.push("Question text too short");
        score -= 0.5;
    }
    if (q.question?.length > 400) {
        reasons.push("Question text unusually long");
        score -= 0.1;
    }
    if (!["easy", "medium", "hard"].includes(q.difficulty)) {
        reasons.push("Invalid difficulty");
        score -= 0.2;
    }

    if (type === "mcq") {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            reasons.push("Must have exactly 4 options");
            score -= 0.5;
        } else {
            const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
            if (unique.size < 4) {
                reasons.push("Duplicate options");
                score -= 0.3;
            }
            if (q.options.some((o) => !o || o.trim().length === 0)) {
                reasons.push("Empty option");
                score -= 0.3;
            }
        }
        if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
            reasons.push("Invalid correctAnswer letter");
            score -= 0.4;
        }
        if (!q.explanation) {
            score -= 0.05;
        }
    }

    if (type === "true_false") {
        if (typeof q.correctAnswer !== "boolean") {
            reasons.push("correctAnswer must be boolean");
            score -= 0.5;
        }
    }

    return { valid: score >= 0.5, score: Math.max(0, Math.round(score * 100) / 100), reasons };
}

// ─── Build dynamic MCQ prompt ───────────────────────────────────────────────
function buildMCQPrompt(topic, num, difficulty) {
    const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    const bloomStr = cfg.bloomLevels.join(", ");

    return `
You are an expert quiz designer with deep knowledge of pedagogy and Bloom's Taxonomy.
Generate ${num} high-quality multiple-choice questions about "${topic}".

DIFFICULTY: ${difficulty.toUpperCase()}
- Target Bloom's Taxonomy levels: ${bloomStr}
- Distractor complexity: ${cfg.distractorComplexity}
- Questions should challenge the user to ${bloomStr} the concept, not just recall a fact.
${difficulty === "hard" ? "- Include nuanced edge cases, common misconceptions as distractors, or multi-step reasoning." : ""}
${difficulty === "easy" ? "- Keep language clear and direct. Distractors should be clearly wrong but plausible." : ""}

RULES:
1. Each question must be unambiguous and have exactly ONE correct answer.
2. All 4 options must be plausible — avoid obviously wrong distractors.
3. Vary question styles: definition, application, comparison, scenario-based.
4. Provide a concise "explanation" (1-2 sentences) for the correct answer.
5. Response MUST be ONLY a single valid JSON object — no markdown, no extra text.

JSON structure:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "A" | "B" | "C" | "D",
      "difficulty": "${difficulty}",
      "explanation": "string",
      "bloomLevel": "${cfg.bloomLevels[0]}"
    }
  ]
}
`.trim();
}

// ─── Build dynamic True/False prompt ───────────────────────────────────────
function buildTrueFalsePrompt(topic, num, difficulty = "medium") {
    const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    const bloomStr = cfg.bloomLevels.join(", ");

    return `
You are an expert quiz designer.
Generate ${num} high-quality true/false questions about "${topic}".

DIFFICULTY: ${difficulty.toUpperCase()}
- Target Bloom's levels: ${bloomStr}
- Aim for a roughly balanced true/false split (not all true or all false).
${difficulty === "hard" ? "- Use subtle misconceptions or edge cases. Avoid obvious statements." : ""}

RULES:
1. Each statement must be clearly and objectively true or false.
2. Provide a concise "explanation" (1-2 sentences) justifying the answer.
3. Response MUST be ONLY a single valid JSON object — no markdown, no extra text.

JSON structure:
{
  "questions": [
    {
      "question": "string",
      "correctAnswer": true | false,
      "difficulty": "${difficulty}",
      "explanation": "string"
    }
  ]
}
`.trim();
}

// ─── Core generator with quality filtering ──────────────────────────────────
async function generateAndFilter({ promptFn, topic, numRequested, difficulty, existingSet, type }) {
    const MAX_ATTEMPTS = 3;
    const MULTIPLIER = 1.6;
    const finalQuestions = [];
    const workingSet = new Set(existingSet);

    for (let attempt = 0; attempt < MAX_ATTEMPTS && finalQuestions.length < numRequested; attempt++) {
        const needed = numRequested - finalQuestions.length;
        const toGenerate = Math.ceil(needed * MULTIPLIER);

        let parsed;
        try {
            const prompt = promptFn(topic, toGenerate, difficulty);
            const aiText = await generateFromGemini(prompt, { preferredModel: "gemini-2.5-pro" });
            parsed = parseAIResponse(aiText);
        } catch (err) {
            if (attempt === MAX_ATTEMPTS - 1) throw err;
            continue;
        }

        for (const q of parsed.questions) {
            const { valid, score, reasons } = scoreQuestion(q, type);

            if (!valid) {
                continue;
            }

            if (isSemanticDuplicate(q.question, workingSet)) {
                continue;
            }

            if (!["easy", "medium", "hard"].includes(q.difficulty)) {
                q.difficulty = difficulty;
            }

            q._qualityScore = score;

            workingSet.add(q.question.trim().toLowerCase());
            finalQuestions.push(q);

            if (finalQuestions.length >= numRequested) break;
        }
    }

    return finalQuestions;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const generateMCQ = async (topic, numQuestions, difficulty = "medium") => {
    const d = normalizeDifficulty(difficulty);
    const questions = await generateAndFilter({
        promptFn: buildMCQPrompt,
        topic,
        numRequested: numQuestions,
        difficulty: d,
        existingSet: new Set(),
        type: "mcq",
    });
    return { questions };
};

export const generateTrueFalse = async (topic, numQuestions, difficulty = "medium") => {
    const d = normalizeDifficulty(difficulty);
    const questions = await generateAndFilter({
        promptFn: buildTrueFalsePrompt,
        topic,
        numRequested: numQuestions,
        difficulty: d,
        existingSet: new Set(),
        type: "true_false",
    });
    return { questions };
};

export const generateMCQWithContext = async (topic, numQuestions, difficulty = "medium", existingQuestions = []) => {
    const d = normalizeDifficulty(difficulty);
    const existingSet = new Set(existingQuestions.map((q) => q.trim().toLowerCase()));
    const questions = await generateAndFilter({
        promptFn: buildMCQPrompt,
        topic,
        numRequested: numQuestions,
        difficulty: d,
        existingSet,
        type: "mcq",
    });
    return { questions };
};

export const generateTrueFalseWithContext = async (
    topic,
    numQuestions,
    difficulty = "medium",
    existingQuestions = []
) => {
    const d = normalizeDifficulty(difficulty);
    const existingSet = new Set(existingQuestions.map((q) => q.trim().toLowerCase()));
    const questions = await generateAndFilter({
        promptFn: buildTrueFalsePrompt,
        topic,
        numRequested: numQuestions,
        difficulty: d,
        existingSet,
        type: "true_false",
    });
    return { questions };
};
