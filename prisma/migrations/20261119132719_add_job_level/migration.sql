-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('INTERNSHIP', 'ENTRY', 'EXPERIENCED');

-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "level" "JobLevel";

-- CreateIndex
CREATE INDEX "JobOffer_level_idx" ON "JobOffer"("level");
