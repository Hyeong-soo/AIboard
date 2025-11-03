const { llmRequestTimeoutMs } = require('./env');

const resolveTimeout = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : llmRequestTimeoutMs;
};

const services = [
  {
    name: 'claude',
    url: process.env.LLM_CLAUDE_URL,
    timeoutMs: resolveTimeout(process.env.LLM_CLAUDE_TIMEOUT_MS),
  },
  {
    name: 'gpt',
    url: process.env.LLM_GPT_URL,
    timeoutMs: resolveTimeout(process.env.LLM_GPT_TIMEOUT_MS),
  },
  {
    name: 'upstage',
    url: process.env.LLM_UPSTAGE_URL,
    timeoutMs: resolveTimeout(process.env.LLM_UPSTAGE_TIMEOUT_MS),
  },
];

const llmServices = services.filter((service) => Boolean(service.url));

module.exports = {
  llmServices,
};
