const prisma = require('../db/prisma');

const mapManual = (manual) => ({
  id: manual.id,
  taskType: manual.taskType,
  llmName: manual.llmName,
  version: manual.version,
  content: manual.content,
  isActive: manual.isActive,
  createdAt: manual.createdAt,
  updatedAt: manual.updatedAt,
});

const findManuals = async ({ taskType, llmName, onlyActive = true } = {}) => {
  const manuals = await prisma.reviewManual.findMany({
    where: {
      ...(taskType ? { taskType } : {}),
      ...(llmName ? { llmName } : {}),
      ...(onlyActive ? { isActive: true } : {}),
    },
    orderBy: [
      { taskType: 'asc' },
      { llmName: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return manuals.map(mapManual);
};

const getLatestManual = async (taskType, llmName) => {
  const manual = await prisma.reviewManual.findFirst({
    where: {
      taskType,
      llmName,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return manual ? mapManual(manual) : null;
};

module.exports = {
  findManuals,
  getLatestManual,
};
