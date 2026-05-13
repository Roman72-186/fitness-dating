-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "InterestedIn" AS ENUM ('male', 'female', 'all');

-- CreateTable
CREATE TABLE "users" (
    "telegram_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT,
    "age" INTEGER NOT NULL DEFAULT 0,
    "gender" "Gender" NOT NULL DEFAULT 'other',
    "interested_in" "InterestedIn" NOT NULL DEFAULT 'all',
    "about" TEXT NOT NULL DEFAULT '',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "photo_url" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "club" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "telegram_username" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "platform" TEXT NOT NULL DEFAULT 'telegram',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("telegram_id")
);

-- CreateTable
CREATE TABLE "profile_actions" (
    "id" SERIAL NOT NULL,
    "viewer_profile_id" TEXT NOT NULL,
    "target_profile_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "user_a_id" TEXT NOT NULL,
    "user_b_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_actions_target_profile_id_action_idx" ON "profile_actions"("target_profile_id", "action");

-- CreateIndex
CREATE INDEX "profile_actions_viewer_profile_id_idx" ON "profile_actions"("viewer_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_actions_viewer_profile_id_target_profile_id_key" ON "profile_actions"("viewer_profile_id", "target_profile_id");

-- CreateIndex
CREATE INDEX "matches_user_a_id_idx" ON "matches"("user_a_id");

-- CreateIndex
CREATE INDEX "matches_user_b_id_idx" ON "matches"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_a_id_user_b_id_key" ON "matches"("user_a_id", "user_b_id");
