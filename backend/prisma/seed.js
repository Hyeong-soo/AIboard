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

const manuals = [
  {
    taskType: 'research_budget_increase',
    llmName: 'Claude Gateway',
    version: 'v2025-11-03',
    content: readManual('../llm/claude/manual.md'),
  },
  {
    taskType: 'research_budget_increase',
    llmName: 'GPT Orchestrator',
    version: 'v2025-11-03',
    content: readManual('../llm/gpt/manual.md'),
  },
  {
    taskType: 'research_budget_increase',
    llmName: 'Upstage Solar',
    version: 'v2025-11-03',
    content: readManual('../llm/upstage/manual.md'),
  },
];

const llms = [
  {
    identifier: 'claude',
    displayName: 'Claude Gateway',
    model: 'claude-sonnet-4-5',
    status: 'HEALTHY',
    avgLatencyMs: 1120,
    approvalRate: 0.72,
    lastUpdatedAt: new Date('2025-11-03T16:40:00'),
    totalDecisions: 2483,
    approvedCount: 1760,
    rejectedCount: 723,
  },
  {
    identifier: 'gpt',
    displayName: 'GPT Orchestrator',
    model: 'gpt-4o-mini',
    status: 'HEALTHY',
    avgLatencyMs: 890,
    approvalRate: 0.68,
    lastUpdatedAt: new Date('2025-11-03T16:37:00'),
    totalDecisions: 2450,
    approvedCount: 1666,
    rejectedCount: 784,
  },
  {
    identifier: 'upstage',
    displayName: 'Upstage Solar',
    model: 'solar-1-mini-chat',
    status: 'DEGRADED',
    avgLatencyMs: 1430,
    approvalRate: 0.64,
    lastUpdatedAt: new Date('2025-11-03T16:32:00'),
    totalDecisions: 2295,
    approvedCount: 1470,
    rejectedCount: 825,
  },
];

const decisions = [
  {
    reference: 'RB-2025-1103-12',
    title: '자율주행 데이터 레이블링 증액 신청',
    requester: '김민수',
    submittedAt: new Date('2025-11-03T15:12:00'),
    summary: '데이터셋 보강을 위한 외주 레이블링 비용 420,000원 증액 요청',
    finalDecision: 'APPROVE',
    approvals: [
      {
        llmName: 'Claude Gateway',
        decision: 'APPROVE',
        confidence: 0.88,
        summary: '연구 과업과 직접 연관된 고유 데이터 레이블링 비용으로 타당.',
        issues: JSON.stringify([]),
        durationMs: 1180,
      },
      {
        llmName: 'GPT Orchestrator',
        decision: 'APPROVE',
        confidence: 0.81,
        summary: '연구 목표 달성에 필요한 데이터 품질 확보를 위한 지출.',
        issues: JSON.stringify(['견적서 첨부 확인 필요']),
        durationMs: 970,
      },
      {
        llmName: 'Upstage Solar',
        decision: 'REJECT',
        confidence: 0.62,
        summary: '총액 계산 누락으로 심사 보류 필요.',
        issues: JSON.stringify(['총 예산 증액 후 금액 명시 누락']),
        durationMs: 1520,
      },
    ],
  },
  {
    reference: 'RB-2025-1103-11',
    title: 'GPU 서버 임대 연장',
    requester: '이서윤',
    submittedAt: new Date('2025-11-03T14:45:00'),
    summary: '딥러닝 실험 지속을 위한 GPU 클러스터 임대 연장 비용 480,000원',
    finalDecision: 'REJECT',
    approvals: [
      {
        llmName: 'Claude Gateway',
        decision: 'REJECT',
        confidence: 0.74,
        summary: '증액 후 총액이 520,000원으로 상한 초과.',
        issues: JSON.stringify(['총액 상한 500,000원 초과']),
        durationMs: 1090,
      },
      {
        llmName: 'GPT Orchestrator',
        decision: 'REJECT',
        confidence: 0.69,
        summary: '상한 초과 및 기존 계약 만료 여부 증빙 부족.',
        issues: JSON.stringify(['상한 초과', '계약 만료 증빙 부재']),
        durationMs: 880,
      },
      {
        llmName: 'Upstage Solar',
        decision: 'REJECT',
        confidence: 0.66,
        summary: '신청 내용 상한 초과, 대체 방안 제시 필요.',
        issues: JSON.stringify([]),
        durationMs: 1405,
      },
    ],
  },
  {
    reference: 'RB-2025-1103-10',
    title: '실험실 고정 장비 유지보수',
    requester: '박준호',
    submittedAt: new Date('2025-11-03T13:05:00'),
    summary: '연구 장비 소모품 교체 비용 180,000원 증액',
    finalDecision: 'REJECT',
    approvals: [
      {
        llmName: 'Claude Gateway',
        decision: 'REJECT',
        confidence: 0.63,
        summary: '신청 금액이 300,000원 이하로 신청 요건 미충족.',
        issues: JSON.stringify(['신청 금액 300,000원 이하']),
        durationMs: 1230,
      },
      {
        llmName: 'GPT Orchestrator',
        decision: 'REJECT',
        confidence: 0.7,
        summary: '규정상 300,000원 이하는 자동 거절 대상.',
        issues: JSON.stringify([]),
        durationMs: 905,
      },
      {
        llmName: 'Upstage Solar',
        decision: 'REJECT',
        confidence: 0.61,
        summary: '요청 금액이 기준 이하로 신청 대상 아님.',
        issues: JSON.stringify([]),
        durationMs: 1388,
      },
    ],
  },
];

async function seedManuals() {
  for (const manual of manuals) {
    await prisma.reviewManual.upsert({
      where: {
        taskType_llmName_version: {
          taskType: manual.taskType,
          llmName: manual.llmName,
          version: manual.version,
        },
      },
      update: {
        content: manual.content,
        isActive: true,
      },
      create: manual,
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

async function seedDecisions() {
  await prisma.decisionLLMResult.deleteMany();
  await prisma.decisionTask.deleteMany();

  for (const decision of decisions) {
    await prisma.decisionTask.create({
      data: {
        reference: decision.reference,
        title: decision.title,
        requester: decision.requester,
        submittedAt: decision.submittedAt,
        summary: decision.summary,
        finalDecision: decision.finalDecision,
        approvals: {
          create: decision.approvals.map((approval) => ({
            llmName: approval.llmName,
            decision: approval.decision,
            confidence: approval.confidence,
            summary: approval.summary,
            issues: approval.issues,
            durationMs: approval.durationMs,
          })),
        },
      },
    });
  }
}

async function main() {
  await seedManuals();
  await seedLlms();
  await seedDecisions();
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
