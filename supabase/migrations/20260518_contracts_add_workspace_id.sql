-- Add workspace_id and created_by_user_id to contracts if missing, then backfill from jobs.
-- This is the source-of-truth fix so the talent portal can query directly.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS workspace_id        uuid REFERENCES premium_workspaces(id),
  ADD COLUMN IF NOT EXISTS created_by_user_id  uuid REFERENCES auth.users(id);

-- Backfill workspace_id from the linked job
UPDATE public.contracts c
SET    workspace_id = j.workspace_id
FROM   public.jobs j
WHERE  c.job_id         = j.id
  AND  c.workspace_id   IS NULL
  AND  j.workspace_id   IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_workspace_id_idx
  ON public.contracts (workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_talent_workspace_idx
  ON public.contracts (talent_user_id, workspace_id)
  WHERE workspace_id IS NOT NULL;
