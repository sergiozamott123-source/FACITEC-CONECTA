import { Link, useNavigate } from "react-router-dom"
import { ClipboardList } from "lucide-react"
import avaliacoesImg from "../assets/programas/avaliacoes_square.png"
import classificacaoImg from "../assets/programas/classificacao_square.png"
import convocacaoImg from "../assets/programas/convocacao_square.png"

const C = {
  navy: "#0D1F3C",
  purple: "#534AB7", purpleBg: "#EEEDFE",
  teal:   "#0F6E56", tealBg:   "#E1F5EE",
  coral:  "#993C1D", coralBg:  "#FAECE7",
}

const FERRAMENTAS = [
  {
    img: avaliacoesImg,
    titulo: "Avaliações",
    desc: "Painel de progresso dos avaliadores e status das avaliações por projeto",
    cor: C.purple, corBg: C.purpleBg,
    rota: "/avaliacoes",
  },
  {
    img: classificacaoImg,
    titulo: "Classificação",
    desc: "Ranking geral dos projetos com notas, consenso e classificação detalhada",
    cor: C.teal, corBg: C.tealBg,
    rota: "/classificacao",
  },
  {
    img: convocacaoImg,
    titulo: "Convocação de Recursos",
    desc: "Gestão dos recursos interpostos pelos candidatos após o resultado",
    cor: C.coral, corBg: C.coralBg,
    rota: "/recursos",
  },
]

function FerramentaCard({ f }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(f.rota)}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        padding: "20px 24px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 18,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: f.corBg,
        overflow: "hidden", flexShrink: 0,
      }}>
        <img src={f.img} alt={f.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
          {f.titulo}
        </div>
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
          {f.desc}
        </div>
      </div>

      <span style={{ color: "#CBD5E1", fontSize: 20, flexShrink: 0 }}>→</span>
    </div>
  )
}

export default function SelecaoM1() {
  return (
    <div style={{
      minHeight: "100vh", background: "#F8FAFC",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14, color: "#0F172A",
    }}>
      {/* Breadcrumb */}
      <div style={{ background: C.navy, padding: "11px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Link to="/pibic-jr" style={{
            color: "rgba(255,255,255,0.45)", fontSize: 13,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            ← PIBIC Jr
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: C.navy, padding: "28px 32px 36px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "#EEEDFE", color: C.purple,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "#AFA9EC", marginBottom: 5,
              }}>
                PIBIC Jr · Edição 2026
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>
                M1 · Seleção
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Ferramentas */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 32px 60px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 20,
        }}>
          Ferramentas administrativas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FERRAMENTAS.map(f => <FerramentaCard key={f.rota} f={f} />)}
        </div>
      </div>
    </div>
  )
}
