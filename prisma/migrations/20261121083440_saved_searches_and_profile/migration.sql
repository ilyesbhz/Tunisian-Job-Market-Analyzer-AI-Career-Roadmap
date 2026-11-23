-- CreateEnum
CREATE TYPE "CareerStatus" AS ENUM ('STUDENT', 'GRADUATE', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "SavedSearch" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "careerStatus" "CareerStatus",
ADD COLUMN     "preferredCountry" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetRole" TEXT;

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
