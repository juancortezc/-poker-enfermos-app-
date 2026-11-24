-- AlterTable
ALTER TABLE "public"."proposals"
ADD COLUMN "image_url" TEXT,
ADD COLUMN "created_by_id" TEXT;

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('thumbsUp', 'thumbsDown');

-- CreateTable
CREATE TABLE "public"."proposal_comments" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proposal_votes" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "vote_type" "public"."VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t29_participants" (
    "id" SERIAL NOT NULL,
    "player_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t29_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proposal_votes_proposal_id_player_id_key" ON "public"."proposal_votes"("proposal_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "t29_participants_player_id_key" ON "public"."t29_participants"("player_id");

-- AddForeignKey
ALTER TABLE "public"."proposals" ADD CONSTRAINT "proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposal_comments" ADD CONSTRAINT "proposal_comments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposal_comments" ADD CONSTRAINT "proposal_comments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposal_votes" ADD CONSTRAINT "proposal_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proposal_votes" ADD CONSTRAINT "proposal_votes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t29_participants" ADD CONSTRAINT "t29_participants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
