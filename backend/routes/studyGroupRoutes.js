import express from "express";
import {
    createStudyGroup,
    joinStudyGroup,
    leaveStudyGroup,
    getUserStudyGroups,
    searchStudyGroups,
    getStudyGroupDetails,
    shareQuizWithGroup,
    updateStudyGroup
} from "../controllers/studyGroupController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// All study group routes require authentication
router.use(verifyToken);

// Study group CRUD
router.post("/", clearCacheByPattern("/api/study-groups"), createStudyGroup);
router.get("/", cache, getUserStudyGroups);
router.get("/search", cache, searchStudyGroups);
router.get("/:groupId", cache, getStudyGroupDetails);
router.put("/:groupId", clearCacheByPattern("/api/study-groups"), updateStudyGroup);

// Study group membership
router.post("/:groupId/join", clearCacheByPattern("/api/study-groups"), joinStudyGroup);
router.post("/:groupId/leave", clearCacheByPattern("/api/study-groups"), leaveStudyGroup);

// Study group activities
router.post("/:groupId/share-quiz", clearCacheByPattern("/api/study-groups"), shareQuizWithGroup);

export default router;
