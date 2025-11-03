require('./env');

const services = [
  { name: 'claude', url: process.env.LLM_CLAUDE_URL },
  { name: 'gpt', url: process.env.LLM_GPT_URL },
  { name: 'upstage', url: process.env.LLM_UPSTAGE_URL },
];

const llmServices = services.filter((service) => Boolean(service.url));

module.exports = {
  llmServices,
};
