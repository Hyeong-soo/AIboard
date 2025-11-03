const path = require('path');
const dotenv = require('dotenv');

const envFile = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envFile });

if (result.error && process.env.NODE_ENV !== 'production') {
  console.warn(`Environment file not found at ${envFile}, falling back to process defaults.`);
}

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 3000;
const llmRequestTimeoutMs = Number(process.env.LLM_REQUEST_TIMEOUT_MS) || 10000;

module.exports = {
  env,
  port,
  llmRequestTimeoutMs,
};
