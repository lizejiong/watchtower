CREATE TABLE "Repository" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "localPath" TEXT NOT NULL,
  "remoteUrl" TEXT NOT NULL,
  "defaultBranch" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "sentryOrgSlug" TEXT NOT NULL,
  "sentryProjectSlug" TEXT NOT NULL,
  "autoRepairEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoRepairRules" JSONB,
  "verificationCmds" JSONB NOT NULL
);

CREATE TABLE "Issue" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "externalIssueId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "culprit" TEXT,
  "level" TEXT,
  "status" TEXT NOT NULL,
  "fingerprint" TEXT,
  "latestEventId" TEXT,
  "release" TEXT,
  "firstSeenAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "Issue_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Issue_repositoryId_externalIssueId_key" ON "Issue"("repositoryId", "externalIssueId");

CREATE TABLE "AnalysisRun" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "issueId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT,
  "rootCause" TEXT,
  "patchBranch" TEXT,
  "prUrl" TEXT,
  "confidence" DOUBLE PRECISION,
  "verification" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalysisRun_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
