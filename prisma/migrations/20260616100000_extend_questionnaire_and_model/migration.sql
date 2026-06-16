-- Safe idempotent migration: add extended questionnaire columns + ModelVersion if missing

DO $$ BEGIN
  CREATE TYPE "CataractRisk" AS ENUM ('NONE', 'HALOS', 'FADING', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "TestSession"
  ADD COLUMN IF NOT EXISTS "historyGlasses" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "familyHistory"  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "screenTime"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fatigueScore"   INTEGER,
  ADD COLUMN IF NOT EXISTS "cataractRisk"   "CataractRisk",
  ADD COLUMN IF NOT EXISTS "duochromeScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "readingAdd"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "avgDistanceCm"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ipdConfidence"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "macularDistortion" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "colorVisionPass"   BOOLEAN,
  ADD COLUMN IF NOT EXISTS "astigmatismScore"  INTEGER,
  ADD COLUMN IF NOT EXISTS "contrastScore"     INTEGER,
  ADD COLUMN IF NOT EXISTS "modelVersionId"    TEXT;

DO $$ BEGIN
  CREATE TYPE "DiagnosisClass" AS ENUM ('EMMETROPIA', 'MYOPIA', 'HYPEROPIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "TestSession"
  ADD COLUMN IF NOT EXISTS "diagnosisClass" "DiagnosisClass",
  ADD COLUMN IF NOT EXISTS "recommendation" JSONB,
  ADD COLUMN IF NOT EXISTS "sphLeft"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sphRight"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cylinder"  DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "ModelVersion" (
  "id"        TEXT NOT NULL,
  "version"   TEXT NOT NULL,
  "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metrics"   JSONB NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ModelVersion_version_key" ON "ModelVersion"("version");

DO $$ BEGIN
  ALTER TABLE "TestSession"
    ADD CONSTRAINT "TestSession_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
