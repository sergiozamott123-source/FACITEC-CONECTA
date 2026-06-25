import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"

// ── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  header:   "#1a2744",
  border:   "#E2E8F0",
  bg:       "#F8FAFC",
  white:    "#FFFFFF",
  dark:     "#0F172A",
  gray:     "#64748B",
  grayL:    "#94A3B8",
  grayBg:   "#F1F5F9",
  // status badges (conforme especificação)
  red:    { bg: "#fcebeb", fg: "#a32d2d" },
  amber:  { bg: "#faeeda", fg: "#854f0b" },
  blue:   { bg: "#e6f1fb", fg: "#0c447c" },
  green:  { bg: "#eaf3de", fg: "#3b6d11" },
  purple: { bg: "#EEEDFE", fg: "#534AB7" },
}

// ── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  aguardando_dados:  { label: "Aguardando dados",  ...C.red    },
  aguardando_equipe: { label: "Aguardando equipe", ...C.purple },
  pronto:            { label: "Pronto p/ emitir",  ...C.amber  },
  emitido:           { label: "Contrato emitido",  ...C.blue   },
  assinado:          { label: "Assinado",          ...C.green  },
}

const FILTROS = [
  { key: "todos",            label: "Todos"           },
  { key: "aguardando_dados", label: "Aguardando dados"},
  { key: "pronto",           label: "Prontos"         },
  { key: "emitido",          label: "Emitidos"        },
  { key: "assinado",         label: "Assinados"       },
]

function calcStatus(p) {
  if (p.contrato?.status === "assinado") return "assinado"
  if (p.contrato?.status === "emitido")  return "emitido"
  const docsOk = p.orientador?.cpf && p.orientador?.doc_identidade && p.orientador?.doc_diploma
  if (!docsOk) return "aguardando_dados"
  if (p.numBolsistas < 8) return "aguardando_equipe"
  return "pronto"
}

function calcDocs(orientador) {
  if (!orientador) return 0
  return [orientador.doc_identidade, orientador.doc_diploma].filter(Boolean).length
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: C.grayBg, fg: C.gray }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, background: cfg.bg, color: cfg.fg,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, border: `0.5px solid ${C.border}`,
      padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: C.gray }}>{label}</span>
    </div>
  )
}

function PillBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 600, transition: "all 0.12s",
        background: active ? C.header : C.grayBg,
        color: active ? C.white : C.gray,
      }}
    >
      {children}
    </button>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function ContratosPainel() {
  const { ano = "2026" } = useParams()
  const navigate = useNavigate()

  const [projetos, setProjetos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filtro, setFiltro]     = useState("todos")

  useEffect(() => { fetchDados() }, [])

  async function fetchDados() {
    setLoading(true)
    setError(null)
    try {
      // 1 — projetos selecionados
      const { data: projData, error: e1 } = await supabase
        .from("projeto")
        .select("id, titulo, codigo, orientador_id, ordem_classificacao")
        .eq("status", "selecionado")
        .order("ordem_classificacao", { ascending: true })
      if (e1) throw e1

      if (!projData?.length) { setProjetos([]); setLoading(false); return }

      const projetoIds   = projData.map(p => p.id)
      const orientadorIds = [...new Set(projData.map(p => p.orientador_id).filter(Boolean))]

      // 2 — orientadores
      const { data: orientData, error: e2 } = await supabase
        .from("orientador")
        .select("id, nome_completo, codigo_orientador, cpf, doc_identidade, doc_diploma")
        .in("id", orientadorIds)
      if (e2) throw e2

      // 3 — bolsistas ativos
      const { data: bolsistaData, error: e3 } = await supabase
        .from("bolsista")
        .select("projeto_id")
        .in("projeto_id", projetoIds)
        .eq("status", "ativo")
      if (e3) throw e3

      // 4 — contratos
      const { data: contratoData, error: e4 } = await supabase
        .from("contrato")
        .select("projeto_id, status, numero_contrato")
        .in("projeto_id", projetoIds)
      if (e4) throw e4

      // merge em memória
      const orientMap = Object.fromEntries((orientData ?? []).map(o => [o.id, o]))
      const bolsistaCount = {}
      ;(bolsistaData ?? []).forEach(b => {
        bolsistaCount[b.projeto_id] = (bolsistaCount[b.projeto_id] ?? 0) + 1
      })
      const contratoMap = Object.fromEntries((contratoData ?? []).map(c => [c.projeto_id, c]))

      const merged = projData.map(p => ({
        ...p,
        orientador:   orientMap[p.orientador_id] ?? null,
        numBolsistas: bolsistaCount[p.id] ?? 0,
        contrato:     contratoMap[p.id] ?? null,
      }))

      setProjetos(merged)
    } catch (err) {
      setError(`Erro ao carregar dados: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // métricas
  const porStatus = projetos.reduce((acc, p) => {
    const s = calcStatus(p)
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const projetosFiltrados = filtro === "todos"
    ? projetos
    : projetos.filter(p => calcStatus(p) === filtro)

  const baseRoute = `/admin/pibic-jr/${ano}/m2/contratos`

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14, color: C.dark,
    }}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ background: C.header, padding: "24px 32px 28px" }}>
        <button
          onClick={() => navigate("/pibic-jr")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.45)", fontSize: 13, padding: "0 0 16px",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← PibicJr
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              M2 · ORGANIZAÇÃO
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>
              Contratos
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>
              PibicJr · Edição {ano} · {loading ? "…" : `${projetos.length} projetos selecionados`}
            </p>
          </div>
          <button
            onClick={fetchDados}
            style={{
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
              padding: "7px 14px", cursor: "pointer",
            }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 60px" }}>

        {error && (
          <div style={{ background: C.red.bg, color: C.red.fg, border: `1px solid ${C.red.fg}33`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ── MÉTRICAS ──────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <MetricCard label="Aguardando dados"  value={porStatus.aguardando_dados  ?? 0} color={C.red.fg}   />
            <MetricCard label="Prontos p/ emitir" value={porStatus.pronto            ?? 0} color={C.amber.fg} />
            <MetricCard label="Contratos emitidos" value={porStatus.emitido          ?? 0} color={C.blue.fg}  />
            <MetricCard label="Assinados"          value={porStatus.assinado         ?? 0} color={C.green.fg} />
          </div>
        )}

        {/* ── FILTROS ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {FILTROS.map(f => (
            <PillBtn key={f.key} active={filtro === f.key} onClick={() => setFiltro(f.key)}>
              {f.label}
              {f.key !== "todos" && !loading && (
                <span style={{ marginLeft: 5, opacity: 0.7 }}>
                  ({f.key === "pronto"   ? (porStatus.pronto            ?? 0)
                  : f.key === "emitido"  ? (porStatus.emitido           ?? 0)
                  : f.key === "assinado" ? (porStatus.assinado          ?? 0)
                  :                        (porStatus.aguardando_dados  ?? 0)})
                </span>
              )}
            </PillBtn>
          ))}
        </div>

        {/* ── TABELA ────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.grayL, fontSize: 13 }}>
            Carregando projetos…
          </div>
        ) : projetosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.grayL, fontSize: 13 }}>
            Nenhum projeto neste filtro.
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 10, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
            {/* cabeçalho */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 70px 160px 110px",
              padding: "10px 20px",
              borderBottom: `1px solid ${C.border}`,
              background: C.grayBg,
              fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em", color: C.grayL,
              gap: 12,
            }}>
              <span>Orientador / Projeto</span>
              <span style={{ textAlign: "center" }}>Bolsistas</span>
              <span style={{ textAlign: "center" }}>Docs</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Ação</span>
            </div>

            {/* linhas */}
            {projetosFiltrados.map((p, idx) => {
              const status   = calcStatus(p)
              const numDocs  = calcDocs(p.orientador)
              const pronto   = status === "pronto"
              const detailRoute = `${baseRoute}/${p.id}`

              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 70px 160px 110px",
                    padding: "13px 20px",
                    borderBottom: idx < projetosFiltrados.length - 1 ? `1px solid ${C.border}` : "none",
                    alignItems: "center",
                    gap: 12,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.grayBg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Orientador / Projeto */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.orientador?.nome_completo ?? <span style={{ color: C.grayL }}>Orientador não vinculado</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      {p.codigo && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: C.blue.fg,
                          background: C.blue.bg, padding: "1px 6px", borderRadius: 4,
                        }}>
                          {p.codigo}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: C.gray, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>
                        {p.titulo}
                      </span>
                    </div>
                  </div>

                  {/* Bolsistas */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: p.numBolsistas >= 8 ? C.green.fg : C.amber.fg,
                    }}>
                      {p.numBolsistas}
                    </span>
                    <span style={{ fontSize: 12, color: C.grayL }}>/8</span>
                  </div>

                  {/* Docs orientador */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: numDocs >= 2 ? C.green.fg : C.red.fg,
                    }}>
                      {numDocs}
                    </span>
                    <span style={{ fontSize: 12, color: C.grayL }}>/2</span>
                  </div>

                  {/* Status badge */}
                  <div>
                    <StatusBadge status={status} />
                  </div>

                  {/* Ação */}
                  <div style={{ textAlign: "right" }}>
                    <button
                      onClick={() => navigate(detailRoute)}
                      style={{
                        padding: "6px 16px", borderRadius: 7, border: "none",
                        cursor: "pointer", fontSize: 12, fontWeight: 600,
                        transition: "opacity 0.12s",
                        background: pronto ? C.header : C.grayBg,
                        color:      pronto ? C.white  : C.gray,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "0.82" }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"    }}
                    >
                      {pronto ? "Emitir" : "Ver"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
