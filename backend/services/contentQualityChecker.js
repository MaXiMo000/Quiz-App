/**
 * Validates the quality of a generated question.
 * @param {object} question - The question object to validate.
 * @returns {boolean} - True if the question is valid, false otherwise.
 */
export const validateQuestion = (question) => {
  if (!question.question || question.question.length < 10) {
    return false;
  }

  if (question.options) {
    if (question.options.length !== 4) {
      return false;
    }
    if (question.options.some((o) => !o || o.length === 0)) {
      return false;
    }
  }

  if (question.correctAnswer === undefined) {
    return false;
  }

  if (!["easy", "medium", "hard"].includes(question.difficulty)) {
    return false;
  }

  return true;
};
