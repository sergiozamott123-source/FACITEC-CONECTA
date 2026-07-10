/**
 * FACITEC CONECTA — Módulo 1: Painel Administrativo Completo
 * Arquivo: src/pages/PainelModulo1.jsx
 *
 * Inclui:
 * - Lista de projetos com filtros, busca e paginação
 * - Detalhe do projeto com avaliações C1-C4
 * - Lista de avaliadores com estatísticas
 * - Fluxo de recursos
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAdmin } from "../contexts/AdminContext";
import { listarCiclos, statusRelatorioNoCiclo } from "../lib/relatorioMensal";

// ── PALETA ───────────────────────────────────────────────────────────
const C = {
  navy:"#0D1F3C", navy2:"#112244", accent:"#3B82F6", accentL:"#93C5FD",
  teal:"#0F6E56", tealBg:"#E1F5EE",
  green:"#16A34A", greenBg:"#DCFCE7",
  amber:"#854F0B", amberBg:"#FEF3C7",
  red:"#DC2626", redBg:"#FEF2F2",
  purple:"#534AB7", purpleBg:"#EEEDFE",
  gray:"#64748B", grayL:"#94A3B8", grayBg:"#F1F5F9",
  border:"#E2E8F0", dark:"#0F172A", white:"#FFFFFF",
};

// ── STATUS CONFIG ────────────────────────────────────────────────────
const STATUS_PROJETO = {
  inscrito:        { label:"Inscrito",         bg:"#EFF6FF", fg:"#1D4ED8" },
  em_avaliacao:    { label:"Em avaliação",      bg:C.amberBg, fg:C.amber  },
  classificado:    { label:"Classificado",      bg:C.greenBg, fg:C.green  },
  nao_classificado:{ label:"Não classificado",  bg:C.redBg,   fg:C.red   },
  recurso:         { label:"Recurso",           bg:C.purpleBg,fg:C.purple },
  finalizado:      { label:"Finalizado",        bg:C.grayBg,  fg:C.gray  },
};

const STATUS_AVALIACAO = {
  pendente:     { label:"Pendente",      bg:C.amberBg, fg:C.amber },
  em_andamento: { label:"Em andamento",  bg:"#EFF6FF", fg:"#1D4ED8" },
  concluida:    { label:"Concluída",     bg:C.greenBg, fg:C.green },
};

// ── HELPERS ──────────────────────────────────────────────────────────
function Badge({ status, map }) {
  const st = map[status] || { label: status, bg: C.grayBg, fg: C.gray };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", fontSize:11, fontWeight:600,
                   padding:"3px 9px", borderRadius:20, background:st.bg, color:st.fg,
                   whiteSpace:"nowrap" }}>
      {st.label}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background:C.white, borderRadius:10, border:`0.5px solid ${C.border}`,
                  padding:16, ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:C.grayL, marginBottom:10 }}>
      {children}
    </div>
  );
}

function BackBtn({ onClick, label="Voltar" }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
               cursor:"pointer", color:C.accent, fontSize:13, fontWeight:500, padding:"4px 0",
               marginBottom:16 }}>
      ← {label}
    </button>
  );
}

function NotaBar({ label, nota, max }) {
  const pct = max > 0 ? (nota / max) * 100 : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12,
                    color:C.dark, marginBottom:4 }}>
        <span>{label}</span>
        <span style={{ fontWeight:500 }}>{nota ?? "—"} / {max}</span>
      </div>
      <div style={{ height:6, background:C.grayBg, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:C.accent,
                      borderRadius:3, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── TELA: LISTA DE PROJETOS ──────────────────────────────────────────
function ListaProjetos({ onSelect }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    async function fetchProjetos() {
      setLoading(true);
      const { data, error } = await supabase
        .from("projeto")
        .select(`
          id, codigo_facitec, titulo, status, status_avaliacao,
          ordem_classificacao, area_conhecimento, instituicao, created_at,
          orientador:orientador_id ( nome_completo, email )
        `)
        .order("codigo_facitec", { ascending: true });

      if (!error) setProjetos(data || []);
      setLoading(false);
    }
    fetchProjetos();
  }, []);

  const filtrados = projetos.filter(p => {
    const matchBusca = busca === "" ||
      p.codigo_facitec?.toLowerCase().includes(busca.toLowerCase()) ||
      p.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      p.orientador?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.instituicao?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // contagem por status
  const contagem = projetos.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:500, color:C.navy }}>
            Projetos — PIBIC Jr 2026
          </div>
          <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>
            {projetos.length} projetos cadastrados · {filtrados.length} exibidos
          </div>
        </div>
        <button style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8,
                         padding:"8px 16px", fontSize:12, fontWeight:500, cursor:"pointer" }}>
          Exportar lista
        </button>
      </div>

      {/* Cards de status */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {[
          { key:"inscrito",         label:"Inscritos"         },
          { key:"em_avaliacao",     label:"Em avaliação"      },
          { key:"classificado",     label:"Classificados"     },
          { key:"nao_classificado", label:"Não classificados" },
          { key:"recurso",          label:"Recursos"          },
          { key:"finalizado",       label:"Finalizados"       },
        ].map(s => {
          const st = STATUS_PROJETO[s.key];
          return (
            <div key={s.key}
              onClick={() => { setFiltroStatus(filtroStatus === s.key ? "todos" : s.key); setPagina(1); }}
              style={{ background: filtroStatus === s.key ? st.bg : C.white,
                       border:`0.5px solid ${filtroStatus === s.key ? st.fg : C.border}`,
                       borderRadius:8, padding:"10px 12px", cursor:"pointer",
                       transition:"all 0.15s" }}>
              <div style={{ fontSize:18, fontWeight:500, color:st.fg }}>{contagem[s.key] || 0}</div>
              <div style={{ fontSize:11, color:C.gray }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Busca */}
      <input
        value={busca}
        onChange={e => { setBusca(e.target.value); setPagina(1); }}
        placeholder="Buscar por código, título, orientador ou instituição..."
        style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`0.5px solid ${C.border}`,
                 fontSize:13, color:C.dark, outline:"none" }}
      />

      {/* Tabela */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:C.grayL }}>Carregando projetos…</div>
        ) : paginados.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:C.grayL }}>Nenhum projeto encontrado.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.navy }}>
                {["Código","Título","Orientador","Área","Status","Classificação"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                                       fontWeight:600, color:"rgba(255,255,255,0.8)",
                                       whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginados.map((p, i) => (
                <tr key={p.id}
                  onClick={() => onSelect(p)}
                  style={{ background: i % 2 === 0 ? C.white : C.grayBg,
                           cursor:"pointer", transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : C.grayBg}>
                  <td style={{ padding:"10px 14px", fontSize:12, fontWeight:500,
                               color:C.accent, whiteSpace:"nowrap" }}>
                    {p.codigo_facitec}
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.dark,
                               maxWidth:280, overflow:"hidden", textOverflow:"ellipsis",
                               whiteSpace:"nowrap" }}>
                    {p.titulo}
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.gray,
                               whiteSpace:"nowrap" }}>
                    {p.orientador?.nome || "—"}
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:11, color:C.gray,
                               maxWidth:160, overflow:"hidden", textOverflow:"ellipsis",
                               whiteSpace:"nowrap" }}>
                    {p.area_conhecimento || "—"}
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <Badge status={p.status} map={STATUS_PROJETO} />
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.dark,
                               textAlign:"center" }}>
                    {p.ordem_classificacao || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            style={{ padding:"6px 12px", borderRadius:6, border:`0.5px solid ${C.border}`,
                     background:C.white, cursor:"pointer", fontSize:12, color:C.gray }}>
            ← Anterior
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)}
              style={{ padding:"6px 10px", borderRadius:6, border:`0.5px solid ${n === pagina ? C.accent : C.border}`,
                       background: n === pagina ? C.accent : C.white,
                       color: n === pagina ? "#fff" : C.gray, cursor:"pointer", fontSize:12 }}>
              {n}
            </button>
          ))}
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
            style={{ padding:"6px 12px", borderRadius:6, border:`0.5px solid ${C.border}`,
                     background:C.white, cursor:"pointer", fontSize:12, color:C.gray }}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ── TELA: DETALHE DO PROJETO ─────────────────────────────────────────
function DetalheProjeto({ projeto, onVoltar }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [orientador, setOrientador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetalhe() {
      setLoading(true);
      const [{ data: avs }, { data: ori }] = await Promise.all([
        supabase.from("avaliacao")
          .select(`*, avaliador:avaliador_id ( nome, email )`)
          .eq("projeto_id", projeto.id),
        supabase.from("orientador")
          .select("*")
          .eq("id", projeto.orientador_id)
          .single(),
      ]);
      setAvaliacoes(avs || []);
      setOrientador(ori);
      setLoading(false);
    }
    fetchDetalhe();
  }, [projeto.id]);

  const mediaNotas = avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + (a.nota_total || 0), 0) / avaliacoes.length).toFixed(2)
    : null;

  const stProjeto = STATUS_PROJETO[projeto.status] || STATUS_PROJETO.inscrito;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <BackBtn onClick={onVoltar} label="Voltar à lista de projetos" />

      {/* Hero */}
      <div style={{ background:C.navy, borderRadius:12, padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
                      flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.accentL, marginBottom:6,
                          fontFamily:"monospace" }}>
              {projeto.codigo_facitec}
            </div>
            <div style={{ fontSize:18, fontWeight:500, color:"#fff", marginBottom:6,
                          maxWidth:600, lineHeight:1.4 }}>
              {projeto.titulo}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>
              {projeto.area_conhecimento} · {projeto.instituicao}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
            <Badge status={projeto.status} map={STATUS_PROJETO} />
            {projeto.ordem_classificacao && (
              <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8,
                            padding:"6px 14px", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:500, color:"#fff" }}>
                  {projeto.ordem_classificacao}º
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>Classificação</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats de avaliação */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
                      borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:16, paddingTop:16,
                      gap:0 }}>
          {[
            { v: avaliacoes.length,         l:"Avaliadores"     },
            { v: mediaNotas ?? "—",         l:"Média das notas" },
            { v: avaliacoes.filter(a => a.status === "concluida").length, l:"Avaliações concluídas" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign:"center",
                                   borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ fontSize:22, fontWeight:500, color:"#fff" }}>{s.v}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        {/* Orientador */}
        <Card>
          <SectionLabel>Orientador</SectionLabel>
          {loading ? <div style={{ color:C.grayL, fontSize:12 }}>Carregando…</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ fontSize:14, fontWeight:500, color:C.dark }}>
                {orientador?.nome || projeto.orientador?.nome || "—"}
              </div>
              <div style={{ fontSize:12, color:C.gray }}>
                {orientador?.email || projeto.orientador?.email || "—"}
              </div>
              {orientador?.telefone && (
                <div style={{ fontSize:12, color:C.gray }}>{orientador.telefone}</div>
              )}
              {orientador?.instituicao && (
                <div style={{ fontSize:12, color:C.gray }}>{orientador.instituicao}</div>
              )}
            </div>
          )}
        </Card>

        {/* Dados do projeto */}
        <Card>
          <SectionLabel>Dados do projeto</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { k:"Área", v: projeto.area_conhecimento },
              { k:"Instituição", v: projeto.instituicao },
              { k:"Status avaliação", v: projeto.status_avaliacao },
              { k:"Inscrito em", v: new Date(projeto.created_at).toLocaleDateString("pt-BR") },
            ].map(item => (
              <div key={item.k} style={{ display:"flex", justifyContent:"space-between",
                                         paddingBottom:6, borderBottom:`0.5px solid ${C.grayBg}`,
                                         fontSize:12 }}>
                <span style={{ color:C.gray }}>{item.k}</span>
                <span style={{ color:C.dark, fontWeight:500, textAlign:"right",
                               maxWidth:"60%" }}>{item.v || "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Resumo */}
      {projeto.resumo && (
        <Card>
          <SectionLabel>Resumo do projeto</SectionLabel>
          <p style={{ fontSize:13, color:C.dark, lineHeight:1.7 }}>{projeto.resumo}</p>
        </Card>
      )}

      {/* Avaliações */}
      <Card>
        <SectionLabel>Avaliações por avaliador</SectionLabel>
        {loading ? (
          <div style={{ color:C.grayL, fontSize:12 }}>Carregando avaliações…</div>
        ) : avaliacoes.length === 0 ? (
          <div style={{ color:C.grayL, fontSize:12, padding:"20px 0", textAlign:"center" }}>
            Nenhuma avaliação registrada ainda.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {avaliacoes.map((av, i) => (
              <div key={av.id} style={{ background:C.grayBg, borderRadius:8, padding:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                              marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.dark }}>
                      {av.avaliador?.nome || `Avaliador ${i + 1}`}
                    </div>
                    <div style={{ fontSize:11, color:C.gray }}>{av.avaliador?.email}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Badge status={av.status} map={STATUS_AVALIACAO} />
                    {av.nota_total !== null && (
                      <div style={{ background:C.navy, color:"#fff", borderRadius:8,
                                    padding:"4px 12px", fontSize:14, fontWeight:600 }}>
                        {av.nota_total} / 10
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
                  <NotaBar label="C1 — Objetivos e justificativa" nota={av.nota_c1} max={3} />
                  <NotaBar label="C2 — Metodologia" nota={av.nota_c2} max={3} />
                  <NotaBar label="C3 — Interação e aplicabilidade" nota={av.nota_c3} max={2} />
                  <NotaBar label="C4 — Qualificação do orientador" nota={av.nota_c4} max={2} />
                </div>
                {av.parecer && (
                  <div style={{ marginTop:10, padding:10, background:"#fff", borderRadius:6,
                                fontSize:12, color:C.dark, lineHeight:1.6 }}>
                    <strong style={{ color:C.gray, fontSize:11 }}>PARECER: </strong>
                    {av.parecer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recursos */}
      {projeto.status === "recurso" && (
        <Card style={{ border:`1px solid ${C.purple}`, background:C.purpleBg }}>
          <SectionLabel>Fluxo de recursos</SectionLabel>
          <div style={{ fontSize:13, color:C.purple }}>
            Este projeto interpôs recurso. Aguardando análise pela avaliadora Cláudia Solares.
          </div>
        </Card>
      )}

      {/* PDF */}
      {projeto.arquivo_pdf_url && (
        <Card>
          <SectionLabel>Documentos</SectionLabel>
          <a href={projeto.arquivo_pdf_url} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.accent,
                     color:"#fff", borderRadius:8, padding:"8px 16px", fontSize:12,
                     fontWeight:500, textDecoration:"none" }}>
            📄 Abrir PDF do projeto
          </a>
        </Card>
      )}
    </div>
  );
}

// ── TELA: AVALIADORES ────────────────────────────────────────────────
function ListaAvaliadores({ onVoltar }) {
  const [avaliadores, setAvaliadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvaliadores() {
      setLoading(true);
      const { data: avs } = await supabase
        .from("avaliador")
        .select(`*, avaliacoes:avaliacao ( id, status, nota_total, projeto_id )`);

      setAvaliadores(avs || []);
      setLoading(false);
    }
    fetchAvaliadores();
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <BackBtn onClick={onVoltar} label="Voltar ao painel" />

      <div style={{ fontSize:16, fontWeight:500, color:C.navy }}>
        Avaliadores — PIBIC Jr 2026
      </div>

      {loading ? (
        <Card><div style={{ color:C.grayL, fontSize:12, textAlign:"center", padding:20 }}>Carregando…</div></Card>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
          {avaliadores.map(av => {
            const total = av.avaliacoes?.length || 0;
            const concluidas = av.avaliacoes?.filter(a => a.status === "concluida").length || 0;
            const mediaNota = concluidas > 0
              ? (av.avaliacoes.filter(a => a.nota_total).reduce((s, a) => s + a.nota_total, 0) / concluidas).toFixed(1)
              : null;

            return (
              <Card key={av.id}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:C.navy,
                                color:"#fff", display:"flex", alignItems:"center",
                                justifyContent:"center", fontSize:16, fontWeight:500,
                                flexShrink:0 }}>
                    {av.nome?.charAt(0) || "A"}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:C.dark }}>{av.nome}</div>
                    <div style={{ fontSize:11, color:C.gray }}>{av.email}</div>
                    {av.instituicao && (
                      <div style={{ fontSize:11, color:C.gray }}>{av.instituicao}</div>
                    )}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
                              gap:0, borderTop:`0.5px solid ${C.border}`, paddingTop:12 }}>
                  {[
                    { v:total,      l:"Projetos"   },
                    { v:concluidas, l:"Concluídas"  },
                    { v:mediaNota ?? "—", l:"Média"  },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign:"center",
                                          borderRight: i < 2 ? `0.5px solid ${C.border}` : "none" }}>
                      <div style={{ fontSize:18, fontWeight:500, color:C.accent }}>{s.v}</div>
                      <div style={{ fontSize:10, color:C.gray }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Progresso */}
                <div style={{ marginTop:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                fontSize:11, color:C.gray, marginBottom:4 }}>
                    <span>Progresso de avaliação</span>
                    <span>{total > 0 ? Math.round((concluidas/total)*100) : 0}%</span>
                  </div>
                  <div style={{ height:5, background:C.grayBg, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${total > 0 ? (concluidas/total)*100 : 0}%`,
                                  height:"100%", background:C.green, borderRadius:3 }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TELA: RECURSOS ───────────────────────────────────────────────────
function FluxoRecursos({ onVoltar }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecursos() {
      setLoading(true);
      const { data } = await supabase
        .from("projeto")
        .select(`
          id, codigo_facitec, titulo, status,
          orientador:orientador_id ( nome_completo, email )
        `)
        .eq("status", "recurso")
        .order("codigo_facitec");
      setProjetos(data || []);
      setLoading(false);
    }
    fetchRecursos();
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <BackBtn onClick={onVoltar} label="Voltar ao painel" />

      <div style={{ fontSize:16, fontWeight:500, color:C.navy }}>
        Fluxo de Recursos — PIBIC Jr 2026
      </div>

      <Card style={{ background:C.purpleBg, border:`0.5px solid ${C.purple}` }}>
        <div style={{ fontSize:13, color:C.purple, fontWeight:500, marginBottom:4 }}>
          Avaliadora de recursos: Cláudia Solares
        </div>
        <div style={{ fontSize:12, color:C.purple, opacity:0.8 }}>
          Os projetos abaixo interpuseram recurso após o resultado da avaliação.
          A análise é realizada exclusivamente pela avaliadora designada.
        </div>
      </Card>

      {loading ? (
        <Card><div style={{ color:C.grayL, fontSize:12, textAlign:"center", padding:20 }}>Carregando…</div></Card>
      ) : projetos.length === 0 ? (
        <Card>
          <div style={{ textAlign:"center", padding:32, color:C.grayL }}>
            <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:500, color:"#334155" }}>
              Nenhum recurso pendente
            </div>
            <div style={{ fontSize:12 }}>Todos os recursos foram analisados.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {projetos.map(p => (
            <Card key={p.id} style={{ display:"flex", alignItems:"center",
                                       justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.purple,
                              fontFamily:"monospace", marginBottom:4 }}>
                  {p.codigo_facitec}
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:C.dark }}>{p.titulo}</div>
                <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>
                  {p.orientador?.nome} · {p.orientador?.email}
                </div>
              </div>
              <Badge status={p.status} map={STATUS_PROJETO} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RESUMO DA EDIÇÃO (Fase 2 — Painel do Programa) ────────────────────
function useResumoPrograma(edicaoId) {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!edicaoId) return;
    let cancelado = false;

    async function load() {
      setLoading(true);
      try {
        const { data: projetos, error: e1 } = await supabase
          .from("projeto")
          .select("id, orientador_id, orientador:orientador_id(id, contrato_url)")
          .eq("edicao_id", edicaoId)
          .eq("status", "selecionado");
        if (e1) throw e1;

        const projetoIds = (projetos ?? []).map(p => p.id);
        const orientadoresPorId = {};
        (projetos ?? []).forEach(p => {
          if (p.orientador_id) orientadoresPorId[p.orientador_id] = p.orientador;
        });
        const orientadorIds = Object.keys(orientadoresPorId);
        const totalOrientadores = orientadorIds.length;
        const comContrato = orientadorIds.filter(id => orientadoresPorId[id]?.contrato_url).length;

        let bolsistasAtivos = 0;
        if (projetoIds.length) {
          const { count, error: e2 } = await supabase
            .from("bolsista")
            .select("*", { count: "exact", head: true })
            .in("projeto_id", projetoIds)
            .eq("status", "ativo");
          if (e2) throw e2;
          bolsistasAtivos = count ?? 0;
        }

        // Relatório mensal — ciclo com janela aberta hoje
        const ciclos = await listarCiclos(edicaoId);
        const hoje = new Date().toISOString().slice(0, 10);
        const cicloAberto = ciclos.find(c => hoje >= c.data_abertura && hoje <= c.data_fechamento) ?? null;

        let cicloResumo = null;
        if (cicloAberto) {
          const { data: relatorios, error: e3 } = await supabase
            .from("relatorio_mensal")
            .select("orientador_id, status, enviado_em")
            .eq("ciclo_id", cicloAberto.id);
          if (e3) throw e3;

          let enviados = 0, pendentes = 0, atrasados = 0;
          orientadorIds.forEach(oid => {
            const relatorio = (relatorios ?? []).find(r => r.orientador_id === oid) ?? null;
            const status = statusRelatorioNoCiclo(cicloAberto, relatorio);
            if (status === "enviado" || status === "enviado_atrasado") enviados++;
            else if (status === "atrasado") atrasados++;
            else pendentes++;
          });
          cicloResumo = { numero: cicloAberto.numero_ciclo, enviados, pendentes, atrasados };
        }

        if (!cancelado) {
          setResumo({ bolsistasAtivos, contratosEmitidos: comContrato, totalOrientadores, ciclo: cicloResumo });
        }
      } catch {
        if (!cancelado) setResumo({ bolsistasAtivos: 0, contratosEmitidos: 0, totalOrientadores: 0, ciclo: null });
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    load();
    return () => { cancelado = true; };
  }, [edicaoId]);

  return { resumo, loading };
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: C.gray }}>{label}</span>
    </div>
  );
}

function ResumoPrograma({ ano, edicaoId }) {
  const { resumo, loading } = useResumoPrograma(edicaoId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>PIBIC Jr · Edição {ano}</div>
        <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>Acompanhamento da edição em andamento.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <Card>
          <SectionLabel>Bolsistas ativos</SectionLabel>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.dark }}>
            {loading ? "…" : resumo.bolsistasAtivos}
          </div>
        </Card>
        <Card>
          <SectionLabel>Contratos emitidos</SectionLabel>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.dark }}>
            {loading ? "…" : `${resumo.contratosEmitidos}/${resumo.totalOrientadores}`}
          </div>
        </Card>
      </div>

      <Card>
        <SectionLabel>
          Relatório mensal{!loading && resumo.ciclo ? ` · Ciclo ${resumo.ciclo.numero}` : ""}
        </SectionLabel>
        {loading ? (
          <div style={{ color: C.grayL, fontSize: 12 }}>Carregando…</div>
        ) : !resumo.ciclo ? (
          <div style={{ color: C.grayL, fontSize: 12, padding: "8px 0" }}>
            Nenhuma janela de relatório aberta no momento.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            <MiniStat label="Enviados" value={resumo.ciclo.enviados} color={C.green} />
            <MiniStat label="Pendentes" value={resumo.ciclo.pendentes} color={C.amber} />
            <MiniStat label="Atrasados" value={resumo.ciclo.atrasados} color={C.red} />
          </div>
        )}
      </Card>
    </div>
  );
}

// ── PAINEL PRINCIPAL DO MÓDULO 1 ─────────────────────────────────────
export default function PainelModulo1() {
  const { ano = "2026" } = useParams();
  const { edicaoSelecionada } = useAdmin();
  const [tela, setTela] = useState("menu"); // menu | projetos | detalhe | avaliadores | recursos
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);
  const [stats, setStats] = useState({ projetos:0, avaliacoes:0, avaliadores:0, recursos:0, loading:true });

  useEffect(() => {
    async function fetchStats() {
      const [{ count: projetos }, { count: avaliacoes }, { count: avaliadores }, { count: recursos }] = await Promise.all([
        supabase.from("projeto").select("*", { count:"exact", head:true }),
        supabase.from("avaliacao").select("*", { count:"exact", head:true }),
        supabase.from("avaliador").select("*", { count:"exact", head:true }),
        supabase.from("projeto").select("*", { count:"exact", head:true }).eq("status","recurso"),
      ]);
      setStats({ projetos:projetos||0, avaliacoes:avaliacoes||0, avaliadores:avaliadores||0, recursos:recursos||0, loading:false });
    }
    fetchStats();
  }, []);

  function handleSelectProjeto(p) {
    setProjetoSelecionado(p);
    setTela("detalhe");
  }

  // Renderiza sub-telas
  if (tela === "projetos") return <ListaProjetos onSelect={handleSelectProjeto} />;
  if (tela === "detalhe" && projetoSelecionado) return (
    <DetalheProjeto projeto={projetoSelecionado} onVoltar={() => setTela("projetos")} />
  );
  if (tela === "avaliadores") return <ListaAvaliadores onVoltar={() => setTela("menu")} />;
  if (tela === "recursos")    return <FluxoRecursos    onVoltar={() => setTela("menu")} />;

  // Menu principal
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Resumo do Painel do Programa (Fase 2) */}
      <ResumoPrograma ano={ano} edicaoId={edicaoSelecionada?.id} />

      {/* Header */}
      <div style={{ background:C.navy, borderRadius:12, padding:"20px 24px" }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em",
                      textTransform:"uppercase", color:C.accentL, marginBottom:8 }}>
          PIBIC Jr · Edição 2026
        </div>
        <div style={{ fontSize:20, fontWeight:500, color:"#fff", marginBottom:4 }}>
          M1 · Seleção de Projetos
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}>
          Gestão completa do processo seletivo — inscrições, avaliações e resultados
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                      borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:16, paddingTop:16 }}>
          {[
            { v:stats.projetos,    l:"Projetos inscritos"  },
            { v:stats.avaliacoes,  l:"Avaliações realizadas"},
            { v:stats.avaliadores, l:"Avaliadores"          },
            { v:stats.recursos,    l:"Recursos pendentes"   },
          ].map((s, i) => (
            <div key={i} style={{ textAlign:"center",
                                   borderRight: i<3 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ fontSize:24, fontWeight:500, color:"#fff" }}>
                {stats.loading ? "…" : s.v}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações principais */}
      <SectionLabel>Acesso rápido</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
        {[
          { icon:"📋", titulo:"Lista de projetos",
            desc:`${stats.projetos} projetos cadastrados — ver detalhes, notas e status`,
            cor:C.accent, tela:"projetos" },
          { icon:"👥", titulo:"Avaliadores",
            desc:`${stats.avaliadores} avaliadores ativos — progresso e estatísticas`,
            cor:C.teal, tela:"avaliadores" },
          { icon:"⚖️", titulo:"Fluxo de recursos",
            desc:`${stats.recursos} recurso(s) pendente(s) — análise pela Cláudia Solares`,
            cor:C.purple, tela:"recursos" },
          { icon:"📊", titulo:"Relatório da edição",
            desc:"Exportar classificação final, notas e pareceres em PDF/Excel",
            cor:C.amber, tela:"menu", disabled:true },
        ].map((item, i) => (
          <div key={i}
            onClick={() => !item.disabled && setTela(item.tela)}
            style={{ background:C.white, borderRadius:10, border:`0.5px solid ${C.border}`,
                     padding:18, cursor: item.disabled ? "not-allowed" : "pointer",
                     opacity: item.disabled ? 0.5 : 1,
                     transition:"box-shadow 0.15s" }}
            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ fontSize:28, marginBottom:10 }}>{item.icon}</div>
            <div style={{ fontSize:14, fontWeight:500, color:C.dark, marginBottom:4 }}>
              {item.titulo}
            </div>
            <div style={{ fontSize:12, color:C.gray, lineHeight:1.5 }}>{item.desc}</div>
            {item.disabled && (
              <div style={{ marginTop:8, fontSize:11, color:C.grayL }}>Em desenvolvimento</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
