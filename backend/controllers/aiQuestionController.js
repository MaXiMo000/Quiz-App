import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";
import {
  generateMCQ,
  generateTrueFalse,
} from "../services/aiQuestionGenerator.js";
import { validateQuestion } from "../services/contentQualityChecker.js";

// ✅ General MCQ Generator
export const generateQuizQuestions = async (req, res) => {
  try {
    const { topic, numQuestions, questionType = "mcq" } = req.body;
    const { id } = req.params;

    if (!topic || !numQuestions) {
      return res
        .status(400)
        .json({ error: "Topic and number of questions are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const existingQuestions = new Set(
      quiz.questions.map((q) => q.question.trim().toLowerCase())
    );
    let finalQuestions = [];
    let parsed;

    if (questionType === "mcq") {
      parsed = await generateMCQ(topic, numQuestions);
    } else if (questionType === "true_false") {
      parsed = await generateTrueFalse(topic, numQuestions);
    } else {
      return res.status(400).json({ error: "Invalid question type" });
    }

    const newUnique = parsed.questions.filter((q) => {
      const normalized = q.question.trim().toLowerCase();
      return !existingQuestions.has(normalized) && validateQuestion(q);
    });

    newUnique.forEach((q) => {
      const normalized = q.question.trim().toLowerCase();
      if (!["easy", "medium", "hard"].includes(q.difficulty)) {
        q.difficulty = "medium";
      }
      existingQuestions.add(normalized);
    });

    finalQuestions.push(...newUnique);

    if (finalQuestions.length === 0) {
      return res
        .status(400)
        .json({ error: "No new unique questions could be generated" });
    }

    quiz.questions.push(...finalQuestions.slice(0, numQuestions));
    quiz.totalMarks = quiz.questions.length;
    quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);
    quiz.duration = quiz.questions.length * 2;

    await quiz.save();
    res.json({
      message: `${finalQuestions.length} new questions added successfully`,
      questions: finalQuestions.slice(0, numQuestions),
    });
  } catch (err) {
    console.error("🔥 AI Question Error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// ✅ Adaptive MCQ Generator
export const generateAdaptiveQuestions = async (req, res) => {
  try {
    const { performance, quizId, numQuestions = 5 } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const topic = quiz.category;
    const difficulty =
      performance === "low" ? "easy" : performance === "high" ? "hard" : "medium";

    const existingQuestions = new Set(
      quiz.questions.map((q) => q.question.trim().toLowerCase())
    );
    let finalQuestions = [];

    const parsed = await generateMCQ(topic, numQuestions, difficulty);

    const newUnique = parsed.questions.filter((q) => {
        const normalized = q.question.trim().toLowerCase();
        return !existingQuestions.has(normalized) && validateQuestion(q);
      });

      newUnique.forEach((q) => {
        const normalized = q.question.trim().toLowerCase();
        existingQuestions.add(normalized);
      });

      finalQuestions.push(...newUnique);

    if (finalQuestions.length === 0) {
      return res
        .status(400)
        .json({ error: "No new unique adaptive questions could be generated" });
    }

    quiz.questions.push(...finalQuestions.slice(0, numQuestions));
    quiz.totalMarks = quiz.questions.length;
    quiz.duration = quiz.questions.length * 2;
    quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);

    await quiz.save();
    res.json({
      message: `${finalQuestions.length} adaptive questions added successfully`,
      questions: finalQuestions.slice(0, numQuestions),
    });
  } catch (err) {
    console.error("🔥 Adaptive AI Error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
