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

router.get("/", getWrittenTests);

router.get("/:id", getTestById);

router.delete("/delete/Test", deleteTest);

router.post("/create", createWrittenTest);

router.post("/:testId/add-question", addQuestionToTest);

router.post("/score-answer", scoreWrittenAnswer);

router.delete("/:id/questions/:questionIndex", deleteQuestion);

export default router;