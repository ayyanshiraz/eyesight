-- Add per-eye cylinder, axis, screen calibration, and extended diagnosis enum

ALTER TABLE "TestSession"
  ADD COLUMN IF NOT EXISTS "cylRight"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cylLeft"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "axisRight"   INTEGER,
  ADD COLUMN IF NOT EXISTS "axisLeft"    INTEGER,
  ADD COLUMN IF NOT EXISTS "pxPerMm"     DOUBLE PRECISION;

-- Extend DiagnosisClass enum safely
DO $$ BEGIN
  ALTER TYPE "DiagnosisClass" ADD VALUE IF NOT EXISTS 'ASTIGMATISM';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "DiagnosisClass" ADD VALUE IF NOT EXISTS 'MIXED';
EXCEPTION WHEN others THEN NULL; END $$;
