-- Alter Session table to store the active story state server-side
ALTER TABLE "Session"
  ADD COLUMN "activeStoryId" TEXT,
  ADD COLUMN "activeStoryKey" TEXT,
  ADD COLUMN "activeStoryTitle" TEXT,
  ADD COLUMN "activeStoryRoundActive" BOOLEAN NOT NULL DEFAULT false;
