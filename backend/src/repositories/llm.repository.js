const prisma = require('../db/prisma');

const mapService = (service) => ({
  id: service.id,
  identifier: service.identifier,
  displayName: service.displayName,
  model: service.model,
  status: service.status,
  avgLatencyMs: service.avgLatencyMs,
  approvalRate: service.approvalRate,
  lastUpdatedAt: service.lastUpdatedAt,
  totalDecisions: service.totalDecisions,
  approvedCount: service.approvedCount,
  rejectedCount: service.rejectedCount,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});

const listLlmServices = async () => {
  const services = await prisma.lLMService.findMany({
    orderBy: { displayName: 'asc' },
  });

  return services.map(mapService);
};

module.exports = {
  listLlmServices,
};
