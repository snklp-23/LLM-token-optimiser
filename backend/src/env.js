const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const ENV_KEYS = [
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "BEDROCK_CHEAP_MODEL",
  "BEDROCK_EXPENSIVE_MODEL",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL",
  "PORT"
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filePath));
}

function isPlaceholder(value) {
  return (
    !value ||
    value.includes("your_") ||
    value.includes("[YOUR_ACTUAL_KEY_HERE]") ||
    value === "pk-lf-your_public_key_here" ||
    value === "sk-lf-your_secret_key_here"
  );
}

function chooseValue(currentValue, backendValue, rootValue) {
  if (!isPlaceholder(currentValue)) {
    return currentValue;
  }

  if (!isPlaceholder(backendValue)) {
    return backendValue;
  }

  if (!isPlaceholder(rootValue)) {
    return rootValue;
  }

  return currentValue || backendValue || rootValue;
}

function loadEnv() {
  const backendEnv = readEnvFile(path.resolve(__dirname, "../.env"));
  const rootEnv = readEnvFile(path.resolve(__dirname, "../../.env"));

  for (const key of ENV_KEYS) {
    const value = chooseValue(process.env[key], backendEnv[key], rootEnv[key]);
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  return process.env;
}

module.exports = {
  isPlaceholder,
  loadEnv
};
