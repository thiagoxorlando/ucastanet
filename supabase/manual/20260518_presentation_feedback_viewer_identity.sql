-- Add viewer identity columns to presentation_feedback
-- Allows agencies to see named, attributed feedback instead of anonymous totals.

ALTER TABLE presentation_feedback
  ADD COLUMN IF NOT EXISTS viewer_name    text,
  ADD COLUMN IF NOT EXISTS viewer_company text,
  ADD COLUMN IF NOT EXISTS viewer_email   text;
