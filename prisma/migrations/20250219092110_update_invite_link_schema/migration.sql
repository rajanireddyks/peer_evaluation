/*
  Warnings:

  - A unique constraint covering the columns `[sharing_link]` on the table `invite_links` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_recived_by_fkey";

-- AlterTable
ALTER TABLE "invite_links" ALTER COLUMN "recived_by" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_sharing_link_key" ON "invite_links"("sharing_link");

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_recived_by_fkey" FOREIGN KEY ("recived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
