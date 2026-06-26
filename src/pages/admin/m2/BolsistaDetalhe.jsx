import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, ExternalLink, Download, FileText,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react'

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const MESES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
]

const DOCS_BASE = [
  { key: 'doc_identidade_aluno',     label: 'Identidade com foto e CPF do aluno',          ref: 'Edital 13.5-e' },
  { key: 'doc_declaracao_matricula', label: 'Declaração de matrícula — Anexo IV',           ref: 'Edital 13.5-f' },
  { key: 'doc_anuencia_direcao',     label: 'Declaração de anuência da direção — Anexo V',  ref: 'Edital 13.5-g' },
  { key: 'doc_autorizacao_imagem',   label: 'Autorização de uso de imagem — Anexo VI',      ref: 'Edital 13.5-h' },
]
const DOCS_MENOR = [
  { key: 'doc_autorizacao_responsavel', label: 'Autorização do responsável — Anexo III',    ref: 'Edital 13.5-c' },
  { key: 'doc_identidade_responsavel',  label: 'Identidade com foto e CPF do responsável',  ref: 'Edital 13.5-d' },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function isMenor(dataNasc) {
  const idade = calcIdade(dataNasc)
  return idade !== null && idade < 18
}

function calcStatusDocs(b) {
  if (!b) return 'incompleto'
  const baseDocs = DOCS_BASE.map(d => b[d.key])
  const menorDocs = isMenor(b.data_nascimento) ? DOCS_MENOR.map(d => b[d.key]) : []
  const all = [...baseDocs, ...menorDocs]
  if (all.every(Boolean)) return 'completo'
  if (all.some(Boolean)) return 'pendente'
  return 'incompleto'
}

function iniciais(nome) {
  if (!nome) return '?'
  return nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

async function baixarDoc(url, filename) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(url, '_blank')
  }
}

// ── SUB-COMPONENTES ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-sm ${value ? 'text-gray-800' : 'text-gray-400 italic'} ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  )
}

function DocRow({ label, reference, url, filename }) {
  const enviado = !!url
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
      enviado
        ? 'border-green-200 bg-green-50'
        : 'border-amber-200 bg-amber-50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {enviado
            ? <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
            : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          }
          <p className="text-xs font-medium text-gray-800 truncate">{label}</p>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 ml-5">{reference}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {enviado ? (
          <>
            <span className="text-[10px] font-semibold text-green-700">Enviado</span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Visualizar
            </a>
            <button
              onClick={() => baixarDoc(url, filename)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3 h-3" />
              Baixar
            </button>
          </>
        ) : (
          <span className="text-[10px] font-semibold text-amber-700">Pendente</span>
        )}
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function BolsistaDetalhe() {
  const { ano = '2026', codigoBolsista } = useParams()
  const navigate = useNavigate()

  const [bolsista,      setBolsista]      = useState(null)
  const [orientador,    setOrientador]    = useState(null)
  const [projeto,       setProjeto]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [toast,         setToast]         = useState(null)

  const [dados, setDados] = useState({
    numero_contrato: '',
    numero_edital:   '01/2026',
    data_assinatura: '',
  })

  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [cpfResponsavel,  setCpfResponsavel]  = useState('')
  const [docResponsavel,  setDocResponsavel]  = useState('')

  useEffect(() => { fetchDados() }, [codigoBolsista])

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function fetchDados() {
    setLoading(true)
    setError(null)
    try {
      // 1 — bolsista pelo código
      const { data: b, error: e1 } = await supabase
        .from('bolsista')
        .select('*')
        .eq('codigo_bolsista', codigoBolsista)
        .single()
      if (e1) throw new Error(`Bolsista não encontrado: ${e1.message}`)
      setBolsista(b)
      setNomeResponsavel(b.nome_responsavel ?? '')
      setCpfResponsavel(b.cpf_responsavel   ?? '')
      setDocResponsavel(b.rg_responsavel    ?? '')

      // 2 — orientador
      if (b.orientador_id) {
        const { data: ori } = await supabase
          .from('orientador')
          .select('id, nome_completo, codigo_orientador')
          .eq('id', b.orientador_id)
          .single()
        if (ori) setOrientador(ori)
      }

      // 3 — projeto + contrato (em paralelo)
      if (b.projeto_id) {
        const [{ data: proj }, { data: cont }] = await Promise.all([
          supabase.from('projeto').select('id, titulo, codigo').eq('id', b.projeto_id).single(),
          supabase.from('contrato').select('numero_contrato, status').eq('projeto_id', b.projeto_id).maybeSingle(),
        ])
        if (proj) setProjeto(proj)
        if (cont?.numero_contrato) {
          setDados(d => ({ ...d, numero_contrato: cont.numero_contrato }))
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function gerarTermoPDF() {
    if (!bolsista) return
    setGeneratingPDF(true)
    try {
      const ehMenor = isMenor(bolsista.data_nascimento)
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const mL = 30, mR = 20, mT = 30, mB = 25
      const pgW = 210, pgH = 297
      const usableW = pgW - mL - mR
      const lineH = 6.5

      // Texto justificado com quebra de página automática
      function addJustified(text, x, startY, maxW, lh) {
        const lines = doc.splitTextToSize(text, maxW)
        let curY = startY
        lines.forEach((line, i) => {
          if (curY + lh > pgH - mB) { doc.addPage(); curY = mT }
          const isLast = i === lines.length - 1
          if (isLast || !line.trim()) {
            doc.text(line, x, curY)
          } else {
            const words = line.trim().split(' ')
            if (words.length <= 1) {
              doc.text(line, x, curY)
            } else {
              const totalW = words.reduce((s, w) => s + doc.getTextWidth(w), 0)
              const space = (maxW - totalW) / (words.length - 1)
              let wx = x
              words.forEach(w => {
                doc.text(w, wx, curY)
                wx += doc.getTextWidth(w) + space
              })
            }
          }
          curY += lh
        })
        return curY
      }

      function checkPage(y, needed = lineH) {
        if (y + needed > pgH - mB) { doc.addPage(); return mT }
        return y
      }

      // ── Cabeçalho FACITEC / CDTIV ─────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(
        'FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC',
        pgW / 2, mT - 14, { align: 'center' },
      )
      doc.text(
        'Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV',
        pgW / 2, mT - 8, { align: 'center' },
      )
      doc.setLineWidth(0.4)
      doc.line(mL, mT - 4, pgW - mR, mT - 4)

      let y = mT + 6

      // ── Título centralizado bold ───────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)

      const linha1 = `ANEXO AO CONTRATO DE CONCESSÃO DE BOLSA Nº ${dados.numero_contrato || '___'}`
      const linha2 = `TERMO DE ADESÃO DO ESTUDANTE BOLSISTA (${ehMenor ? 'MENOR' : 'MAIOR'} DE IDADE)`

      for (const l of doc.splitTextToSize(linha1, usableW)) {
        y = checkPage(y, lineH)
        doc.text(l, pgW / 2, y, { align: 'center' })
        y += lineH
      }
      y += 2
      y = checkPage(y, lineH)
      doc.text(linha2, pgW / 2, y, { align: 'center' })
      y += lineH * 1.8

      // ── Referência alinhada à direita ──────────────────────────────────
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      y = checkPage(y, lineH)
      doc.text(`Edital FACITEC ${dados.numero_edital || '01/2026'}`, pgW - mR, y, { align: 'right' })
      y += lineH * 1.8

      // ── Parágrafo de adesão ────────────────────────────────────────────
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)

      const escola = [bolsista.escola_origem, bolsista.ano_escolar]
        .filter(Boolean).join(' — ') || '___'

      const paragrafo = ehMenor
        ? `Eu, ${bolsista.nome_completo || '___'}, inscrito(a) no CPF nº ${bolsista.cpf || '___'}, representado(a) neste ato por seu(sua) representante legal ${nomeResponsavel || '___'}, portador(a) do CPF nº ${cpfResponsavel || '___'}${docResponsavel ? ` e do documento de identidade nº ${docResponsavel}` : ''}, aluno(a) do(a) ${escola}, declaro que adiro ao projeto de pesquisa "${projeto?.titulo || '___'}", no âmbito do Edital FACITEC ${dados.numero_edital || '01/2026'}, vinculado ao Contrato nº ${dados.numero_contrato || '___'}, comprometendo-me a cumprir todos os termos e condições estabelecidos.`
        : `Eu, ${bolsista.nome_completo || '___'}, inscrito(a) no CPF nº ${bolsista.cpf || '___'}, aluno(a) do(a) ${escola}, declaro que adiro ao projeto de pesquisa "${projeto?.titulo || '___'}", no âmbito do Edital FACITEC ${dados.numero_edital || '01/2026'}, vinculado ao Contrato nº ${dados.numero_contrato || '___'}, comprometendo-me a cumprir todos os termos e condições estabelecidos.`

      y = addJustified(paragrafo, mL, y, usableW, lineH)
      y += lineH

      // ── Cláusula Primeira ──────────────────────────────────────────────
      y += 4
      y = checkPage(y, lineH * 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('CLÁUSULA PRIMEIRA: DAS OBRIGAÇÕES DO ESTUDANTE BOLSISTA.', mL, y)
      y += lineH * 1.2

      doc.setFont('helvetica', 'normal')
      y = addJustified(
        'O Estudante Bolsista compromete-se a: cumprir todas as atividades previstas no plano de trabalho; apresentar os resultados do projeto, caso seja convocado(a); ter frequência mínima mensal de 75% (setenta e cinco por cento) nas atividades do projeto; manter-se em dia com as obrigações fiscais junto à Fazenda Municipal; efetuar o cadastro junto ao Banco autorizado pelo FACITEC.',
        mL, y, usableW, lineH,
      )
      y += lineH

      // ── Cláusula Segunda ───────────────────────────────────────────────
      y += 4
      y = checkPage(y, lineH * 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('CLÁUSULA SEGUNDA: DAS PENALIDADES.', mL, y)
      y += lineH * 1.2

      doc.setFont('helvetica', 'normal')
      y = addJustified(
        'O descumprimento das obrigações previstas na Cláusula Primeira acarretará no desligamento do estudante bolsista do projeto e na impossibilidade de participação no Programa PibicJr por 12 (doze) meses.',
        mL, y, usableW, lineH,
      )
      y += lineH * 2.5

      // ── Linha de data ──────────────────────────────────────────────────
      let dataStr = '_____ de __________ de _____'
      if (dados.data_assinatura) {
        const d = new Date(dados.data_assinatura + 'T12:00:00')
        dataStr = `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
      }
      y = checkPage(y, lineH)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text(`Vitória, ${dataStr}.`, mL, y)
      y += lineH * 3.5

      // ── Linha de assinatura ────────────────────────────────────────────
      y = checkPage(y, 35)
      const cx = pgW / 2
      doc.setDrawColor(0)
      doc.setLineWidth(0.4)
      doc.line(cx - 38, y, cx + 38, y)
      y += lineH * 0.7

      const sigNome  = ehMenor
        ? (nomeResponsavel        || '___')
        : (bolsista.nome_completo || '___')
      const sigTitulo = ehMenor ? 'Representante Legal do Estudante' : 'Estudante Bolsista'

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(sigNome, cx, y, { align: 'center' })
      y += lineH * 0.8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(sigTitulo, cx, y, { align: 'center' })

      // ── Download ───────────────────────────────────────────────────────
      doc.save(`Termo_${bolsista.codigo_bolsista || bolsista.id}.pdf`)
      showToast('Termo de adesão gerado com sucesso.', 'ok')
    } catch (err) {
      showToast(`Erro ao gerar PDF: ${err.message}`, 'err')
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ── ESTADOS DE CARREGAMENTO ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Carregando…
      </div>
    )
  }

  if (error || !bolsista) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium">{error ?? 'Bolsista não encontrado.'}</p>
          <button
            onClick={() => navigate(`/admin/pibic-jr/${ano}/m2`)}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            ← Voltar ao suppainel
          </button>
        </div>
      </div>
    )
  }

  // ── VALORES COMPUTADOS ────────────────────────────────────────────────────
  const ehMenor = isMenor(bolsista.data_nascimento)
  const idade   = calcIdade(bolsista.data_nascimento)
  const status  = calcStatusDocs(bolsista)
  const docsExibir = [...DOCS_BASE, ...(ehMenor ? DOCS_MENOR : [])]
  const docsEnviados = docsExibir.filter(d => bolsista[d.key]).length

  const statusCfg = {
    completo:   { label: 'Completo',   cls: 'bg-green-100 text-green-700 border-green-300' },
    pendente:   { label: 'Pendente',   cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    incompleto: { label: 'Incompleto', cls: 'bg-red-100 text-red-700 border-red-300'       },
  }[status]

  const tipoCfg = bolsista.tipo === 'voluntario'
    ? { label: 'Voluntário', cls: 'bg-purple-100 text-purple-700 border-purple-300' }
    : { label: 'Titular',    cls: 'bg-blue-100 text-blue-700 border-blue-300'       }

  const idadeCfg = ehMenor
    ? { label: `Menor · ${idade} anos`, cls: 'bg-amber-100 text-amber-700 border-amber-300' }
    : { label: `Maior · ${idade ?? '?'} anos`, cls: 'bg-gray-100 text-gray-600 border-gray-300' }

  const toastCls = toast?.type === 'ok'  ? 'bg-green-50 text-green-800 border-green-200'
                 : toast?.type === 'err' ? 'bg-red-50 text-red-800 border-red-200'
                 : 'bg-blue-50 text-blue-800 border-blue-200'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a2744' }} className="px-8 pt-5 pb-7">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-5 flex-wrap">
          <button
            onClick={() => navigate(`/admin/pibic-jr/${ano}/m2`)}
            className="hover:text-white/70 transition-colors"
          >
            M2 — Organização
          </button>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span>{orientador?.nome_completo ?? '—'}</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-white/70">{bolsista.nome_completo}</span>
        </nav>

        {/* Identidade */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">{iniciais(bolsista.nome_completo)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{bolsista.nome_completo}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold font-mono text-blue-300 bg-blue-950/50 border border-blue-700/40 px-2 py-0.5 rounded">
                {bolsista.codigo_bolsista}
              </span>
              {[tipoCfg, idadeCfg, statusCfg].map((cfg, i) => (
                <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-8 py-7 space-y-5">

        {/* ── 1. Dados pessoais ── */}
        <Section title="Dados pessoais">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2">
              <Field label="Nome completo" value={bolsista.nome_completo} />
            </div>
            <Field label="CPF" value={bolsista.cpf} mono />
            <Field
              label="Data de nascimento"
              value={bolsista.data_nascimento
                ? new Date(bolsista.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')
                : null}
            />
            <Field label="Ano / série" value={bolsista.ano_escolar} />
            <Field label="Escola" value={bolsista.escola_origem} />
            <Field label="Telefone" value={bolsista.telefone} />
            <Field label="E-mail" value={bolsista.email} />
          </div>

          {ehMenor && (
            <div className="mt-5 pt-4 border-t border-amber-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Responsável legal
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <Field label="Nome do responsável" value={bolsista.nome_responsavel} />
                </div>
                <Field label="CPF do responsável" value={bolsista.cpf_responsavel} mono />
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2">
              <Field label="Projeto" value={projeto?.titulo} />
            </div>
            <Field
              label="Orientador"
              value={orientador
                ? `${orientador.nome_completo} (${orientador.codigo_orientador})`
                : null}
            />
          </div>
        </Section>

        {/* ── 2. Documentos ── */}
        <Section title={`Documentos — ${docsEnviados}/${docsExibir.length} enviados`}>
          <div className="space-y-2">
            {docsExibir.map(d => (
              <DocRow
                key={d.key}
                label={d.label}
                reference={d.ref}
                url={bolsista[d.key]}
                filename={`${d.key}_${bolsista.codigo_bolsista ?? bolsista.id}`}
              />
            ))}
          </div>
        </Section>

        {/* ── 3. Gerar Termo de Adesão ── */}
        <Section title="Gerar Termo de Adesão">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                  Número do contrato
                </label>
                <input
                  type="text"
                  placeholder="Ex: 009/2026"
                  value={dados.numero_contrato}
                  onChange={e => setDados(d => ({ ...d, numero_contrato: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                  Número do edital
                </label>
                <input
                  type="text"
                  placeholder="Ex: 01/2026"
                  value={dados.numero_edital}
                  onChange={e => setDados(d => ({ ...d, numero_edital: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {ehMenor && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Nome do responsável legal
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do responsável"
                    value={nomeResponsavel}
                    onChange={e => setNomeResponsavel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      CPF do responsável
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfResponsavel}
                      onChange={e => setCpfResponsavel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      CI/RG ou CNH do responsável
                    </label>
                    <input
                      type="text"
                      placeholder="Número do documento"
                      value={docResponsavel}
                      onChange={e => setDocResponsavel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Data de assinatura
              </label>
              <input
                type="date"
                value={dados.data_assinatura}
                onChange={e => setDados(d => ({ ...d, data_assinatura: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {ehMenor && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Bolsista <strong>menor de idade</strong>. A assinatura no termo será do representante legal.
                </span>
              </div>
            )}

            <button
              onClick={gerarTermoPDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              {generatingPDF
                ? 'Gerando PDF…'
                : `Gerar PDF — Termo_${bolsista.codigo_bolsista ?? bolsista.id}.pdf`}
            </button>
          </div>
        </Section>

      </div>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg border ${toastCls}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
