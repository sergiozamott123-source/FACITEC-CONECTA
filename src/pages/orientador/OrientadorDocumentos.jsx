import { useEffect, useRef, useState } from 'react'
import { Download, Eye, Upload, FileText, Clock, CheckCircle2 } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'

const ACEITOS = '.pdf,.jpg,.jpeg,.png,.webp'
const BUCKET = 'inscricoes'
// Bucket dedicado a vídeos: arquivos bem maiores que os documentos acima e com
// mime types diferentes (o bucket `inscricoes` não aceita video/*).
const BUCKET_VIDEOS = 'videos-acompanhamento'

const DOCS_ORIENTADOR = [
  { key: 'doc_identidade',      label: 'Documento de identidade com foto e CPF', ref: 'Edital 01/2026, item 13.5-a' },
  { key: 'doc_diploma',         label: 'Diploma de graduação de curso superior', ref: 'Edital 01/2026, item 13.5-b' },
  { key: 'doc_regularidade_url', label: 'Declaração de Regularidade junto ao FACITEC', ref: 'Comprova que o(a) orientador(a) está em situação regular junto ao FACITEC' },
]

const VIDEOS_ACOMPANHAMENTO = [
  { key: 'video_mes3_url', nomeKey: 'nome_arquivo_video_mes3', label: 'Vídeo de acompanhamento — fim do 3º mês' },
  { key: 'video_mes5_url', nomeKey: 'nome_arquivo_video_mes5', label: 'Vídeo de acompanhamento — fim do 5º mês' },
]

const ACEITOS_VIDEO = '.mp4,.mov,.webm'

async function uploadArquivo(file, path, bucket = BUCKET) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

function StatusChip({ status }) {
  if (status === 'emitido') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> Emitido
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> Aguardando
    </span>
  )
}

function DocActions({ url }) {
  if (!url) return null
  return (
    <div className="flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" /> Visualizar
      </a>
      <a
        href={url}
        download
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> Baixar
      </a>
    </div>
  )
}

function UploadButton({ onUpload, uploading, label, accept = ACEITOS }) {
  const ref = useRef()
  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? 'Enviando...' : label ?? 'Enviar arquivo'}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />
    </>
  )
}

export function OrientadorDocumentos() {
  const { orientador, projeto } = usePortalOrientador()
  const [bolsistas, setBolsistas] = useState([])
  const [contrato, setContrato] = useState(null)
  const [termos, setTermos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const [meusDocUrls, setMeusDocUrls] = useState({})
  const [videos, setVideos] = useState({})
  const [error, setError] = useState(null)

  const exigeVideos = projeto?.edicao?.programa_id === 'PROFICJR'

  useEffect(() => {
    if (!projeto) { setLoading(false); return }
    fetchDados()
  }, [projeto])

  async function fetchDados() {
    setLoading(true)
    const [
      { data: bData },
      { data: cData },
      { data: tData },
    ] = await Promise.all([
      supabase.from('bolsista').select('id,nome_completo,codigo_facitec,data_nascimento,tipo').eq('projeto_id', projeto.id).eq('status', 'ativo').order('created_at'),
      supabase.from('contrato').select('*').eq('projeto_id', projeto.id).maybeSingle(),
      supabase.from('termo_adesao').select('*').eq('projeto_id', projeto.id),
    ])
    setBolsistas(bData ?? [])
    setContrato(cData ?? null)
    setTermos(tData ?? [])

    // Carregar URLs dos docs do orientador
    const urls = {}
    for (const doc of DOCS_ORIENTADOR) {
      if (orientador?.[doc.key]) urls[doc.key] = orientador[doc.key]
    }
    setMeusDocUrls(urls)

    // Carregar URLs dos vídeos de acompanhamento do projeto
    const vids = {}
    for (const v of VIDEOS_ACOMPANHAMENTO) {
      if (projeto?.[v.key]) vids[v.key] = { url: projeto[v.key], nome: projeto[v.nomeKey] }
    }
    setVideos(vids)

    setLoading(false)
  }

  async function handleUploadMeuDoc(docKey, file) {
    if (!orientador) return
    const ext = file.name.split('.').pop()
    const path = `orientadores/${orientador.id}/${docKey}.${ext}`
    setUploading(prev => ({ ...prev, [docKey]: true }))
    try {
      const url = await uploadArquivo(file, path)
      await supabase.from('orientador').update({ [docKey]: url }).eq('id', orientador.id)
      setMeusDocUrls(prev => ({ ...prev, [docKey]: url }))
    } catch {
      setError('Erro ao enviar arquivo.')
    } finally {
      setUploading(prev => ({ ...prev, [docKey]: false }))
    }
  }

  async function handleUploadVideo(video, file) {
    if (!projeto) return
    const ext = file.name.split('.').pop()
    const path = `projetos/${projeto.id}/${video.key}.${ext}`
    setUploading(prev => ({ ...prev, [video.key]: true }))
    try {
      const url = await uploadArquivo(file, path, BUCKET_VIDEOS)
      await supabase.from('projeto').update({ [video.key]: url, [video.nomeKey]: file.name }).eq('id', projeto.id)
      setVideos(prev => ({ ...prev, [video.key]: { url, nome: file.name } }))
    } catch {
      setError('Erro ao enviar arquivo.')
    } finally {
      setUploading(prev => ({ ...prev, [video.key]: false }))
    }
  }

  function getTermoBolsista(bolsistaId) {
    return termos.find(t => t.bolsista_id === bolsistaId) ?? null
  }

  function tipoTermo(dataNasc) {
    if (!dataNasc) return 'Padrão'
    const age = new Date().getFullYear() - new Date(dataNasc).getFullYear()
    return age < 18 ? 'Menor de idade' : 'Maior de idade'
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Contratos, termos e documentos do orientador</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {/* Meu contrato — PDF assinado, enviado pela Secretaria */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Meu contrato
          </h2>

          {orientador?.contrato_url ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700 truncate">{orientador.nome_arquivo_contrato ?? 'Contrato assinado'}</p>
              </div>
              <DocActions url={orientador.contrato_url} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">Seu contrato ainda não foi disponibilizado pela Secretaria.</p>
          )}
        </div>

        {/* Seção 1 — Contrato */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Contrato de Concessão de Bolsa
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : contrato?.status === 'emitido' ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <StatusChip status="emitido" />
                {contrato.numero_processo && (
                  <p className="text-xs text-gray-600">
                    Nº do processo: <span className="font-medium">{contrato.numero_processo}</span>
                  </p>
                )}
                {contrato.vigencia && (
                  <p className="text-xs text-gray-600">
                    Vigência: <span className="font-medium">{contrato.vigencia}</span>
                  </p>
                )}
                {contrato.created_at && (
                  <p className="text-xs text-gray-400">
                    Emitido em: {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <DocActions url={contrato.arquivo_url} />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Clock className="w-4 h-4 shrink-0" />
              Aguardando emissão pela Secretaria
            </div>
          )}
        </div>

        {/* Seção 2 — Termos de Adesão */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Termos de Adesão
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : bolsistas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum bolsista cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {bolsistas.map(b => {
                const termo = getTermoBolsista(b.id)
                return (
                  <div key={b.id} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{b.nome_completo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {b.codigo_facitec && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded">
                            {b.codigo_facitec}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{tipoTermo(b.data_nascimento)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusChip status={termo?.status} />
                      {termo?.status === 'emitido' && <DocActions url={termo.arquivo_url} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Seção 3 — Meus documentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-600" />
            Meus documentos
          </h2>

          <div className="space-y-3">
            {DOCS_ORIENTADOR.map(doc => {
              const url = meusDocUrls[doc.key]
              const filename = url ? decodeURIComponent(url.split('/').pop().split('?')[0]) : null
              return (
                <div key={doc.key} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.ref}</p>
                      {url && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate max-w-xs">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          {filename}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {url ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Enviado
                          </span>
                          <DocActions url={url} />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                      <UploadButton
                        onUpload={file => handleUploadMeuDoc(doc.key, file)}
                        uploading={uploading[doc.key]}
                        label={url ? 'Substituir' : 'Enviar'}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Seção 4 — Vídeos de acompanhamento (só PROFIC Jr) */}
        {exigeVideos && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Vídeos de acompanhamento
            </h2>

            <div className="space-y-3">
              {VIDEOS_ACOMPANHAMENTO.map(video => {
                const entry = videos[video.key]
                return (
                  <div key={video.key} className="py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{video.label}</p>
                        {entry?.nome && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate max-w-xs">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                            {entry.nome}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry?.url ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3 h-3" /> Enviado
                            </span>
                            <DocActions url={entry.url} />
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                        <UploadButton
                          accept={ACEITOS_VIDEO}
                          onUpload={file => handleUploadVideo(video, file)}
                          uploading={uploading[video.key]}
                          label={entry?.url ? 'Substituir' : 'Enviar'}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
