-- ==========================================
-- BITÁCORA 2.0 - SUPABASE FINAL SCHEMA UPDATE
-- ==========================================

-- 1. Create Entities Table
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  address text,
  description text
);

-- 2. Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  entity_id uuid REFERENCES public.entities(id) NOT NULL,
  scheduled_start timestamp with time zone,
  scheduled_end timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'))
);

-- 3. Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_id text;

-- 4. Update Logs Table (New Columns)
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id);
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS critical_level text DEFAULT 'BAJA' CHECK (critical_level IN ('BAJA', 'MEDIA', 'ALTA'));
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS signature_url text;

-- 5. Data Migration (Optional/Safety)
-- Create a default entity if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.entities WHERE name = 'Entidad Defecto') THEN
        INSERT INTO public.entities (name, address, description)
        VALUES ('Entidad Defecto', 'Dirección no especificada', 'Entidad inicial para migración de datos');
    END IF;
END $$;

-- Assign existing logs to the default entity if they are null
UPDATE public.logs 
SET entity_id = (SELECT id FROM public.entities WHERE name = 'Entidad Defecto' LIMIT 1) 
WHERE entity_id IS NULL;

-- 6. RLS (Row Level Security) Configuration
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Entities Policy
DROP POLICY IF EXISTS "Entities are viewable by authenticated users." ON public.entities;
CREATE POLICY "Entities are viewable by authenticated users." ON public.entities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Shifts Policies
DROP POLICY IF EXISTS "Users can view their own shifts." ON public.shifts;
CREATE POLICY "Users can view their own shifts." ON public.shifts
  FOR SELECT USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

DROP POLICY IF EXISTS "Admins can manage all shifts." ON public.shifts;
CREATE POLICY "Admins can manage all shifts." ON public.shifts
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

DROP POLICY IF EXISTS "Users can update their own shifts." ON public.shifts;
CREATE POLICY "Users can update their own shifts." ON public.shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- Logs Policies (Restricted by shift/entity)
DROP POLICY IF EXISTS "Admins can view all logs." ON public.logs;
CREATE POLICY "Admins can view all logs." ON public.logs
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

DROP POLICY IF EXISTS "Guards can view logs of their active shift entity." ON public.logs;
CREATE POLICY "Guards can view logs of their active shift entity." ON public.logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shifts
      WHERE shifts.user_id = auth.uid()
      AND shifts.entity_id = logs.entity_id
      AND shifts.status = 'ACTIVE'
    )
  );

-- 7. Helper Functions
CREATE OR REPLACE FUNCTION public.has_active_shift(entity_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shifts
    WHERE user_id = auth.uid()
    AND entity_id = entity_id_param
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Storage Setup Reminder (Bucket creation and policies)
-- Note: Make sure to create a bucket named 'files' in Supabase Storage.
-- Policy for public read access:
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'files');
-- Policy for authenticated upload:
-- CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
