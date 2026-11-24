-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('Comision', 'Enfermo', 'Invitado');

-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('ACTIVO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "public"."GameDateStatus" AS ENUM ('pending', 'CREATED', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."TimerStatus" AS ENUM ('inactive', 'active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "public"."TimerActionType" AS ENUM ('start', 'pause', 'resume', 'stop', 'level_up', 'level_down', 'reset');

-- CreateTable
CREATE TABLE "public"."players" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "join_date" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_temporary" BOOLEAN,
    "inviter_id" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "admin_key" TEXT,
    "aliases" TEXT[],
    "join_year" INTEGER,
    "last_victory_date" TEXT,
    "pin" TEXT,
    "birth_date" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournaments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'ACTIVO',
    "participant_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_dates" (
    "id" SERIAL NOT NULL,
    "date_number" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."GameDateStatus" NOT NULL DEFAULT 'pending',
    "player_ids" TEXT[],
    "start_time" TIMESTAMP(3),
    "players_min" INTEGER NOT NULL DEFAULT 9,
    "players_max" INTEGER NOT NULL DEFAULT 24,
    "tournament_id" INTEGER NOT NULL,

    CONSTRAINT "game_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_results" (
    "id" SERIAL NOT NULL,
    "player_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "game_date_id" INTEGER NOT NULL,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."eliminations" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "eliminated_player_id" TEXT NOT NULL,
    "eliminator_player_id" TEXT NOT NULL,
    "elimination_time" TEXT NOT NULL,
    "game_date_id" INTEGER NOT NULL,

    CONSTRAINT "eliminations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_rankings" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "game_date_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "ranking_position" INTEGER NOT NULL,
    "accumulated_points" INTEGER NOT NULL,
    "elimination_positions" INTEGER[],

    CONSTRAINT "tournament_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_drafts" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tournamentNumber" INTEGER,
    "gameDates" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "calendar_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timer_states" (
    "id" SERIAL NOT NULL,
    "game_date_id" INTEGER NOT NULL,
    "status" "public"."TimerStatus" NOT NULL DEFAULT 'inactive',
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "time_remaining" INTEGER NOT NULL DEFAULT 0,
    "total_elapsed" INTEGER NOT NULL DEFAULT 0,
    "start_time" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "paused_duration" INTEGER NOT NULL DEFAULT 0,
    "level_start_time" TIMESTAMP(3),
    "blind_levels" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timer_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timer_actions" (
    "id" SERIAL NOT NULL,
    "timer_state_id" INTEGER NOT NULL,
    "action_type" "public"."TimerActionType" NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_level" INTEGER,
    "to_level" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "timer_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blind_levels" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "small_blind" INTEGER NOT NULL,
    "big_blind" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "blind_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_participants" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."parent_child_stats" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "parent_player_id" TEXT NOT NULL,
    "child_player_id" TEXT NOT NULL,
    "elimination_count" INTEGER NOT NULL,
    "is_active_relation" BOOLEAN NOT NULL DEFAULT false,
    "first_elimination" TIMESTAMP(3) NOT NULL,
    "last_elimination" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_child_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_winners" (
    "id" SERIAL NOT NULL,
    "tournament_number" INTEGER NOT NULL,
    "champion_id" TEXT NOT NULL,
    "runner_up_id" TEXT NOT NULL,
    "third_place_id" TEXT NOT NULL,
    "siete_id" TEXT NOT NULL,
    "dos_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proposals" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_number_key" ON "public"."tournaments"("number");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rankings_tournament_id_game_date_id_player_id_key" ON "public"."tournament_rankings"("tournament_id", "game_date_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "timer_states_game_date_id_key" ON "public"."timer_states"("game_date_id");

-- CreateIndex
CREATE UNIQUE INDEX "blind_levels_tournament_id_level_key" ON "public"."blind_levels"("tournament_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_player_id_key" ON "public"."tournament_participants"("tournament_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_child_stats_tournament_id_parent_player_id_child_pla_key" ON "public"."parent_child_stats"("tournament_id", "parent_player_id", "child_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_winners_tournament_number_key" ON "public"."tournament_winners"("tournament_number");

-- AddForeignKey
ALTER TABLE "public"."players" ADD CONSTRAINT "players_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_dates" ADD CONSTRAINT "game_dates_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_results" ADD CONSTRAINT "game_results_game_date_id_fkey" FOREIGN KEY ("game_date_id") REFERENCES "public"."game_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_results" ADD CONSTRAINT "game_results_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."eliminations" ADD CONSTRAINT "eliminations_game_date_id_fkey" FOREIGN KEY ("game_date_id") REFERENCES "public"."game_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."eliminations" ADD CONSTRAINT "eliminations_eliminated_player_id_fkey" FOREIGN KEY ("eliminated_player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."eliminations" ADD CONSTRAINT "eliminations_eliminator_player_id_fkey" FOREIGN KEY ("eliminator_player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_rankings" ADD CONSTRAINT "tournament_rankings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_rankings" ADD CONSTRAINT "tournament_rankings_game_date_id_fkey" FOREIGN KEY ("game_date_id") REFERENCES "public"."game_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_rankings" ADD CONSTRAINT "tournament_rankings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timer_states" ADD CONSTRAINT "timer_states_game_date_id_fkey" FOREIGN KEY ("game_date_id") REFERENCES "public"."game_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timer_actions" ADD CONSTRAINT "timer_actions_timer_state_id_fkey" FOREIGN KEY ("timer_state_id") REFERENCES "public"."timer_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timer_actions" ADD CONSTRAINT "timer_actions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blind_levels" ADD CONSTRAINT "blind_levels_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."parent_child_stats" ADD CONSTRAINT "parent_child_stats_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."parent_child_stats" ADD CONSTRAINT "parent_child_stats_parent_player_id_fkey" FOREIGN KEY ("parent_player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."parent_child_stats" ADD CONSTRAINT "parent_child_stats_child_player_id_fkey" FOREIGN KEY ("child_player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_winners" ADD CONSTRAINT "tournament_winners_champion_id_fkey" FOREIGN KEY ("champion_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_winners" ADD CONSTRAINT "tournament_winners_runner_up_id_fkey" FOREIGN KEY ("runner_up_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_winners" ADD CONSTRAINT "tournament_winners_third_place_id_fkey" FOREIGN KEY ("third_place_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_winners" ADD CONSTRAINT "tournament_winners_siete_id_fkey" FOREIGN KEY ("siete_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_winners" ADD CONSTRAINT "tournament_winners_dos_id_fkey" FOREIGN KEY ("dos_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

