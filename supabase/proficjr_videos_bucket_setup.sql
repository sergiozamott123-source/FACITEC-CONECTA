-- =============================================================================
-- FACITEC Conecta — Bucket de Storage para os vídeos de acompanhamento (PROFIC Jr)
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Motivo de um bucket separado do `inscricoes` (usado pelos documentos):
--   - `inscricoes` só aceita os mime types de documento (pdf/jpg/png/webp) — um
--     teste de upload real de vídeo contra ele falhou com
--     "mime type video/mp4 is not supported".
--   - Vídeos tendem a ser bem maiores que os documentos de identidade/diploma.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos-acompanhamento',
  'videos-acompanhamento',
  true,
  314572800, -- 300MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas permissivas, no mesmo padrão de rls_permissive.sql (sem gate por role —
-- revisar quando o app passar a exigir autenticação real para todo o fluxo).
DROP POLICY IF EXISTS "videos_acompanhamento_select" ON storage.objects;
DROP POLICY IF EXISTS "videos_acompanhamento_insert" ON storage.objects;
DROP POLICY IF EXISTS "videos_acompanhamento_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_acompanhamento_delete" ON storage.objects;

CREATE POLICY "videos_acompanhamento_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos-acompanhamento');

CREATE POLICY "videos_acompanhamento_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos-acompanhamento');

CREATE POLICY "videos_acompanhamento_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'videos-acompanhamento');

CREATE POLICY "videos_acompanhamento_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos-acompanhamento');

-- Verificação
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'videos-acompanhamento';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'videos_acompanhamento%';
