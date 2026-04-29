const { loadEnv } = require("./env");

loadEnv();

// Two-model setup: small fast model for basic queries, larger model for complex tasks.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";
const OLLAMA_CHEAP_MODEL = process.env.OLLAMA_CHEAP_MODEL || "qwen2.5:1.5b";
const OLLAMA_EXPENSIVE_MODEL = process.env.OLLAMA_EXPENSIVE_MODEL || OLLAMA_MODEL;

const MODELS = {
  CHEAP: OLLAMA_CHEAP_MODEL,
  EXPENSIVE: OLLAMA_EXPENSIVE_MODEL
};

// Simulated pricing to demonstrate cost savings from optimization.
// In production, these would map to actual paid API costs.
const PRICING_PER_MILLION_TOKENS = {
  [MODELS.CHEAP]: {
    input: 0.06,
    output: 0.24
  },
  [MODELS.EXPENSIVE]: {
    input: 0.80,
    output: 3.20
  }
};

const EXPENSIVE_TOOL_TOKEN_ESTIMATE = 120;
const EXPENSIVE_QUERY_ROUTING_AVOIDED_TOKENS = 350;

module.exports = {
  MODELS,
  OLLAMA_MODEL,
  PRICING_PER_MILLION_TOKENS,
  EXPENSIVE_TOOL_TOKEN_ESTIMATE,
  EXPENSIVE_QUERY_ROUTING_AVOIDED_TOKENS
};
