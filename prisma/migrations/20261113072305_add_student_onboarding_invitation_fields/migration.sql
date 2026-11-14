/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `MembershipInvitation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `MembershipInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MembershipInvitation" ADD COLUMN     "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteeName" VARCHAR(120),
ADD COLUMN     "inviteePhone" VARCHAR(20),
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MembershipInvitation_tokenHash_key" ON "MembershipInvitation"("tokenHash");
