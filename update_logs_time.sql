-- Add occurred_at column to logs table
ALTER TABLE public.logs 
ADD COLUMN occurred_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
