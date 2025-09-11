import LearningAnalytics from "../models/LearningAnalytics.js";
import CognitiveMetrics from "../models/CognitiveMetrics.js";

/**
 * Track learning analytics for a user and quiz.
 * @param {string} userId - The ID of the user.
 * @param {string} quizId - The ID of the quiz.
 * @param {object} metrics - The metrics to track.
 */
export const trackLearningAnalytics = async (userId, quizId, metrics) => {
  return LearningAnalytics.findOneAndUpdate(
    { user: userId, quiz: quizId },
    { $set: { metrics } },
    { upsert: true, new: true }
  );
};

/**
 * Track cognitive metrics for a user and quiz.
 * @param {string} userId - The ID of the user.
 * @param {string} quizId - The ID of the quiz.
 * @param {object} metrics - The metrics to track.
 */
export const trackCognitiveMetrics = async (userId, quizId, metrics) => {
  return CognitiveMetrics.findOneAndUpdate(
    { user: userId, quiz: quizId },
    { $set: { metrics } },
    { upsert: true, new: true }
  );
};
