import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./lib/supabase";

const C = {
  navy:"#0D1F3C",navy2:"#112244",navy3:"#1A3460",
  accent:"#3B82F6",accentL:"#93C5FD",
  teal:"#0F6E56",tealL:"#5DCAA5",tealBg:"#E1F5EE",
  purple:"#534AB7",purpleL:"#AFA9EC",purpleBg:"#EEEDFE",
  coral:"#993C1D",coralBg:"#FAECE7",
  amber:"#854F0B",amberBg:"#FAEEDA",
  green:"#16A34A",greenBg:"#DCFCE7",
  gray:"#64748B",grayL:"#94A3B8",grayBg:"#F1F5F9",
  border:"#E2E8F0",white:"#FFFFFF",dark:"#0F172A",
};

const LOGO_FACITEC = "/src/assets/logo-facitec.png";
const LOGO_CDTIV   = "/src/assets/logo-cdtiv.jpg";

const PROGRAMAS_BASE = [
  { id:"pibic-jr",     nome:"PIBIC Jr",      nomeCompleto:"Programa de Iniciação Científica Júnior",          publico:"Ensino Fundamental II · 6º ao 9º ano", icon:"🔬", cor:C.teal,   corBg:C.tealBg,   edicaoId:"9321a3d8-e4b6-499c-91ef-4ac93" },
  { id:"profic-jr",    nome:"PROFIC Jr",      nomeCompleto:"Programa de Fomento à Iniciação Científica Jr",    publico:"Ensino Fundamental I · 1º ao 5º ano",  icon:"🏫", cor:C.purple, corBg:C.purpleBg, edicaoId:null },
  { id:"profic-jovem", nome:"PROFIC Jovem",   nomeCompleto:"Programa de Fomento à Iniciação Científica",       publico:"Ensino Médio · 1º ao 3º ano",          icon:"📚", cor:C.coral,  corBg:C.coralBg,  edicaoId:null },
  { id:"pos-graduacao",nome:"Pós-Graduação",  nomeCompleto:"Programa de Bolsas para Pós-Graduação",            publico:"Mestrado e Doutorado",                 icon:"🎓", cor:C.amber,  corBg:C.amberBg,  edicaoId:null },
];

const MODULOS_PIBIC = [
  { id:"m1", nome:"M1 · Seleção",     desc:"Edital · Inscrição · Avaliação · Resultado", status:"concluido" },
  { id:"m2", nome:"M2 · Organização", desc:"Contratos · Termos de Adesão · Equipes",     status:"em-breve"  },
  { id:"m3", nome:"M3 · Gestão",      desc:"Acompanhamento · Relatórios · Bolsas",       status:"planejado" },
  { id:"m4", nome:"M4 · Legado",      desc:"Edições passadas · Incorporação ao acervo",  status:"planejado" },
];

const MODULOS_VAZIO = MODULOS_PIBIC.map(m => ({ ...m, status:"planejado" }));

const statusModulo = {
  concluido:  { label:"Concluído ✔", bg:C.greenBg, fg:C.green  },
  "em-breve": { label:"Em breve",    bg:"#FEF3C7", fg:"#B45309" },
  planejado:  { label:"Planejado",   bg:C.grayBg,  fg:C.grayL  },
};

const ACERVO_TAGS = ["Editais históricos","Projetos selecionados","Relatórios anuais","Publicações","Bolsistas cadastrados","Todos os programas"];

const GLOBAL_CSS = `
  .fc-app * { box-sizing:border-box; margin:0; padding:0; }
  .fc-app { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; line-height:1.5; background:#F1F5F9; min-height:100vh; color:#0F172A; }
  .fc-app ::-webkit-scrollbar { width:4px; height:4px; }
  .fc-app ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:2px; }
  @keyframes fc-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .fc-fadein { animation:fc-fadein 0.22s ease both; }
  @keyframes fc-spin { to{transform:rotate(360deg)} }
  .fc-spin { animation:fc-spin 0.8s linear infinite; display:inline-block; }
  .fc-card { background:#fff; border-radius:10px; border:0.5px solid #E2E8F0; padding:14px; }
  .fc-pill { display:inline-flex; align-items:center; font-size:10px; font-weight:600; padding:3px 9px; border-radius:20px; white-space:nowrap; }
  .fc-section-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#94A3B8; margin-bottom:10px; }
  .fc-nav-item:hover { color:rgba(255,255,255,0.85) !important; }
  .fc-prog-card { transition:box-shadow 0.15s; cursor:pointer; }
  .fc-prog-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }
  .fc-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:260px; gap:12px; color:#94A3B8; text-align:center; }
`;

function injectCSS() {
  if (document.getElementById("fc-css")) return;
  const s = document.createElement("style");
  s.id = "fc-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

// ── HOOK: busca stats reais do Supabase ──────────────────────────────
function useStats() {
  const [stats, setStats] = useState({ projetos:0, avaliacoes:0, avaliadores:0, loading:true });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [{ count: projetos }, { count: avaliacoes }, { count: avaliadores }] = await Promise.all([
          supabase.from("projeto").select("*", { count:"exact", head:true }),
          supabase.from("avaliacao").select("*", { count:"exact", head:true }),
          supabase.from("avaliador").select("*", { count:"exact", head:true }),
        ]);
        setStats({ projetos: projetos||0, avaliacoes: avaliacoes||0, avaliadores: avaliadores||0, loading:false });
      } catch(e) {
        console.error("Erro ao buscar stats:", e);
        setStats(s => ({ ...s, loading:false }));
      }
    }
    fetchStats();
  }, []);

  return stats;
}

// ── HOOK: busca atividades recentes ──────────────────────────────────
function useAtividades() {
  const [atividades, setAtividades] = useState([]);

  useEffect(() => {
    async function fetchAtividades() {
      try {
        const { data } = await supabase
          .from("projeto")
          .select("codigo_facitec, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5);

        if (data) {
          setAtividades(data.map(p => ({
            cor: p.status === "inscrito" ? C.green : C.accent,
            texto: `Projeto ${p.codigo_facitec} — ${p.status}`,
            tempo: new Date(p.created_at).toLocaleDateString("pt-BR"),
          })));
        }
      } catch(e) {
        console.error("Erro ao buscar atividades:", e);
      }
    }
    fetchAtividades();
  }, []);

  return atividades;
}

// ── COMPONENTES ──────────────────────────────────────────────────────

function Logos({ height=36 }) {
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      <div style={{ background:"#000", borderRadius:6, padding:"2px 6px", display:"flex", alignItems:"center" }}>
        <img src={LOGO_FACITEC} alt="FACITEC" style={{ height, width:"auto", display:"block" }} />
      </div>
      <div style={{ width:1, height:height*0.75, background:"rgba(255,255,255,0.2)", margin:"0 12px" }} />
      <div style={{ background:"#fff", borderRadius:6, padding:"3px 8px", display:"flex", alignItems:"center" }}>
        <img src={LOGO_CDTIV} alt="CDTIV" style={{ height:height*0.8, width:"auto", display:"block" }} />
      </div>
    </div>
  );
}

function Header({ pagina, setPagina }) {
  const nav = [
    { id:"painel",        label:"Painel geral"   },
    { id:"pibic-jr",      label:"PIBIC Jr"       },
    { id:"profic-jr",     label:"PROFIC Jr"      },
    { id:"profic-jovem",  label:"PROFIC Jovem"   },
    { id:"pos-graduacao", label:"Pós-Graduação"  },
    { id:"memoria",       label:"MEMÓRIA FACITEC", special:true },
    { id:"config",        label:"Configurações"  },
  ];
  return (
    <div style={{ position:"sticky", top:0, zIndex:100 }}>
      <div style={{ background:C.navy, padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Logos height={36} />
        <div style={{ textAlign:"center" }}>
          <div style={{ color:"#fff", fontSize:13, fontWeight:500 }}>FACITEC CONECTA</div>
          <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11 }}>Painel da Secretaria Executiva</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, color:"rgba(255,255,255,0.4)" }}>🔔</span>
          <div style={{ display:"flex", alignItems:"center", gap:8, color:"rgba(255,255,255,0.7)", fontSize:12 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:C.navy3, border:"1.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontWeight:600 }}>SE</div>
            Secretaria Executiva
          </div>
        </div>
      </div>
      <div style={{ background:C.navy2, display:"flex", padding:"0 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", overflowX:"auto" }}>
        <Link to="/"
          style={{ display:"flex", alignItems:"center", gap:4, textDecoration:"none",
                   color:"rgba(255,255,255,0.4)", fontSize:12, padding:"10px 14px",
                   borderBottom:"2px solid transparent", whiteSpace:"nowrap",
                   paddingRight:16, marginRight:4,
                   borderRight:"1px solid rgba(255,255,255,0.08)" }}>
          ← Programas
        </Link>
        {nav.map(item => (
          <button key={item.id} className="fc-nav-item" onClick={() => setPagina(item.id)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, padding:"10px 14px", whiteSpace:"nowrap",
              color: pagina===item.id ? "#fff" : item.special ? C.purpleL : "rgba(255,255,255,0.5)",
              borderBottom: pagina===item.id ? `2px solid ${item.special ? C.purpleL : C.accent}` : "2px solid transparent" }}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, valor, label, iconBg, iconColor, loading }) {
  return (
    <div className="fc-card" style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:iconBg, color:iconColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:500, color:C.dark, lineHeight:1 }}>
        {loading ? <span className="fc-spin">⟳</span> : valor}
      </div>
      <div style={{ fontSize:11, color:C.gray }}>{label}</div>
    </div>
  );
}

function ModuloCard({ modulo }) {
  const st = statusModulo[modulo.status];
  return (
    <div className="fc-card" style={{ padding:"10px 12px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:500, color:C.dark }}>{modulo.nome}</span>
        <span className="fc-pill" style={{ background:st.bg, color:st.fg }}>{st.label}</span>
      </div>
      <div style={{ fontSize:11, color:C.gray }}>{modulo.desc}</div>
    </div>
  );
}

function ProgramaCard({ programa, onClick, stats }) {
  const ativo = programa.edicaoId !== null;
  return (
    <div className="fc-card fc-prog-card" onClick={onClick} style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ width:36, height:36, borderRadius:8, background:programa.corBg, color:programa.cor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{programa.icon}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.dark }}>{programa.nome}</div>
            <div style={{ fontSize:11, color:C.gray, marginTop:1 }}>{programa.publico}</div>
          </div>
        </div>
        <span className="fc-pill" style={ ativo ? { background:C.greenBg, color:C.green } : { background:C.grayBg, color:C.grayL }}>
          {ativo ? `Ativo · ${stats?.projetos ?? "…"} projetos` : "A configurar"}
        </span>
      </div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {(ativo ? MODULOS_PIBIC : MODULOS_VAZIO).map(m => {
          const ms = statusModulo[m.status];
          return <span key={m.id} className="fc-pill" style={{ background:ms.bg, color:ms.fg }}>{m.nome}</span>;
        })}
      </div>
    </div>
  );
}

// ── PÁGINAS ──────────────────────────────────────────────────────────

function PainelGeral({ setPagina }) {
  const stats = useStats();
  const atividades = useAtividades();

  return (
    <div className="fc-fadein" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:500, color:C.navy }}>Painel geral</div>
          <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>
            FACITEC CONECTA · {new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" })} · Todos os programas
          </div>
        </div>
        <span className="fc-pill" style={{ background:C.greenBg, color:C.green, fontSize:11, padding:"5px 12px" }}>✔ Sistema operacional</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        <StatCard icon="📄" valor={stats.projetos}    label="Projetos — PibicJr26"    iconBg={C.tealBg}   iconColor={C.teal}   loading={stats.loading} />
        <StatCard icon="✅" valor={stats.avaliacoes}  label="Avaliações realizadas"    iconBg={C.amberBg}  iconColor={C.amber}  loading={stats.loading} />
        <StatCard icon="👥" valor={stats.avaliadores} label="Avaliadores ativos"       iconBg="#E6F1FB"    iconColor="#185FA5"  loading={stats.loading} />
        <StatCard icon="🏛" valor="30+"               label="Anos — MEMÓRIA FACITEC"   iconBg={C.purpleBg} iconColor={C.purple} loading={false} />
      </div>

      <div>
        <div className="fc-section-label">Programas</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {PROGRAMAS_BASE.map(p => (
            <ProgramaCard key={p.id} programa={p} onClick={() => setPagina(p.id)}
              stats={p.edicaoId ? { projetos: stats.projetos } : null} />
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div className="fc-card">
          <div className="fc-section-label">Atividade recente — projetos</div>
          {atividades.length === 0
            ? <div style={{ fontSize:12, color:C.grayL, padding:"12px 0" }}>Carregando…</div>
            : atividades.map((a, i) => (
              <div key={i} style={{ display:"flex", gap:9, padding:"7px 0", borderBottom: i<atividades.length-1 ? `0.5px solid ${C.grayBg}` : "none" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:a.cor, flexShrink:0, marginTop:5 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:C.dark }}>{a.texto}</div>
                  <div style={{ fontSize:10, color:C.grayL }}>{a.tempo}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="fc-card">
          <div className="fc-section-label">MEMÓRIA FACITEC</div>
          <div style={{ background:C.purpleBg, borderRadius:8, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:8, background:C.purple, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📚</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:C.purple }}>30+ anos de ciência</div>
              <div style={{ fontSize:11, color:C.purpleL, marginTop:1 }}>Portal público do legado científico · 1991–hoje</div>
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
            {ACERVO_TAGS.map(t => <span key={t} className="fc-pill" style={{ background:C.purpleBg, color:C.purple }}>{t}</span>)}
          </div>
          <button onClick={() => setPagina("memoria")}
            style={{ width:"100%", background:C.purpleBg, color:C.purple, border:`0.5px solid ${C.purpleL}`, borderRadius:8, padding:"8px", fontSize:12, fontWeight:500, cursor:"pointer" }}>
            Acessar MEMÓRIA FACITEC →
          </button>
        </div>
      </div>
    </div>
  );
}

function PaginaPrograma({ programa }) {
  const [statsPrograma, setStatsPrograma] = useState({ projetos:0, avaliacoes:0, avaliadores:0, inscricoes:0, loading:true });
  const ativo = programa.edicaoId !== null;
  const modulos = ativo ? MODULOS_PIBIC : MODULOS_VAZIO;

  useEffect(() => {
    if (!ativo) { setStatsPrograma(s => ({ ...s, loading:false })); return; }
    async function fetch() {
      const [{ count: projetos }, { count: avaliacoes }, { count: avaliadores }] = await Promise.all([
        supabase.from("projeto").select("*", { count:"exact", head:true }),
        supabase.from("avaliacao").select("*", { count:"exact", head:true }),
        supabase.from("avaliador").select("*", { count:"exact", head:true }),
      ]);
      setStatsPrograma({ projetos:projetos||0, avaliacoes:avaliacoes||0, avaliadores:avaliadores||0, inscricoes:projetos||0, loading:false });
    }
    fetch();
  }, [ativo]);

  return (
    <div className="fc-fadein" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:"#fff", borderRadius:12, border:`0.5px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ background:C.navy, padding:"20px 24px", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:programa.corBg, color:programa.cor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{programa.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"#fff", fontSize:18, fontWeight:500 }}>{programa.nome}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:2 }}>{programa.nomeCompleto}</div>
            <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, marginTop:2 }}>{programa.publico}</div>
          </div>
          <span className="fc-pill" style={ ativo ? { background:C.greenBg, color:C.green, fontSize:11, padding:"5px 12px" } : { background:C.grayBg, color:C.grayL, fontSize:11, padding:"5px 12px" }}>
            {ativo ? "Ativo · Edição 2026" : "A configurar"}
          </span>
        </div>
        {ativo && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderTop:`1px solid ${C.border}` }}>
            {[
              { v:statsPrograma.projetos,   l:"Projetos"   },
              { v:statsPrograma.inscricoes, l:"Inscrições" },
              { v:statsPrograma.avaliacoes, l:"Avaliações" },
              { v:statsPrograma.avaliadores,l:"Avaliadores"},
            ].map((s, i) => (
              <div key={i} style={{ padding:"14px 16px", textAlign:"center", borderRight: i<3 ? `0.5px solid ${C.border}` : "none" }}>
                <div style={{ fontSize:22, fontWeight:500, color:programa.cor }}>
                  {statsPrograma.loading ? <span className="fc-spin">⟳</span> : s.v}
                </div>
                <div style={{ fontSize:11, color:C.gray }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="fc-section-label">Módulos operacionais</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {modulos.map(m => <ModuloCard key={m.id} modulo={m} />)}
        </div>
      </div>

      {!ativo && (
        <div className="fc-card">
          <div className="fc-placeholder">
            <div style={{ fontSize:40, opacity:0.4 }}>{programa.icon}</div>
            <div style={{ fontSize:14, fontWeight:500, color:"#334155" }}>{programa.nome} — em configuração</div>
            <div style={{ fontSize:12, color:C.grayL, maxWidth:340 }}>
              Seguirá o mesmo fluxo M1→M4 do PIBIC Jr, adaptado ao seu público e edital.
            </div>
          </div>
        </div>
      )}

      {ativo && (
        <div>
          <div className="fc-section-label">Ações rápidas</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { icon:"📋", label:"Ver inscrições",      desc:`${statsPrograma.projetos} projetos recebidos` },
              { icon:"⚖️", label:"Painel de avaliação", desc:`${statsPrograma.avaliacoes} avaliações realizadas` },
              { icon:"📊", label:"Relatórios",           desc:"Exportar dados da edição" },
            ].map((a, i) => (
              <div key={i} className="fc-card fc-prog-card" style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontSize:22 }}>{a.icon}</div>
                <div style={{ fontSize:12, fontWeight:500, color:C.dark }}>{a.label}</div>
                <div style={{ fontSize:11, color:C.gray }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaginaMemoria() {
  const decadas = [
    { periodo:"1991–2000", projetos:"48 projetos",  desc:"Primeiros anos do FACITEC — consolidação do PIBIC Jr" },
    { periodo:"2001–2010", projetos:"127 projetos", desc:"Expansão dos programas — primeiras edições do PROFIC" },
    { periodo:"2011–2020", projetos:"203 projetos", desc:"Modernização e diversificação temática dos projetos" },
    { periodo:"2021–hoje", projetos:"89 projetos",  desc:"Era digital — sistemas e processos modernizados" },
  ];
  const categorias = [
    { icon:"📁", nome:"Editais",      qtd:"30+ documentos",  desc:"Todos os editais desde 1991" },
    { icon:"🔬", nome:"Projetos",     qtd:"467 projetos",    desc:"Projetos selecionados com orientadores" },
    { icon:"📊", nome:"Relatórios",   qtd:"200+ relatórios", desc:"Relatórios anuais e prestação de contas" },
    { icon:"👩‍🎓",nome:"Bolsistas",    qtd:"1.800+ pessoas",  desc:"Estudantes e orientadores ao longo dos anos" },
    { icon:"📰", nome:"Publicações",  qtd:"Em catalogação",  desc:"Artigos e materiais derivados" },
    { icon:"🗓", nome:"Linha do tempo",qtd:"1991–2026",      desc:"Cronologia completa de edições" },
  ];
  return (
    <div className="fc-fadein" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:C.navy, borderRadius:12, padding:"32px 28px", textAlign:"center" }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:C.purpleL, marginBottom:12 }}>FACITEC CONECTA</div>
        <div style={{ fontSize:28, fontWeight:600, color:"#fff", marginBottom:8 }}>MEMÓRIA FACITEC</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", maxWidth:480, margin:"0 auto 20px" }}>
          30 anos de ciência, pesquisa e inovação a serviço do município de Vitória.
        </div>
        <div style={{ display:"inline-flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          {["1991–2026","4 programas","467 projetos","1.800+ bolsistas"].map(t => (
            <span key={t} className="fc-pill" style={{ background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)", border:"0.5px solid rgba(255,255,255,0.2)", padding:"5px 14px", fontSize:11 }}>{t}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="fc-section-label">Linha do tempo</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {decadas.map((d,i) => (
            <div key={i} className="fc-card" style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.purple, marginTop:5, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:C.purple }}>{d.periodo}</div>
                <div style={{ fontSize:13, fontWeight:500, color:C.dark, marginTop:2 }}>{d.projetos}</div>
                <div style={{ fontSize:11, color:C.gray, marginTop:3 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="fc-section-label">O que está no acervo</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {categorias.map((c,i) => (
            <div key={i} className="fc-card fc-prog-card" style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:24 }}>{c.icon}</div>
              <div style={{ fontSize:12, fontWeight:500, color:C.dark }}>{c.nome}</div>
              <div style={{ fontSize:13, fontWeight:500, color:C.purple }}>{c.qtd}</div>
              <div style={{ fontSize:11, color:C.gray }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fc-card" style={{ background:C.purpleBg, border:`0.5px solid ${C.purpleL}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:C.purple, marginBottom:4 }}>Portal público da MEMÓRIA FACITEC</div>
            <div style={{ fontSize:11, color:C.purple, opacity:0.8 }}>Acesso aberto para pesquisadores, comunidade acadêmica e sociedade.</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
            <div style={{ fontSize:11, fontWeight:500, color:C.purple }}>🔗 cdtiv.com.br/facitec/memoria</div>
            <span className="fc-pill" style={{ background:C.greenBg, color:C.green }}>Em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaginaConfig() {
  return (
    <div className="fc-fadein">
      <div className="fc-card">
        <div className="fc-placeholder">
          <div style={{ fontSize:40, opacity:0.4 }}>⚙️</div>
          <div style={{ fontSize:14, fontWeight:500, color:"#334155" }}>Configurações do sistema</div>
          <div style={{ fontSize:12, color:C.grayL, maxWidth:340 }}>Gerenciamento de usuários, perfis, eixos temáticos e critérios por edição. Disponível nas próximas versões.</div>
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────────────
export default function FacitecConecta() {
  const [pagina, setPagina] = useState("painel");
  useEffect(() => { injectCSS(); }, []);

  const programaAtivo = PROGRAMAS_BASE.find(p => p.id === pagina);

  function renderPagina() {
    if (pagina === "painel") return <PainelGeral setPagina={setPagina} />;
    if (programaAtivo)       return <PaginaPrograma programa={programaAtivo} />;
    if (pagina === "memoria") return <PaginaMemoria />;
    if (pagina === "config")  return <PaginaConfig />;
    return null;
  }

  return (
    <div className="fc-app">
      <Header pagina={pagina} setPagina={setPagina} />
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 24px" }}>
        {renderPagina()}
      </div>
    </div>
  );
}