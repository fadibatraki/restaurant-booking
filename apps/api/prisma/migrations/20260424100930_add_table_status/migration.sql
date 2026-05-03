-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE');

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE';
