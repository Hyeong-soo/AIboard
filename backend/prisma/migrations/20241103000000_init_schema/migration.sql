-- CreateTable
CREATE TABLE "DecisionTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "finalDecision" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DecisionLLMResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "decisionTaskId" INTEGER NOT NULL,
    "llmName" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "confidence" REAL,
    "summary" TEXT NOT NULL,
    "issues" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionLLMResult_decisionTaskId_fkey" FOREIGN KEY ("decisionTaskId") REFERENCES "DecisionTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LLMService" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "avgLatencyMs" INTEGER,
    "approvalRate" REAL,
    "lastUpdatedAt" DATETIME,
    "totalDecisions" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewManual" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskType" TEXT NOT NULL,
    "llmName" TEXT,
    "version" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DecisionTask_reference_key" ON "DecisionTask"("reference");

-- CreateIndex
CREATE INDEX "DecisionLLMResult_decisionTaskId_llmName_idx" ON "DecisionLLMResult"("decisionTaskId", "llmName");

-- CreateIndex
CREATE UNIQUE INDEX "LLMService_identifier_key" ON "LLMService"("identifier");

-- CreateIndex
CREATE INDEX "ReviewManual_taskType_llmName_idx" ON "ReviewManual"("taskType", "llmName");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewManual_taskType_llmName_version_key" ON "ReviewManual"("taskType", "llmName", "version");
