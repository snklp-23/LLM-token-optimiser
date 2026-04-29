const { EXPENSIVE_QUERY_ROUTING_AVOIDED_TOKENS } = require("../constants");

// Router policy — uses fast keyword matching only (no LLM call).
// This is instant and avoids the latency of an Ollama call for routing.
const EXPENSIVE_KEYWORDS = [
  "code", "coding", "programming", "debug", "bug", "refactor", "function",
  "javascript", "typescript", "python", "node", "react", "api",
  "backend", "frontend", "devops", "docker", "kubernetes", "terraform",
  "ansible", "jenkins", "github actions", "cicd", "ci/cd", "pipeline",
  "cloud", "aws", "azure", "gcp", "deployment", "automation",
  "script", "scripting", "shell", "powershell", "bash",
  "infrastructure", "observability", "monitoring", "incident", "runbook"
];

const SEARCH_KEYWORDS = [
  "latest", "current", "today", "right now", "weather", "time",
  "news", "update", "release", "version", "pricing",
  "documentation", "docs", "best practice", "official",
  "web search", "search the web"
];

function containsKeyword(query, keywords) {
  return keywords.some((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`);
    return pattern.test(query);
  });
}

async function queryRouter(userQuery, complexityThreshold = 0.6, options = {}) {
  const normalizedQuery = String(userQuery || "").toLowerCase();
  const isExpensiveTask = containsKeyword(normalizedQuery, EXPENSIVE_KEYWORDS);
  const useWebSearch = isExpensiveTask || containsKeyword(normalizedQuery, SEARCH_KEYWORDS);

  const shouldUseExpensive = isExpensiveTask;
  const taskType = isExpensiveTask ? "technical" : useWebSearch ? "current-data" : "general";
  const reason = isExpensiveTask
    ? "Technical routing guardrail: coding, DevOps, cloud, or automation tasks use the expensive model."
    : useWebSearch
      ? "Current-data routing guardrail: lookups and live information use the cheap model with web search."
      : "General-purpose task routed to cheap model.";

  return {
    shouldUseExpensive,
    useWebSearch,
    taskType,
    reason,
    ollamaTokensUsed: 0,
    ollamaCost: 0,
    flashCost: 0,
    tokensAvoided: shouldUseExpensive ? 0 : EXPENSIVE_QUERY_ROUTING_AVOIDED_TOKENS
  };
}

module.exports = queryRouter;
