const prisma = require('../db/prisma');

const parseIssues = (issues) => {
  if (!issues) return [];
  try {
    const parsed = JSON.parse(issues);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const mapDecisionApproval = (approval) => ({
  id: approval.id,
  llmName: approval.llmName,
  decision: approval.decision,
  confidence: approval.confidence,
  summary: approval.summary,
  issues: parseIssues(approval.issues),
  durationMs: approval.durationMs,
  createdAt: approval.createdAt,
});

const mapDecisionTask = (task) => ({
  id: task.id,
  reference: task.reference,
  title: task.title,
  requester: task.requester,
  submittedAt: task.submittedAt,
  summary: task.summary,
  finalDecision: task.finalDecision,
  approvals: task.approvals?.map(mapDecisionApproval) ?? [],
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const listDecisions = async (options = {}) => {
  const take = options.take ?? 20;
  const skip = options.skip ?? 0;

  const [total, tasks] = await Promise.all([
    prisma.decisionTask.count(),
    prisma.decisionTask.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { approvals: true },
      take,
      skip,
    }),
  ]);

  return {
    total,
    items: tasks.map(mapDecisionTask),
  };
};

const getDecisionById = async (id) => {
  const task = await prisma.decisionTask.findUnique({
    where: { id: Number(id) },
    include: { approvals: true },
  });

  if (!task) {
    return null;
  }

  return mapDecisionTask(task);
};

const createDecision = async (data) => {
  const task = await prisma.decisionTask.create({
    data: {
      reference: data.reference,
      title: data.title,
      requester: data.requester,
      submittedAt: data.submittedAt,
      summary: data.summary,
      finalDecision: data.finalDecision,
      approvals: {
        create: data.approvals.map((approval) => ({
          llmName: approval.llmName,
          decision: approval.decision,
          confidence: approval.confidence ?? null,
          summary: approval.summary,
          issues: approval.issues ? JSON.stringify(approval.issues) : JSON.stringify([]),
          durationMs: approval.durationMs ?? null,
        })),
      },
    },
    include: { approvals: true },
  });

  return mapDecisionTask(task);
};

module.exports = {
  listDecisions,
  getDecisionById,
  createDecision,
};
