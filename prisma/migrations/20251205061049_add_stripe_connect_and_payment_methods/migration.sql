-- AlterTable
ALTER TABLE "Org" ADD COLUMN "stripeConnectAccountId" TEXT,
ADD COLUMN "acceptsCard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "acceptsCash" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "acceptsBankTransfer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "billingDay" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "paymentMethod" TEXT;
