PRAGMA foreign_keys=OFF;

CREATE TABLE "DecisionTask_new" (
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

INSERT INTO "DecisionTask_new" (
  "id",
  "reference",
  "title",
  "requester",
  "submittedAt",
  "summary",
  "finalDecision",
  "createdAt",
  "updatedAt"
) SELECT
  "id",
  "reference",
  "title",
  "requester",
  "submittedAt",
  "summary",
  "finalDecision",
  "createdAt",
  "updatedAt"
FROM "DecisionTask";

DROP TABLE "DecisionTask";

ALTER TABLE "DecisionTask_new" RENAME TO "DecisionTask";

CREATE UNIQUE INDEX "DecisionTask_reference_key" ON "DecisionTask"("reference");

PRAGMA foreign_keys=ON;
