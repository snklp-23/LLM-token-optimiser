// Quick script to list available Bedrock models in your account
const { BedrockClient, ListFoundationModelsCommand } = require("@aws-sdk/client-bedrock");
require("dotenv").config({ path: ".env" });

const client = new BedrockClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function listModels() {
  const command = new ListFoundationModelsCommand({});
  const response = await client.send(command);
  
  const textModels = response.modelSummaries
    .filter(m => m.outputModalities?.includes("TEXT") && m.modelLifecycle?.status === "ACTIVE")
    .map(m => ({
      id: m.modelId,
      name: m.modelName,
      provider: m.providerName,
      input: m.inputModalities,
      streaming: m.responseStreamingSupported
    }));

  console.log("\n=== Available TEXT models (ACTIVE) ===\n");
  for (const m of textModels) {
    console.log(`  ${m.id}  (${m.provider} - ${m.name})`);
  }
  console.log(`\nTotal: ${textModels.length} models`);
}

listModels().catch(e => console.error(e.message));
