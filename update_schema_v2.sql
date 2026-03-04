-- Create entities table
CREATE TABLE public.entities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  address text,
  description text
);

-- Add entity_id to logs
ALTER TABLE public.logs ADD COLUMN entity_id uuid REFERENCES public.entities(id);

-- Create a default entity for existing logs
INSERT INTO public.entities (name, address, description)
VALUES ('Entidad Defecto', 'Dirección no especificada', 'Entidad inicial para migración de datos');

-- Assign existing logs to the default entity
UPDATE public.logs SET entity_id = (SELECT id FROM public.entities WHERE name = 'Entidad Defecto' LIMIT 1) WHERE entity_id IS NULL;

-- Create shifts table
CREATE TABLE public.shifts (
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

-- Enable RLS for entities and shifts
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Entities policies
CREATE POLICY "Entities are viewable by authenticated users." ON public.entities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Shifts policies
CREATE POLICY "Users can view their own shifts." ON public.shifts
  FOR SELECT USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Admins can manage all shifts." ON public.shifts
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Users can start their own shifts." ON public.shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- Update logs RLS to filter by shift/entity for guards
DROP POLICY "Logs are viewable by everyone (for now, or restrict to auth users)." ON public.logs;

CREATE POLICY "Admins can view all logs." ON public.logs
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Guards can view logs of their active shift entity." ON public.logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shifts
      WHERE shifts.user_id = auth.uid()
      AND shifts.entity_id = logs.entity_id
      AND shifts.status = 'ACTIVE'
    )
  );

-- Function to check if a user has an active shift
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
