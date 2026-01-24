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
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

router.get("/", verifyToken, cache, getWrittenTests);

router.get("/:id", verifyToken, cache, getTestById);

router.delete("/delete/Test", verifyToken, clearCacheByPattern("/api/written-tests"), deleteTest);

router.post("/create", verifyToken, clearCacheByPattern("/api/written-tests"), createWrittenTest);

router.post("/:testId/add-question", verifyToken, clearCacheByPattern("/api/written-tests"), addQuestionToTest);

router.post("/score-answer", verifyToken, clearCacheByPattern("/api/written-tests"), scoreWrittenAnswer);

router.delete("/:id/questions/:questionIndex", verifyToken, clearCacheByPattern("/api/written-tests"), deleteQuestion);

export default router;
