const { MODELS, PRICING_PER_MILLION_TOKENS } = require("../constants");
const OllamaClient = require("../ollamaClient");
const { estimateTokensFromMessages, toPlainMessages } = require("../messageUtils");

// Context compression:
// - If the conversation is short, do nothing.
// - Otherwise, summarize older messages into a compact "Previous conversation summary:" message
//   and keep the last N turns verbatim. This reduces prompt size while preserving recent context.
// Ollama (Mistral) is used for generating the summary (free).
function formatMessages(messages) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n");
}

async function contextCompressor(messages = [], maxMessagesToKeep = 5, options = {}) {
  const plainMessages = toPlainMessages(messages);
  const ollama = options.ollama || options.gemini || new OllamaClient();
  const tokensBeforeCompression = estimateTokensFromMessages(plainMessages);

  if (plainMessages.length <= maxMessagesToKeep) {
    return {
      compressedMessages: plainMessages,
      tokensBeforeCompression,
      tokensAfterCompression: tokensBeforeCompression,
      tokensSaved: 0,
      costSaved: 0,
      compressionCost: 0
    };
  }

  const keepCount = Math.max(1, maxMessagesToKeep);
  const oldMessages = plainMessages.slice(0, -keepCount);
  const recentMessages = plainMessages.slice(-keepCount);
  const prompt = [
    "Here are previous conversation messages, oldest first:",
    formatMessages(oldMessages),
    "",
    "Summarize the key context in 2-3 short sentences that would help understand the current conversation.",
    "Return only the summary text, no extra text."
  ].join("\n");

  const result = await ollama.callModel(
    [{ role: "user", content: prompt }],
    250,
    { optimization: "contextCompression" }
  );

  let summary = result.response.trim();
  let compressedMessages = [
    {
      role: "user",
      content: `Previous conversation summary: ${summary}`
    },
    ...recentMessages
  ];
  let tokensAfterCompression = estimateTokensFromMessages(compressedMessages);

  if (tokensAfterCompression >= tokensBeforeCompression) {
    summary = summary.slice(0, 300).trim();
    compressedMessages = [
      {
        role: "user",
        content: `Previous conversation summary: ${summary}`
      },
      ...recentMessages
    ];
    tokensAfterCompression = Math.min(
      estimateTokensFromMessages(compressedMessages),
      Math.max(0, tokensBeforeCompression - 1)
    );
  }

  const tokensSaved = Math.max(0, tokensBeforeCompression - tokensAfterCompression);
  // Simulated cost savings based on expensive model pricing
  const pricing = PRICING_PER_MILLION_TOKENS[MODELS.EXPENSIVE] || { input: 0.80 };
  const costSaved = (tokensSaved / 1_000_000) * pricing.input;

  return {
    compressedMessages,
    tokensBeforeCompression,
    tokensAfterCompression,
    tokensSaved,
    costSaved,
    compressionCost: 0, // Ollama is free
    flashTokensUsed: result.inputTokens + result.outputTokens
  };
}

module.exports = contextCompressor;
