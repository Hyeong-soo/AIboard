const manualRepository = require('../repositories/manual.repository');

const listManuals = async (req, res, next) => {
  try {
    const { taskType, llmName, withInactive } = req.query;
    const manuals = await manualRepository.findManuals({
      taskType,
      llmName,
      onlyActive: withInactive !== 'true',
    });

    res.json({ items: manuals });
  } catch (error) {
    next(error);
  }
};

const getManual = async (req, res, next) => {
  try {
    const { taskType, llmName } = req.params;
    const manual = await manualRepository.getLatestManual(taskType, llmName);

    if (!manual) {
      return res.status(404).json({ message: 'Manual not found' });
    }

    return res.json(manual);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listManuals,
  getManual,
};
