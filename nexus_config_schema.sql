CREATE TABLE IF NOT EXISTS nexus_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE UNIQUE,
  nexus_endpoint TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Admin de perfiles o admin de la entidad (vía shifts)
ALTER TABLE nexus_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage nexus config" ON nexus_config
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
    OR
    entity_id IN (
      SELECT entity_id FROM shifts WHERE user_id = auth.uid()
    )
  );
