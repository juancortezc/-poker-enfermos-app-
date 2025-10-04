-- Create comments table for ProposalV2 entries
CREATE TABLE "proposal_v2_comments" (
    "id" SERIAL PRIMARY KEY,
    "proposal_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proposal_v2_comments_proposal_id_fkey"
      FOREIGN KEY ("proposal_id") REFERENCES "proposals_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposal_v2_comments_player_id_fkey"
      FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create votes table for ProposalV2 entries
CREATE TABLE "proposal_v2_votes" (
    "id" SERIAL PRIMARY KEY,
    "proposal_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "vote_type" "VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proposal_v2_votes_proposal_id_fkey"
      FOREIGN KEY ("proposal_id") REFERENCES "proposals_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposal_v2_votes_player_id_fkey"
      FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Ensure each player can only vote once per proposal
CREATE UNIQUE INDEX "proposal_v2_votes_proposal_id_player_id_key"
  ON "proposal_v2_votes" ("proposal_id", "player_id");
