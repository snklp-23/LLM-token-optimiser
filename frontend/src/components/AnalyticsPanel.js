import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Activity, BarChart3, GitCompare, TrendingDown } from "lucide-react";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler, Title
);

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function AnalyticsPanel({ metricsHistory }) {
  if (!metricsHistory.length) {
    return (
      <section className="analytics-panel empty-state">
        <h2>Analytics</h2>
        <p>No data yet</p>
      </section>
    );
  }

  const labels = metricsHistory.map((_, index) => `#${index + 1}`);
  const tokenSavings = metricsHistory.map((metrics) =>
    Math.max(0, metrics.tokensBeforeOptimization - metrics.tokensAfterOptimization)
  );
  const totalCostSaved = sum(
    metricsHistory.map((metrics) =>
      Math.max(0, metrics.costBeforeOptimization - metrics.costAfterOptimization)
    )
  );
  const averageTokensSaved = Math.round(sum(tokenSavings) / metricsHistory.length);
  const winRate = Math.round(
    (tokenSavings.filter((value) => value > 0).length / metricsHistory.length) * 100
  );
  const totalTokensSaved = sum(tokenSavings);
  const avgCompressionRatio = metricsHistory.length > 0
    ? Math.round(
        sum(metricsHistory.map((m) => m.tokensBeforeOptimization > 0
          ? ((m.tokensBeforeOptimization - m.tokensAfterOptimization) / m.tokensBeforeOptimization) * 100
          : 0
        )) / metricsHistory.length
      )
    : 0;

  // Token savings line chart with gradient fill
  const lineData = {
    labels,
    datasets: [
      {
        label: "Tokens Saved",
        data: tokenSavings,
        borderColor: "#0f8f68",
        backgroundColor: "rgba(15, 143, 104, 0.12)",
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#0f8f68",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
      tooltip: {
        backgroundColor: "#172026",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.parsed.y} tokens saved`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { font: { size: 10 }, color: "#657382" }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: "#657382" }
      }
    }
  };

  // Before vs After token comparison (stacked)
  const beforeAfterData = {
    labels,
    datasets: [
      {
        label: "After Optimization",
        data: metricsHistory.map((m) => m.tokensAfterOptimization),
        backgroundColor: "#0f8f68",
        borderRadius: 4,
        barPercentage: 0.7
      },
      {
        label: "Tokens Saved",
        data: tokenSavings,
        backgroundColor: "rgba(15, 143, 104, 0.2)",
        borderRadius: 4,
        barPercentage: 0.7
      }
    ]
  };

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
      tooltip: {
        backgroundColor: "#172026",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} tokens`
        }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: "#657382" } },
      y: { stacked: true, beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#657382" } }
    }
  };

  // Per-optimization breakdown chart
  const breakdownData = {
    labels,
    datasets: [
      {
        label: "Tool Selection",
        data: metricsHistory.map((m) => m.tokensFromToolSelection || 0),
        backgroundColor: "#2269a8",
        borderRadius: 3,
        barPercentage: 0.65
      },
      {
        label: "Context Compression",
        data: metricsHistory.map((m) => m.tokensFromContextCompression || 0),
        backgroundColor: "#7c3aed",
        borderRadius: 3,
        barPercentage: 0.65
      },
      {
        label: "Query Routing",
        data: metricsHistory.map((m) => m.tokensFromQueryRouting || 0),
        backgroundColor: "#d97706",
        borderRadius: 3,
        barPercentage: 0.65
      }
    ]
  };

  const breakdownBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
      tooltip: {
        backgroundColor: "#172026",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} tokens`
        }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: "#657382" } },
      y: { stacked: true, beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#657382" } }
    }
  };

  // Cost comparison chart
  const costData = {
    labels,
    datasets: [
      {
        label: "Before",
        data: metricsHistory.map((metrics) => metrics.costBeforeOptimization),
        backgroundColor: "rgba(138, 164, 195, 0.7)",
        borderRadius: 3,
        barPercentage: 0.7
      },
      {
        label: "After",
        data: metricsHistory.map((metrics) => metrics.costAfterOptimization),
        backgroundColor: "#efb84a",
        borderRadius: 3,
        barPercentage: 0.7
      }
    ]
  };

  const costOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
      tooltip: {
        backgroundColor: "#172026",
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(6)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#657382" } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#657382" } }
    }
  };

  // Model usage distribution
  const modelCounts = {};
  metricsHistory.forEach((m) => {
    const model = m.modelUsed || "unknown";
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  });

  return (
    <section className="analytics-panel" aria-label="Analytics">
      <div className="panel-heading">
        <div>
          <h2>Analytics</h2>
          <p>{metricsHistory.length} calls tracked</p>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="analytics-stats-row">
        <div className="analytics-stat-card">
          <TrendingDown size={16} className="stat-icon green" />
          <div>
            <span className="stat-value">{totalTokensSaved}</span>
            <span className="stat-label">Total Tokens Saved</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <Activity size={16} className="stat-icon blue" />
          <div>
            <span className="stat-value">{avgCompressionRatio}%</span>
            <span className="stat-label">Avg Compression</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <BarChart3 size={16} className="stat-icon amber" />
          <div>
            <span className="stat-value">{winRate}%</span>
            <span className="stat-label">Win Rate</span>
          </div>
        </div>
        <div className="analytics-stat-card">
          <GitCompare size={16} className="stat-icon purple" />
          <div>
            <span className="stat-value">{Object.keys(modelCounts).length}</span>
            <span className="stat-label">Models Used</span>
          </div>
        </div>
      </div>

      {/* Token Savings Trend */}
      <div className="chart-section">
        <h3 className="chart-title">
          <TrendingDown size={14} />
          Token Savings Trend
        </h3>
        <div className="chart-box">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* Before vs After Stacked */}
      <div className="chart-section">
        <h3 className="chart-title">
          <BarChart3 size={14} />
          Before vs After Optimization
        </h3>
        <div className="chart-box">
          <Bar data={beforeAfterData} options={stackedBarOptions} />
        </div>
      </div>

      {/* Per-optimization Breakdown */}
      <div className="chart-section">
        <h3 className="chart-title">
          <Activity size={14} />
          Savings by Optimization Type
        </h3>
        <div className="chart-box">
          <Bar data={breakdownData} options={breakdownBarOptions} />
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="chart-section">
        <h3 className="chart-title">
          <GitCompare size={14} />
          Cost Comparison (Simulated)
        </h3>
        <div className="chart-box">
          <Bar data={costData} options={costOptions} />
        </div>
      </div>

      {/* Model Distribution */}
      <div className="model-distribution">
        <h3 className="chart-title">Model Usage Distribution</h3>
        <div className="model-bars">
          {Object.entries(modelCounts).map(([model, count]) => {
            const pct = Math.round((count / metricsHistory.length) * 100);
            return (
              <div className="model-bar-row" key={model}>
                <span className="model-bar-name">{model}</span>
                <div className="model-bar-track">
                  <div
                    className={`model-bar-fill ${model.includes("qwen") ? "cheap" : "expensive"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="model-bar-count">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="stats-strip">
        <span>
          Avg saved <strong>{averageTokensSaved}</strong>
        </span>
        <span>
          Total saved <strong>${totalCostSaved.toFixed(6)}</strong>
        </span>
        <span>
          Win rate <strong>{winRate}%</strong>
        </span>
      </div>
    </section>
  );
}

export default AnalyticsPanel;
