/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const readManual = (relativePath) => {
  const manualPath = path.resolve(__dirname, '..', relativePath);
  try {
    return fs.readFileSync(manualPath, 'utf8');
  } catch (error) {
    console.warn(`[seed] Manual file not found at ${manualPath}, falling back to placeholder.`);
    return 'Manual content not available.';
  }
};

const manualRecords = [
  {
    taskType: 'research_budget_increase',
    llmName: null,
    version: 'v2025-11-03',
    content: '# 공통 검토 매뉴얼는 별도로 제공되지 않습니다.',
  },
  {
    taskType: 'research_budget_increase',
    llmName: 'Claude',
    version: 'v2025-11-03',
    content: readManual('../llm/claude/manual.md'),
  },
  {
    taskType: 'research_budget_increase',
    llmName: 'GPT',
    version: 'v2025-11-03',
    content: readManual('../llm/gpt/manual.md'),
  },
  {
    taskType: 'research_budget_increase',
    llmName: 'Upstage',
    version: 'v2025-11-03',
    content: readManual('../llm/upstage/manual.md'),
  },
];

const llms = [
  {
    identifier: 'claude',
    displayName: 'Claude',
    model: 'claude-sonnet-4-5',
    status: 'HEALTHY',
    avgLatencyMs: 0,
    approvalRate: 0,
    lastUpdatedAt: new Date('2025-11-03T16:40:00'),
    totalDecisions: 0,
    approvedCount: 0,
    rejectedCount: 0,
  },
  {
    identifier: 'gpt',
    displayName: 'GPT',
    model: 'gpt-4o-mini',
    status: 'HEALTHY',
    avgLatencyMs: 0,
    approvalRate: 0.0,
    lastUpdatedAt: new Date('2025-11-03T16:37:00'),
    totalDecisions: 0,
    approvedCount: 0,
    rejectedCount: 0,
  },
  {
    identifier: 'upstage',
    displayName: 'Upstage',
    model: 'solar-1-mini-chat',
    status: 'HEALTHY',
    avgLatencyMs: 0,
    approvalRate: 0.0,
    lastUpdatedAt: new Date('2025-11-03T16:32:00'),
    totalDecisions: 0,
    approvedCount: 0,
    rejectedCount: 0,
  },
];

const clearDecisionHistory = async () => {
  try {
    await prisma.decisionLLMResult.deleteMany();
    await prisma.decisionTask.deleteMany();
  } catch (error) {
    if (error.code === 'P1008') {
      console.warn(
        '[seed] Skipped clearing decision history because the database was busy. Stop running services and rerun the seed if you need a clean slate.',
      );
      return;
    }
    throw error;
  }
};

async function seedManuals() {
  await prisma.reviewManual.deleteMany({});

  for (const manual of manualRecords) {
    await prisma.reviewManual.create({
      data: {
        taskType: manual.taskType,
        llmName: manual.llmName,
        version: manual.version,
        content: manual.content,
        isActive: true,
      },
    });
  }
}

async function seedLlms() {
  for (const llm of llms) {
    await prisma.lLMService.upsert({
      where: { identifier: llm.identifier },
      update: {
        displayName: llm.displayName,
        model: llm.model,
        status: llm.status,
        avgLatencyMs: llm.avgLatencyMs,
        approvalRate: llm.approvalRate,
        lastUpdatedAt: llm.lastUpdatedAt,
        totalDecisions: llm.totalDecisions,
        approvedCount: llm.approvedCount,
        rejectedCount: llm.rejectedCount,
      },
      create: llm,
    });
  }
}

async function main() {
  await clearDecisionHistory();
  await seedManuals();
  await seedLlms();
}

main()
  .then(async () => {
    console.log('Database seeded successfully ✅');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Database seed failed ❌', error);
    await prisma.$disconnect();
    process.exit(1);
  });
