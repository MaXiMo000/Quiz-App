import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import Loading from "./Loading";
import "./AdaptiveQuiz.css";
import { markQuizFullscreenOnLoad } from "../utils/quizFullscreen.js";
import {
    buildAdaptiveGeneratorPath,
    getEffectiveSessionPerformance,
    normalizeDifficultyMode,
} from "../utils/adaptiveQuizSignals.js";
import { computeAdaptiveGenerationPlan } from "../utils/adaptiveQuizPlan.js";

const AdaptiveQuiz = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [response, setResponse] = useState(null);
    const [topic, setTopic] = useState("");
    const [quizTitle, setQuizTitle] = useState("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [knowledgeProfile, setKnowledgeProfile] = useState(null);
    /** Start true so we don’t treat “no profile yet” as 0 topic results before the first fetch */
    const [profileLoading, setProfileLoading] = useState(true);
    const [lastResult, setLastResult] = useState(null);

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    const loadKnowledgeProfile = useCallback(async () => {
        if (!id) {
            setProfileLoading(false);
            return;
        }
        setProfileLoading(true);
        try {
            const res = await axios.get("/api/intelligence/quiz-knowledge-profile", {
                params: { quizId: id },
            });
            // Axios interceptor may unwrap { data: {...} } to res.data
            setKnowledgeProfile(res.data);
        } catch (err) {
            console.error("Knowledge profile", err);
            setKnowledgeProfile(null);
        } finally {
            setProfileLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const res = await axios.get(`/api/quizzes/${id}`);
                const q = res.data;
                setTopic(q.category || "");
                setQuizTitle(q.title || "");
                setResponse({ questions: q.questions || [] });
            } catch (err) {
                console.error("Error fetching quiz data", err);
                showError("Failed to load quiz data.");
            } finally {
                setLoading(false);
            }
        };
        fetchTopic();
    }, [id, showError]);

    useEffect(() => {
        if (!loading && id) {
            loadKnowledgeProfile();
        }
    }, [loading, id, loadKnowledgeProfile]);

    const autoPlan = useMemo(
        () =>
            computeAdaptiveGenerationPlan({
                knowledgeProfile,
                searchParams: query,
                profileLoading,
                quizId: id,
            }),
        [knowledgeProfile, query, profileLoading, id]
    );

    const applyQueryPreset = useCallback(
        (difficultyMode, performance) => {
            const path = buildAdaptiveGeneratorPath(id, { difficultyMode, performance });
            navigate(path, { replace: true });
        },
        [id, navigate]
    );

    /** What the URL says for mode, else what auto-plan inferred (for one active highlight). */
    const urlDifficultyMode = normalizeDifficultyMode(query.get("difficultyMode"));
    const activeQuickMode = urlDifficultyMode || autoPlan.difficultyMode;

    const sessionPerformanceForApi = useMemo(
        () => getEffectiveSessionPerformance(query),
        [location.search, query]
    );

    const handleGenerate = async () => {
        setGenerating(true);
        setLastResult(null);
        try {
            const { difficultyMode, performance } = autoPlan;
            const res = await axios.post("/api/adaptive", {
                quizId: id,
                performance,
                numQuestions,
                difficultyMode,
            });

            const payload = res.data;
            const added = payload?.added ?? payload?.questions?.length ?? 0;
            const used = payload?.usedDifficulty ?? "";
            const mode =
                payload?.effectiveDifficultyMode ?? payload?.difficultyMode ?? difficultyMode;

            const updatedQuiz = await axios.get(`/api/quizzes/${id}`, {
                params: { _t: Date.now() },
            });
            setResponse({ questions: updatedQuiz.data.questions });
            setLastResult({
                added,
                usedDifficulty: used,
                mode,
                source: payload?.difficultySource,
            });
            showSuccess(
                `Added ${added} question(s) at ${used} difficulty (${mode}). Your profile was updated.`
            );
            loadKnowledgeProfile();
        } catch (error) {
            console.error("Error generating adaptive questions:", error);
            showError(error.response?.data?.message || "Failed to generate questions.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteQuestion = async (index) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this question?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/quizzes/${id}/questions/${index}`);
            const updatedQuestions = response.questions.filter((_, i) => i !== index);
            setResponse({ ...response, questions: updatedQuestions });
            showSuccess("Question removed.");
        } catch (error) {
            console.error("Error deleting question:", error);
            showError("Failed to delete question.");
        }
    };

    if (loading) {
        return <Loading fullScreen={true} />;
    }

    return (
        <div className="adaptive-wrapper">
            <div className="adaptive-bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <motion.div
                className="adaptive-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2>
                    <span>🧠</span>
                    <span>Adaptive Quiz Generator</span>
                </h2>

                <div className="adaptive-info">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <strong>Quiz:</strong> {quizTitle || "—"}
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 }}
                    >
                        <strong>Topic:</strong> {topic || "Loading..."}
                    </motion.p>

                    <div className="adaptive-knowledge-panel" aria-live="polite">
                        <div className="adaptive-knowledge-header">
                            <strong>Your level (this topic)</strong>
                            {profileLoading && <span className="adaptive-knowledge-loading">Updating…</span>}
                        </div>
                        {knowledgeProfile ? (
                            <ul className="adaptive-knowledge-list">
                                <li>
                                    <span>Recommended</span>
                                    <span className={`difficulty-tag ${knowledgeProfile.recommendedDifficulty}`}>
                                        {knowledgeProfile.recommendedDifficulty}
                                    </span>
                                </li>
                                <li>
                                    <span>Confidence</span>
                                    <span>{Math.round((knowledgeProfile.confidence || 0) * 100)}%</span>
                                </li>
                                <li>
                                    <span>Based on</span>
                                    <span>
                                        {knowledgeProfile.basedOnQuizzes} past result(s) in this topic
                                        <span className="adaptive-knowledge-cap"> (max 5 used)</span>
                                    </span>
                                </li>
                                {knowledgeProfile.dataSource != null && knowledgeProfile.dataSource !== "" && (
                                    <li>
                                        <span>Data source</span>
                                        <span>{String(knowledgeProfile.dataSource)}</span>
                                    </li>
                                )}
                                {knowledgeProfile.confidenceTier != null && knowledgeProfile.confidenceTier !== "" && (
                                    <li>
                                        <span>Confidence tier</span>
                                        <span className={`adaptive-tier adaptive-tier--${knowledgeProfile.confidenceTier}`}>
                                            {knowledgeProfile.confidenceTier}
                                        </span>
                                    </li>
                                )}
                                <li>
                                    <span>Your level</span>
                                    <span>Lv.{knowledgeProfile.userLevel ?? 1}</span>
                                </li>
                            </ul>
                            <p className="adaptive-knowledge-footnote">
                                <strong>Confidence</strong> measures how much we trust this topic estimate from your{" "}
                                <strong>saved report history</strong> (scores and timing), not a prediction for your
                                next attempt.
                            </p>
                        ) : (
                            <p className="adaptive-knowledge-empty">
                                Complete a few quizzes in this category to unlock smarter difficulty estimates.
                            </p>
                        )}
                    </div>

                    <div className="adaptive-auto-plan" aria-live="polite">
                        <h3 className="adaptive-auto-plan-title">How we’ll set difficulty</h3>
                        <p className="adaptive-auto-plan-subtitle">Automatic — no extra steps needed</p>
                        {profileLoading ? (
                            <p className="adaptive-auto-plan-detail">Loading your profile…</p>
                        ) : (
                            <>
                                <p className="adaptive-auto-plan-lead">
                                    <strong>{autoPlan.title}</strong>
                                </p>
                                <p className="adaptive-auto-plan-detail">{autoPlan.detail}</p>
                                <div className="adaptive-auto-plan-chips" role="list">
                                    <div className="adaptive-plan-chip" role="listitem">
                                        <span className="adaptive-plan-chip-label">Generation style</span>
                                        <span
                                            className={`adaptive-plan-mode-pill adaptive-plan-mode-pill--${autoPlan.difficultyMode}`}
                                        >
                                            {autoPlan.difficultyMode === "blended"
                                                ? "Blended"
                                                : autoPlan.difficultyMode === "performance"
                                                  ? "Session only"
                                                  : "Smart focus"}
                                        </span>
                                        <span className="adaptive-plan-chip-hint">
                                            {autoPlan.difficultyMode === "performance"
                                                ? "Ignores long-term history — uses the performance level only (retry / nudge)."
                                                : autoPlan.ignoreUrlPerformance
                                                  ? "Preference, level, and past results in this topic when you have them"
                                                  : autoPlan.difficultyMode === "blended"
                                                    ? "History + your latest quiz result (or stored session)"
                                                    : "Topic history & account preferences"}
                                        </span>
                                    </div>
                                    <div className="adaptive-plan-chip" role="listitem">
                                        <span className="adaptive-plan-chip-label">Latest session tier</span>
                                        {autoPlan.ignoreUrlPerformance ? (
                                            <>
                                                <span className="adaptive-plan-performance adaptive-plan-performance--neutral">
                                                    Not blended in
                                                </span>
                                                <span className="adaptive-plan-chip-hint">
                                                    Smart mode still uses your <strong>saved quiz reports</strong> in this
                                                    topic, plus level and preferences — that’s what drives recommended
                                                    difficulty and confidence above. We only skip mixing in your{" "}
                                                    <strong>last attempt’s</strong> performance band; choose{" "}
                                                    <strong>Blended</strong> to combine both.
                                                </span>
                                            </>
                                        ) : autoPlan.hasSessionSignal ? (
                                            <>
                                                <span
                                                    className={`adaptive-plan-performance adaptive-plan-performance--${autoPlan.performance}`}
                                                >
                                                    {autoPlan.performance === "low"
                                                        ? "Needs support"
                                                        : autoPlan.performance === "high"
                                                          ? "Strong"
                                                          : "Average"}
                                                </span>
                                                <span className="adaptive-plan-chip-hint">
                                                    {autoPlan.usedStoredSession
                                                        ? "From your latest completed quiz on this device."
                                                        : "From the score carried through when you left the quiz."}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="adaptive-plan-performance adaptive-plan-performance--neutral">
                                                    Standard baseline
                                                </span>
                                                <span className="adaptive-plan-chip-hint">
                                                    Finish a quiz first — we’ll use your score from that run, or a standard
                                                    baseline until then.
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <motion.label
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <strong>Number of Questions:</strong>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                            className="adaptive-input"
                        />
                    </motion.label>

                    {lastResult && (
                        <p className="adaptive-last-result" role="status">
                            Last run: <strong>{lastResult.added}</strong> added · difficulty{" "}
                            <strong>{lastResult.usedDifficulty}</strong> · mode <strong>{lastResult.mode}</strong>
                        </p>
                    )}

                    <motion.button
                        className="generate-btn"
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || (profileLoading && autoPlan.difficultyMode !== "performance")}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {generating
                            ? "⏳ Generating..."
                            : profileLoading && autoPlan.difficultyMode !== "performance"
                              ? "⏳ Loading profile…"
                              : "✨ Generate Questions"}
                    </motion.button>

                    <div className="adaptive-mode-shortcuts" role="group" aria-label="Generation mode">
                        <span className="adaptive-mode-shortcuts-label">Mode</span>
                        <p className="adaptive-mode-shortcuts-hint">
                            <strong>Smart</strong> uses your topic history, level, and preferences (no latest session tier).{" "}
                            <strong>Blended</strong> and <strong>Session only</strong> use the session level from your
                            last finished quiz on this device — you don’t pick it manually here.
                        </p>
                        <div className="adaptive-mode-shortcuts-row">
                            <button
                                type="button"
                                className={`adaptive-mode-shortcut-btn${activeQuickMode === "intelligent" ? " adaptive-mode-shortcut-btn--active" : ""}`}
                                onClick={() => applyQueryPreset("intelligent")}
                            >
                                Smart (profile)
                            </button>
                            <button
                                type="button"
                                className={`adaptive-mode-shortcut-btn${activeQuickMode === "blended" ? " adaptive-mode-shortcut-btn--active" : ""}`}
                                onClick={() =>
                                    applyQueryPreset("blended", getEffectiveSessionPerformance(query))
                                }
                            >
                                Blended
                            </button>
                            <button
                                type="button"
                                className={`adaptive-mode-shortcut-btn${activeQuickMode === "performance" ? " adaptive-mode-shortcut-btn--active" : ""}`}
                                onClick={() =>
                                    applyQueryPreset("performance", getEffectiveSessionPerformance(query))
                                }
                            >
                                Session only
                            </button>
                        </div>
                        {activeQuickMode === "performance" && (
                            <p className="adaptive-mode-session-readout" role="status">
                                Session level: <strong>{sessionPerformanceForApi}</strong> — from your latest completed
                                quiz on this device. Complete another quiz to refresh it.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="adaptive-back-btn"
                        onClick={() => {
                            markQuizFullscreenOnLoad();
                            navigate(`/user/test/${id}`);
                        }}
                    >
                        ← Back to quiz
                    </button>
                </div>

                {response && response.questions && response.questions.length > 0 && (
                    <motion.div
                        className="generated-questions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <h4>
                            <span>📋</span>
                            <span>Questions in this quiz ({response.questions.length})</span>
                        </h4>
                        <div className="question-list">
                            <ul>
                                {response.questions.map((q, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 + i * 0.05 }}
                                    >
                                        <strong>Q{i + 1}:</strong>
                                        <span>{q.question}</span>
                                        <div className="question-actions">
                                            <span className={`difficulty-tag ${q.difficulty}`}>
                                                {(q.difficulty || "medium").toUpperCase()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteQuestion(i)}
                                                className="delete-btn"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default AdaptiveQuiz;
