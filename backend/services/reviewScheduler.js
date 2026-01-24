import ReviewSchedule from "../models/ReviewSchedule.js";
import { calculateNextReview } from "../algorithms/spacedRepetition.js";
import logger from "../utils/logger.js";

/**
 * Get the review schedule for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - A promise that resolves to an array of review schedules.
 */
export const getReviewScheduleForUser = async (userId) => {
  try {
    const schedules = await ReviewSchedule.find({ user: userId, nextReviewDate: { $lte: new Date() } })
      .populate("quiz", "title category questions")
      .lean(); // Use lean() for better performance

    // Manually populate question data from the quiz
    const reviews = schedules.map(schedule => {
      // Safety check: ensure quiz exists and has questions
      if (!schedule.quiz || !schedule.quiz.questions || !Array.isArray(schedule.quiz.questions)) {
        return null;
      }

      // Convert both IDs to strings for comparison
      const questionIdStr = schedule.question?.toString();
      if (!questionIdStr) {
        return null;
      }

      const question = schedule.quiz.questions.find(q => {
        if (!q || !q._id) return false;
        return q._id.toString() === questionIdStr;
      });

      // Only return reviews with valid question data
      if (!question) {
        return null;
      }

      return {
        ...schedule,
        question: question
      };
    }).filter(review => review !== null); // Filter out null entries

    return reviews;
  } catch (error) {
    logger.error({ message: "Error in getReviewScheduleForUser", userId, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Update the review schedule for a question.
 * @param {string} userId - The ID of the user.
 * @param {string} quizId - The ID of the quiz.
 * @param {string} questionId - The ID of the question.
 * @param {number} quality - The quality of the user's answer (0-5).
 */
export const updateReviewSchedule = async (
  userId,
  quizId,
  questionId,
  quality
) => {
  let schedule = await ReviewSchedule.findOne({
    user: userId,
    quiz: quizId,
    question: questionId,
  });

  if (!schedule) {
    schedule = new ReviewSchedule({
      user: userId,
      quiz: quizId,
      question: questionId,
      nextReviewDate: new Date(),
    });
  }

  const { easinessFactor, repetitions, interval } = schedule;
  const {
    easinessFactor: newEasinessFactor,
    repetitions: newRepetitions,
    interval: newInterval,
    nextReviewDate,
  } = calculateNextReview(quality, easinessFactor, repetitions, interval);

  schedule.easinessFactor = newEasinessFactor;
  schedule.repetitions = newRepetitions;
  schedule.interval = newInterval;
  schedule.nextReviewDate = nextReviewDate;
  schedule.lastReviewedDate = new Date();

  await schedule.save();
  return schedule;
};

/**
 * Create initial review schedules for a quiz.
 * @param {string} userId - The ID of the user.
 *  @param {string} quizId - The ID of the quiz.
 * @param {Array} questions - An array of questions from the quiz.
 */
export const createInitialReviewSchedules = async (userId, quizId, questions) => {
    const schedules = questions.map(question => ({
        user: userId,
        quiz: quizId,
        question: question._id,
        nextReviewDate: new Date(),
    }));

    // Use insertMany for efficiency and to avoid creating duplicate schedules
    await ReviewSchedule.insertMany(schedules, { ordered: false }).catch(err => {
        // Ignore duplicate key errors, which are expected if schedules already exist
        if (err.code !== 11000) {
            throw err;
        }
    });
};
