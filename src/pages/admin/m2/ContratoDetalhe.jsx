import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"

// ── PALETA (mesma do ContratosPainel) ────────────────────────────────────────
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
    dados.numero_contrato &&
    dados.numero_processo &&
    dados.nome_diretor_presidente &&
    dados.nome_diretora_adm &&
    dados.data_assinatura &&
    dados.data_inicio_vigencia &&
    dados.data_fim_vigencia
  )
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
        padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
        background: C.grayBg,
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
  const enviado = !!url
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: `1px solid ${enviado ? C.green.fg + "44" : C.amber.fg + "44"}`, background: enviado ? C.green.bg : C.amber.bg }}>
      <span style={{ fontSize: 12, color: C.dark }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {enviado && (
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue.fg, textDecoration: "none", fontWeight: 600 }}>
            Ver →
          </a>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: enviado ? C.green.fg : C.amber.fg }}>
          {enviado ? "Enviado" : "Pendente"}
        </span>
      </div>
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const colors = { ok: C.green, err: C.red, info: C.blue }
  const c = colors[type] ?? C.blue
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, color: c.fg, border: `1px solid ${c.fg}44`,
      borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 340,
    }}>
      {msg}
    </div>
  )
}

const inputCss = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 7,
  outline: "none", background: C.white, color: C.dark,
  boxSizing: "border-box",
}

const CONTRATO_INICIAL = {
  numero_contrato: "", numero_processo: "",
  nome_diretor_presidente: "", nome_diretora_adm: "",
  data_assinatura: "", data_inicio_vigencia: "", data_fim_vigencia: "",
}

// ── TELA PRINCIPAL ───────────────────────────────────────────────────────────
export default function ContratoDetalhe() {
  const { ano = "2026", projetoId } = useParams()
  const navigate = useNavigate()

  const [projeto,    setProjeto]    = useState(null)
  const [orientador, setOrientador] = useState(null)
  const [bolsistas,  setBolsistas]  = useState([])
  const [contrato,   setContrato]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [toast,          setToast]          = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // null | "saving" | "saved"
  const [dados, setDados] = useState(CONTRATO_INICIAL)

  const debounceRef = useRef(null)
  const isDirtyRef  = useRef(false)

  useEffect(() => { fetchDados() }, [projetoId])

  // debounce auto-save — só dispara após interação do usuário
  useEffect(() => {
    if (!isDirtyRef.current || loading || !projeto) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(autoSave, 1500)
    return () => clearTimeout(debounceRef.current)
  }, [dados])

  function showToast(msg, type = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function fetchDados() {
    setLoading(true)
    setError(null)
    try {
      // 1 — projeto
      const { data: proj, error: e1 } = await supabase
        .from("projeto")
        .select("id, titulo, codigo, orientador_id, status")
        .eq("id", projetoId)
        .single()
      if (e1) throw e1
      setProjeto(proj)

      // 2 — orientador
      if (proj.orientador_id) {
        const { data: ori, error: e2 } = await supabase
          .from("orientador")
          .select("id, nome_completo, codigo_orientador, cpf, rg, orgao_emissor, email, telefone, cep, logradouro, numero, complemento, bairro, municipio, uf, doc_identidade, doc_diploma")
          .eq("id", proj.orientador_id)
          .single()
        if (!e2) setOrientador(ori)
      }

      // 3 — bolsistas ativos
      const { data: bolsData } = await supabase
        .from("bolsista")
        .select("id, nome_completo, cpf, data_nascimento, ano_escolar, escola_origem")
        .eq("projeto_id", projetoId)
        .eq("status", "ativo")
        .order("created_at", { ascending: true })
      setBolsistas(bolsData ?? [])

      // 4 — contrato (pode não existir)
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
        })
      }
    } catch (err) {
      setError(`Erro ao carregar dados: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // preserva o status já existente — nunca rebaixa emitido/assinado
  function buildPayload(overrideStatus) {
    const status = overrideStatus ?? contrato?.status ?? "rascunho"
    return { ...dados, projeto_id: projetoId, orientador_id: projeto.orientador_id, status }
  }

  async function autoSave() {
    setAutoSaveStatus("saving")
    const { data, error: err } = contrato
      ? await supabase.from("contrato").update(buildPayload()).eq("projeto_id", projetoId).select().single()
      : await supabase.from("contrato").insert(buildPayload()).select().single()
    if (!err) {
      setContrato(data)
      setAutoSaveStatus("saved")
      setTimeout(() => setAutoSaveStatus(null), 2500)
    } else {
      setAutoSaveStatus(null)
    }
  }

  async function handleSalvarDados(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current) // cancela debounce pendente
    setSaving(true)
    const { data, error: err } = contrato
      ? await supabase.from("contrato").update(buildPayload()).eq("projeto_id", projetoId).select().single()
      : await supabase.from("contrato").insert(buildPayload()).select().single()
    setSaving(false)
    if (err) { showToast(`Erro ao salvar: ${err.message}`, "err"); return }
    setContrato(data)
    setAutoSaveStatus(null)
    showToast("Dados do contrato salvos.", "ok")
  }

  function handleDadosChange(field, value) {
    isDirtyRef.current = true
    setDados(d => ({ ...d, [field]: value }))
  }

  const status = loading ? null : calcStatus({ orientador, bolsistas, contrato })
  const dadosOk = calcDadosContratoOk(dados)
  const endereco = orientador
    ? [orientador.logradouro, orientador.numero, orientador.complemento, orientador.bairro, orientador.municipio, orientador.uf]
        .filter(Boolean).join(", ")
    : ""

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.grayL, fontSize: 14, fontFamily: "system-ui, sans-serif" }}>
        Carregando…
      </div>
    )
  }

  if (error || !projeto) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.red.fg, fontSize: 14, fontFamily: "system-ui, sans-serif" }}>
        {error ?? "Projeto não encontrado."}
      </div>
    )
  }

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
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* 1 — Dados do orientador */}
        <Card title="Dados do orientador">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px", marginBottom: 20 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Nome completo" value={orientador?.nome_completo} />
            </div>
            <Field label="CPF"           value={orientador?.cpf}          mono />
            <Field label="RG"            value={orientador?.rg}           mono />
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
                      {b.escola_origem ?? "—"}
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

              {/* número contrato */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Número do contrato
                </label>
                <input
                  style={inputCss}
                  placeholder="Ex: 001/2026"
                  value={dados.numero_contrato}
                  onChange={e => handleDadosChange("numero_contrato", e.target.value)}
                />
              </div>

              {/* número processo */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Número do processo administrativo
                </label>
                <input
                  style={inputCss}
                  placeholder="Ex: 2026.001234"
                  value={dados.numero_processo}
                  onChange={e => handleDadosChange("numero_processo", e.target.value)}
                />
              </div>

              {/* diretor presidente */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Nome do Diretor Presidente
                </label>
                <input
                  style={inputCss}
                  value={dados.nome_diretor_presidente}
                  onChange={e => handleDadosChange("nome_diretor_presidente", e.target.value)}
                />
              </div>

              {/* diretora adm */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Nome da Diretora Adm-Financeira
                </label>
                <input
                  style={inputCss}
                  value={dados.nome_diretora_adm}
                  onChange={e => handleDadosChange("nome_diretora_adm", e.target.value)}
                />
              </div>

              {/* data assinatura */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Data de assinatura
                </label>
                <input
                  type="date"
                  style={inputCss}
                  value={dados.data_assinatura}
                  onChange={e => handleDadosChange("data_assinatura", e.target.value)}
                />
              </div>

              {/* vigência */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Início da vigência
                  </label>
                  <input
                    type="date"
                    style={inputCss}
                    value={dados.data_inicio_vigencia}
                    onChange={e => handleDadosChange("data_inicio_vigencia", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.grayL, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Fim da vigência
                  </label>
                  <input
                    type="date"
                    style={inputCss}
                    value={dados.data_fim_vigencia}
                    onChange={e => handleDadosChange("data_fim_vigencia", e.target.value)}
                  />
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer",
                background: C.header, color: C.white, fontSize: 13, fontWeight: 600,
                opacity: saving ? 0.6 : 1, transition: "opacity 0.12s",
              }}
            >
              {saving ? "Salvando…" : "Salvar dados"}
            </button>
          </form>
        </Card>

        {/* 4 — Ações */}
        <Card title="Ações">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                disabled={!dadosOk}
                onClick={() => showToast("Geração de PDF em desenvolvimento.", "info")}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none", cursor: dadosOk ? "pointer" : "not-allowed",
                  background: dadosOk ? C.header : C.grayBg,
                  color:      dadosOk ? C.white  : C.grayL,
                  fontSize: 13, fontWeight: 600, opacity: dadosOk ? 1 : 0.7,
                  transition: "opacity 0.12s",
                }}
              >
                Gerar contrato PDF
              </button>
              {!dadosOk && (
                <span style={{ fontSize: 11, color: C.amber.fg }}>Preencha todos os dados do contrato antes de gerar.</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                onClick={() => showToast("Geração de termos em desenvolvimento.", "info")}
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

          </div>
        </Card>

      </div>

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  )
}
