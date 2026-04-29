const axios = require("axios");
const { loadEnv } = require("./env");
const { OLLAMA_MODEL } = require("./constants");
const {
  estimateTokensFromMessages,
  estimateTokensFromText,
  extractJsonObject,
  toPlainMessages
} = require("./messageUtils");

// OllamaClient handles all local LLM calls via Ollama (Mistral 7B).
// Used for routing, prompt optimization, context compression, and tool selection.
// Runs entirely on local hardware — zero API cost.
class OllamaClient {
  constructor(options = {}) {
    loadEnv();
    this.mock = options.mock || process.env.MOCK_LLM === "true";
    this.baseUrl = options.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = options.model || OLLAMA_MODEL;
  }

  // Chat-style call to Ollama. Accepts messages in [{role, content}] format.
  async callModel(messages, maxTokens = 1000, metadata = {}) {
    if (this.mock) {
      return this.mockCallModel(messages, maxTokens, metadata);
    }

    const plainMessages = toPlainMessages(messages);
    const ollamaMessages = plainMessages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content
    }));

    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: this.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature: 0.3
      }
    });

    const data = response.data;
    const responseText = data.message?.content || "";
    const inputTokens = data.prompt_eval_count || estimateTokensFromMessages(plainMessages);
    const outputTokens = data.eval_count || estimateTokensFromText(responseText);

    return {
      response: responseText,
      inputTokens,
      outputTokens,
      totalCost: 0, // Ollama is free — runs locally
      metadata
    };
  }

  // Count tokens for a set of messages. Ollama does not have a dedicated
  // token counting endpoint, so we estimate using the character heuristic.
  async countTokens(messages) {
    return estimateTokensFromMessages(messages);
  }

  // Cost calculation — always zero for local Ollama calls.
  calculateCost(_inputTokens = 0, _outputTokens = 0) {
    return 0;
  }

  // Mock implementation for testing without a running Ollama instance.
  async mockCallModel(messages, maxTokens = 1000, metadata = {}) {
    const plainMessages = toPlainMessages(messages);
    const prompt = plainMessages.map((msg) => msg.content).join("\n").toLowerCase();
    const userQueryMatch = prompt.match(/user query:\s*(.*)/);
    const userQuery = userQueryMatch ? userQueryMatch[1] : prompt;
    let response = "Mock response from Ollama.";

    if (prompt.includes("neededtools")) {
      if (userQuery.includes("2+2") || userQuery.includes("calculate") || userQuery.includes("math")) {
        response = '{"neededTools":["calculator"]}';
      } else if (userQuery.includes("latest") || userQuery.includes("current") || userQuery.includes("today")) {
        response = '{"neededTools":["web_search"]}';
      } else {
        response = '{"neededTools":[]}';
      }
    } else if (
      prompt.includes("shoulduseexpensive") ||
      prompt.includes("route this query to either") ||
      prompt.includes('"usewebsearch"')
    ) {
      const shouldUseExpensive =
        userQuery.includes("latest") ||
        userQuery.includes("today") ||
        userQuery.includes("architecture") ||
        userQuery.includes("research") ||
        userQuery.includes("multi-step") ||
        userQuery.includes("code") ||
        userQuery.includes("debug") ||
        userQuery.includes("automation") ||
        userQuery.includes("cloud") ||
        userQuery.includes("devops") ||
        userQuery.includes("kubernetes");
      const useWebSearch =
        shouldUseExpensive ||
        userQuery.includes("latest") ||
        userQuery.includes("today") ||
        userQuery.includes("weather") ||
        userQuery.includes("time") ||
        userQuery.includes("current");
      response = JSON.stringify({
        shouldUseExpensive,
        useWebSearch,
        taskType: shouldUseExpensive ? "technical" : useWebSearch ? "current-data" : "general",
        reason: shouldUseExpensive
          ? "Technical work should use the expensive model."
          : useWebSearch
            ? "Current-data request should use the cheap model with web search."
            : "Simple general knowledge question."
      });
    } else if (prompt.includes("summarize the key context")) {
      response =
        "The prior conversation discussed programming concepts and examples. Keep the user's learning context and answer the next question directly.";
    } else if (prompt.includes("capital of france")) {
      response = "Paris is the capital of France.";
    } else if (prompt.includes("2+2")) {
      response = "2 + 2 = 4.";
    }

    const inputTokens = estimateTokensFromMessages(plainMessages);
    const outputTokens = estimateTokensFromText(response);

    return {
      response,
      inputTokens,
      outputTokens,
      totalCost: 0,
      mock: true,
      metadata
    };
  }
}

module.exports = OllamaClient;
