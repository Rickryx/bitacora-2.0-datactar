-- Create a bucket for signatures and evidence
-- Note: This requires the storage extension to be enabled in Supabase
-- Typically done via the UI, but here are the SQL commands if available via API

-- insert into storage.buckets (id, name, public) values ('files', 'files', true);

-- Add document_id, critical level and signature_url in logs
ALTER TABLE public.logs ADD COLUMN document_id text;
ALTER TABLE public.logs ADD COLUMN critical_level text DEFAULT 'BAJA' CHECK (critical_level IN ('BAJA', 'MEDIA', 'ALTA'));
ALTER TABLE public.logs ADD COLUMN signature_url text;

-- Add document_id to profiles for guards
ALTER TABLE public.profiles ADD COLUMN document_id text;

-- Update RLS for storage (simplified for demo)
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'files');
-- CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
