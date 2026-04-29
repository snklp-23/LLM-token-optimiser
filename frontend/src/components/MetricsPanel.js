import { Brain, CheckCircle, Clock, Loader, Route, Scissors, TrendingDown, Wrench, Zap } from "lucide-react";

function percent(part, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((part / total) * 100)}%`;
}

function MetricCard({ icon, label, value, tone }) {
  return (
    <div className={`metric-card ${tone || ""}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BreakdownRow({ icon, label, value, total }) {
  return (
    <div className="breakdown-row">
      <div className="breakdown-label">
        {icon}
        <span>{label}</span>
      </div>
      <strong>
        {value} <span>{percent(value, total)}</span>
      </strong>
    </div>
  );
}

function ProcessStep({ label, status, detail }) {
  const iconMap = {
    pending: <Clock size={14} className="step-icon pending" />,
    running: <Loader size={14} className="step-icon running spin-animation" />,
    done: <CheckCircle size={14} className="step-icon done" />
  };

  return (
    <div className={`process-step ${status}`}>
      {iconMap[status] || iconMap.pending}
      <div className="step-content">
        <span className="step-label">{label}</span>
        {detail ? <span className="step-detail">{detail}</span> : null}
      </div>
    </div>
  );
}

function MetricsPanel({ currentMetrics, processSteps }) {
  const steps = processSteps || [];
  const isProcessing = steps.length > 0 && steps.some((s) => s.status === "running");

  if (!currentMetrics && !isProcessing) {
    return (
      <section className="metrics-panel empty-state">
        <h2>Metrics</h2>
        <p>No data yet</p>
      </section>
    );
  }

  const tokensSaved = currentMetrics
    ? Math.max(0, currentMetrics.tokensBeforeOptimization - currentMetrics.tokensAfterOptimization)
    : 0;
  const totalBreakdown = currentMetrics
    ? currentMetrics.tokensFromToolSelection +
      currentMetrics.tokensFromContextCompression +
      currentMetrics.tokensFromQueryRouting
    : 0;

  return (
    <section className="metrics-panel" aria-label="Optimization metrics">
      <div className="panel-heading">
        <div>
          <h2>Metrics</h2>
          {currentMetrics?.modelUsed ? <p>{currentMetrics.modelUsed}</p> : null}
        </div>
      </div>

      {/* Live Process Log — shows while processing */}
      {steps.length > 0 ? (
        <div className="metric-section process-log">
          <h3>
            <Zap size={14} />
            {isProcessing ? " Processing..." : " Completed"}
          </h3>
          {steps.map((step, i) => (
            <ProcessStep key={i} label={step.label} status={step.status} detail={step.detail} />
          ))}
        </div>
      ) : null}

      {currentMetrics ? (
        <>
          <div className="summary-grid">
            <MetricCard
              icon={<TrendingDown size={18} />}
              label="Tokens Saved"
              tone="green"
              value={`${tokensSaved} (${percent(tokensSaved, currentMetrics.tokensBeforeOptimization)})`}
            />
            <MetricCard
              icon={<Brain size={18} />}
              label="Model Used"
              tone="blue"
              value={currentMetrics.modelUsed || "none"}
            />
          </div>

          <div className="metric-section">
            <h3>Savings Breakdown</h3>
            <BreakdownRow
              icon={<Wrench size={16} />}
              label="Tool Selection"
              total={totalBreakdown}
              value={currentMetrics.tokensFromToolSelection}
            />
            <BreakdownRow
              icon={<Scissors size={16} />}
              label="Context Compression"
              total={totalBreakdown}
              value={currentMetrics.tokensFromContextCompression}
            />
            <BreakdownRow
              icon={<Route size={16} />}
              label="Query Routing"
              total={totalBreakdown}
              value={currentMetrics.tokensFromQueryRouting}
            />
          </div>

          {currentMetrics.routingReason ? (
            <div className="routing-note">
              <span>Routing</span>
              <p>{currentMetrics.routingReason}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default MetricsPanel;
