import { useNavigate } from "react-router-dom"
import logoFacitec from "@/assets/facitec_logo_cropped.png"
import logoCdtiv from "@/assets/logo-cdtiv.jpg.jpg"

export default function PortalAdmin() {
  const navigate = useNavigate()

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* FAIXA 1 — Header branco */}
      <div style={{
        background: "#ffffff",
        padding: "18px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 130, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={logoCdtiv} alt="CDTIV" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ width: 1, height: 36, background: "#E0E0E0" }} />
          <div style={{ width: 130, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={logoFacitec} alt="FACITEC" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
        </div>
        <button
          onClick={() => {}}
          style={{
            background: "none",
            border: "1px solid #CBD5E1",
            color: "#475569",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>

      {/* FAIXA 2 — Meio navy */}
      <div style={{
        flex: 1,
        background: "#0B1C3D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 46,
          fontWeight: 500,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.15,
        }}>
          FACITEC CONECTA
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "2.5px",
          color: "#9FB3D9",
          textAlign: "center",
        }}>
          Sistema Integrado de Gestão
        </div>
      </div>

      {/* FAIXA 3 — Footer branco */}
      <div style={{
        background: "#ffffff",
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          onClick={() => navigate("/hub")}
          style={{
            background: "#0B1C3D",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "13px 32px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Acessar o Painel
          <span style={{ fontSize: 16 }}>→</span>
        </button>
        <div style={{
          fontSize: 11,
          color: "#94A3B8",
          letterSpacing: "0.02em",
        }}>
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES
        </div>
      </div>

    </div>
  )
}
