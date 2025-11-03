const decisionRepository = require('../repositories/decision.repository');

const listDecisions = async (req, res, next) => {
  try {
    const take = req.query.limit ? Number(req.query.limit) : undefined;
    const skip = req.query.offset ? Number(req.query.offset) : undefined;
    const result = await decisionRepository.listDecisions({ take, skip });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getDecision = async (req, res, next) => {
  try {
    const decision = await decisionRepository.getDecisionById(req.params.id);

    if (!decision) {
      return res.status(404).json({ message: 'Decision not found' });
    }

    return res.json(decision);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listDecisions,
  getDecision,
};
