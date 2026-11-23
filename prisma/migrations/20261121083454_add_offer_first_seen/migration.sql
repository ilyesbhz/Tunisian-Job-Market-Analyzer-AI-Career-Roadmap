-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "JobOffer_firstSeenAt_idx" ON "JobOffer"("firstSeenAt");
