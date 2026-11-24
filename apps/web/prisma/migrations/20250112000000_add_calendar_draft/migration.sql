-- CreateTable
CREATE TABLE "calendar_drafts" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tournament_number" INTEGER,
    "game_dates" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_drafts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calendar_drafts" ADD CONSTRAINT "calendar_drafts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
