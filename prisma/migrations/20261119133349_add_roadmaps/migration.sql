-- CreateTable
CREATE TABLE "Roadmap" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetRole" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "market" JSONB NOT NULL,
    "plan" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Roadmap_userId_createdAt_idx" ON "Roadmap"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
