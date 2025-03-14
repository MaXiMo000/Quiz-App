import express from "express";
import {
    createWrittenTest,
    getWrittenTests,
    addQuestionToTest,
    scoreWrittenAnswer,
    getTestById,
    deleteTest,
    deleteQuestion
} from "../controllers/writtenTestController.js";

const router = express.Router();

// ✅ Fetch all written tests
router.get("/", getWrittenTests);

router.get("/:id", getTestById);

router.delete("/delete/Test", deleteTest);

// ✅ Create a new written test
router.post("/create", createWrittenTest);

// ✅ Add a question to an existing test
router.post("/:testId/add-question", addQuestionToTest);

// ✅ AI Scoring for written answers
router.post("/score-answer", scoreWrittenAnswer);

router.delete("/:id/questions/:questionIndex", deleteQuestion);

export default router;