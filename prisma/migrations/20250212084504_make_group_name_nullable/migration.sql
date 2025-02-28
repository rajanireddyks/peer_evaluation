/*
  Warnings:

  - The values [STARTED,SUBMITTED,UNDER_REVIEW,REDO,REJECTED] on the enum `SessionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SessionStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');
ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "SessionStatus_new" USING ("status"::text::"SessionStatus_new");
ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_old";
ALTER TYPE "SessionStatus_new" RENAME TO "SessionStatus";
DROP TYPE "SessionStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "group_name" DROP NOT NULL;
