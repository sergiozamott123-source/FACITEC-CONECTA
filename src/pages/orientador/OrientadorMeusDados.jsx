import { useRef, useState } from 'react'
import { Save, Upload, FileText, CheckCircle, Info, ArrowRight } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

const BUCKET = 'inscricoes'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACEITOS = '.pdf,.jpg,.jpeg,.png'

function maskCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskTel(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function maskCep(v) {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

async function buscarCep(cep) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    return data.erro ? null : data
  } catch { return null }
}

async function uploadDoc(file, orientadorId, fieldKey) {
  if (file.size > MAX_FILE_SIZE) throw new Error('Arquivo muito grande. Máximo: 5MB.')
  const ext = file.name.split('.').pop()
  const path = `orientadores/${orientadorId}/${fieldKey}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

function UploadField({ label, reference, fieldKey, currentUrl, onUpload, uploading }) {
  const ref = useRef()
  const hasFile = !!currentUrl
  const isPdf = currentUrl?.toLowerCase().endsWith('.pdf')
  const filename = currentUrl ? decodeURIComponent(currentUrl.split('/').pop().split('?')[0]) : null

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="text-xs text-gray-400">{reference}</p>
      <div
        className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
          hasFile
            ? 'border-green-300 bg-green-50 hover:bg-green-100'
            : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
        onClick={() => ref.current?.click()}
      >
        {hasFile ? (
          <>
            {isPdf
              ? <FileText className="w-5 h-5 text-red-500 shrink-0" />
              : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            }
            <span className="text-xs text-gray-700 truncate flex-1">{filename}</span>
            <span className="text-[10px] text-blue-600 shrink-0 font-medium">Substituir</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Clique para enviar (PDF, JPG, PNG — máx. 5MB)</span>
          </>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={ACEITOS}
        className="hidden"
        disabled={uploading}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(fieldKey, f)
          e.target.value = ''
        }}
      />
      {uploading && <p className="text-[10px] text-blue-500 mt-0.5">Enviando...</p>}
    </div>
  )
}

function calcProgress(form, docs) {
  const fields = [
    form.cpf, form.rg, form.orgao_emissor, form.telefone,
    form.cep, form.logradouro, form.numero, form.bairro, form.municipio, form.uf,
  ]
  const filled = fields.filter(Boolean).length
  const docsFilled = [docs.doc_identidade, docs.doc_diploma].filter(Boolean).length
  return Math.round(((filled + docsFilled) / (fields.length + 2)) * 100)
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const readonlyCls = 'w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-md text-sm cursor-not-allowed'

export function OrientadorMeusDados() {
  const { orientador, setOrientador } = usePortalOrientador()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    cpf: orientador?.cpf ?? '',
    rg: orientador?.rg ?? '',
    orgao_emissor: orientador?.orgao_emissor ?? '',
    telefone: orientador?.telefone ?? '',
    cep: orientador?.cep ?? '',
    logradouro: orientador?.logradouro ?? '',
    numero: orientador?.numero ?? '',
    complemento: orientador?.complemento ?? '',
    bairro: orientador?.bairro ?? '',
    municipio: orientador?.municipio ?? '',
    uf: orientador?.uf ?? '',
  })
  const [docs, setDocs] = useState({
    doc_identidade: orientador?.doc_identidade ?? '',
    doc_diploma: orientador?.doc_diploma ?? '',
  })
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const progress = calcProgress(form, docs)

  function handleChange(e) {
    const { name, value } = e.target
    let v = value
    if (name === 'cpf') v = maskCpf(value)
    else if (name === 'telefone') v = maskTel(value)
    else if (name === 'cep') v = maskCep(value)
    setForm(prev => ({ ...prev, [name]: v }))
  }

  async function handleBlur(e) {
    const { name, value } = e.target
    if (!orientador || !value) return
    await supabase.from('orientador').update({ [name]: value }).eq('id', orientador.id)
  }

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    const data = await buscarCep(form.cep)
    setBuscandoCep(false)
    if (!data) return
    const updates = {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      municipio: data.localidade ?? '',
      uf: data.uf ?? '',
    }
    setForm(prev => ({ ...prev, ...updates }))
    if (orientador) {
      await supabase.from('orientador').update({ cep: form.cep, ...updates }).eq('id', orientador.id)
    }
  }

  async function handleUpload(fieldKey, file) {
    if (!orientador) return
    setUploading(prev => ({ ...prev, [fieldKey]: true }))
    setError(null)
    try {
      const url = await uploadDoc(file, orientador.id, fieldKey)
      setDocs(prev => ({ ...prev, [fieldKey]: url }))
      await supabase.from('orientador').update({ [fieldKey]: url }).eq('id', orientador.id)
      setSuccess('Documento enviado com sucesso.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message ?? 'Erro ao enviar documento.')
    } finally {
      setUploading(prev => ({ ...prev, [fieldKey]: false }))
    }
  }

  async function salvar(navegar) {
    if (!orientador) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('orientador')
      .update({ ...form, ...docs })
      .eq('id', orientador.id)
      .select()
      .single()
    setSaving(false)
    if (err) { setError('Erro ao salvar. Tente novamente.'); return }
    setOrientador(data)
    if (navegar) {
      navigate('/orientador/bolsistas')
    } else {
      setSuccess('Rascunho salvo.')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const field = (name, opts = {}) => ({
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    className: inputCls,
    ...opts,
  })

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6 space-y-5" style={{ maxWidth: 'calc(100% - 200px)' }}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meus dados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete seu cadastro e envie os documentos obrigatórios</p>
        </div>

        {/* Progresso */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Progresso do cadastro</p>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Aviso prazo */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Prazo de entrega de documentos: 18/06 a 26/06/2026</span> — conforme item 13.5 do Edital FACITEC 01/2026. A entrega incompleta implica desclassificação.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">{success}</div>
        )}

        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Dados pessoais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input value={orientador?.nome_completo ?? ''} disabled className={readonlyCls} />
              <p className="text-[11px] text-gray-400 mt-0.5">Campo não editável.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input {...field('cpf')} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
              <input {...field('rg')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Órgão emissor</label>
              <input {...field('orgao_emissor')} placeholder="SSP/ES" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input {...field('telefone')} placeholder="(00) 00000-0000" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input value={orientador?.email ?? ''} disabled className={readonlyCls} />
              <p className="text-[11px] text-gray-400 mt-0.5">Campo não editável.</p>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Endereço</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                name="cep"
                value={form.cep}
                onChange={handleChange}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                className={inputCls}
              />
              {buscandoCep && <p className="text-[10px] text-blue-500 mt-0.5">Buscando endereço...</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
              <input {...field('logradouro')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input {...field('numero')} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input {...field('complemento')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input {...field('bairro')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Município</label>
              <input {...field('municipio')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
              <input {...field('uf')} maxLength={2} className={inputCls + ' uppercase'} />
            </div>
          </div>
        </div>

        {/* Documentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Documentos obrigatórios</h2>
          <UploadField
            label="Documento de identidade com foto e CPF"
            reference="Edital 01/2026, item 13.5-a"
            fieldKey="doc_identidade"
            currentUrl={docs.doc_identidade}
            onUpload={handleUpload}
            uploading={uploading.doc_identidade}
          />
          <UploadField
            label="Diploma de graduação de curso superior"
            reference="Edital 01/2026, item 13.5-b"
            fieldKey="doc_diploma"
            currentUrl={docs.doc_diploma}
            onUpload={handleUpload}
            uploading={uploading.doc_diploma}
          />
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 pb-8">
          <button
            onClick={() => salvar(false)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button
            onClick={() => salvar(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Salvar e continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  )
}
