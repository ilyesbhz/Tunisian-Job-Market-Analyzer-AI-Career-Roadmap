/*
  Warnings:

  - A unique constraint covering the columns `[sourceId,externalId]` on the table `JobOffer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `externalId` to the `JobOffer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "JobOffer_sourceId_externalId_key" ON "JobOffer"("sourceId", "externalId");
