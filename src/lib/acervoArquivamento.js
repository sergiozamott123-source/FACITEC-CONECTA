// src/lib/acervoArquivamento.js
//
// Arquivamento de documentos "vivos" (contrato, termo de adesão, relatório
// mensal, documentos de recurso) direto no Acervo — copia o arquivo de
// origem para o bucket `acervo` e registra em `documento_acervo`.

import { supabase } from './supabase'
import { documentoAcervoService } from './db'
import { gerarBlobPDFRelatorioMensal } from './relatorioMensalPdf'

const BUCKET = 'acervo'

// O bucket `acervo` só aceita esta lista de mime types (ver acervo_setup.sql).
// fetch() cross-origin frequentemente não expõe o Content-Type original,
// deixando blob.type vazio — nesse caso o Supabase rejeitaria o upload com
// um tipo genérico fora da lista, então inferimos pela extensão do arquivo.
const MIME_POR_EXTENSAO = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

function inferirContentType(nomeArquivo) {
  const extensao = nomeArquivo?.split('.').pop()?.toLowerCase()
  return MIME_POR_EXTENSAO[extensao] || 'application/octet-stream'
}

// O Supabase Storage rejeita paths com acento, espaço ou símbolos (ex:
// parênteses em "...-signed (1).pdf") com "Invalid key" — usada só no path
// do storage; o nome_arquivo original (com acento etc) é mantido em
// documento_acervo, que é só para exibição.
function sanitizarNomeArquivo(nome) {
  return nome
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
}

export async function arquivarArquivo({ url, nomeArquivo, edicaoId, entidadeTipo, entidadeId, categoria, descricao }) {
  const res = await fetch(url)
  const blob = await res.blob()
  const path = `${entidadeTipo}/${entidadeId}/${Date.now()}-${sanitizarNomeArquivo(nomeArquivo)}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || inferirContentType(nomeArquivo),
  })
  if (upErr) throw upErr

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return documentoAcervoService.create({
    edicao_id: edicaoId,
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    categoria,
    nome_arquivo: nomeArquivo,
    url: publicUrl,
    descricao: descricao ?? null,
  })
}

export function arquivarContratoOrientador(orientador, edicaoId) {
  if (!orientador?.contrato_url) throw new Error('Este orientador ainda não tem contrato enviado.')
  return arquivarArquivo({
    url: orientador.contrato_url,
    nomeArquivo: orientador.nome_arquivo_contrato || 'contrato.pdf',
    edicaoId,
    entidadeTipo: 'orientador',
    entidadeId: orientador.id,
    categoria: 'contrato',
    descricao: orientador.nome_completo ? `Contrato de ${orientador.nome_completo}` : null,
  })
}

export function arquivarTermoAdesao(bolsista, edicaoId) {
  if (!bolsista?.termo_adesao_url) throw new Error('Este bolsista ainda não tem termo de adesão enviado.')
  return arquivarArquivo({
    url: bolsista.termo_adesao_url,
    nomeArquivo: bolsista.termo_adesao_nome_arquivo || 'termo_adesao.pdf',
    edicaoId,
    entidadeTipo: 'bolsista',
    entidadeId: bolsista.id,
    categoria: 'termo_adesao',
    descricao: bolsista.nome_completo ? `Termo de adesão de ${bolsista.nome_completo}` : null,
  })
}

export function arquivarRecursoDocumento(recursoDocumento, edicaoId, orientadorId) {
  return arquivarArquivo({
    url: recursoDocumento.url,
    nomeArquivo: recursoDocumento.nome_arquivo,
    edicaoId,
    entidadeTipo: 'orientador',
    entidadeId: orientadorId,
    categoria: recursoDocumento.tipo,
    descricao: null,
  })
}

// Diferente das outras: não existe um arquivo pronto para copiar — o PDF é
// gerado na hora (mesma geração usada na visualização, ver relatorioMensalPdf.js)
// e o blob resultante é que sobe pro bucket.
export async function arquivarRelatorioMensal({ relatorio, edicaoId, ciclo, orientador, projetoTitulo, nomesBolsistas }) {
  const { blob, nomeArquivo } = await gerarBlobPDFRelatorioMensal({ relatorio, ciclo, orientador, projetoTitulo, nomesBolsistas })
  const path = `orientador/${orientador?.id}/${Date.now()}-${sanitizarNomeArquivo(nomeArquivo)}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'application/pdf' })
  if (upErr) throw upErr

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return documentoAcervoService.create({
    edicao_id: edicaoId,
    entidade_tipo: 'orientador',
    entidade_id: orientador?.id,
    categoria: 'relatorio_mensal',
    nome_arquivo: nomeArquivo,
    url: publicUrl,
    descricao: ciclo ? `Relatório mensal — ciclo ${ciclo.numero_ciclo} (${ciclo.mes_referencia})` : null,
  })
}

export function jaArquivado(docsExistentes, entidadeTipo, entidadeId, categoria) {
  return (docsExistentes ?? []).some(
    (d) => d.entidade_tipo === entidadeTipo && d.entidade_id === entidadeId && d.categoria === categoria
  )
}
