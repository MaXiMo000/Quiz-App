import React, { useState, useEffect } from "react";
import axios from "../utils/axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import "./AdvancedAnalytics.css";

const AdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("/api/intelligence/analytics");
        setAnalytics(res.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching advanced analytics:", error);
        setError("Failed to load analytics data. Please try again later.");
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  const formatValue = (value, type = "number") => {
    if (type === "percentage") return `${(value * 100).toFixed(1)}%`;
    if (type === "time") return `${value.toFixed(2)}s`;
    if (type === "score") return value.toFixed(1);
    return value.toFixed(2);
  };

  const getScoreColor = (value, max = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return "var(--success)";
    if (percentage >= 60) return "var(--warning)";
    return "var(--danger)";
  };

  const getPerformanceLevel = (value, max = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Average";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="advanced-analytics-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="advanced-analytics-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Unable to Load Analytics</h3>
          <p className="error-message">{error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="advanced-analytics-container">
        <div className="no-data-container">
          <div className="no-data-icon">📊</div>
          <h3 className="no-data-title">No Analytics Data Available</h3>
          <p className="no-data-message">
            Complete some quizzes to see your advanced analytics and performance insights.
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const cognitiveMetrics = analytics.advanced?.cognitiveMetrics || [];
  const learningAnalytics = analytics.advanced?.learningAnalytics || [];

  const responseTimeData = {
    labels: cognitiveMetrics.map((_, index) => `Session ${index + 1}`),
    datasets: [{
      label: 'Response Time (s)',
      data: cognitiveMetrics.map(metric => metric.metrics.responseTime),
      borderColor: 'var(--accent)',
      backgroundColor: 'var(--accent-light)',
      tension: 0.4,
      fill: true
    }]
  };

  const engagementData = {
    labels: learningAnalytics.map((_, index) => `Session ${index + 1}`),
    datasets: [{
      label: 'Engagement Score',
      data: learningAnalytics.map(analytic => analytic.metrics.engagement),
      borderColor: 'var(--success)',
      backgroundColor: 'var(--success-light)',
      tension: 0.4,
      fill: true
    }]
  };

  const comprehensionData = {
    labels: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
    datasets: [{
      data: [
        learningAnalytics.filter(a => a.metrics.comprehension >= 0.8).length,
        learningAnalytics.filter(a => a.metrics.comprehension >= 0.6 && a.metrics.comprehension < 0.8).length,
        learningAnalytics.filter(a => a.metrics.comprehension >= 0.4 && a.metrics.comprehension < 0.6).length,
        learningAnalytics.filter(a => a.metrics.comprehension < 0.4).length
      ],
      backgroundColor: [
        'var(--success)',
        'var(--warning)',
        'var(--info)',
        'var(--danger)'
      ],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-color)',
          font: {
            family: 'var(--font-sans)'
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-muted)',
          font: {
            family: 'var(--font-sans)'
          }
        },
        grid: {
          color: 'var(--border-color)'
        }
      },
      y: {
        ticks: {
          color: 'var(--text-muted)',
          font: {
            family: 'var(--font-sans)'
          }
        },
        grid: {
          color: 'var(--border-color)'
        }
      }
    }
  };

  return (
    <div className="advanced-analytics-container">
      {/* Header Section */}
      <div className="analytics-header">
        <div className="header-content">
          <h1 className="analytics-title">Advanced Analytics</h1>
          <p className="analytics-subtitle">
            Deep insights into your learning patterns and cognitive performance
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{cognitiveMetrics.length}</div>
            <div className="stat-label">Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {formatValue(
                cognitiveMetrics.reduce((acc, metric) => acc + metric.metrics.responseTime, 0) / cognitiveMetrics.length || 0,
                "time"
              )}
            </div>
            <div className="stat-label">Avg Response</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {formatValue(
                learningAnalytics.reduce((acc, analytic) => acc + analytic.metrics.engagement, 0) / learningAnalytics.length || 0,
                "score"
              )}
            </div>
            <div className="stat-label">Engagement</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === "cognitive" ? "active" : ""}`}
          onClick={() => setActiveTab("cognitive")}
        >
          🧠 Cognitive
        </button>
        <button
          className={`tab-button ${activeTab === "learning" ? "active" : ""}`}
          onClick={() => setActiveTab("learning")}
        >
          📚 Learning
        </button>
        <button
          className={`tab-button ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          💡 Insights
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-grid">
            {/* Performance Overview Cards */}
            <div className="overview-card">
              <div className="card-header">
                <h3 className="card-title">Performance Overview</h3>
                <div className="card-icon">📈</div>
              </div>
              <div className="performance-metrics">
                <div className="metric-item">
                  <div className="metric-label">Average Response Time</div>
                  <div
                    className="metric-value"
                    style={{ color: getScoreColor(
                      cognitiveMetrics.reduce((acc, metric) => acc + metric.metrics.responseTime, 0) / cognitiveMetrics.length || 0,
                      2
                    ) }}
                  >
                    {formatValue(
                      cognitiveMetrics.reduce((acc, metric) => acc + metric.metrics.responseTime, 0) / cognitiveMetrics.length || 0,
                      "time"
                    )}
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Engagement Level</div>
                  <div
                    className="metric-value"
                    style={{ color: getScoreColor(
                      learningAnalytics.reduce((acc, analytic) => acc + analytic.metrics.engagement, 0) / learningAnalytics.length || 0,
                      20
                    ) }}
                  >
                    {formatValue(
                      learningAnalytics.reduce((acc, analytic) => acc + analytic.metrics.engagement, 0) / learningAnalytics.length || 0,
                      "score"
                    )}
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Comprehension Rate</div>
                  <div
                    className="metric-value"
                    style={{ color: getScoreColor(
                      learningAnalytics.reduce((acc, analytic) => acc + analytic.metrics.comprehension, 0) / learningAnalytics.length || 0,
                      1
                    ) }}
                  >
                    {formatValue(
                      learningAnalytics.reduce((acc, analytic) => acc + analytic.metrics.comprehension, 0) / learningAnalytics.length || 0,
                      "percentage"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-card">
                <h3 className="chart-title">Response Time Trend</h3>
                <div className="chart-container">
                  <Line data={responseTimeData} options={chartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">Engagement Trend</h3>
                <div className="chart-container">
                  <Line data={engagementData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cognitive" && (
          <div className="cognitive-section">
            <div className="section-header">
              <h2 className="section-title">Cognitive Performance</h2>
              <p className="section-subtitle">Analysis of your mental processing and response patterns</p>
            </div>

            <div className="metrics-grid">
              {cognitiveMetrics.map((metric, index) => (
                <div key={metric._id || index} className="metric-card">
                  <div className="metric-card-header">
                    <h4 className="metric-card-title">Session {index + 1}</h4>
                    <div className="metric-card-date">
                      {new Date(metric.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="metric-card-content">
                    <div className="metric-row">
                      <div className="metric-label">Response Time</div>
                      <div
                        className="metric-value"
                        style={{ color: getScoreColor(metric.metrics.responseTime, 2) }}
                      >
                        {formatValue(metric.metrics.responseTime, "time")}
                      </div>
                    </div>
                    <div className="metric-row">
                      <div className="metric-label">Fatigue Score</div>
                      <div
                        className="metric-value"
                        style={{ color: getScoreColor(metric.metrics.fatigueScore, 1) }}
                      >
                        {formatValue(metric.metrics.fatigueScore, "score")}
                      </div>
                    </div>
                    <div className="performance-indicator">
                      <div className="indicator-label">Performance Level</div>
                      <div
                        className="indicator-value"
                        style={{ color: getScoreColor(metric.metrics.responseTime, 2) }}
                      >
                        {getPerformanceLevel(metric.metrics.responseTime, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "learning" && (
          <div className="learning-section">
            <div className="section-header">
              <h2 className="section-title">Learning Analytics</h2>
              <p className="section-subtitle">Your engagement and comprehension patterns over time</p>
            </div>

            <div className="learning-grid">
              <div className="learning-chart-card">
                <h3 className="chart-title">Comprehension Distribution</h3>
                <div className="chart-container">
                  <Doughnut data={comprehensionData} options={chartOptions} />
                </div>
              </div>

              <div className="learning-metrics">
                {learningAnalytics.map((analytic, index) => (
                  <div key={analytic._id || index} className="learning-metric-card">
                    <div className="learning-metric-header">
                      <h4 className="learning-metric-title">Session {index + 1}</h4>
                      <div className="learning-metric-date">
                        {new Date(analytic.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="learning-metric-content">
                      <div className="learning-metric-row">
                        <div className="learning-metric-label">Engagement</div>
                        <div className="learning-metric-progress">
                          <div
                            className="progress-bar"
                            style={{
                              width: `${(analytic.metrics.engagement / 20) * 100}%`,
                              backgroundColor: getScoreColor(analytic.metrics.engagement, 20)
                            }}
                          ></div>
                          <span className="progress-value">
                            {formatValue(analytic.metrics.engagement, "score")}
                          </span>
                        </div>
                      </div>
                      <div className="learning-metric-row">
                        <div className="learning-metric-label">Comprehension</div>
                        <div className="learning-metric-progress">
                          <div
                            className="progress-bar"
                            style={{
                              width: `${analytic.metrics.comprehension * 100}%`,
                              backgroundColor: getScoreColor(analytic.metrics.comprehension, 1)
                            }}
                          ></div>
                          <span className="progress-value">
                            {formatValue(analytic.metrics.comprehension, "percentage")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="insights-section">
            <div className="section-header">
              <h2 className="section-title">AI-Powered Insights</h2>
              <p className="section-subtitle">Personalized recommendations based on your learning data</p>
            </div>

            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">🎯</div>
                <h3 className="insight-title">Focus Areas</h3>
                <p className="insight-description">
                  Based on your response times, consider taking breaks every 30-45 minutes to maintain optimal performance.
                </p>
              </div>

              <div className="insight-card">
                <div className="insight-icon">📈</div>
                <h3 className="insight-title">Improvement Trends</h3>
                <p className="insight-description">
                  Your engagement levels are showing positive trends. Keep up the consistent practice!
                </p>
              </div>

              <div className="insight-card">
                <div className="insight-icon">⏰</div>
                <h3 className="insight-title">Optimal Study Time</h3>
                <p className="insight-description">
                  Your cognitive performance peaks during morning sessions. Schedule challenging quizzes for 9-11 AM.
                </p>
              </div>

              <div className="insight-card">
                <div className="insight-icon">🧠</div>
                <h3 className="insight-title">Cognitive Load</h3>
                <p className="insight-description">
                  Your fatigue scores are well-managed. You're maintaining good mental stamina throughout sessions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
