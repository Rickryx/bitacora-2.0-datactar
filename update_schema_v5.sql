-- ==============================================
-- BITÁCORA 2.0 — SCHEMA UPDATE v5
-- Fixes: entity_id in profiles, COORDINATOR RLS
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Add entity_id to profiles (was never added in previous migrations)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL;

-- 2. Allow ADMIN and COORDINATOR to update any profile
--    (needed for "Asignar Personal" in entities tab)
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile." ON public.profiles
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'COORDINATOR')
  );

-- 3. Fix shifts SELECT: include COORDINATOR
DROP POLICY IF EXISTS "Users can view their own shifts." ON public.shifts;
CREATE POLICY "Users can view their own shifts." ON public.shifts
  FOR SELECT USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'COORDINATOR')
  );

-- 4. Fix shifts ALL (manage): include COORDINATOR
DROP POLICY IF EXISTS "Admins can manage all shifts." ON public.shifts;
CREATE POLICY "Admins can manage all shifts." ON public.shifts
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'COORDINATOR')
  );

-- 5. Fix logs SELECT: include COORDINATOR
DROP POLICY IF EXISTS "Admins can view all logs." ON public.logs;
CREATE POLICY "Admins can view all logs." ON public.logs
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'COORDINATOR')
  );

-- 6. Ensure expected_rounds exists in shifts (may be missing)
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS expected_rounds integer DEFAULT 3;

-- 7. Allow ADMIN/COORDINATOR to insert logs (for any entity they manage)
DROP POLICY IF EXISTS "Admins can insert logs." ON public.logs;
CREATE POLICY "Admins can insert logs." ON public.logs
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'COORDINATOR')
    OR EXISTS (
      SELECT 1 FROM public.shifts
      WHERE shifts.user_id = auth.uid()
      AND shifts.entity_id = logs.entity_id
      AND shifts.status = 'ACTIVE'
    )
  );
