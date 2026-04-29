// Message conversion utilities:
// - Frontend + internal code uses `{ role, content }`
// - Ollama expects `{ role, content }` (OpenAI-compatible)
// - Bedrock Converse API expects `{ role, content: [{ text }] }`

function normalizeRole(role) {
  if (role === "assistant" || role === "model") {
    return "assistant";
  }

  return "user";
}

// Convert to Bedrock Converse API format.
// Bedrock requires content as an array of content blocks.
function toBedrockMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === "string" && message.content.trim())
    .map((message) => ({
      role: normalizeRole(message.role),
      content: [{ text: message.content }]
    }));
}

// Convert to Ollama-compatible format (same as OpenAI chat format).
function toOllamaMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === "string" && message.content.trim())
    .map((message) => ({
      role: normalizeRole(message.role),
      content: message.content
    }));
}

function toPlainMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role === "assistant" || message.role === "model" ? "assistant" : "user",
      content: message.content
    }));
}

function latestUserMessage(query) {
  return [{ role: "user", content: String(query || "") }];
}

function estimateTokensFromText(text) {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(String(text).length / 4));
}

function estimateTokensFromMessages(messages) {
  return toPlainMessages(messages).reduce((sum, message) => {
    return sum + estimateTokensFromText(message.content) + 4;
  }, 0);
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty model response");
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

module.exports = {
  estimateTokensFromMessages,
  estimateTokensFromText,
  extractJsonObject,
  latestUserMessage,
  toBedrockMessages,
  toOllamaMessages,
  toPlainMessages
};
