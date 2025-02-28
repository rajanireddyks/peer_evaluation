/*
  Warnings:

  - You are about to drop the column `evaluation_type` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `group_size` on the `groups` table. All the data in the column will be lost.
  - Added the required column `session_id` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evaluation_type` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_size` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_students` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "EvaluationStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "groups" DROP COLUMN "evaluation_type",
DROP COLUMN "group_size",
ADD COLUMN     "session_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "evaluation_type" "EvaluationType" NOT NULL,
ADD COLUMN     "group_size" INTEGER NOT NULL,
ADD COLUMN     "total_students" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
