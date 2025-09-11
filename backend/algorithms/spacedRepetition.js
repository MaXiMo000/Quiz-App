// SM-2 Spaced Repetition Algorithm

const calculateNextReview = (
  quality,
  easinessFactor,
  repetitions,
  interval
) => {
  if (quality < 3) {
    // If the quality of the response is poor, reset the repetition schedule
    return {
      easinessFactor,
      repetitions: 0,
      interval: 1,
      nextReviewDate: getNextReviewDate(1),
    };
  }

  let newEasinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEasinessFactor < 1.3) {
    newEasinessFactor = 1.3;
  }

  let newRepetitions;
  let newInterval;

  if (repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.ceil(interval * newEasinessFactor);
    newRepetitions = repetitions + 1;
  }

  return {
    easinessFactor: newEasinessFactor,
    repetitions: newRepetitions,
    interval: newInterval,
    nextReviewDate: getNextReviewDate(newInterval),
  };
};

const getNextReviewDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export { calculateNextReview };
