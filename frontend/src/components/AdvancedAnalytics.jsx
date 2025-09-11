import React, { useState, useEffect } from "react";
import axios from "../utils/axios";

const AdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("/intelligence/analytics");
        setAnalytics(res.data);
      } catch (error) {
        console.error("Error fetching advanced analytics:", error);
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!analytics) {
    return <div>No analytics data available.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Advanced Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-2">Cognitive Metrics</h3>
          {analytics.advanced?.cognitiveMetrics.map((metric) => (
            <div key={metric._id}>
              <p>Response Time: {metric.metrics.responseTime.toFixed(2)}s</p>
              <p>Fatigue Score: {metric.metrics.fatigueScore.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-2">Learning Analytics</h3>
          {analytics.advanced?.learningAnalytics.map((analytic) => (
            <div key={analytic._id}>
              <p>Engagement: {analytic.metrics.engagement.toFixed(2)}</p>
              <p>Comprehension: {analytic.metrics.comprehension.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
