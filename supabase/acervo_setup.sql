-- =============================================================================
-- FACITEC Conecta — Módulo Acervo (legado): tabela documento_acervo + bucket
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto: Fase 1 do módulo Acervo (M4 "Legado"). Reaproveita as tabelas
-- existentes (edicao, projeto, orientador, bolsista) — edições antigas são
-- simplesmente `edicao.status = 'encerrado'`. `documento_acervo` é um anexo
-- genérico e polimórfico, para pendurar arquivos soltos (PDFs, fotos, vídeos)
-- em qualquer entidade sem exigir que o dado estruturado exista primeiro.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela documento_acervo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documento_acervo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id uuid REFERENCES edicao(id),        -- sempre preenchido, para filtrar por ano/edição fácil
  entidade_tipo text NOT NULL,                  -- 'edicao' | 'projeto' | 'orientador' | 'bolsista'
  entidade_id uuid,                             -- null quando entidade_tipo = 'edicao'
  categoria text NOT NULL,                      -- 'foto' | 'video' | 'pdf' | 'planilha' | 'documento' | 'outro'
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  descricao text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documento_acervo_edicao_idx ON documento_acervo (edicao_id);
CREATE INDEX IF NOT EXISTS documento_acervo_entidade_idx ON documento_acervo (entidade_tipo, entidade_id);

-- -----------------------------------------------------------------------------
-- RLS — mesmo padrão permissivo de rls_permissive.sql (sem gate por role até o
-- admin ganhar sessão própria — ver nota em rls_permissive.sql).
-- -----------------------------------------------------------------------------
ALTER TABLE documento_acervo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documento_acervo_select" ON documento_acervo;
DROP POLICY IF EXISTS "documento_acervo_insert" ON documento_acervo;
DROP POLICY IF EXISTS "documento_acervo_update" ON documento_acervo;
DROP POLICY IF EXISTS "documento_acervo_delete" ON documento_acervo;

CREATE POLICY "documento_acervo_select" ON documento_acervo FOR SELECT USING (true);
CREATE POLICY "documento_acervo_insert" ON documento_acervo FOR INSERT WITH CHECK (true);
CREATE POLICY "documento_acervo_update" ON documento_acervo FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "documento_acervo_delete" ON documento_acervo FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- Bucket de storage `acervo` — público, permissivo, mesmo padrão do bucket
-- `videos-acompanhamento`. Aceita PDF, imagens, vídeo e documentos office,
-- com o mesmo teto de tamanho generoso (300MB) já usado para vídeos.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'acervo',
  'acervo',
  true,
  314572800, -- 300MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "acervo_select" ON storage.objects;
DROP POLICY IF EXISTS "acervo_insert" ON storage.objects;
DROP POLICY IF EXISTS "acervo_update" ON storage.objects;
DROP POLICY IF EXISTS "acervo_delete" ON storage.objects;

CREATE POLICY "acervo_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'acervo');

CREATE POLICY "acervo_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'acervo');

CREATE POLICY "acervo_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'acervo');

CREATE POLICY "acervo_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'acervo');

-- =============================================================================
-- Verificação
-- =============================================================================
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'acervo';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'acervo%';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documento_acervo';
