const { MODELS, EXPENSIVE_TOOL_TOKEN_ESTIMATE } = require("./constants");
const OllamaClient = require("./ollamaClient");
const contextCompressor = require("./optimizations/contextCompressor");
const queryRouter = require("./optimizations/queryRouter");
const toolSelector = require("./optimizations/toolSelector");
const { estimateTokensFromMessages, toPlainMessages } = require("./messageUtils");

function enabledMap(useOptimizations = {}) {
  return {
    toolSelection: useOptimizations.toolSelection !== false,
    contextCompression: useOptimizations.contextCompression !== false,
    queryRouting: useOptimizations.queryRouting !== false
  };
}

async function optimizationPipeline(input = {}, options = {}) {
  const {
    userQuery = "",
    conversationHistory = [],
    availableTools = [],
    useOptimizations = {}
  } = input;

  const enabled = enabledMap(useOptimizations);
  const ollama = options.ollama || new OllamaClient();
  const plainHistory = toPlainMessages(conversationHistory);

  // Run all three optimization steps IN PARALLEL to minimize latency.
  // Each step calls Ollama independently — no dependencies between them.
  const [routerResult, toolResult, compressionResult] = await Promise.all([
    // 1) Query routing
    enabled.queryRouting
      ? queryRouter(userQuery, input.complexityThreshold || 0.6, { ollama })
      : Promise.resolve({
          shouldUseExpensive: true,
          reason: "Query routing disabled; using expensive model baseline.",
          ollamaTokensUsed: 0, ollamaCost: 0, flashCost: 0, tokensAvoided: 0
        }),

    // 2) Tool selection (we don't know routing result yet, so always run it)
    enabled.toolSelection && availableTools.length > 0
      ? toolSelector(userQuery, availableTools, { ollama })
      : Promise.resolve({
          selectedTools: availableTools.map((tool) => tool.name),
          ollamaTokensUsed: 0, ollamaCost: 0, flashCost: 0, tokensAvoided: 0
        }),

    // 3) Context compression
    enabled.contextCompression && plainHistory.length > (input.maxMessagesToKeep || 5)
      ? contextCompressor(plainHistory, input.maxMessagesToKeep || 5, { ollama })
      : Promise.resolve({
          compressedMessages: plainHistory,
          tokensBeforeCompression: estimateTokensFromMessages(plainHistory),
          tokensAfterCompression: estimateTokensFromMessages(plainHistory),
          tokensSaved: 0, costSaved: 0, compressionCost: 0, flashTokensUsed: 0
        })
  ]);

  // If routing decided "cheap", clear tool selection (cheap model doesn't need tools)
  if (!routerResult.shouldUseExpensive) {
    toolResult.selectedTools = [];
    toolResult.tokensAvoided = availableTools.length * EXPENSIVE_TOOL_TOKEN_ESTIMATE;
  }

  // All optimization costs are zero because Ollama runs locally.
  const totalOptimizationCost = 0;

  return {
    decision: {
      shouldUseExpensive: routerResult.shouldUseExpensive,
      shouldUsePro: routerResult.shouldUseExpensive,
      useWebSearch: routerResult.useWebSearch,
      taskType: routerResult.taskType,
      routingReason: routerResult.reason,
      selectedTools: toolResult.selectedTools,
      compressedMessages: compressionResult.compressedMessages,
      model: routerResult.shouldUseExpensive ? MODELS.EXPENSIVE : MODELS.CHEAP
    },
    optimizationCosts: {
      ollamaCostTool: 0,
      ollamaCostRouter: 0,
      ollamaCostCompression: 0,
      totalOptimizationCost: 0,
      flashCostTool: 0,
      flashCostRouter: 0,
      flashCostCompression: 0,
      totalFlashCost: 0
    },
    tokenSavingsMetrics: {
      contextsTokensBeforeCompression: compressionResult.tokensBeforeCompression,
      contextsTokensAfterCompression: compressionResult.tokensAfterCompression,
      contextTokensBeforeCompression: compressionResult.tokensBeforeCompression,
      contextTokensAfterCompression: compressionResult.tokensAfterCompression,
      tokensAvoidedByQueryRouting: routerResult.tokensAvoided || 0,
      tokensAvoidedByToolSelection: toolResult.tokensAvoided || 0,
      tokensSavedByContextCompression: compressionResult.tokensSaved || 0,
      totalEstimatedTokensSaved:
        (routerResult.tokensAvoided || 0) +
        (toolResult.tokensAvoided || 0) +
        (compressionResult.tokensSaved || 0)
    },
    optimizationDetails: {
      enabled,
      router: routerResult,
      toolSelector: toolResult,
      contextCompressor: compressionResult
    }
  };
}

module.exports = optimizationPipeline;
