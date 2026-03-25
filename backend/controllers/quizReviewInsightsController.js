import { generateFromGemini } from "../utils/geminiHelper.js";
import logger from "../utils/logger.js";
import { sendSuccess, sendValidationError, sendError } from "../utils/responseHelper.js";

const MAX_WRONG = 15;

/**
 * Strip markdown code fences and parse JSON from AI response
 */
function extractJsonObject(text) {
    if (!text || typeof text !== "string") return null;
    let cleaned = text.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(cleaned);
    if (fence) cleaned = fence[1].trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
        return null;
    }
}

/**
 * POST /api/quizzes/review-insights
 * Body: { quizTitle?, category?, wrongQuestions: [...] }
 */
export const getWrongAnswerInsights = async (req, res) => {
    try {
        const { quizTitle = "Quiz", category = "General", wrongQuestions = [] } = req.body;

        if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
            return sendValidationError(res, { wrongQuestions: "At least one wrong question is required" }, "No wrong questions to analyze");
        }

        const slice = wrongQuestions.slice(0, MAX_WRONG);
        const payload = slice.map((q, index) => ({
            index,
            questionText: String(q.questionText || "").slice(0, 800),
            userAnswerText: String(q.userAnswerText || q.userAnswer || "").slice(0, 400),
            correctAnswerText: String(q.correctAnswerText || "").slice(0, 400),
            options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 300)) : []
        }));

        const prompt = `You are an expert tutor for a quiz learning app. The student got these multiple-choice questions wrong.

Quiz context: title="${quizTitle}", category="${category}".

For EACH item below, produce concise, encouraging teaching text. Explain WHY the wrong answer is incorrect and WHY the correct answer is right, then give ONE new practice multiple-choice question on the same concept (4 options A-D, exactly one correct).

Input items (JSON):
${JSON.stringify(payload)}

Respond with ONLY valid JSON (no markdown), shape:
{
  "items": [
    {
      "index": 0,
      "whyWrong": "1-3 sentences",
      "whyCorrect": "1-3 sentences",
      "keyConcept": "short phrase",
      "studyTip": "one memorable tip",
      "similarQuestion": {
        "question": "string",
        "options": ["option A text","option B","option C","option D"],
        "correctAnswer": "A" or "B" or "C" or "D",
        "explanation": "why the answer is correct"
      }
    }
  ]
}

Include one entry in "items" for each input index (0 to ${payload.length - 1}). Keep similarQuestion distinct from the original wording.`;

        let raw;
        try {
            raw = await generateFromGemini(prompt, {
                preferredModel: "gemini-2.5-flash-lite",
                maxRetries: 2
            });
        } catch (apiErr) {
            logger.error({ message: "Gemini review insights failed", error: apiErr.message });
            return sendError(res, "AI insights are temporarily unavailable. You can still review questions on this page.", 503);
        }

        const parsed = extractJsonObject(raw);
        if (!parsed || !Array.isArray(parsed.items)) {
            logger.warn("Invalid AI JSON for review insights");
            return sendError(res, "Could not generate insights. Please try again in a moment.", 502);
        }

        return sendSuccess(res, { items: parsed.items, analyzedCount: slice.length }, "Insights generated");
    } catch (error) {
        logger.error({ message: "quizReviewInsights error", error: error.message, stack: error.stack });
        return sendError(res, "Failed to generate review insights", 500);
    }
};
