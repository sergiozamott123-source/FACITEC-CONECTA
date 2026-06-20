import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import logoFacitec from "@/assets/logo-facitec.png.png"
import logoCdtiv from "@/assets/logo-cdtiv.jpg.jpg"

import pibicJrImg from "@/assets/programas/pibic-jr.jpg"
import proficJrImg from "@/assets/programas/profic-jr.jpg"
import proficJovemImg from "@/assets/programas/profic-jovem.jpg"
import posGraduacaoImg from "@/assets/programas/pos-graduacao.jpg"
const PROGRAMAS = [
  {
    slug: "pibic-jr",
    nome: "PIBIC Jr",
    nomeCompleto: "Programa de Iniciação Científica Júnior",
    publico: "Ensino Fundamental II · 6º ao 9º ano",
    descricao: "Formação científica desde cedo, conectando alunos a orientadores e projetos de pesquisa aplicada.",
    cor: "#534AB7",
    corBg: "#EEEDFE",
    ativo: true,
    rota: "/pibic-jr",
    image: pibicJrImg,
  },
  {
    slug: "profic-jr",
    nome: "PROFIC Jr",
    nomeCompleto: "Programa de Fomento à Iniciação Científica Jr",
    publico: "Ensino Fundamental I · 1º ao 5º ano",
    descricao: "Estímulo à curiosidade científica nos primeiros anos escolares.",
    cor: "#0F6E56",
    corBg: "#E1F5EE",
    ativo: false,
    rota: null,
    image: proficJrImg,
  },
  {
    slug: "profic-jovem",
    nome: "PROFIC Jovem",
    nomeCompleto: "Programa de Fomento à Iniciação Científica",
    publico: "Ensino Médio · 1º ao 3º ano",
    descricao: "Pesquisa aplicada e inovação para estudantes do ensino médio de Vitória.",
    cor: "#993C1D",
    corBg: "#FAECE7",
    ativo: false,
    rota: null,
    image: proficJovemImg,
  },
  {
    slug: "pos-graduacao",
    nome: "Pós-Graduação",
    nomeCompleto: "Programa de Bolsas para Pós-Graduação",
    publico: "Mestrado e Doutorado",
    descricao: "Apoio à pesquisa avançada em parceria com universidades e institutos de pesquisa.",
    cor: "#854F0B",
    corBg: "#FAEEDA",
    ativo: false,
    rota: null,
    image: posGraduacaoImg,
  },
]

function ProgramaCover({ programa }) {
  if (programa.image) {
    return (
      <img
        src={programa.image}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    )
  }
  return (
    <div style={{
      width: "100%", height: "100%",
      background: `linear-gradient(135deg, ${programa.corBg} 0%, ${programa.cor}22 100%)`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -24, top: -24,
        width: 110, height: 110, borderRadius: "50%",
        background: programa.cor + "1A",
      }} />
      <div style={{
        position: "absolute", right: 50, bottom: -32,
        width: 80, height: 80, borderRadius: "50%",
        background: programa.cor + "12",
      }} />
    </div>
  )
}

function ProgramaCard({ programa, totalProjetos }) {
  const navigate = useNavigate()

  function handleClick() {
    if (programa.rota) navigate(programa.rota)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        background: "#fff",
        overflow: "hidden",
        cursor: programa.ativo ? "pointer" : "not-allowed",
        opacity: programa.ativo ? 1 : 0.62,
        transition: "box-shadow 0.15s, transform 0.12s",
      }}
      onMouseEnter={e => {
        if (!programa.ativo) return
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.1)"
        e.currentTarget.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none"
        e.currentTarget.style.transform = "none"
      }}
    >
      {/* Cover */}
      <div style={{ height: 104, position: "relative", flexShrink: 0 }}>
        <ProgramaCover programa={programa} />
        <div style={{ position: "absolute", bottom: 12, left: 16 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20,
            background: programa.ativo ? "#DCFCE7" : "rgba(255,255,255,0.75)",
            color: programa.ativo ? "#16A34A" : "#94A3B8",
            backdropFilter: "blur(4px)",
          }}>
            {programa.ativo ? (
              <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A", display: "inline-block" }} />Ativo</>
            ) : "Em breve"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", lineHeight: 1.2, marginBottom: 2 }}>
          {programa.nome}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: programa.cor, marginBottom: 10 }}>
          {programa.nomeCompleto}
        </div>
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
          {programa.descricao}
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid #F1F5F9", paddingTop: 12,
        }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{programa.publico}</span>
          {programa.ativo ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: programa.cor }}>
              {totalProjetos !== null ? `${totalProjetos} projetos` : "…"}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#CBD5E1" }}>Em configuração</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HubProgramas() {
  const [totalProjetos, setTotalProjetos] = useState(null)

  useEffect(() => {
    supabase
      .from("projeto")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setTotalProjetos(count ?? 0))
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8FAFC",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
      color: "#0F172A",
    }}>
      {/* Top bar */}
      <div style={{ background: "#0D1F3C", padding: "14px 32px" }}>
        <div style={{
          maxWidth: 960, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#000", borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center" }}>
              <img src={logoFacitec} alt="FACITEC" style={{ height: 32, display: "block" }} />
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)" }} />
            <div style={{ background: "#fff", borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center" }}>
              <img src={logoCdtiv} alt="CDTIV" style={{ height: 26, display: "block" }} />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500 }}>
              Prefeitura de Vitória
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
              Companhia de Desenvolvimento, Turismo e Inovação
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(180deg, #112244 0%, #0D1F3C 100%)",
        padding: "44px 32px 52px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#93C5FD", marginBottom: 12,
          }}>
            Fundo Municipal de Ciência e Tecnologia
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: "#fff", margin: "0 0 10px", lineHeight: 1.2 }}>
            Facitec Conecta
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 auto", maxWidth: 460 }}>
            Plataforma integrada de gestão dos programas de fomento científico da Cia de Desenvolvimento e Turismo de Vitória
          </p>
        </div>
      </div>

      {/* Programs grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px 60px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 20,
        }}>
          Programas
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {PROGRAMAS.map(p => (
            <ProgramaCard
              key={p.slug}
              programa={p}
              totalProjetos={p.ativo ? totalProjetos : null}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
