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

const createManualVersion = async ({ taskType, llmName = null, content, version }) => {
  const resolvedTaskType = taskType;
  const resolvedLlmName =
    llmName === undefined || llmName === null || `${llmName}`.trim() === ''
      ? null
      : `${llmName}`.trim();
  const resolvedVersion =
    version && `${version}`.trim().length > 0
      ? `${version}`.trim()
      : `v${new Date().toISOString().replace(/[:.]/g, '-')}`;

  const manual = await prisma.$transaction(async (tx) => {
    await tx.reviewManual.updateMany({
      where: {
        taskType: resolvedTaskType,
        llmName: resolvedLlmName,
        isActive: true,
      },
      data: { isActive: false },
    });

    const created = await tx.reviewManual.create({
      data: {
        taskType: resolvedTaskType,
        llmName: resolvedLlmName,
        version: resolvedVersion,
        content,
        isActive: true,
      },
    });

    return created;
  });

  return mapManual(manual);
};

module.exports = {
  findManuals,
  getLatestManual,
  createManualVersion,
};
