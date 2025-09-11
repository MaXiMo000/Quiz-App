import { getReviewScheduleForUser, updateReviewSchedule } from "../services/reviewScheduler.js";

export const getReviewSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const schedule = await getReviewScheduleForUser(userId);
    res.json(schedule);
  } catch (error) {
    console.error("Error getting review schedule:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizId, questionId, quality } = req.body;
        const schedule = await updateReviewSchedule(userId, quizId, questionId, quality);
        res.json(schedule);
    } catch (error) {
        console.error("Error updating review schedule:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
