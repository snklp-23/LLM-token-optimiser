const { EXPENSIVE_TOOL_TOKEN_ESTIMATE } = require("../constants");

// Tool selection — uses fast keyword matching only (no LLM call).
// Matches query keywords against tool keywords for instant selection.
function toolSelector(userQuery, availableTools = [], options = {}) {
  if (!Array.isArray(availableTools) || availableTools.length === 0) {
    return Promise.resolve({
      selectedTools: [],
      ollamaTokensUsed: 0,
      ollamaCost: 0,
      flashCost: 0
    });
  }

  const normalizedQuery = String(userQuery || "").toLowerCase();

  // Match tools by checking if any of their keywords appear in the query
  const selectedTools = availableTools
    .filter((tool) => {
      const keywords = Array.isArray(tool.keywords) ? tool.keywords : [];
      return keywords.some((keyword) => normalizedQuery.includes(keyword.toLowerCase()));
    })
    .map((tool) => tool.name);

  return Promise.resolve({
    selectedTools,
    ollamaTokensUsed: 0,
    ollamaCost: 0,
    flashCost: 0,
    tokensAvoided: Math.max(0, availableTools.length - selectedTools.length) * EXPENSIVE_TOOL_TOKEN_ESTIMATE
  });
}

module.exports = toolSelector;
