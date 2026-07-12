import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { getPrograma } from "@/lib/programas"
import { ClipboardList, Users, BarChart2, Archive, FlaskConical } from "lucide-react"

const C = {
  navy: "#0D1F3C",
  purple: "#534AB7", purpleBg: "#EEEDFE",
  teal: "#0F6E56",   tealBg:   "#E1F5EE",
  coral: "#993C1D",  coralBg:  "#FAECE7",
  amber: "#854F0B",  amberBg:  "#FAEEDA",
}

function buildModulos(slug) {
  return [
    {
      id: "m1", codigo: "M1", nome: "Seleção",
      desc: "Inscrições, avaliação de projetos e resultado final",
      cor: C.purple, corBg: C.purpleBg, ativo: true,
      rota: `/${slug}/selecao`, Icon: ClipboardList,
    },
    {
      id: "m2", codigo: "M2", nome: "Organização",
      desc: "Contratos, termos de adesão e equipes",
      cor: C.teal, corBg: C.tealBg, ativo: true,
      rota: `/admin/${slug}/2026/m2`, Icon: Users,
    },
    {
      id: "m3", codigo: "M3", nome: "Gestão",
      desc: "Acompanhamento, relatórios e bolsas",
      cor: C.coral, corBg: C.coralBg, ativo: false,
      rota: null, Icon: BarChart2,
    },
    {
      id: "m4", codigo: "M4", nome: "Legado",
      desc: "Edições passadas e incorporação ao acervo",
      cor: C.amber, corBg: C.amberBg, ativo: true,
      rota: `/admin/acervo`, Icon: Archive,
    },
  ]
}

function ModuloCard({ modulo }) {
  const navigate = useNavigate()
  const { Icon } = modulo

  return (
    <div
      onClick={() => modulo.rota && navigate(modulo.rota)}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: `1px solid ${modulo.ativo ? modulo.cor + "44" : "#E2E8F0"}`,
        padding: "24px",
        cursor: modulo.ativo ? "pointer" : "not-allowed",
        opacity: modulo.ativo ? 1 : 0.52,
        transition: "box-shadow 0.15s",
        display: "flex", flexDirection: "column", gap: 14,
      }}
      onMouseEnter={e => { if (modulo.ativo) e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.09)" }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: modulo.corBg, color: modulo.cor,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={24} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.07em", color: modulo.cor, marginBottom: 5,
        }}>
          {modulo.codigo}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8, lineHeight: 1.2 }}>
          {modulo.nome}
        </div>
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
          {modulo.desc}
        </div>
      </div>

      <div>
        {modulo.ativo ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, padding: "5px 12px",
            borderRadius: 20, background: modulo.corBg, color: modulo.cor,
          }}>
            Acessar →
          </span>
        ) : (
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 600,
            padding: "4px 10px", borderRadius: 20,
            background: "#F1F5F9", color: "#94A3B8",
          }}>
            Em breve
          </span>
        )}
      </div>
    </div>
  )
}

export default function PibicJr({ slug = "pibic-jr" }) {
  const programaSlug = slug
  const programa = getPrograma(programaSlug)
  const [stats, setStats] = useState({ projetos: null, avaliacoes: null })

  useEffect(() => {
    if (!programa) return
    let cancelado = false

    async function carregarStats() {
      const { data: edicoes } = await supabase
        .from("edicao")
        .select("id")
        .eq("programa_id", programa.programaId)
      const edicaoIds = (edicoes ?? []).map((e) => e.id)
      if (edicaoIds.length === 0) {
        if (!cancelado) setStats({ projetos: 0, avaliacoes: 0 })
        return
      }

      const { data: projetosData, count: projetos } = await supabase
        .from("projeto")
        .select("id", { count: "exact" })
        .in("edicao_id", edicaoIds)
      const projetoIds = (projetosData ?? []).map((p) => p.id)

      let avaliacoes = 0
      if (projetoIds.length > 0) {
        const { count } = await supabase
          .from("avaliacao")
          .select("*", { count: "exact", head: true })
          .in("projeto_id", projetoIds)
        avaliacoes = count ?? 0
      }

      if (!cancelado) setStats({ projetos: projetos ?? 0, avaliacoes })
    }

    carregarStats()
    return () => { cancelado = true }
  }, [programa])

  if (!programa) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Programa não encontrado</p>
          <Link to="/hub" style={{ fontSize: 13, color: "#534AB7" }}>← Voltar para Programas</Link>
        </div>
      </div>
    )
  }

  const MODULOS = buildModulos(programaSlug)

  return (
    <div style={{
      minHeight: "100vh", background: "#F8FAFC",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14, color: "#0F172A",
    }}>
      {/* Breadcrumb */}
      <div style={{ background: C.navy, padding: "11px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Link to="/" style={{
            color: "rgba(255,255,255,0.45)", fontSize: 13,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            ← Programas
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: C.navy, padding: "28px 32px 36px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: C.purpleBg, color: C.purple,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FlaskConical size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                {programa.nome}
              </h1>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                {programa.nomeCompleto} · Edição 2026
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 40 }}>
            {[
              { v: stats.projetos,   l: "Projetos inscritos"   },
              { v: stats.avaliacoes, l: "Avaliações realizadas" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {s.v !== null ? s.v : "…"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 32px 60px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 20,
        }}>
          Módulos operacionais
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {MODULOS.map(m => <ModuloCard key={m.id} modulo={m} />)}
        </div>
      </div>
    </div>
  )
}
