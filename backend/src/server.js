const fs = require("fs");
const os = require("os");
const path = require("path");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const { loadEnv } = require("./env");

loadEnv();

const { MODELS, PRICING_PER_MILLION_TOKENS } = require("./constants");
const OllamaClient = require("./ollamaClient");
const { getRecentCalls, getSummary, recordCall } = require("./metricsStore");
const optimizationPipeline = require("./optimizationPipeline");
const { toPlainMessages } = require("./messageUtils");
const { addFiles, getFiles, listFiles, removeFile } = require("./sessionStore");
const { trace, verifyLangfuseConnection } = require("./langfuseClient");

const app = express();
const port = process.env.PORT || 3001;
const uploadDirectory = path.join(os.tmpdir(), "token-optimizer-uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  dest: uploadDirectory,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10
  }
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function selectedToolDescriptions(availableTools = [], selectedToolNames = []) {
  const selected = new Set(selectedToolNames);
  return availableTools
    .filter((tool) => selected.has(tool.name))
    .map((tool) => `${tool.name}: ${tool.description || "No description"}`)
    .join("\n");
}

function buildProcessingMessages(query, conversationHistory, availableTools, decision) {
  const compressedMessages = Array.isArray(decision?.compressedMessages)
    ? toPlainMessages(decision.compressedMessages)
    : toPlainMessages(conversationHistory);
  const toolContext = selectedToolDescriptions(availableTools, decision?.selectedTools || []);
  const messages = [];

  if (toolContext) {
    messages.push({
      role: "user",
      content: [
        "Relevant tools available for this response:",
        toolContext,
        "Use these tools conceptually when helpful, but answer directly in natural language."
      ].join("\n")
    });
  }

  messages.push(...compressedMessages);
  messages.push({
    role: "user",
    content: query
  });

  return messages;
}

// File upload endpoint — stores files locally for this session.
app.post(
  "/api/files",
  upload.array("files", 10),
  asyncHandler(async (req, res) => {
    const sessionId = req.body.sessionId || "default-session";
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ error: "At least one file is required" });
    }

    const uploaded = [];

    for (const file of files) {
      uploaded.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sessionId,
        name: file.originalname,
        mimeType: file.mimetype || "application/octet-stream",
        localPath: file.path,
        size: file.size
      });
    }

    addFiles(sessionId, uploaded);
    res.json({ files: uploaded });
  })
);

app.get(
  "/api/files/:sessionId",
  asyncHandler(async (req, res) => {
    res.json({ files: listFiles(req.params.sessionId) });
  })
);

app.delete(
  "/api/files/:sessionId/:fileId",
  asyncHandler(async (req, res) => {
    const { removedFile, files } = removeFile(req.params.sessionId, req.params.fileId);
    if (removedFile?.localPath) {
      fs.promises.unlink(removedFile.localPath).catch(() => {});
    }
    res.json({ files });
  })
);

app.post(
  "/api/optimize",
  asyncHandler(async (req, res) => {
    const {
      query,
      sessionId = "default-session",
      attachmentIds = [],
      conversationHistory = [],
      availableTools = [],
      useOptimizations = {}
    } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "query is required" });
    }

    const output = await optimizationPipeline({
      userQuery: query,
      conversationHistory,
      availableTools,
      useOptimizations
    });

    res.json(output);
  })
);

app.post(
  "/api/process",
  asyncHandler(async (req, res) => {
    const {
      query,
      sessionId = "default-session",
      attachmentIds = [],
      conversationHistory = [],
      availableTools = [],
      optimizationOutput,
      useOptimizations = {}
    } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "query is required" });
    }

    const effectiveOptimizationOutput =
      optimizationOutput ||
      (await optimizationPipeline({
        userQuery: query,
        conversationHistory,
        availableTools,
        useOptimizations
      }));

    const decision = effectiveOptimizationOutput.decision || {};
    const model = decision.shouldUseExpensive ? MODELS.EXPENSIVE : MODELS.CHEAP;
    const messages = buildProcessingMessages(
      query,
      conversationHistory,
      availableTools,
      decision
    );

    // Use the model chosen by the router — cheap (fast, small) or expensive (powerful)
    const ollama = new OllamaClient({ model });
    const result = await ollama.callModel(
      messages,
      decision.shouldUseExpensive ? 2800 : 1800,
      {
        endpoint: "/api/process",
        selectedTools: decision.selectedTools || [],
        routingReason: decision.routingReason,
        sessionId
      }
    );

    // Apply simulated pricing based on the routing decision
    const pricing = PRICING_PER_MILLION_TOKENS[model] || PRICING_PER_MILLION_TOKENS[MODELS.CHEAP];
    const simulatedCost =
      (result.inputTokens / 1_000_000) * pricing.input +
      (result.outputTokens / 1_000_000) * pricing.output;

    const savedMetrics = effectiveOptimizationOutput.tokenSavingsMetrics || {};
    const recorded = recordCall({
      query,
      model,
      response: result.response,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalCost: simulatedCost,
      optimizationCosts: effectiveOptimizationOutput.optimizationCosts || {},
      tokenSavingsMetrics: savedMetrics,
      tokensSaved: savedMetrics.totalEstimatedTokensSaved || 0,
      decision
    });

    try {
      await trace("full-query-optimization", {
        input: {
          query,
          conversationLength: conversationHistory.length,
          availableToolCount: availableTools.length
        },
        output: {
          response: result.response,
          model
        },
        metadata: {
          modelUsed: model,
          optimizationsUsed: useOptimizations,
          selectedTools: decision.selectedTools || [],
          useWebSearch: Boolean(decision.useWebSearch),
          taskType: decision.taskType || null,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalCostWithOptimization: simulatedCost,
          optimizationCosts: effectiveOptimizationOutput.optimizationCosts || {},
          tokenSavingsMetrics: savedMetrics
        }
      });
    } catch (error) {
      console.warn("Full-flow Langfuse logging failed:", error.message);
    }

    res.json({
      response: result.response,
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalCost: simulatedCost,
      finishReason: result.finishReason,
      metrics: recorded,
      optimizationOutput: effectiveOptimizationOutput
    });
  })
);

app.get(
  "/api/metrics",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit || 10);
    res.json({
      summary: getSummary(),
      calls: getRecentCalls(Number.isFinite(limit) ? limit : 10)
    });
  })
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "token-optimizer-backend",
    architecture: "ollama-only",
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Internal server error"
  });
});

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`Architecture: Ollama-only (all local, zero API cost)`);
    await verifyLangfuseConnection();
  });
}

module.exports = app;
