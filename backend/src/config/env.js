const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const resolveEnvFileName = () => {
  if (process.env.ENV_FILE) {
    return process.env.ENV_FILE;
  }
  return process.env.NODE_ENV === 'production' ? '.env.docker' : '.env.dev';
};

const envCandidates = Array.from(
  new Set([resolveEnvFileName(), '.env'].filter(Boolean)),
);

const resolveCandidatePath = (candidate) =>
  path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);

const loadedEnvFile = envCandidates.find((candidate) => {
  const filePath = resolveCandidatePath(candidate);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  dotenv.config({ path: filePath });
  return true;
});

if (!loadedEnvFile && process.env.NODE_ENV !== 'production') {
  console.warn(
    `Environment file not found. Looked for ${envCandidates
      .map((candidate) => resolveCandidatePath(candidate))
      .join(', ')}, falling back to system environment variables.`,
  );
}

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;
const llmRequestTimeoutMs = Number(process.env.LLM_REQUEST_TIMEOUT_MS) || 10000;
const mpcServiceUrl = process.env.MPC_SERVICE_URL || '';
const mpcRequestTimeoutMs = Number(process.env.MPC_REQUEST_TIMEOUT_MS) || 10000;
const mpcThreshold = Number(process.env.MPC_THRESHOLD || 0);

module.exports = {
  env,
  port,
  llmRequestTimeoutMs,
  mpcServiceUrl,
  mpcRequestTimeoutMs,
  mpcThreshold,
};
