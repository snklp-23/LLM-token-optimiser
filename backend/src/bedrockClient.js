const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const { loadEnv } = require("./env");
const { PRICING_PER_MILLION_TOKENS } = require("./constants");
const { trace } = require("./langfuseClient");
const {
  estimateTokensFromMessages,
  estimateTokensFromText,
  toBedrockMessages,
  toPlainMessages
} = require("./messageUtils");

// BedrockClient handles all AWS Bedrock calls for response generation.
// Receives optimized/compressed prompts from the Ollama optimization layer
// and generates responses using the recommended Bedrock model.
class BedrockClient {
  constructor(options = {}) {
    loadEnv();
    this.mock = options.mock || process.env.MOCK_LLM === "true";
    this.pricing = options.pricing || PRICING_PER_MILLION_TOKENS;
    this.enableLangfuse = options.enableLangfuse !== false;

    if (!this.mock) {
      this.client = options.client || new BedrockRuntimeClient({
        region: options.region || process.env.AWS_REGION || "us-east-1",
        credentials: options.credentials || {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
    }
  }

  // Main entrypoint used by server.js for response generation.
  // Supports token counting, cost calculation, and auto-continuation.
  async callModel(modelId, messages, maxTokens = 1000, metadata = {}, requestOptions = {}) {
    if (this.mock) {
      return this.mockCallModel(modelId, messages, maxTokens, metadata, requestOptions);
    }

    const maxPasses = requestOptions.allowContinuation === false ? 1 : 3;
    let workingMessages = messages;
    let fullResponse = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let finishReason = null;

    for (let pass = 0; pass < maxPasses; pass += 1) {
      const singlePass = await this.converseOnce(
        modelId,
        workingMessages,
        maxTokens
      );

      fullResponse = fullResponse
        ? `${fullResponse.trimEnd()}\n${singlePass.response.trimStart()}`
        : singlePass.response;
      totalInputTokens += singlePass.inputTokens;
      totalOutputTokens += singlePass.outputTokens;
      totalCost += singlePass.totalCost;
      finishReason = singlePass.finishReason;

      // If the model stopped due to max tokens, request continuation.
      if (finishReason !== "max_tokens") {
        break;
      }

      workingMessages = [
        ...toPlainMessages(messages),
        { role: "assistant", content: fullResponse },
        {
          role: "user",
          content: "Continue exactly from where you stopped. Do not repeat earlier text. Finish the answer completely."
        }
      ];
    }

    const result = {
      response: fullResponse,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalCost,
      finishReason
    };

    if (this.enableLangfuse) {
      try {
        await trace(`bedrock-${modelId}`, {
          input: {
            model: modelId,
            messages: toPlainMessages(messages),
            maxTokens
          },
          output: {
            response: result.response
          },
          metadata: {
            ...metadata,
            model: modelId,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalCost: result.totalCost,
            finishReason: result.finishReason
          }
        });
      } catch (error) {
        console.warn("Bedrock call succeeded, but Langfuse logging failed:", error.message);
      }
    }

    return result;
  }

  // Single Converse API call. Separated so continuation logic can reuse it.
  async converseOnce(modelId, messages, maxTokens) {
    const bedrockMessages = toBedrockMessages(messages);

    if (bedrockMessages.length === 0) {
      throw new Error("Bedrock call requires at least one message with content.");
    }

    const command = new ConverseCommand({
      modelId,
      messages: bedrockMessages,
      inferenceConfig: {
        maxTokens,
        temperature: 0.7
      }
    });

    const response = await this.client.send(command);

    const responseText = this.extractText(response);
    const usage = response.usage || {};
    const inputTokens = usage.inputTokens || estimateTokensFromMessages(messages);
    const outputTokens = usage.outputTokens || estimateTokensFromText(responseText);
    const totalCost = this.calculateCost(modelId, inputTokens, outputTokens);
    const finishReason = response.stopReason || null;

    return {
      response: responseText,
      inputTokens,
      outputTokens,
      totalCost,
      finishReason
    };
  }

  // Count tokens — Bedrock does not have a standalone count endpoint,
  // so we estimate. Actual token counts come back in the response metadata.
  async countTokens(messages) {
    return estimateTokensFromMessages(messages);
  }

  calculateCost(modelId, inputTokens = 0, outputTokens = 0) {
    const pricing = this.pricing[modelId];

    if (!pricing) {
      // Fall back to cheap pricing if model not in table
      const cheapKey = Object.keys(this.pricing)[0];
      const fallback = this.pricing[cheapKey] || { input: 0.06, output: 0.24 };
      const inputCost = (inputTokens / 1_000_000) * fallback.input;
      const outputCost = (outputTokens / 1_000_000) * fallback.output;
      return inputCost + outputCost;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  extractText(response) {
    if (!response) {
      return "";
    }

    // Bedrock Converse API returns output.message.content as an array of content blocks
    const content = response.output?.message?.content;

    if (Array.isArray(content)) {
      return content
        .map((block) => block.text || "")
        .join("")
        .trim();
    }

    return "";
  }

  async mockCallModel(modelId, messages, maxTokens = 1000, metadata = {}, requestOptions = {}) {
    const plainMessages = toPlainMessages(messages);
    const prompt = plainMessages.map((msg) => msg.content).join("\n").toLowerCase();
    let response = "Mock response from Bedrock.";

    if (prompt.includes("capital of france")) {
      response = "Paris is the capital of France.";
    } else if (prompt.includes("2+2")) {
      response = "2 + 2 = 4.";
    } else if (prompt.includes("latest") || prompt.includes("research")) {
      response = "Here are some recent findings in the field of AI research...";
    }

    const inputTokens = estimateTokensFromMessages(plainMessages);
    const outputTokens = estimateTokensFromText(response);
    const totalCost = this.calculateCost(modelId, inputTokens, outputTokens);

    return {
      response,
      inputTokens,
      outputTokens,
      totalCost,
      finishReason: "end_turn",
      mock: true,
      metadata
    };
  }
}

module.exports = BedrockClient;
