import { useState } from "react";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronRight,
  Code,
  Cpu,
  Database,
  GitBranch,
  Layers,
  MessageSquare,
  Route,
  Scissors,
  Server,
  Wrench,
  Zap
} from "lucide-react";

function ExpandableSection({ icon, title, subtitle, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div className={`deep-section ${open ? "expanded" : ""}`}>
      <button className="deep-section-header" onClick={() => setOpen(!open)} type="button">
        <div className="deep-section-left">
          <div className="deep-section-icon">{icon}</div>
          <div>
            <span className="deep-section-title">{title}</span>
            {subtitle ? <span className="deep-section-subtitle">{subtitle}</span> : null}
          </div>
        </div>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open ? <div className="deep-section-body">{children}</div> : null}
    </div>
  );
}

function DataFlowArrow({ label }) {
  return (
    <div className="data-flow-arrow">
      <div className="flow-line" />
      <span className="flow-label">{label}</span>
      <div className="flow-line" />
    </div>
  );
}

function CodeSnippet({ title, code }) {
  return (
    <div className="code-snippet-block">
      {title ? <span className="code-snippet-title">{title}</span> : null}
      <pre className="code-snippet">{code}</pre>
    </div>
  );
}

function KeywordBadge({ word, active }) {
  return <span className={`keyword-badge ${active ? "active" : ""}`}>{word}</span>;
}

function PipelineDeepDive({ currentMetrics, optimizationToggle, lastOptimizationOutput }) {
  const decision = lastOptimizationOutput?.decision || {};
  const details = lastOptimizationOutput?.optimizationDetails || {};
  const savings = lastOptimizationOutput?.tokenSavingsMetrics || {};
  const enabled = details.enabled || {};

  const routerKeywordsExpensive = [
    "code", "coding", "debug", "python", "react", "api",
    "docker", "kubernetes", "cloud", "aws", "devops", "terraform"
  ];
  const routerKeywordsCheap = [
    "latest", "current", "today", "weather", "news", "documentation"
  ];

  return (
    <section className="pipeline-deep-dive" aria-label="Pipeline Deep Dive">
      <div className="panel-heading">
        <div>
          <h2>
            <Layers size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
            Pipeline Deep Dive
          </h2>
          <p>How your query gets optimized behind the scenes</p>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="deep-architecture">
        <div className="arch-flow">
          <div className="arch-node user-node">
            <MessageSquare size={16} />
            <span>User Query</span>
          </div>
          <ArrowRight size={14} className="arch-arrow" />
          <div className="arch-node api-node">
            <Server size={16} />
            <span>POST /api/optimize</span>
          </div>
          <ArrowRight size={14} className="arch-arrow" />
          <div className="arch-node pipeline-node">
            <GitBranch size={16} />
            <span>Parallel Pipeline</span>
          </div>
          <ArrowRight size={14} className="arch-arrow" />
          <div className="arch-node ollama-node">
            <Cpu size={16} />
            <span>Ollama ({decision.model || "mistral"})</span>
          </div>
          <ArrowRight size={14} className="arch-arrow" />
          <div className="arch-node response-node">
            <Brain size={16} />
            <span>Response</span>
          </div>
        </div>
      </div>

      {/* Step 1: Query Routing */}
      <ExpandableSection
        icon={<Route size={18} />}
        title="Step 1 — Query Routing"
        subtitle={decision.routingReason
          ? `→ ${decision.shouldUseExpensive ? "Expensive" : "Cheap"} model selected`
          : "Classifies query complexity via keyword matching"}
        defaultOpen={true}
      >
        <div className="deep-explanation">
          <div className="deep-how-label">
            <Zap size={14} />
            <strong>How it works</strong>
          </div>
          <p>
            The router scans the user query for <strong>keyword patterns</strong> — no LLM call needed.
            If the query contains technical/DevOps keywords, it routes to the <strong>expensive model</strong> (Mistral 7B).
            General queries go to the <strong>cheap model</strong> (Qwen 2.5 1.5B) which is faster and uses fewer tokens.
          </p>

          <div className="deep-how-label" style={{ marginTop: 16 }}>
            <Code size={14} />
            <strong>Keyword matching logic</strong>
          </div>
          <div className="keyword-group">
            <span className="keyword-group-label">→ Expensive model triggers:</span>
            <div className="keyword-badges">
              {routerKeywordsExpensive.map((w) => (
                <KeywordBadge key={w} word={w} active={decision.shouldUseExpensive} />
              ))}
            </div>
          </div>
          <div className="keyword-group">
            <span className="keyword-group-label">→ Cheap model + web search triggers:</span>
            <div className="keyword-badges">
              {routerKeywordsCheap.map((w) => (
                <KeywordBadge key={w} word={w} active={!decision.shouldUseExpensive && decision.useWebSearch} />
              ))}
            </div>
          </div>

          <CodeSnippet
            title="queryRouter.js — routing decision"
            code={`const isExpensiveTask = containsKeyword(query, EXPENSIVE_KEYWORDS);
// If match → route to Mistral (expensive, powerful)
// If no match → route to Qwen 2.5:1.5b (cheap, fast)
// Tokens avoided: ${savings.tokensAvoidedByQueryRouting || 0}`}
          />

          {decision.routingReason ? (
            <div className="deep-result-box">
              <span className="result-label">Decision</span>
              <div className="result-detail">
                <span className={`result-badge ${decision.shouldUseExpensive ? "expensive" : "cheap"}`}>
                  {decision.shouldUseExpensive ? "EXPENSIVE" : "CHEAP"} MODEL
                </span>
                <span className="result-model">{decision.model}</span>
              </div>
              <p className="result-reason">{decision.routingReason}</p>
              {decision.taskType ? (
                <span className="result-task-type">Task type: <strong>{decision.taskType}</strong></span>
              ) : null}
            </div>
          ) : null}
        </div>
      </ExpandableSection>

      <DataFlowArrow label="Runs in parallel" />

      {/* Step 2: Tool Selection */}
      <ExpandableSection
        icon={<Wrench size={18} />}
        title="Step 2 — Tool Selection"
        subtitle={decision.selectedTools
          ? `${decision.selectedTools.length} tools selected from 4 available`
          : "Filters tools by keyword matching"}
      >
        <div className="deep-explanation">
          <div className="deep-how-label">
            <Zap size={14} />
            <strong>How it works</strong>
          </div>
          <p>
            Each tool has associated <strong>keywords</strong>. The selector checks which
            tool keywords appear in the user query. Only matching tools are included in
            the prompt sent to the LLM, saving tokens on irrelevant tool descriptions.
          </p>

          <div className="tool-grid">
            {[
              { name: "calculator", keywords: ["math", "calculate", "compute"], icon: "🧮" },
              { name: "web_search", keywords: ["search", "latest", "current"], icon: "🔍" },
              { name: "code_runner", keywords: ["code", "execute", "debug"], icon: "💻" },
              { name: "weather", keywords: ["weather", "forecast", "temperature"], icon: "🌤" }
            ].map((tool) => {
              const isSelected = (decision.selectedTools || []).includes(tool.name);
              return (
                <div className={`tool-card ${isSelected ? "selected" : "pruned"}`} key={tool.name}>
                  <div className="tool-card-header">
                    <span className="tool-card-icon">{tool.icon}</span>
                    <span className="tool-card-name">{tool.name}</span>
                    <span className={`tool-status-badge ${isSelected ? "kept" : "pruned"}`}>
                      {isSelected ? "KEPT" : "PRUNED"}
                    </span>
                  </div>
                  <div className="tool-card-keywords">
                    {tool.keywords.map((k) => (
                      <span className="tool-keyword" key={k}>{k}</span>
                    ))}
                  </div>
                  <span className="tool-card-savings">
                    {isSelected ? "Included in prompt" : "~120 tokens saved"}
                  </span>
                </div>
              );
            })}
          </div>

          <CodeSnippet
            title="toolSelector.js — filtering logic"
            code={`// For each tool, check if ANY keyword appears in the query
const selectedTools = availableTools
  .filter(tool => tool.keywords.some(kw => query.includes(kw)))
  .map(tool => tool.name);

// Tokens saved: (4 - ${(decision.selectedTools || []).length}) tools × 120 tokens/tool
// = ${savings.tokensAvoidedByToolSelection || 0} tokens avoided`}
          />

          <div className="deep-result-box">
            <span className="result-label">Result</span>
            <p>
              <strong>{savings.tokensAvoidedByToolSelection || 0}</strong> tokens saved by removing{" "}
              {Math.max(0, 4 - (decision.selectedTools || []).length)} irrelevant tool descriptions from the prompt.
            </p>
          </div>
        </div>
      </ExpandableSection>

      <DataFlowArrow label="Runs in parallel" />

      {/* Step 3: Context Compression */}
      <ExpandableSection
        icon={<Scissors size={18} />}
        title="Step 3 — Context Compression"
        subtitle={savings.tokensSavedByContextCompression > 0
          ? `${savings.tokensSavedByContextCompression} tokens compressed via Ollama summarization`
          : "Summarizes old messages when history exceeds 5 turns"}
      >
        <div className="deep-explanation">
          <div className="deep-how-label">
            <Zap size={14} />
            <strong>How it works</strong>
          </div>
          <p>
            When conversation history exceeds <strong>5 messages</strong>, older messages are
            sent to <strong>Ollama (Mistral)</strong> for summarization. The summary replaces
            old messages, and the last 5 messages are kept verbatim. This reduces prompt size
            while preserving recent context.
          </p>

          <div className="compression-flow">
            <div className="comp-step">
              <div className="comp-step-icon"><Database size={16} /></div>
              <div>
                <strong>Full History</strong>
                <span>{savings.contextTokensBeforeCompression || "N/A"} tokens</span>
              </div>
            </div>
            <ArrowRight size={14} className="comp-arrow" />
            <div className="comp-step">
              <div className="comp-step-icon"><Cpu size={16} /></div>
              <div>
                <strong>Ollama Summarize</strong>
                <span>POST /api/chat → mistral</span>
              </div>
            </div>
            <ArrowRight size={14} className="comp-arrow" />
            <div className="comp-step">
              <div className="comp-step-icon"><Scissors size={16} /></div>
              <div>
                <strong>Compressed</strong>
                <span>{savings.contextTokensAfterCompression || "N/A"} tokens</span>
              </div>
            </div>
          </div>

          <CodeSnippet
            title="contextCompressor.js — Ollama call"
            code={`// Split history: old messages → summarize, recent → keep verbatim
const oldMessages = history.slice(0, -5);
const recentMessages = history.slice(-5);

// Call Ollama for summarization
const result = await ollama.callModel([{
  role: "user",
  content: "Summarize the key context in 2-3 sentences..."
}], 250);  // max 250 tokens for summary

// Replace old messages with: "Previous conversation summary: ..."
// Tokens saved: ${savings.tokensSavedByContextCompression || 0}`}
          />

          <div className="deep-how-label" style={{ marginTop: 16 }}>
            <Server size={14} />
            <strong>Ollama API call details</strong>
          </div>
          <div className="api-call-detail">
            <div className="api-row">
              <span className="api-label">Endpoint</span>
              <code>POST http://localhost:11434/api/chat</code>
            </div>
            <div className="api-row">
              <span className="api-label">Model</span>
              <code>mistral</code>
            </div>
            <div className="api-row">
              <span className="api-label">Temperature</span>
              <code>0.3</code>
            </div>
            <div className="api-row">
              <span className="api-label">Max tokens</span>
              <code>250 (for summary)</code>
            </div>
            <div className="api-row">
              <span className="api-label">Cost</span>
              <code>$0.00 (local inference)</code>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <DataFlowArrow label="Pipeline output assembled" />

      {/* Step 4: Response Generation */}
      <ExpandableSection
        icon={<Brain size={18} />}
        title="Step 4 — Response Generation"
        subtitle={currentMetrics?.modelUsed
          ? `Generated via ${currentMetrics.modelUsed} with optimized prompt`
          : "Generates final response with optimized context"}
      >
        <div className="deep-explanation">
          <div className="deep-how-label">
            <Zap size={14} />
            <strong>How it works</strong>
          </div>
          <p>
            After optimization, the system constructs the final prompt by combining:
            (1) selected tool descriptions, (2) compressed conversation history, and
            (3) the current query. This optimized prompt is sent to the model chosen
            by the router.
          </p>

          <div className="prompt-assembly">
            <div className="prompt-block">
              <span className="prompt-block-label">Tool Context</span>
              <span className="prompt-block-detail">
                {(decision.selectedTools || []).length > 0
                  ? `${(decision.selectedTools || []).join(", ")} descriptions included`
                  : "No tools (cheap model doesn't need tools)"}
              </span>
            </div>
            <span className="prompt-plus">+</span>
            <div className="prompt-block">
              <span className="prompt-block-label">Compressed History</span>
              <span className="prompt-block-detail">
                {savings.tokensSavedByContextCompression > 0
                  ? `Summary + last 5 messages`
                  : "Full history (under 5 messages)"}
              </span>
            </div>
            <span className="prompt-plus">+</span>
            <div className="prompt-block">
              <span className="prompt-block-label">User Query</span>
              <span className="prompt-block-detail">Original query text</span>
            </div>
            <span className="prompt-equals">=</span>
            <div className="prompt-block final">
              <span className="prompt-block-label">Optimized Prompt</span>
              <span className="prompt-block-detail">
                {currentMetrics
                  ? `${currentMetrics.tokensAfterOptimization} tokens (saved ${Math.max(0, currentMetrics.tokensBeforeOptimization - currentMetrics.tokensAfterOptimization)})`
                  : "Pending..."}
              </span>
            </div>
          </div>

          <div className="deep-how-label" style={{ marginTop: 16 }}>
            <Server size={14} />
            <strong>Final Ollama API call</strong>
          </div>
          <div className="api-call-detail">
            <div className="api-row">
              <span className="api-label">Endpoint</span>
              <code>POST http://localhost:11434/api/chat</code>
            </div>
            <div className="api-row">
              <span className="api-label">Model</span>
              <code>{decision.model || currentMetrics?.modelUsed || "mistral"}</code>
            </div>
            <div className="api-row">
              <span className="api-label">Max tokens</span>
              <code>{decision.shouldUseExpensive ? "2800" : "1800"}</code>
            </div>
            <div className="api-row">
              <span className="api-label">Stream</span>
              <code>false (full response)</code>
            </div>
            <div className="api-row">
              <span className="api-label">Input tokens</span>
              <code>{currentMetrics ? `${currentMetrics.tokensAfterOptimization - (currentMetrics.tokensAfterOptimization > 0 ? Math.round(currentMetrics.tokensAfterOptimization * 0.3) : 0)}` : "—"}</code>
            </div>
            <div className="api-row">
              <span className="api-label">Simulated cost</span>
              <code>{currentMetrics ? `$${(currentMetrics.costAfterOptimization || 0).toFixed(6)}` : "—"}</code>
            </div>
          </div>

          <CodeSnippet
            title="server.js — final model call"
            code={`// Choose model based on router decision
const model = decision.shouldUseExpensive
  ? "mistral"      // Powerful, for technical tasks
  : "qwen2.5:1.5b"; // Fast, for simple queries

// Build optimized message array
const messages = [
  ...toolContext,        // Only selected tool descriptions
  ...compressedHistory,  // Summary + recent messages
  { role: "user", content: query }
];

// Call Ollama with chosen model
const ollama = new OllamaClient({ model });
const result = await ollama.callModel(messages, maxTokens);`}
          />
        </div>
      </ExpandableSection>

      {/* Token Savings Waterfall */}
      {currentMetrics ? (
        <div className="token-waterfall-section">
          <h3>
            <Zap size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Token Optimization Waterfall
          </h3>
          <div className="waterfall-chart">
            <WaterfallBar
              label="Original"
              value={currentMetrics.tokensBeforeOptimization}
              max={currentMetrics.tokensBeforeOptimization}
              type="total"
            />
            <WaterfallBar
              label="− Tool Selection"
              value={currentMetrics.tokensFromToolSelection}
              max={currentMetrics.tokensBeforeOptimization}
              type="saving"
            />
            <WaterfallBar
              label="− Context Compression"
              value={currentMetrics.tokensFromContextCompression}
              max={currentMetrics.tokensBeforeOptimization}
              type="saving"
            />
            <WaterfallBar
              label="− Query Routing"
              value={currentMetrics.tokensFromQueryRouting}
              max={currentMetrics.tokensBeforeOptimization}
              type="saving"
            />
            <WaterfallBar
              label="Final"
              value={currentMetrics.tokensAfterOptimization}
              max={currentMetrics.tokensBeforeOptimization}
              type="result"
            />
          </div>
        </div>
      ) : null}

      {/* Optimization Toggle Status */}
      <div className="toggle-status-section">
        <h3>Active Optimizations</h3>
        <div className="toggle-status-grid">
          {[
            { key: "queryRouting", label: "Query Routing", desc: "Keyword-based model selection", icon: <Route size={16} /> },
            { key: "toolSelection", label: "Tool Selection", desc: "Keyword-based tool filtering", icon: <Wrench size={16} /> },
            { key: "contextCompression", label: "Context Compression", desc: "Ollama-powered summarization", icon: <Scissors size={16} /> }
          ].map((opt) => (
            <div className={`toggle-status-card ${optimizationToggle?.[opt.key] ? "active" : "inactive"}`} key={opt.key}>
              <div className="toggle-status-icon">{opt.icon}</div>
              <span className="toggle-status-label">{opt.label}</span>
              <span className="toggle-status-desc">{opt.desc}</span>
              <span className={`toggle-status-badge ${optimizationToggle?.[opt.key] ? "on" : "off"}`}>
                {optimizationToggle?.[opt.key] ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaterfallBar({ label, value, max, type }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="waterfall-row">
      <span className="waterfall-label">{label}</span>
      <div className="waterfall-track">
        <div className={`waterfall-fill ${type}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="waterfall-value">{value}</span>
    </div>
  );
}

export default PipelineDeepDive;
