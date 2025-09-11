import React, { useState, useEffect } from "react";
import axios from "../utils/axios";

const SpacedRepetition = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get("/reviews");
        setReviews(res.data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
      setLoading(false);
    };

    fetchReviews();
  }, []);

  const handleUpdateReview = async (quality) => {
    const review = reviews[currentReviewIndex];
    try {
      await axios.post("/reviews/update", {
        quizId: review.quiz._id,
        questionId: review.question._id,
        quality: quality,
      });
    } catch (error) {
      console.error("Error updating review:", error);
    }

    setShowAnswer(false);
    if (currentReviewIndex < reviews.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      setReviews([]); // No more reviews
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Spaced Repetition</h2>
        <p>No reviews due today. Great job!</p>
      </div>
    );
  }

  const currentReview = reviews[currentReviewIndex];
  const question = currentReview.question;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Spaced Repetition</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">{currentReview.quiz.title}</h3>
        <p className="mb-4">{question.question}</p>
        {showAnswer && (
          <div className="mb-4">
            <p className="font-bold">Answer:</p>
            <p>{question.options[question.correctAnswer]}</p>
          </div>
        )}
        {!showAnswer && (
          <button
            onClick={() => setShowAnswer(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Show Answer
          </button>
        )}
        {showAnswer && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleUpdateReview(1)}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Forgot
            </button>
            <button
              onClick={() => handleUpdateReview(3)}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              Hard
            </button>
            <button
              onClick={() => handleUpdateReview(5)}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacedRepetition;
