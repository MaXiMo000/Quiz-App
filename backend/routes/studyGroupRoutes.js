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

const router = express.Router();

// All study group routes require authentication
router.use(verifyToken);

// Study group CRUD
router.post("/", createStudyGroup);
router.get("/", getUserStudyGroups);
router.get("/search", searchStudyGroups);
router.get("/:groupId", getStudyGroupDetails);
router.put("/:groupId", updateStudyGroup);

// Study group membership
router.post("/:groupId/join", joinStudyGroup);
router.post("/:groupId/leave", leaveStudyGroup);

// Study group activities
router.post("/:groupId/share-quiz", shareQuizWithGroup);

export default router;
