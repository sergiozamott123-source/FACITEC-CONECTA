import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { jsPDF } from "jspdf"
import { supabase } from "@/lib/supabase"

// ── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  header:  "#1a2744",
  border:  "#E2E8F0",
  bg:      "#F8FAFC",
  white:   "#FFFFFF",
  dark:    "#0F172A",
  gray:    "#64748B",
  grayL:   "#94A3B8",
  grayBg:  "#F1F5F9",
  red:    { bg: "#fcebeb", fg: "#a32d2d" },
  amber:  { bg: "#faeeda", fg: "#854f0b" },
  blue:   { bg: "#e6f1fb", fg: "#0c447c" },
  green:  { bg: "#eaf3de", fg: "#3b6d11" },
  purple: { bg: "#EEEDFE", fg: "#534AB7" },
}

const STATUS_CFG = {
  aguardando_dados:  { label: "Aguardando dados",  ...C.red    },
  aguardando_equipe: { label: "Aguardando equipe", ...C.purple },
  pronto:            { label: "Pronto p/ emitir",  ...C.amber  },
  emitido:           { label: "Contrato emitido",  ...C.blue   },
  assinado:          { label: "Assinado",          ...C.green  },
}

const MESES = ["janeiro","fevereiro","março","abril","maio","junho",
               "julho","agosto","setembro","outubro","novembro","dezembro"]

// ── TEMPLATE DO CONTRATO ─────────────────────────────────────────────────────
const TEMPLATE_CONTRATO = `CONTRATO DE CONCESSÃO DE BOLSAS Nº {{numero_contrato}}

{{numero_contrato}}, QUE ENTRE SI CELEBRAM A COMPANHIA DE DESENVOLVIMENTO, TURISMO E INOVAÇÃO DE VITÓRIA - CDTIV E {{nome_orientador}}

A COMPANHIA DE DESENVOLVIMENTO, TURISMO E INOVAÇÃO DE VITÓRIA - CDTIV, empresa pública municipal, com personalidade jurídica de direito privado, inscrita no CNPJ/MF 31.482.631/0001-18, com sede social situada à Rua Armando Moreira de Oliveira, 230, Goiabeiras, CEP 29.075-075, Vitória-ES, na qualidade de gestora do Fundo de Apoio à Ciência e Tecnologia - FACITEC, inscrito no CNPJ 21.896.905/0001-61, neste ato representada pelo Diretor Presidente, {{nome_diretor_presidente}}, e pela Diretora Administrativo Financeiro, {{nome_diretora_adm_financeira}}, doravante denominada CDTIV, e de outro lado {{nome_orientador}}, CPF nº {{cpf_orientador}} e RG nº {{rg_orientador}}, residente e domiciliado(a) no {{endereco_orientador}}, doravante denominado(a) simplesmente Orientador(a), de acordo com o disposto no processo administrativo nº {{numero_processo}}, firmam com base nas Leis Municipais nº 3.763/91, 5151/2000 e 7.871/2009, seus respectivos regulamentos, os Decretos Municipais nº 13.325/2007, 13.326/2007, 13.985/2008 e 14.663/2010, a Resolução 01/2014 do CMCT e o Edital {{numero_edital}}, o presente instrumento que se regerá na forma das cláusulas e condições a seguir estabelecidas:

CLÁUSULA PRIMEIRA: DO OBJETO.

O objeto deste instrumento é a concessão de 01 (uma) Bolsa de Orientação e 08 (oito) Bolsas de Iniciação Científica Júnior, conforme termos de adesão, para realização do projeto de pesquisa: {{titulo_projeto}}, aprovado no âmbito do Edital {{numero_edital}}.

As bolsas são concedidas em razão de terem sido atendidos os requisitos e critérios de avaliação previstos no Edital.

CLÁUSULA SEGUNDA: DA NATUREZA DOS RECURSOS, FORMA DE PAGAMENTO E VALORES.

Os valores das bolsas são de R$ {{valor_bolsa_orientador_fmt}} ({{valor_bolsa_orientador_extenso}}), mensais, para o(a) Orientador(a), e R$ {{valor_bolsa_estudante_fmt}} ({{valor_bolsa_estudante_extenso}}), mensais, para cada estudante bolsista que aderir ao presente instrumento, conforme tabela de bolsas do CMCT vigente.

O crédito será colocado à disposição dos Creditados em 06 (seis) parcelas mensais e sucessivas, até o décimo dia útil do mês subsequente ao mês de referência, desde que cumpridas as obrigações dispostas na CLÁUSULA QUINTA, através de depósitos em conta de "pagamento de benefício" junto ao Banco credenciado pelo FACITEC, sendo o valor global deste Instrumento de R$ {{valor_global_fmt}} ({{valor_global_extenso}}). O crédito ora concedido compõe o Fundo de Apoio à Ciência e Tecnologia do Município de Vitória - FACITEC, criado pela Lei nº 3.763/91, dotação orçamentária: FACITEC - 03.02.19.573.0030.1.0144 - Natureza da despesa: 3.3.90.18.04 - Fonte de Recursos: 1.500.0000.0000 - Especificação: Apoio à Pesquisa Científica - Exercício: {{ano_exercicio}}.

CLÁUSULA TERCEIRA: DA VIGÊNCIA.

3.1. A vigência deste contrato será de 06 (seis) meses contados a partir da data de sua assinatura, podendo ser prorrogado, sem acréscimos de bolsas, mediante solicitação do(a) Orientador(a) e autorização da Diretoria da CDTIV.

CLÁUSULA QUARTA: DA EQUIPE DO PROJETO, DESLIGAMENTOS E SUBSTITUIÇÕES.

A equipe do Projeto será formada pelo(a) Orientador(a) e por até 08 (oito) estudantes bolsistas que aderirem ao presente instrumento.

O(A) Orientador(a) poderá utilizar estudantes voluntários em suas equipes para o desenvolvimento de seus projetos.

Em caso de desligamento de estudantes bolsistas, o(a) Orientador(a) observará os seguintes procedimentos: deverá substituí-los, mediante justificativa, até o fim do terceiro mês de vigência do projeto; nos meses seguintes, a pesquisa terá prosseguimento com a equipe restante; poderão ser substituídos até 03 (três) estudantes bolsistas; os casos omissos serão analisados pelo Comitê de Acompanhamento.

Em caso de impossibilidade do(a) Orientador(a) continuar à frente do projeto, o mesmo poderá ser substituído por outro orientador que preencha os mesmos requisitos.

CLÁUSULA QUINTA: DAS OBRIGAÇÕES.

Da CDTIV: Liberar os recursos conforme estabelecido na Cláusula Segunda; emitir certificado de participação para os Orientadores, estudantes bolsistas e eventuais voluntários.

Do(a) Orientador(a): Orientar, monitorar e acompanhar as atividades de cada bolsista; encaminhar à CDTIV/FACITEC os relatórios mensais do projeto até o quinto dia útil do mês subsequente; solicitar à CDTIV/FACITEC a suspensão do pagamento e o desligamento do estudante bolsista que descumprir o plano de trabalho; entregar à CDTIV/FACITEC, no prazo de até 60 (sessenta) dias após o encerramento do PibicJr, o relatório final do projeto; produzir junto com os estudantes todo material necessário para apresentação do projeto; manter-se em dia com as obrigações fiscais junto à Fazenda Municipal.

Do(a) Estudante Bolsista: Cumprir todas as atividades previstas no plano de trabalho; apresentar os resultados do projeto, caso seja convocado; ter frequência mínima mensal de 75% nas atividades do projeto; manter-se em dia com as obrigações fiscais junto à Fazenda Municipal; efetuar o cadastro junto ao Banco autorizado. O estudante bolsista formalizará sua participação mediante assinatura do Termo de Adesão. Para os menores de dezoito anos, o Termo deve ser assinado pelo responsável.

CLÁUSULA SEXTA: DAS PENALIDADES.

O descumprimento das obrigações por parte do(a) Estudante Bolsista acarretará no seu desligamento do projeto e na impossibilidade de participação no Programa por 12 meses.

O descumprimento das obrigações por parte do(a) Orientador(a) acarretará no encerramento de seu projeto, rescisão deste instrumento e impossibilidade de submissão de projetos no Programa por 24 meses.

CLÁUSULA SÉTIMA: DISPOSIÇÕES FINAIS.

Este Instrumento será devidamente publicado no veículo de divulgação dos atos oficiais da Companhia de Desenvolvimento, Turismo e Inovação de Vitória.

Fica eleito o Foro da Fazenda Pública Estadual, Municipal, Registro Públicos, Meio Ambiente e Saúde de Vitória/ES para dirimir quaisquer questões que decorram direta ou indiretamente do presente contrato.

E por estarem assim justos e acordados, assinam o presente contrato em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo:

Vitória, {{dia_assinatura}} de {{mes_assinatura}} de {{ano_assinatura}}.


_______________________________    _______________________________
{{nome_diretor_presidente}}         {{nome_diretora_adm_financeira}}
Diretor Presidente - CDTIV          Diretora de Administração e Finanças - CDTIV


_______________________________
{{nome_orientador}}
Orientador(a)


TESTEMUNHAS:

_______________________________
Nome legível:
CPF:
Assinatura:

_______________________________
Nome legível:
CPF:
Assinatura:`

// ── HELPERS ──────────────────────────────────────────────────────────────────
function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function calcStatus({ orientador, bolsistas, contrato }) {
  if (contrato?.status === "assinado") return "assinado"
  if (contrato?.status === "emitido")  return "emitido"
  const docsOk = orientador?.cpf && orientador?.doc_identidade && orientador?.doc_diploma
  if (!docsOk) return "aguardando_dados"
  if ((bolsistas?.length ?? 0) < 8) return "aguardando_equipe"
  return "pronto"
}

function calcDadosContratoOk(dados) {
  return !!(
    dados.numero_contrato && dados.numero_processo &&
    dados.nome_diretor_presidente && dados.nome_diretora_adm &&
    dados.data_assinatura && dados.data_inicio_vigencia && dados.data_fim_vigencia
  )
}

function fmtBRL(n) {
  return Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function porExtenso(valor) {
  const n = Math.round(Number(valor || 0) * 100)
  const reais = Math.floor(n / 100)
  const centavos = n % 100

  const uni = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove",
               "dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"]
  const dez = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"]
  const cen = ["","cento","duzentos","trezentos","quatrocentos","quinhentos",
               "seiscentos","setecentos","oitocentos","novecentos"]

  function p(x) {
    if (x === 0) return ""
    if (x === 100) return "cem"
    if (x < 20) return uni[x]
    if (x < 100) { const d = Math.floor(x / 10), u = x % 10; return dez[d] + (u ? " e " + uni[u] : "") }
    const c = Math.floor(x / 100), r = x % 100
    return cen[c] + (r ? " e " + p(r) : "")
  }

  function grp(x) {
    if (x === 0) return ""
    if (x < 1000) return p(x)
    const m = Math.floor(x / 1000), r = x % 1000
    const mil = m === 1 ? "mil" : p(m) + " mil"
    return mil + (r ? " e " + p(r) : "")
  }

  if (reais === 0 && centavos === 0) return "zero reais"
  let res = ""
  if (reais > 0) res += grp(reais) + (reais === 1 ? " real" : " reais")
  if (centavos > 0) {
    if (reais > 0) res += " e "
    res += p(centavos) + (centavos === 1 ? " centavo" : " centavos")
  }
  return res
}

function gerarTextoContrato(projeto, orientador, dados) {
  const vOri    = Number(dados.valor_bolsa_orientador || 1000)
  const vEst    = Number(dados.valor_bolsa_estudante  || 300)
  const vGlobal = vOri * 6 + 8 * vEst * 6

  const endParts = orientador
    ? [orientador.logradouro, orientador.numero, orientador.complemento,
       orientador.bairro, orientador.municipio, orientador.uf]
    : []
  const endereco = endParts.filter(Boolean).join(", ") || "___"

  let dataObj = { dia: "___", mes: "___", ano: "____" }
  if (dados.data_assinatura) {
    const d = new Date(dados.data_assinatura + "T12:00:00")
    dataObj = {
      dia: String(d.getDate()).padStart(2, "0"),
      mes: MESES[d.getMonth()],
      ano: String(d.getFullYear()),
    }
  }

  const vars = {
    "{{numero_contrato}}":               dados.numero_contrato             || "___",
    "{{nome_orientador}}":               orientador?.nome_completo         || "___",
    "{{cpf_orientador}}":                orientador?.cpf                   || "___",
    "{{rg_orientador}}":                 orientador?.rg                    || "___",
    "{{orgao_emissor}}":                 orientador?.orgao_emissor         || "___",
    "{{endereco_orientador}}":           endereco,
    "{{numero_processo}}":               dados.numero_processo             || "___",
    "{{numero_edital}}":                 dados.numero_edital               || "01/2026",
    "{{titulo_projeto}}":                projeto?.titulo                   || "___",
    "{{nome_diretor_presidente}}":       dados.nome_diretor_presidente     || "___",
    "{{nome_diretora_adm_financeira}}":  dados.nome_diretora_adm          || "___",
    "{{valor_bolsa_orientador_fmt}}":    fmtBRL(vOri),
    "{{valor_bolsa_orientador_extenso}}":porExtenso(vOri),
    "{{valor_bolsa_estudante_fmt}}":     fmtBRL(vEst),
    "{{valor_bolsa_estudante_extenso}}": porExtenso(vEst),
    "{{valor_global_fmt}}":              fmtBRL(vGlobal),
    "{{valor_global_extenso}}":          porExtenso(vGlobal),
    "{{ano_exercicio}}":                 String(dados.ano_exercicio || 2026),
    "{{dia_assinatura}}":                dataObj.dia,
    "{{mes_assinatura}}":                dataObj.mes,
    "{{ano_assinatura}}":                dataObj.ano,
  }

  let texto = TEMPLATE_CONTRATO
  for (const [k, v] of Object.entries(vars)) {
    texto = texto.split(k).join(v)
  }
  return texto
}

// ── SUB-COMPONENTES ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: C.grayBg, fg: C.gray }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, background: cfg.bg, color: cfg.fg, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  )
}

function Card({ title, children, action }) {
  return (
    <div style={{ background: C.white, borderRadius: 10, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.grayBg,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.gray }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  )
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: C.grayL, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: value ? C.dark : C.grayL, fontFamily: mono ? "monospace" : "inherit" }}>
        {value || "—"}
      </div>
    </div>
  )
}

function DocBadge({ url, label }) {
  const ok = !!url
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", borderRadius: 8,
      border: `1px solid ${ok ? C.green.fg + "44" : C.amber.fg + "44"}`,
      background: ok ? C.green.bg : C.amber.bg,
    }}>
      <span style={{ fontSize: 12, color: C.dark }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {ok && (
          <a href={url} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: C.blue.fg, textDecoration: "none", fontWeight: 600 }}>
            Ver →
          </a>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: ok ? C.green.fg : C.amber.fg }}>
          {ok ? "Enviado" : "Pendente"}
        </span>
      </div>
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const c = ({ ok: C.green, err: C.red, info: C.blue })[type] ?? C.blue
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, color: c.fg, border: `1px solid ${c.fg}44`,
      borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 360,
    }}>
      {msg}
    </div>
  )
}

const inputCss = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 7,
  outline: "none", background: C.white, color: C.dark, boxSizing: "border-box",
}

const labelCss = {
  display: "block", fontSize: 11, fontWeight: 600, color: C.grayL,
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em",
}

const CONTRATO_INICIAL = {
  numero_contrato: "", numero_processo: "",
  nome_diretor_presidente: "", nome_diretora_adm: "",
  data_assinatura: "", data_inicio_vigencia: "", data_fim_vigencia: "",
  valor_bolsa_orientador: 1000, valor_bolsa_estudante: 300,
  numero_edital: "01/2026", ano_exercicio: 2026,
  conteudo_editavel: "",
}

// ── TELA PRINCIPAL ───────────────────────────────────────────────────────────
export default function ContratoDetalhe() {
  const { ano = "2026", projetoId } = useParams()
  const navigate = useNavigate()

  const [projeto,        setProjeto]        = useState(null)
  const [orientador,     setOrientador]     = useState(null)
  const [bolsistas,      setBolsistas]      = useState([])
  const [contrato,       setContrato]       = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [generatingPDF,  setGeneratingPDF]  = useState(false)
  const [toast,          setToast]          = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null)
  const [dados,          setDados]          = useState(CONTRATO_INICIAL)

  const debounceRef  = useRef(null)
  const isDirtyRef   = useRef(false)
  const contratoRef  = useRef(null)  // espelho síncrono de `contrato` para closures

  // sincroniza ref sempre que o estado mudar
  useEffect(() => { contratoRef.current = contrato }, [contrato])

  useEffect(() => { fetchDados() }, [projetoId])

  useEffect(() => {
    if (!isDirtyRef.current || loading || !projeto) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(autoSave, 1500)
    return () => clearTimeout(debounceRef.current)
  }, [dados])

  function showToast(msg, type = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function fetchDados() {
    setLoading(true)
    setError(null)
    try {
      const { data: proj, error: e1 } = await supabase
        .from("projeto")
        .select("id, titulo, codigo, orientador_id, status")
        .eq("id", projetoId)
        .single()
      if (e1) throw e1
      setProjeto(proj)

      if (proj.orientador_id) {
        const { data: ori } = await supabase
          .from("orientador")
          .select("id, nome_completo, codigo_orientador, cpf, rg, orgao_emissor, email, telefone, cep, logradouro, numero, complemento, bairro, municipio, uf, doc_identidade, doc_diploma")
          .eq("id", proj.orientador_id)
          .single()
        if (ori) setOrientador(ori)
      }

      const { data: bolsData, error: eBols } = await supabase
        .from("bolsista")
        .select("*")
        .eq("projeto_id", projetoId)
        .eq("status", "ativo")
        .order("created_at", { ascending: true })
      if (eBols) throw new Error(`Falha ao carregar bolsistas: ${eBols.message}`)
      setBolsistas(bolsData ?? [])

      const { data: cont } = await supabase
        .from("contrato")
        .select("*")
        .eq("projeto_id", projetoId)
        .maybeSingle()
      setContrato(cont ?? null)
      if (cont) {
        setDados({
          numero_contrato:         cont.numero_contrato         ?? "",
          numero_processo:         cont.numero_processo         ?? "",
          nome_diretor_presidente: cont.nome_diretor_presidente ?? "",
          nome_diretora_adm:       cont.nome_diretora_adm       ?? "",
          data_assinatura:         cont.data_assinatura         ?? "",
          data_inicio_vigencia:    cont.data_inicio_vigencia    ?? "",
          data_fim_vigencia:       cont.data_fim_vigencia       ?? "",
          valor_bolsa_orientador:  cont.valor_bolsa_orientador  ?? 1000,
          valor_bolsa_estudante:   cont.valor_bolsa_estudante   ?? 300,
          numero_edital:           cont.numero_edital            ?? "01/2026",
          ano_exercicio:           cont.ano_exercicio            ?? 2026,
          conteudo_editavel:       cont.conteudo_editavel        ?? "",
        })
      }
    } catch (err) {
      setError(`Erro ao carregar dados: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function buildPayload(overrideStatus) {
    const curr     = contratoRef.current
    const status   = overrideStatus ?? curr?.status ?? "rascunho"
    const vOri     = Number(dados.valor_bolsa_orientador || 0)
    const vEst     = Number(dados.valor_bolsa_estudante  || 0)
    return {
      ...dados,
      projeto_id:    projetoId,
      orientador_id: projeto.orientador_id,
      valor_global:  vOri * 6 + 8 * vEst * 6,
      status,
    }
  }

  // Upsert seguro: usa contratoRef para evitar stale closure;
  // UPDATE retorna array — pegamos data[0] para não depender de .single().
  async function upsert(overrideStatus) {
    const curr = contratoRef.current
    const payload = buildPayload(overrideStatus)
    if (curr) {
      const { data, error } = await supabase
        .from("contrato")
        .update(payload)
        .eq("projeto_id", projetoId)
        .select()
      const row = data?.[0] ?? null
      if (!error && row) {
        setContrato(row)
        contratoRef.current = row
      }
      return { row, error }
    } else {
      const { data, error } = await supabase
        .from("contrato")
        .insert(payload)
        .select()
        .single()
      if (!error && data) {
        setContrato(data)
        contratoRef.current = data
      }
      return { row: data, error }
    }
  }

  async function autoSave() {
    setAutoSaveStatus("saving")
    const { row, error } = await upsert()
    if (!error && row) {
      setAutoSaveStatus("saved")
      setTimeout(() => setAutoSaveStatus(null), 2500)
    } else {
      setAutoSaveStatus(null)
    }
  }

  async function handleSalvarDados(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    setSaving(true)
    const { error } = await upsert()
    setSaving(false)
    if (error) { showToast(`Erro ao salvar: ${error.message}`, "err"); return }
    setAutoSaveStatus(null)
    showToast("Dados do contrato salvos.", "ok")
  }

  function handleDadosChange(field, value) {
    isDirtyRef.current = true
    setDados(d => ({ ...d, [field]: value }))
  }

  function handleRegenerarTexto() {
    const texto = gerarTextoContrato(projeto, orientador, dados)
    handleDadosChange("conteudo_editavel", texto)
  }

  async function handleGerarPDF() {
    if (!dados.conteudo_editavel.trim()) {
      showToast("Gere o texto do contrato antes de exportar o PDF.", "info")
      return
    }
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" })
      const mL = 30, mR = 20, mT = 30, mB = 20
      const pgW = 210, pgH = 297
      const usableW = pgW - mL - mR
      const lineH   = 6.5
      const col2X   = pgW / 2 + 5
      const sigW    = 65

      // ── texto justificado com quebra de página automática ─────────────
      function addJustifiedText(doc, text, x, startY, maxWidth, lh) {
        const lines = doc.splitTextToSize(text, maxWidth)
        let curY = startY
        lines.forEach((line, i) => {
          if (curY + lh > pgH - mB) { doc.addPage(); curY = mT }
          const isLast = i === lines.length - 1
          if (isLast || !line.trim()) {
            doc.text(line, x, curY)
          } else {
            const words = line.trim().split(" ")
            if (words.length <= 1) {
              doc.text(line, x, curY)
            } else {
              const totalW = words.reduce((s, w) => s + doc.getTextWidth(w), 0)
              const space  = (maxWidth - totalW) / (words.length - 1)
              let wx = x
              words.forEach(w => { doc.text(w, wx, curY); wx += doc.getTextWidth(w) + space })
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

      // ── cabeçalho ─────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC",
               pgW / 2, mT - 14, { align: "center" })
      doc.text("Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV",
               pgW / 2, mT - 8,  { align: "center" })
      doc.setLineWidth(0.4)
      doc.line(mL, mT - 4, pgW - mR, mT - 4)
      doc.setFontSize(12)

      let y = mT + 2

      // ── separar corpo do bloco de assinaturas ─────────────────────────
      const fullText = dados.conteudo_editavel
      const vitMatch = /^Vitória,/m.exec(fullText)
      const bodyText = vitMatch
        ? fullText.slice(0, vitMatch.index).trimEnd()
        : fullText

      // ── renderizar corpo ──────────────────────────────────────────────
      for (const rawLine of bodyText.split("\n")) {
        const txt = rawLine.trim()
        if (!txt) { y += lineH * 0.5; continue }

        y = checkPage(y, lineH)

        if (/^CONTRATO DE CONCESSÃO/i.test(txt)) {
          // título do contrato centralizado
          doc.setFont("helvetica", "bold")
          doc.setFontSize(13)
          const titleW = doc.splitTextToSize(txt, usableW)
          for (const tl of titleW) {
            y = checkPage(y, lineH)
            doc.text(tl, pgW / 2, y, { align: "center" })
            y += lineH
          }
          doc.setFontSize(12)
        } else if (/^CLÁUSULA/i.test(txt)) {
          // cláusula principal: espaço extra + bold + texto pode quebrar
          y += 4
          y = checkPage(y, lineH)
          doc.setFont("helvetica", "bold")
          const clauseLines = doc.splitTextToSize(txt, usableW)
          for (const cl of clauseLines) {
            y = checkPage(y, lineH)
            doc.text(cl, mL, y)
            y += lineH
          }
          doc.setFont("helvetica", "normal")
        } else if (/^3\.1\./.test(txt)) {
          // subcláusula: bold sem espaço extra
          y = checkPage(y, lineH)
          doc.setFont("helvetica", "bold")
          const subLines = doc.splitTextToSize(txt, usableW)
          for (const sl of subLines) {
            y = checkPage(y, lineH)
            doc.text(sl, mL, y)
            y += lineH
          }
          doc.setFont("helvetica", "normal")
        } else {
          doc.setFont("helvetica", "normal")
          y = addJustifiedText(doc, txt, mL, y, usableW, lineH)
        }
      }

      // ── bloco de assinaturas ─────────────────────────────────────────
      y += lineH

      // linha da data
      const dateLine = vitMatch
        ? fullText.slice(vitMatch.index).split("\n")[0].trim()
        : ""
      if (dateLine) {
        y = checkPage(y, lineH)
        doc.setFont("helvetica", "normal")
        doc.text(dateLine, mL, y)
        y += lineH * 2
      }

      // garante espaço (≈ 65 mm) para o primeiro bloco de assinaturas
      y = checkPage(y, 65)

      // helper: reinicia estado gráfico e traça linha horizontal
      function sigLine(x1, x2, atY) {
        doc.setDrawColor(0)
        doc.setLineWidth(0.4)
        doc.line(x1, atY, x2, atY)
      }

      // — Diretor Presidente + Diretora Adm-Financeira (2 colunas) —
      sigLine(mL,    mL    + sigW, y)
      sigLine(col2X, col2X + sigW, y)
      y += lineH * 0.7

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(dados.nome_diretor_presidente || "___", mL,    y)
      doc.text(dados.nome_diretora_adm       || "___", col2X, y)
      y += lineH * 0.8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text("Diretor Presidente - CDTIV",                   mL,    y)
      doc.text("Diretora de Administração e Finanças - CDTIV", col2X, y)
      y += lineH * 2.5

      // — Orientador (centralizado) —
      y = checkPage(y, 30)
      const cx = pgW / 2
      sigLine(cx - 32, cx + 32, y)
      y += lineH * 0.7

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(orientador?.nome_completo || "___", cx, y, { align: "center" })
      y += lineH * 0.8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text("Orientador(a)", cx, y, { align: "center" })
      y += lineH * 2.5

      // — Testemunhas (2 colunas) —
      y = checkPage(y, 45)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text("TESTEMUNHAS:", mL, y)
      y += lineH * 1.5

      y = checkPage(y, lineH * 6)
      sigLine(mL,    mL    + sigW, y)
      sigLine(col2X, col2X + sigW, y)
      y += lineH * 0.7

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      for (const field of ["Nome legível:", "CPF:", "Assinatura:"]) {
        y = checkPage(y, lineH)
        doc.text(field, mL,    y)
        doc.text(field, col2X, y)
        y += lineH
      }

      // ── upload para Storage + atualiza status ─────────────────────────
      const filename = `contrato-${(dados.numero_contrato || projetoId).replace(/\//g, "-")}.pdf`
      const blob = doc.output("blob")
      const storagePath = `contratos/${projetoId}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from("inscricoes")
        .upload(storagePath, blob, { contentType: "application/pdf", upsert: true })

      let pdfUrl = null
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("inscricoes").getPublicUrl(storagePath)
        pdfUrl = urlData.publicUrl
      }

      const updatePdf = { status: "emitido", ...(pdfUrl ? { pdf_url: pdfUrl } : {}) }
      const { data: updatedRows } = await supabase
        .from("contrato")
        .update(updatePdf)
        .eq("projeto_id", projetoId)
        .select()
      const updated = updatedRows?.[0] ?? null
      if (updated) { setContrato(updated); contratoRef.current = updated }

      doc.save(filename)
      showToast("Contrato PDF gerado. Status atualizado para Emitido.", "ok")
    } catch (err) {
      showToast(`Erro ao gerar PDF: ${err.message}`, "err")
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ── VALORES COMPUTADOS ────────────────────────────────────────────────────
  const status = loading ? null : calcStatus({ orientador, bolsistas, contrato })
  const dadosOk = calcDadosContratoOk(dados)
  const prontoParaPDF = dadosOk && !!dados.conteudo_editavel.trim()
  const valorGlobal = (Number(dados.valor_bolsa_orientador || 0) * 6) + (8 * Number(dados.valor_bolsa_estudante || 0) * 6)
  const endereco = orientador
    ? [orientador.logradouro, orientador.numero, orientador.complemento,
       orientador.bairro, orientador.municipio, orientador.uf].filter(Boolean).join(", ")
    : ""

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.grayL, fontSize: 14 }}>
      Carregando…
    </div>
  )

  if (error || !projeto) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.red.fg, fontSize: 14 }}>
      {error ?? "Projeto não encontrado."}
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14, color: C.dark }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: C.header, padding: "20px 32px 24px" }}>
        <button
          onClick={() => navigate(`/admin/pibic-jr/${ano}/m2/contratos`)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 13, padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Voltar aos contratos
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>
              M2 · CONTRATO
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.25 }}>
              {orientador?.nome_completo ?? "Orientador"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              {projeto.codigo && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue.fg, background: C.blue.bg, padding: "2px 8px", borderRadius: 5 }}>
                  {projeto.codigo}
                </span>
              )}
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {projeto.titulo}
              </span>
            </div>
          </div>
          {status && <StatusBadge status={status} />}
        </div>
      </div>

      {/* ── CONTEÚDO ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* 1 — Dados do orientador */}
        <Card title="Dados do orientador">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px", marginBottom: 20 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Nome completo" value={orientador?.nome_completo} />
            </div>
            <Field label="CPF"           value={orientador?.cpf}           mono />
            <Field label="RG"            value={orientador?.rg}            mono />
            <Field label="Órgão emissor" value={orientador?.orgao_emissor} />
            <Field label="E-mail"        value={orientador?.email} />
            <Field label="Telefone"      value={orientador?.telefone} />
            <Field label="CEP"           value={orientador?.cep} />
            {endereco && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Endereço" value={endereco} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.grayL, marginBottom: 4 }}>
              Documentos obrigatórios
            </div>
            <DocBadge url={orientador?.doc_identidade} label="Documento de identidade com foto e CPF — item 13.5-a" />
            <DocBadge url={orientador?.doc_diploma}    label="Diploma de graduação de curso superior — item 13.5-b" />
          </div>
        </Card>

        {/* 2 — Equipe de bolsistas */}
        <Card title={`Equipe de bolsistas — ${bolsistas.length} / 8`}>
          {bolsistas.length === 0 ? (
            <p style={{ fontSize: 13, color: C.grayL, margin: 0 }}>Nenhum bolsista cadastrado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {bolsistas.map((b, idx) => {
                const idade = calcIdade(b.data_nascimento)
                const menor = idade !== null && idade < 18
                return (
                  <div
                    key={b.id}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr 100px 100px 120px",
                      alignItems: "center", gap: 12, padding: "10px 0",
                      borderBottom: idx < bolsistas.length - 1 ? `1px solid ${C.border}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{b.nome_completo}</div>
                      <div style={{ fontSize: 11, color: C.grayL, marginTop: 2 }}>
                        {b.cpf && <span style={{ fontFamily: "monospace" }}>{b.cpf}</span>}
                        {b.ano_escolar && <span style={{ marginLeft: b.cpf ? 8 : 0 }}>{b.ano_escolar}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.gray }}>
                      {b.data_nascimento ? new Date(b.data_nascimento).toLocaleDateString("pt-BR") : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.escola ?? b.escola_origem ?? "—"}
                    </div>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                        background: menor ? C.amber.bg : C.grayBg,
                        color:      menor ? C.amber.fg : C.gray,
                      }}>
                        {menor ? `Menor (${idade} anos)` : `Maior (${idade ?? "?"})`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* 3 — Dados do contrato */}
        <Card
          title="Dados do contrato — preenchimento pela Secretaria"
          action={
            autoSaveStatus === "saving" ? (
              <span style={{ fontSize: 11, color: C.grayL }}>Salvando…</span>
            ) : autoSaveStatus === "saved" ? (
              <span style={{ fontSize: 11, color: C.green.fg, fontWeight: 600 }}>✓ Salvo</span>
            ) : null
          }
        >
          <form onSubmit={handleSalvarDados}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 20 }}>

              <div>
                <label style={labelCss}>Número do contrato</label>
                <input style={inputCss} placeholder="Ex: 001/2026"
                  value={dados.numero_contrato}
                  onChange={e => handleDadosChange("numero_contrato", e.target.value)} />
              </div>

              <div>
                <label style={labelCss}>Número do processo administrativo</label>
                <input style={inputCss} placeholder="Ex: 2026.001234"
                  value={dados.numero_processo}
                  onChange={e => handleDadosChange("numero_processo", e.target.value)} />
              </div>

              <div>
                <label style={labelCss}>Nome do Diretor Presidente</label>
                <input style={inputCss}
                  value={dados.nome_diretor_presidente}
                  onChange={e => handleDadosChange("nome_diretor_presidente", e.target.value)} />
              </div>

              <div>
                <label style={labelCss}>Nome da Diretora Adm-Financeira</label>
                <input style={inputCss}
                  value={dados.nome_diretora_adm}
                  onChange={e => handleDadosChange("nome_diretora_adm", e.target.value)} />
              </div>

              <div>
                <label style={labelCss}>Data de assinatura</label>
                <input type="date" style={inputCss}
                  value={dados.data_assinatura}
                  onChange={e => handleDadosChange("data_assinatura", e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelCss}>Início da vigência</label>
                  <input type="date" style={inputCss}
                    value={dados.data_inicio_vigencia}
                    onChange={e => handleDadosChange("data_inicio_vigencia", e.target.value)} />
                </div>
                <div>
                  <label style={labelCss}>Fim da vigência</label>
                  <input type="date" style={inputCss}
                    value={dados.data_fim_vigencia}
                    onChange={e => handleDadosChange("data_fim_vigencia", e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelCss}>Número do edital</label>
                <input style={inputCss} placeholder="Ex: 01/2026"
                  value={dados.numero_edital}
                  onChange={e => handleDadosChange("numero_edital", e.target.value)} />
              </div>

              <div>
                <label style={labelCss}>Ano de exercício</label>
                <input type="number" style={inputCss} placeholder="Ex: 2026"
                  value={dados.ano_exercicio}
                  onChange={e => handleDadosChange("ano_exercicio", Number(e.target.value))} />
              </div>

              <div>
                <label style={labelCss}>Valor da bolsa — Orientador (R$)</label>
                <input type="number" step="0.01" style={inputCss}
                  value={dados.valor_bolsa_orientador}
                  onChange={e => handleDadosChange("valor_bolsa_orientador", Number(e.target.value))} />
              </div>

              <div>
                <label style={labelCss}>Valor da bolsa — Estudante (R$)</label>
                <input type="number" step="0.01" style={inputCss}
                  value={dados.valor_bolsa_estudante}
                  onChange={e => handleDadosChange("valor_bolsa_estudante", Number(e.target.value))} />
              </div>

              {/* valor global calculado */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelCss}>Valor global do instrumento (calculado)</label>
                <div style={{
                  padding: "9px 12px", borderRadius: 7, background: C.grayBg,
                  border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: C.dark,
                  display: "flex", alignItems: "baseline", gap: 10,
                }}>
                  R$ {fmtBRL(valorGlobal)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: C.grayL }}>
                    ({dados.valor_bolsa_orientador}×6 parcelas + 8 × {dados.valor_bolsa_estudante}×6 parcelas)
                    = {porExtenso(valorGlobal)}
                  </span>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                background: C.header, color: C.white, fontSize: 13, fontWeight: 600,
                opacity: saving ? 0.6 : 1, transition: "opacity 0.12s",
              }}
            >
              {saving ? "Salvando…" : "Salvar dados"}
            </button>
          </form>
        </Card>

        {/* 4 — Texto do contrato */}
        <Card
          title="Texto do contrato"
          action={
            <button
              onClick={handleRegenerarTexto}
              style={{
                padding: "5px 14px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: C.white, color: C.dark, fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "background 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.grayBg }}
              onMouseLeave={e => { e.currentTarget.style.background = C.white  }}
            >
              Regenerar texto
            </button>
          }
        >
          {!dados.conteudo_editavel && (
            <p style={{ fontSize: 13, color: C.amber.fg, marginTop: 0, marginBottom: 12 }}>
              Clique em <strong>Regenerar texto</strong> para montar o texto do contrato com os dados preenchidos acima.
            </p>
          )}
          <textarea
            value={dados.conteudo_editavel}
            onChange={e => handleDadosChange("conteudo_editavel", e.target.value)}
            spellCheck={false}
            style={{
              width: "100%", minHeight: 520, padding: "14px", fontSize: 12,
              fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.7,
              border: `1px solid ${C.border}`, borderRadius: 7, resize: "vertical",
              outline: "none", background: C.white, color: C.dark, boxSizing: "border-box",
            }}
            placeholder="O texto completo do contrato aparecerá aqui. Edite livremente antes de gerar o PDF."
          />
        </Card>

        {/* 5 — Ações */}
        <Card title="Ações">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                disabled={!prontoParaPDF || generatingPDF}
                onClick={handleGerarPDF}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  cursor: prontoParaPDF && !generatingPDF ? "pointer" : "not-allowed",
                  background: prontoParaPDF ? C.header : C.grayBg,
                  color:      prontoParaPDF ? C.white   : C.grayL,
                  fontSize: 13, fontWeight: 600,
                  opacity: prontoParaPDF ? 1 : 0.7, transition: "opacity 0.12s",
                }}
              >
                {generatingPDF ? "Gerando PDF…" : "Gerar contrato PDF"}
              </button>
              {!dadosOk && (
                <span style={{ fontSize: 11, color: C.amber.fg }}>
                  Preencha todos os dados do contrato.
                </span>
              )}
              {dadosOk && !dados.conteudo_editavel.trim() && (
                <span style={{ fontSize: 11, color: C.amber.fg }}>
                  Gere o texto do contrato antes de exportar.
                </span>
              )}
              {contrato?.pdf_url && (
                <a href={contrato.pdf_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: C.blue.fg, fontWeight: 600 }}>
                  Ver último PDF gerado →
                </a>
              )}
            </div>

            <button
              onClick={() => showToast("Geração de termos de adesão em desenvolvimento.", "info")}
              style={{
                padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`,
                cursor: "pointer", background: C.white, color: C.dark,
                fontSize: 13, fontWeight: 600, transition: "background 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.grayBg }}
              onMouseLeave={e => { e.currentTarget.style.background = C.white  }}
            >
              Gerar termos de adesão
            </button>

          </div>
        </Card>

      </div>

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  )
}
