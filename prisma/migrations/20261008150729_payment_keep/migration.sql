-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_parentId_fkey";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "parentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
