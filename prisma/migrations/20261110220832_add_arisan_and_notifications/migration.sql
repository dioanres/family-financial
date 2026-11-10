-- CreateEnum
CREATE TYPE "ArisanStatus" AS ENUM ('OPEN', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ArisanRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Arisan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributionAmount" DOUBLE PRECISION NOT NULL,
    "paymentDueDay" INTEGER NOT NULL,
    "drawDay" INTEGER NOT NULL,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "joinCode" TEXT NOT NULL,
    "status" "ArisanStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArisanMember" (
    "id" TEXT NOT NULL,
    "arisanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ArisanRole" NOT NULL DEFAULT 'MEMBER',
    "hasWon" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArisanMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArisanPeriod" (
    "id" TEXT NOT NULL,
    "arisanId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "drawDate" TIMESTAMP(3) NOT NULL,
    "winnerMemberId" TEXT,
    "drawnAt" TIMESTAMP(3),

    CONSTRAINT "ArisanPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArisanPayment" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "ArisanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Arisan_joinCode_key" ON "Arisan"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanMember_arisanId_userId_key" ON "ArisanMember"("arisanId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPeriod_winnerMemberId_key" ON "ArisanPeriod"("winnerMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPeriod_arisanId_periodNumber_key" ON "ArisanPeriod"("arisanId", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ArisanPayment_periodId_memberId_key" ON "ArisanPayment"("periodId", "memberId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Arisan" ADD CONSTRAINT "Arisan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanMember" ADD CONSTRAINT "ArisanMember_arisanId_fkey" FOREIGN KEY ("arisanId") REFERENCES "Arisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanMember" ADD CONSTRAINT "ArisanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPeriod" ADD CONSTRAINT "ArisanPeriod_arisanId_fkey" FOREIGN KEY ("arisanId") REFERENCES "Arisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPeriod" ADD CONSTRAINT "ArisanPeriod_winnerMemberId_fkey" FOREIGN KEY ("winnerMemberId") REFERENCES "ArisanMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPayment" ADD CONSTRAINT "ArisanPayment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ArisanPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArisanPayment" ADD CONSTRAINT "ArisanPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ArisanMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

