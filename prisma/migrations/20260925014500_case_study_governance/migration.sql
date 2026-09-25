ALTER TABLE "PortfolioProject"
  ADD COLUMN "caseStudyPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "caseStudySlug" TEXT,
  ADD COLUMN "caseStudyClientName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "caseStudyChallenge" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "caseStudySolution" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "caseStudyOutcomes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "caseStudyApprovalReference" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "caseStudyPublishedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PortfolioProject_caseStudySlug_key"
  ON "PortfolioProject"("caseStudySlug");
