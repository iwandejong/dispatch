-- Replace the User/Session tables with a fixed two-value actor: the person (HUMAN) and the coding agent (AGENT).
-- Existing rows are attributed to HUMAN, except audit rows that came in over MCP (AGENT).

CREATE TYPE "Actor" AS ENUM ('HUMAN', 'AGENT');

-- Issue
ALTER TABLE "Issue" ADD COLUMN "assignee" "Actor", ADD COLUMN "createdBy" "Actor" NOT NULL DEFAULT 'HUMAN';
UPDATE "Issue" SET "assignee" = 'HUMAN' WHERE "assigneeId" IS NOT NULL;
ALTER TABLE "Issue" ALTER COLUMN "createdBy" DROP DEFAULT;
ALTER TABLE "Issue" DROP COLUMN "assigneeId", DROP COLUMN "createdById";
CREATE INDEX "Issue_assignee_idx" ON "Issue"("assignee");

-- Comment
ALTER TABLE "Comment" ADD COLUMN "author" "Actor" NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "Comment" ALTER COLUMN "author" DROP DEFAULT;
ALTER TABLE "Comment" DROP COLUMN "authorId";

-- Activity (assignee-change values used to be usernames)
ALTER TABLE "Activity" ADD COLUMN "actor" "Actor" NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "Activity" ALTER COLUMN "actor" DROP DEFAULT;
UPDATE "Activity" SET "from" = CASE WHEN "from" IS NULL THEN NULL ELSE 'HUMAN' END,
                      "to"   = CASE WHEN "to"   IS NULL THEN NULL ELSE 'HUMAN' END
  WHERE "type" = 'ASSIGNEE_CHANGED';
ALTER TABLE "Activity" DROP COLUMN "actorId";
CREATE INDEX "Activity_actor_idx" ON "Activity"("actor");

-- AuditLog
ALTER TABLE "AuditLog" ADD COLUMN "actor" "Actor" NOT NULL DEFAULT 'HUMAN';
UPDATE "AuditLog" SET "actor" = 'AGENT' WHERE "source" = 'mcp';
ALTER TABLE "AuditLog" ALTER COLUMN "actor" DROP DEFAULT;
ALTER TABLE "AuditLog" DROP COLUMN "actorId";
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");

DROP TABLE "Session";
DROP TABLE "User";
DROP TYPE "Role";
