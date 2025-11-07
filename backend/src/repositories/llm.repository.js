const prisma = require('../db/prisma');

const buildStatsIndex = (aggregates = []) => {
  const stats = new Map();
  aggregates.forEach((entry) => {
    const key = entry.llmName?.toLowerCase?.();
    if (!key) return;
    stats.set(key, {
      avgLatencyMs: entry._avg?.durationMs ?? null,
      totalDecisions: entry._count?._all ?? 0,
      approvedCount: 0,
      rejectedCount: 0,
    });
  });
  return stats;
};

const mergeDecisionBreakdown = (stats, breakdown = []) => {
  breakdown.forEach((entry) => {
    const key = entry.llmName?.toLowerCase?.();
    if (!key) return;
    const bucket = stats.get(key) || {
      avgLatencyMs: null,
      totalDecisions: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };
    if (entry.decision === 'APPROVE') {
      bucket.approvedCount = entry._count?._all ?? 0;
    } else if (entry.decision === 'REJECT') {
      bucket.rejectedCount = entry._count?._all ?? 0;
    }
    stats.set(key, bucket);
  });
};

const listLlmServices = async () => {
  const [services, aggregateLatency, decisionBreakdown] = await Promise.all([
    prisma.lLMService.findMany({
      orderBy: { displayName: 'asc' },
    }),
    prisma.decisionLLMResult.groupBy({
      by: ['llmName'],
      _avg: { durationMs: true },
      _count: { _all: true },
    }),
    prisma.decisionLLMResult.groupBy({
      by: ['llmName', 'decision'],
      _count: { _all: true },
    }),
  ]);

  const statsIndex = buildStatsIndex(aggregateLatency);
  mergeDecisionBreakdown(statsIndex, decisionBreakdown);

  return services.map((service) => {
    const key = service.identifier?.toLowerCase?.() || service.displayName?.toLowerCase?.();
    const stats = (key && statsIndex.get(key)) || {
      avgLatencyMs: null,
      totalDecisions: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };

    return {
      id: service.id,
      identifier: service.identifier,
      displayName: service.displayName || service.identifier,
      model: service.model,
      status: service.status,
      avgLatencyMs: stats.avgLatencyMs !== null ? Math.round(stats.avgLatencyMs) : null,
      totalDecisions: stats.totalDecisions,
      approvedCount: stats.approvedCount,
      rejectedCount: stats.rejectedCount,
    };
  });
};

module.exports = {
  listLlmServices,
};
