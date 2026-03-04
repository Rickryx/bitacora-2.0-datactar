-- Add finish_reason to shifts table
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS finish_reason text;
