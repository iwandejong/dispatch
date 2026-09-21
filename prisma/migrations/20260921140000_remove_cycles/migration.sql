-- Cycles are gone. Drop the issue link, the table, and the CYCLE_CHANGED activity type.
DELETE FROM "Activity" WHERE "type" = 'CYCLE_CHANGED';

ALTER TABLE "Issue" DROP COLUMN "cycleId";
DROP TABLE "Cycle";

ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
CREATE TYPE "ActivityType" AS ENUM ('ISSUE_CREATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED', 'LABEL_ADDED', 'LABEL_REMOVED');
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType" USING ("type"::text::"ActivityType");
DROP TYPE "ActivityType_old";
