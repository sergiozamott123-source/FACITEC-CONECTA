const HEIGHTS = { sm: 36, md: 52, lg: 80 }

export default function LogoFacitecConecta({ size = 'md', inverted = false }) {
  const h = HEIGHTS[size] ?? 52
  const w = Math.round(h * 560 / 220)

  // Color tokens — inverted = white text for dark backgrounds
  const c1 = inverted ? '#ffffff' : '#1e3a5f'       // FACITEC text, dark-navy shapes
  const c2 = inverted ? '#93c5fd' : '#2e6da4'       // Conecta text, blue shapes
  const cs = inverted ? 'rgba(255,255,255,0.40)' : '#8a9ab0'  // subtitle
  const div = inverted ? 'rgba(255,255,255,0.12)' : '#e2e8f0' // separator line

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 560 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FACITEC Conecta"
      style={{ display: 'block' }}
    >
      {/* Blocos decorativos */}
      <rect x="20" y="52" width="38" height="38" rx="3" fill="#f26522" />
      <rect x="44" y="76" width="22" height="22" rx="2" fill={c1} />
      <rect x="20" y="92" width="18" height="18" rx="2" fill={c2} />
      <rect x="38" y="92" width="34" height="34" rx="3" fill="#3aaa5c" />

      {/* FACITEC */}
      <text x="88" y="88" fontFamily="Arial, Helvetica, sans-serif" fontSize="40" fontWeight="700" fill={c1} letterSpacing="1">
        FACITEC
      </text>

      {/* Separador */}
      <line x1="88" y1="100" x2="500" y2="100" stroke={div} strokeWidth="0.5" />

      {/* Grafo de rede */}
      <line x1="98"  y1="132" x2="138" y2="115" stroke={c1} strokeWidth="1.5" />
      <line x1="98"  y1="132" x2="138" y2="149" stroke={c1} strokeWidth="1.5" />
      <line x1="144" y1="115" x2="172" y2="123" stroke="#f26522" strokeWidth="1.2" />
      <line x1="144" y1="115" x2="172" y2="141" stroke="#3aaa5c" strokeWidth="1" />
      <line x1="144" y1="149" x2="172" y2="123" stroke="#f26522" strokeWidth="1" />
      <line x1="144" y1="149" x2="172" y2="141" stroke="#3aaa5c" strokeWidth="1.2" />
      <line x1="177" y1="123" x2="202" y2="132" stroke={c2} strokeWidth="1.5" />
      <line x1="177" y1="141" x2="202" y2="132" stroke={c2} strokeWidth="1.5" />

      {/* Nós */}
      <circle cx="98"  cy="132" r="7"   fill={c1} />
      <circle cx="138" cy="115" r="5.5" fill={c1} />
      <circle cx="138" cy="149" r="5.5" fill={c1} />
      <circle cx="172" cy="123" r="4.5" fill="#f26522" />
      <circle cx="172" cy="141" r="4.5" fill="#3aaa5c" />
      <circle cx="202" cy="132" r="6.5" fill={c2} />

      {/* Conecta */}
      <text x="220" y="140" fontFamily="Arial, Helvetica, sans-serif" fontSize="24" fontWeight="300" fill={c2} letterSpacing="4">
        Conecta
      </text>

      {/* Subtítulo */}
      <text x="88" y="175" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fill={cs} letterSpacing="2">
        CDTIV · VITÓRIA · ES
      </text>
    </svg>
  )
}
