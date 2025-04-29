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

router.get("/", getWrittenTests, verifyToken);

router.get("/:id", getTestById, verifyToken);

router.delete("/delete/Test", deleteTest, verifyToken);

router.post("/create", createWrittenTest, verifyToken);

router.post("/:testId/add-question", addQuestionToTest, verifyToken);

router.post("/score-answer", scoreWrittenAnswer, verifyToken);

router.delete("/:id/questions/:questionIndex", deleteQuestion, verifyToken);

export default router;