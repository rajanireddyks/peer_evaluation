/*
  Warnings:

  - You are about to drop the column `recived_by` on the `invite_links` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `invite_links` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_recived_by_fkey";

-- AlterTable
ALTER TABLE "invite_links" DROP COLUMN "recived_by",
DROP COLUMN "status",
ADD COLUMN     "received_by" JSONB;
