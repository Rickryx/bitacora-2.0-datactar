-- 1. Enable Realtime for the 'logs' table
-- This ensures Supabase broadcasts changes to connected clients
alter publication supabase_realtime add table public.logs;

-- 2. Allow Public (Anonymous) Read Access
-- Currently, only 'authenticated' users can see logs. 
-- We verify if the policy exists (names might vary if you created them manually) and create a permissive one.

-- This policy allows ANYONE with the API Key/Anon Key to view the logs.
-- Ideally, you would revert this in production or use a Service Role key for your external app.
CREATE POLICY "Public read access" ON public.logs FOR SELECT USING (true);
