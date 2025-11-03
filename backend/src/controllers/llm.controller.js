const llmRepository = require('../repositories/llm.repository');

const listLlmStatus = async (req, res, next) => {
  try {
    const services = await llmRepository.listLlmServices();
    res.json({ items: services });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLlmStatus,
};
