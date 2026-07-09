-- =============================================================================
-- FACITEC Conecta — Storage: contratos assinados dos orientadores
-- Upload feito pela Secretaria; leitura pelo orientador dono do contrato.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-orientadores', 'contratos-orientadores', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "contratos_orientadores_select" ON storage.objects;
DROP POLICY IF EXISTS "contratos_orientadores_insert" ON storage.objects;
DROP POLICY IF EXISTS "contratos_orientadores_update" ON storage.objects;
DROP POLICY IF EXISTS "contratos_orientadores_delete" ON storage.objects;

CREATE POLICY "contratos_orientadores_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contratos-orientadores'
    AND (
      get_my_role() = 'secretaria'
      OR (storage.foldername(name))[1] = get_my_orientador_id()::text
    )
  );

CREATE POLICY "contratos_orientadores_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contratos-orientadores'
    AND get_my_role() = 'secretaria'
  );

CREATE POLICY "contratos_orientadores_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'contratos-orientadores'
    AND get_my_role() = 'secretaria'
  );

CREATE POLICY "contratos_orientadores_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contratos-orientadores'
    AND get_my_role() = 'secretaria'
  );

-- Verificação
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'contratos_orientadores%';
