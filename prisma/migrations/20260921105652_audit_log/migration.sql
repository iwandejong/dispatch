-- DropIndex
DROP INDEX "Issue_description_trgm_idx";

-- DropIndex
DROP INDEX "Issue_title_trgm_idx";

-- DropIndex
DROP INDEX "Label_name_trgm_idx";

-- DropIndex
DROP INDEX "Project_name_trgm_idx";

-- DropIndex
DROP INDEX "User_displayName_trgm_idx";

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "meta" JSONB,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
