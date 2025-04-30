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
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, getWrittenTests);

router.get("/:id", verifyToken, getTestById);

router.delete("/delete/Test", verifyToken, deleteTest);

router.post("/create", verifyToken, createWrittenTest);

router.post("/:testId/add-question", verifyToken, addQuestionToTest);

router.post("/score-answer", verifyToken, scoreWrittenAnswer);

router.delete("/:id/questions/:questionIndex", verifyToken, deleteQuestion);

export default router;