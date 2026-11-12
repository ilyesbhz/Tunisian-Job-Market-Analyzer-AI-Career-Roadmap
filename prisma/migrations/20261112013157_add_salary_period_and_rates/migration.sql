-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "salaryPeriod" "SalaryPeriod";

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "currency" TEXT NOT NULL,
    "perTnd" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency")
);
