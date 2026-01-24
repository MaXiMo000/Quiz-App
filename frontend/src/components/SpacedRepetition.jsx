import React, { useState, useEffect, useRef } from "react";
import axios from "../utils/axios";
import Loading from "./Loading";
import "./SpacedRepetition.css";

const SpacedRepetition = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizProgress, setQuizProgress] = useState({});
  const fetchingRef = useRef(false); // Prevent duplicate calls

  useEffect(() => {
    // Prevent duplicate calls (React StrictMode in dev causes double renders)
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const fetchReviews = async () => {
      try {
        const res = await axios.get("/api/reviews");

        // Check if response data is an array
        if (!Array.isArray(res.data)) {
          console.error("Invalid response format:", res.data);
          setReviews([]);
          setLoading(false);
          fetchingRef.current = false;
          return;
        }

        // Filter out reviews with missing question data
        const validReviews = res.data.filter(review =>
          review &&
          review.question &&
          review.quiz &&
          review.quiz._id
        );

        setReviews(validReviews);

        // Initialize quiz progress tracking
        const progress = {};
        validReviews.forEach((review) => {
          const quizId = review.quiz._id;
          if (!progress[quizId]) {
            progress[quizId] = {
              isFirstTime: true,
              currentQuestionIndex: 0,
              totalQuestions: 0
            };
          }
          progress[quizId].totalQuestions++;
        });
        setQuizProgress(progress);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
        // Reset fetching flag on error so user can retry
        fetchingRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();

    // Cleanup function
    return () => {
      fetchingRef.current = false;
    };
  }, []);

  const handleUpdateReview = async (quality) => {
    const review = reviews[currentReviewIndex];
    const quizId = review.quiz._id;

    try {
      await axios.post("/api/reviews/update", {
        quizId: quizId,
        questionId: review.question._id || review.question,
        quality: quality,
      });
    } catch (error) {
      console.error("Error updating review:", error);
    }

    // Update quiz progress
    setQuizProgress(prev => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        isFirstTime: false,
        currentQuestionIndex: (prev[quizId]?.currentQuestionIndex || 0) + 1
      }
    }));

    setShowAnswer(false);
    if (currentReviewIndex < reviews.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      setReviews([]); // No more reviews
    }
  };

  if (loading) {
    return <Loading fullScreen={true} />;
  }

  if (reviews.length === 0) {
    return (
      <div className="spaced-repetition">
        <div className="spaced-repetition-container">
          <div className="spaced-repetition-header">
            <h2>🧠 Spaced Repetition</h2>
            <p>Master your knowledge with scientifically-proven spaced repetition</p>
          </div>
          <div className="spaced-repetition-empty">
            <h2>🎉 All Caught Up!</h2>
            <p>No reviews due today. Great job! Check back tomorrow for new review sessions.</p>
          </div>
        </div>
      </div>
    );
  }

  // Safety check for currentReview
  if (!reviews[currentReviewIndex]) {
    return (
      <div className="spaced-repetition">
        <div className="spaced-repetition-container">
          <div className="spaced-repetition-header">
            <h2>🧠 Spaced Repetition</h2>
            <p>Master your knowledge with scientifically-proven spaced repetition</p>
          </div>
          <div className="spaced-repetition-empty">
            <h2>🎉 All Caught Up!</h2>
            <p>No reviews available at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentReview = reviews[currentReviewIndex];
  const question = currentReview?.question;
  const quizId = currentReview?.quiz?._id;
  const isFirstTimeForQuiz = quizId ? (quizProgress[quizId]?.isFirstTime !== false) : true;

  // Handle case where question data is missing
  if (!question || !quizId) {
    return (
      <div className="spaced-repetition">
        <div className="spaced-repetition-container">
          <div className="spaced-repetition-header">
            <h2>🧠 Spaced Repetition</h2>
            <p>Master your knowledge with scientifically-proven spaced repetition</p>
          </div>
          <div className="error-state">
            <h2>⚠️ Data Error</h2>
            <p>Question data not found. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spaced-repetition">
      <div className="spaced-repetition-container">
        <div className="spaced-repetition-header">
          <h2>🧠 Spaced Repetition</h2>
          <p>Master your knowledge with scientifically-proven spaced repetition</p>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <span className="progress-text">
            Review {currentReviewIndex + 1} of {reviews.length}
          </span>
          {!isFirstTimeForQuiz && (
            <span className="quiz-progress-text">
              📚 Continuing {currentReview.quiz.title}
            </span>
          )}
        </div>

        <div className="review-card">
          <div className="quiz-info">
            <h3 className="quiz-title">{currentReview.quiz.title}</h3>
            <span className="quiz-category">{currentReview.quiz.category}</span>
          </div>

          <div className="question-section">
            <p className="question-text">{question.question}</p>
          </div>

          {(showAnswer || !isFirstTimeForQuiz) && (
            <div className="answer-section">
              <p className="answer-label">
                {isFirstTimeForQuiz ? "📋 All Options:" : "📚 Review Options:"}
              </p>
              <div className="options-grid">
                {question.options && question.options.map((option, index) => {
                  const isCorrect = question.correctAnswer &&
                    question.correctAnswer.charCodeAt(0) - 65 === index;
                  const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

                  return (
                    <div
                      key={index}
                      className={`option-item ${isCorrect ? 'correct-option' : 'incorrect-option'}`}
                    >
                      <div className="option-letter">{optionLetter}</div>
                      <div className="option-text">{option}</div>
                      {isCorrect && <div className="correct-badge">✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="button-group">
            {(!showAnswer && isFirstTimeForQuiz) ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="action-button show-answer-btn"
              >
                🔍 Show Answer
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleUpdateReview(1)}
                  className="action-button quality-btn forgot-btn"
                >
                  ❌ Forgot
                </button>
                <button
                  onClick={() => handleUpdateReview(3)}
                  className="action-button quality-btn hard-btn"
                >
                  ⚠️ Hard
                </button>
                <button
                  onClick={() => handleUpdateReview(5)}
                  className="action-button quality-btn easy-btn"
                >
                  ✅ Easy
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpacedRepetition;
