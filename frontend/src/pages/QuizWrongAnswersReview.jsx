import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import { loadQuizReviewSession } from "../utils/quizReviewSession";
import "./QuizWrongAnswersReview.css";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function isWrong(q) {
    if (!q) return false;
    const u = q.userAnswer;
    const c = q.correctAnswer;
    if (u === "Not Answered" || u == null) return true;
    return u !== c;
}

function buildPdf(doc, session, wrongList, insightsList) {
    const margin = 14;
    const maxW = 180;
    let y = 18;
    const lh = 6;
    const pageH = doc.internal.pageSize.getHeight();

    const nextPage = () => {
        doc.addPage();
        y = 18;
    };

    const textBlock = (lines, size = 10, style = "normal") => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        const parts = typeof lines === "string" ? doc.splitTextToSize(lines, maxW) : lines;
        for (const line of parts) {
            if (y > pageH - 16) nextPage();
            doc.text(line, margin, y);
            y += lh;
        }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("QuizNest — Wrong answer report", margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Quiz: ${session.quizTitle || "Quiz"}`, margin, y);
    y += 6;
    doc.text(`Score: ${session.score} / ${session.total}  •  Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;

    wrongList.forEach((q, idx) => {
        const insight =
            insightsList[idx] ||
            (Array.isArray(insightsList) ? insightsList.find((x) => x && x.index === idx) : null);

        if (y > pageH - 40) nextPage();
        doc.setDrawColor(200);
        doc.line(margin, y, margin + maxW, y);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        textBlock(`Question ${idx + 1}`);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        textBlock(q.questionText || "");

        textBlock(`Your answer: ${q.userAnswerText || q.userAnswer || "—"}`);
        textBlock(`Correct: ${q.correctAnswerText || "—"}`);

        if (insight) {
            doc.setFont("helvetica", "bold");
            textBlock("Why this felt tricky");
            doc.setFont("helvetica", "normal");
            textBlock(insight.whyWrong || "");
            doc.setFont("helvetica", "bold");
            textBlock("Correct reasoning");
            doc.setFont("helvetica", "normal");
            textBlock(insight.whyCorrect || "");
            if (insight.studyTip) {
                doc.setFont("helvetica", "bold");
                textBlock("Study tip");
                doc.setFont("helvetica", "normal");
                textBlock(insight.studyTip);
            }
            const sim = insight.similarQuestion;
            if (sim?.question) {
                doc.setFont("helvetica", "bold");
                textBlock("Practice question");
                doc.setFont("helvetica", "normal");
                textBlock(sim.question);
                if (Array.isArray(sim.options)) {
                    sim.options.forEach((opt, i) => {
                        textBlock(`${LETTERS[i] || i}. ${opt}`);
                    });
                }
                doc.setFont("helvetica", "bold");
                textBlock(`Answer: ${sim.correctAnswer || "—"}`);
                doc.setFont("helvetica", "normal");
                if (sim.explanation) textBlock(sim.explanation);
            }
        }
        y += 4;
    });

    doc.save(`quiznest-wrong-answers-${(session.quizTitle || "quiz").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 40)}.pdf`);
}

const QuizWrongAnswersReview = () => {
    const { id: routeQuizId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [insights, setInsights] = useState(null);
    const [insightsErr, setInsightsErr] = useState("");
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        const data = loadQuizReviewSession();
        if (!data || !data.questions || !Array.isArray(data.questions)) {
            setSession(null);
            setLoading(false);
            return;
        }
        if (routeQuizId && data.quizId && data.quizId !== routeQuizId) {
            setSession(null);
            setLoading(false);
            return;
        }
        setSession(data);
        setLoading(false);
    }, [routeQuizId]);

    const wrongQuestions = useMemo(() => {
        if (!session?.questions) return [];
        return session.questions.filter(isWrong);
    }, [session]);

    const insightsList = useMemo(() => {
        if (!insights?.items || !Array.isArray(insights.items)) return [];
        return wrongQuestions.map((_, i) => {
            const byField = insights.items.find((x) => x && x.index === i);
            return byField || insights.items[i] || null;
        });
    }, [insights, wrongQuestions]);

    useEffect(() => {
        if (!session || wrongQuestions.length === 0) {
            return;
        }

        let cancelled = false;
        (async () => {
            setAiLoading(true);
            setInsightsErr("");
            try {
                const body = {
                    quizTitle: session.quizTitle,
                    category: session.category || "General",
                    wrongQuestions: wrongQuestions.map((q) => ({
                        questionText: q.questionText,
                        userAnswer: q.userAnswer,
                        userAnswerText: q.userAnswerText,
                        correctAnswer: q.correctAnswer,
                        correctAnswerText: q.correctAnswerText,
                        options: q.options
                    }))
                };
                const res = await axios.post("/api/quizzes/review-insights", body);
                if (!cancelled) {
                    setInsights(res.data);
                }
            } catch (e) {
                if (!cancelled) {
                    setInsightsErr(e.response?.data?.message || e.message || "Could not load AI explanations");
                }
            } finally {
                if (!cancelled) setAiLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [session, wrongQuestions]);

    const handlePdf = useCallback(async () => {
        if (!session || wrongQuestions.length === 0) return;
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        buildPdf(doc, session, wrongQuestions, insightsList);
    }, [session, wrongQuestions, insightsList]);

    if (loading) {
        return (
            <div className="quiz-wrong-review-page">
                <Spinner />
            </div>
        );
    }

    if (!session) {
        return (
            <motion.div className="quiz-wrong-review-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="quiz-review-empty">
                    <h2>No review data</h2>
                    <p className="sub">Complete a quiz and choose &quot;Study wrong answers&quot; from the results screen.</p>
                    <button type="button" className="quiz-review-btn primary" onClick={() => navigate("/user/test")}>
                        Browse quizzes
                    </button>
                </div>
            </motion.div>
        );
    }

    if (wrongQuestions.length === 0) {
        return (
            <motion.div className="quiz-wrong-review-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="quiz-review-back">
                    <button type="button" onClick={() => navigate("/user/test")}>← Back to quizzes</button>
                </div>
                <div className="quiz-review-empty">
                    <h2>Perfect score on this attempt</h2>
                    <p>You didn&apos;t miss any questions — nothing to study here. Try another quiz to keep leveling up.</p>
                    <button type="button" className="quiz-review-btn primary" onClick={() => navigate("/user/test")}>
                        More quizzes
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="quiz-wrong-review-page"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="quiz-review-back">
                <button type="button" onClick={() => navigate("/user/test")}>← Back to quizzes</button>
            </div>

            <header className="quiz-review-hero">
                <h1>Study missed questions</h1>
                <p className="sub">{session.quizTitle}</p>
                <div className="quiz-review-score-pill">
                    <span>{session.score}</span>
                    <span>/</span>
                    <span>{session.total}</span>
                    <span style={{ marginLeft: "0.5rem", fontWeight: 600, opacity: 0.9 }}>
                        • {wrongQuestions.length} to review
                    </span>
                </div>
                <div className="quiz-review-actions">
                    <button type="button" className="quiz-review-btn primary" onClick={handlePdf}>
                        📄 Download PDF report
                    </button>
                    <button
                        type="button"
                        className="quiz-review-btn"
                        onClick={() => navigate(`/adaptive/${session.quizId}?performance=low`)}
                    >
                        🚀 Adaptive practice
                    </button>
                </div>
            </header>

            {aiLoading && (
                <p className="quiz-review-status">Generating explanations and practice questions…</p>
            )}
            {insightsErr && !aiLoading && (
                <div className="quiz-review-error" role="alert">
                    {insightsErr} You can still read your answers below or download the PDF (without AI sections if empty).
                </div>
            )}

            {wrongQuestions.map((q, idx) => {
                const insight = insightsList[idx];
                const sim = insight?.similarQuestion;

                return (
                    <motion.article
                        key={`${session.quizId}-wrong-${idx}-${q.questionText?.slice(0, 20)}`}
                        className="quiz-review-card wrong"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * idx }}
                    >
                        <div className="quiz-review-card-header">
                            <span className="quiz-review-badge">Missed question {idx + 1}</span>
                        </div>
                        <h2 className="quiz-review-qtext">{q.questionText}</h2>
                        <div className="quiz-review-answers">
                            <div className="quiz-review-ans-row">
                                <span className="label">Your answer</span>
                                <span className="value">{q.userAnswerText || q.userAnswer || "—"}</span>
                            </div>
                            <div className="quiz-review-ans-row">
                                <span className="label">Correct</span>
                                <span className="value">{q.correctAnswerText || q.correctAnswer || "—"}</span>
                            </div>
                        </div>

                        {insight && (
                            <div className="quiz-review-insights">
                                {insight.keyConcept && (
                                    <>
                                        <h4>Key idea</h4>
                                        <p>{insight.keyConcept}</p>
                                    </>
                                )}
                                <h4>Why your choice was off</h4>
                                <p>{insight.whyWrong || "—"}</p>
                                <h4>Why the right answer works</h4>
                                <p>{insight.whyCorrect || "—"}</p>
                                {insight.studyTip && (
                                    <>
                                        <h4>Remember</h4>
                                        <p>{insight.studyTip}</p>
                                    </>
                                )}
                            </div>
                        )}

                        {sim?.question && (
                            <div className="quiz-review-practice">
                                <h4>Similar practice question</h4>
                                <p className="quiz-review-practice-q">{sim.question}</p>
                                {(sim.options || []).map((opt, oi) => {
                                    const letter = LETTERS[oi] || String(oi + 1);
                                    const isCorrect = letter === (sim.correctAnswer || "").toUpperCase();
                                    return (
                                        <div key={oi} className={`quiz-review-option ${isCorrect ? "correct-opt" : ""}`}>
                                            <span className="let">{letter}.</span>
                                            <span>{opt}</span>
                                        </div>
                                    );
                                })}
                                {sim.explanation && (
                                    <p style={{ marginTop: "var(--space-md)", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                        <strong>Why {sim.correctAnswer}:</strong> {sim.explanation}
                                    </p>
                                )}
                            </div>
                        )}
                    </motion.article>
                );
            })}
        </motion.div>
    );
};

export default QuizWrongAnswersReview;
