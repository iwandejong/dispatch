-- Trigram indexes make Prisma's case-insensitive `contains` (ILIKE '%q%') fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Issue_title_trgm_idx" ON "Issue" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Issue_description_trgm_idx" ON "Issue" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Label_name_trgm_idx" ON "Label" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "User_displayName_trgm_idx" ON "User" USING GIN ("displayName" gin_trgm_ops);
CREATE INDEX "Project_name_trgm_idx" ON "Project" USING GIN ("name" gin_trgm_ops);
