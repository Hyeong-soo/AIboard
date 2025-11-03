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

const createManual = async (req, res, next) => {
  try {
    const { taskType, llmName, content, version } = req.body || {};
    const normalizedTaskType =
      typeof taskType === 'string' ? taskType.trim() : '';
    const normalizedContent =
      typeof content === 'string' ? content : null;
    const normalizedLlmName =
      llmName === null || llmName === undefined
        ? null
        : typeof llmName === 'string' && llmName.trim().length > 0
        ? llmName.trim()
        : null;
    const normalizedVersion =
      typeof version === 'string' && version.trim().length > 0
        ? version.trim()
        : undefined;

    if (!normalizedTaskType) {
      return res.status(400).json({ message: 'taskType is required' });
    }

    if (!normalizedContent || normalizedContent.trim().length === 0) {
      return res.status(400).json({ message: 'content must be a non-empty string' });
    }

    const manual = await manualRepository.createManualVersion({
      taskType: normalizedTaskType,
      llmName: normalizedLlmName,
      content: normalizedContent,
      version: normalizedVersion,
    });

    return res.status(201).json(manual);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listManuals,
  getManual,
  createManual,
};
