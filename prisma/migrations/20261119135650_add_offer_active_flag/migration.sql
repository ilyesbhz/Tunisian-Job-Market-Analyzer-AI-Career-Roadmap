-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastImportedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "JobOffer_isActive_country_idx" ON "JobOffer"("isActive", "country");
