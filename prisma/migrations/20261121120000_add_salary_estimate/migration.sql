-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "estimatedSalaryBracket" TEXT,
ADD COLUMN     "estimatedSalaryConfidence" DOUBLE PRECISION,
ADD COLUMN     "estimatedSalaryCurrency" TEXT,
ADD COLUMN     "estimatedSalaryMax" INTEGER,
ADD COLUMN     "estimatedSalaryMin" INTEGER;
