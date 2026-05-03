/*
  Warnings:

  - The values [CLEANING,OUT_OF_SERVICE] on the enum `TableStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TableStatus_new" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');
ALTER TABLE "public"."Table" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Table" ALTER COLUMN "status" TYPE "TableStatus_new" USING ("status"::text::"TableStatus_new");
ALTER TYPE "TableStatus" RENAME TO "TableStatus_old";
ALTER TYPE "TableStatus_new" RENAME TO "TableStatus";
DROP TYPE "public"."TableStatus_old";
ALTER TABLE "Table" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;
