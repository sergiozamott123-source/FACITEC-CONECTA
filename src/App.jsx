import PortalAdmin from '@/pages/PortalAdmin';
import PainelModulo1 from '@/pages/PainelModulo1';
import HubProgramas from '@/pages/HubProgramas';
import PibicJr from '@/pages/PibicJr';
import SelecaoM1 from '@/pages/SelecaoM1';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Edicoes } from '@/pages/Edicoes'
import { Avaliacoes } from '@/pages/Avaliacoes'
import { Equipes } from '@/pages/Equipes'
import { Contratos } from '@/pages/Contratos'
import { Bolsistas } from '@/pages/Bolsistas'
import { Financeiro } from '@/pages/Financeiro'
import { Historico } from '@/pages/Historico'
import { Classificacao } from '@/pages/Classificacao'
import { HomeAdmin } from '@/pages/admin/HomeAdmin'
import { ConvocacaoRecurso } from '@/pages/admin/ConvocacaoRecurso'
import { PainelConsolidadoRecurso } from '@/pages/admin/PainelConsolidadoRecurso'
import { DecisaoFinalRecurso } from '@/pages/admin/DecisaoFinalRecurso'
import { Importacao } from '@/pages/Importacao'
import { LoginInscricao } from '@/pages/inscricao/LoginInscricao'
import { FormularioInscricao } from '@/pages/inscricao/FormularioInscricao'
import { ConfirmacaoInscricao } from '@/pages/inscricao/ConfirmacaoInscricao'
import { FichaInscricao } from '@/pages/candidato/FichaInscricao'
import { RedefinirSenha } from '@/pages/inscricao/RedefinirSenha'
import { ConfiguracaoInscricao } from '@/pages/admin/ConfiguracaoInscricao'
import { ClassificacaoAdmin } from '@/pages/admin/Classificacao'
import { AvaliadorProvider, useAvaliador } from '@/contexts/AvaliadorContext'
import { LoginAvaliador } from '@/pages/avaliador/LoginAvaliador'
import { ProjetosAvaliador } from '@/pages/avaliador/ProjetosAvaliador'
import { FichaAvaliacao } from '@/pages/avaliador/FichaAvaliacao'
import { RespostaRecursoAvaliador } from '@/pages/avaliador/RespostaRecursoAvaliador'
import { RedefinirSenhaAvaliador } from '@/pages/avaliador/RedefinirSenhaAvaliador'
import { OrientadorProvider, useOrientador } from '@/contexts/OrientadorContext'
import { LoginCandidato } from '@/pages/candidato/LoginCandidato'
import { MeusRecursos } from '@/pages/candidato/MeusRecursos'
import { RecursoWizard } from '@/pages/candidato/RecursoWizard'
import { PortalOrientadorProvider } from '@/contexts/PortalOrientadorContext'
import { LoginOrientador } from '@/pages/orientador/LoginOrientador'
import { RedefinirSenhaOrientador } from '@/pages/orientador/RedefinirSenhaOrientador'
import { OrientadorDashboard } from '@/pages/orientador/OrientadorDashboard'
import { OrientadorDados } from '@/pages/orientador/OrientadorDados'
import { OrientadorMeusDados } from '@/pages/orientador/OrientadorMeusDados'
import { OrientadorEquipe } from '@/pages/orientador/OrientadorEquipe'
import { OrientadorBolsistas } from '@/pages/orientador/OrientadorBolsistas'
import { OrientadorDocumentos } from '@/pages/orientador/OrientadorDocumentos'
import { RelatorioMensal } from '@/pages/orientador/RelatorioMensal'
import ContratosPainel from '@/pages/admin/m2/ContratosPainel'
import ContratoDetalhe from '@/pages/admin/m2/ContratoDetalhe'
import SuperpainelM2 from '@/pages/admin/m2/SuperpainelM2'
import BolsistaDetalhe from '@/pages/admin/m2/BolsistaDetalhe'
import { PortalEntrada } from '@/pages/PortalEntrada'
import { LoginSecretaria } from '@/pages/LoginSecretaria'
import { RedefinirSenhaSecretaria } from '@/pages/RedefinirSenhaSecretaria'
import { GerenciarUsuariosOrientadores } from '@/pages/admin/GerenciarUsuariosOrientadores'
import { RelatoriosMensais } from '@/pages/admin/RelatoriosMensais'
import { SecretariaAuthProvider } from '@/contexts/SecretariaAuthContext'
import { RequireAcessoSecretaria } from '@/components/RequireAcessoSecretaria'
import { RequireAcessoOrientador } from '@/components/RequireAcessoOrientador'

function ProtectedAvaliador({ children }) {
  const { avaliador, loading } = useAvaliador()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }
  if (!avaliador) return <Navigate to="/avaliador/login" replace />
  return children
}

function ProtectedCandidato({ children }) {
  const { orientador, loading } = useOrientador()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }
  if (!orientador) return <Navigate to="/candidato/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ficha pública de inscrição PibicJr (nova) */}
        <Route path="/inscricao" element={<FichaInscricao />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        {/* Fluxo legado de inscrição */}
        <Route path="/inscricao/login" element={<LoginInscricao />} />
        <Route path="/inscricao/formulario" element={<FormularioInscricao />} />
        <Route path="/inscricao/confirmacao" element={<ConfirmacaoInscricao />} />
        {/* Portal de avaliadores */}
        <Route path="/avaliador/*" element={
          <AvaliadorProvider>
            <Routes>
              <Route path="login" element={<LoginAvaliador />} />
              <Route path="redefinir-senha" element={<RedefinirSenhaAvaliador />} />
              <Route path="projetos" element={<ProtectedAvaliador><ProjetosAvaliador /></ProtectedAvaliador>} />
              <Route path="projeto/:avaliacaoId" element={<ProtectedAvaliador><FichaAvaliacao /></ProtectedAvaliador>} />
              <Route path="recurso/:ccId" element={<ProtectedAvaliador><RespostaRecursoAvaliador /></ProtectedAvaliador>} />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </AvaliadorProvider>
        } />
        {/* Portal do orientador — equipe e documentos */}
        <Route path="/orientador/*" element={
          <PortalOrientadorProvider>
            <Routes>
              <Route path="login" element={<LoginOrientador />} />
              <Route path="painel" element={<RequireAcessoOrientador><OrientadorDashboard /></RequireAcessoOrientador>} />
              <Route path="dashboard" element={<RequireAcessoOrientador><OrientadorDashboard /></RequireAcessoOrientador>} />
              <Route path="dados" element={<RequireAcessoOrientador><OrientadorDados /></RequireAcessoOrientador>} />
              <Route path="meus-dados" element={<RequireAcessoOrientador><OrientadorMeusDados /></RequireAcessoOrientador>} />
              <Route path="equipe" element={<RequireAcessoOrientador><OrientadorEquipe /></RequireAcessoOrientador>} />
              <Route path="bolsistas" element={<RequireAcessoOrientador><OrientadorBolsistas /></RequireAcessoOrientador>} />
              <Route path="relatorio-mensal" element={<RequireAcessoOrientador><RelatorioMensal /></RequireAcessoOrientador>} />
              <Route path="documentos" element={<RequireAcessoOrientador><OrientadorDocumentos /></RequireAcessoOrientador>} />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </PortalOrientadorProvider>
        } />
        {/* Alias de entrada — landing linka pra cá; abre o login do orientador */}
        <Route path="/login/orientador" element={
          <PortalOrientadorProvider>
            <LoginOrientador />
          </PortalOrientadorProvider>
        } />
        <Route path="/login/orientador/redefinir-senha" element={<RedefinirSenhaOrientador />} />
        {/* Portal do candidato — recursos */}
        <Route path="/candidato/*" element={
          <OrientadorProvider>
            <Routes>
              <Route path="login" element={<LoginCandidato />} />
              <Route path="meus-recursos" element={<ProtectedCandidato><MeusRecursos /></ProtectedCandidato>} />
              <Route path="recurso/:projetoId" element={<ProtectedCandidato><RecursoWizard /></ProtectedCandidato>} />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </OrientadorProvider>
        } />
        {/* Portal de entrada institucional */}
        <Route path="/" element={<PortalEntrada />} />
        {/* Login da Secretaria executiva */}
        <Route path="/login/secretaria" element={
          <SecretariaAuthProvider>
            <LoginSecretaria />
          </SecretariaAuthProvider>
        } />
        <Route path="/login/secretaria/redefinir-senha" element={<RedefinirSenhaSecretaria />} />
        {/* Hub de programas */}
        <Route path="/hub" element={<HubProgramas />} />
        {/* Programas — visão geral e módulos.
            Rotas explícitas por slug (em vez de /:programa) para não colidir
            em especificidade com o catch-all /* da área administrativa mais
            abaixo, que hospeda /edicoes, /avaliacoes, /contratos etc. */}
        <Route path="/pibic-jr" element={<PibicJr slug="pibic-jr" />} />
        <Route path="/pibic-jr/selecao" element={<SelecaoM1 slug="pibic-jr" />} />
        <Route path="/profic-jr" element={<PibicJr slug="profic-jr" />} />
        <Route path="/profic-jr/selecao" element={<SelecaoM1 slug="profic-jr" />} />
        {/* redirect de URL antiga */}
        <Route path="/painel" element={<Navigate to="/pibic-jr" replace />} />
        {/* Área administrativa — restrita à Secretaria executiva */}
        <Route
          path="/*"
          element={
            <SecretariaAuthProvider>
              <RequireAcessoSecretaria>
                <Layout>
                  <Routes>
                    <Route path="/admin/painel" element={<Dashboard />} />
                    <Route path="/edicoes" element={<Edicoes />} />
                    {/* Órfãs — não linkadas em nenhum menu hoje (verificado via grep),
                        mantidas na URL antiga em vez de migradas para não adivinhar intenção. */}
                    <Route path="/equipes" element={<Equipes />} />
                    <Route path="/contratos" element={<Contratos />} />
                    <Route path="/importacao" element={<Importacao />} />
                    <Route path="/admin" element={<HomeAdmin />} />
                    <Route path="/admin/classificacao" element={<ClassificacaoAdmin />} />
                    <Route path="/admin/configuracao-inscricao" element={<ConfiguracaoInscricao />} />
                    <Route path="/admin/gerenciar-usuarios-orientadores" element={<GerenciarUsuariosOrientadores />} />
                    <Route path="/admin/relatorios-mensais" element={<RelatoriosMensais />} />
                    {/* Redirects de compatibilidade — URLs antigas linkadas em favoritos/e-mails
                        continuam funcionando, apontando para o programa/edição padrão. */}
                    <Route path="/avaliacoes" element={<Navigate to="/admin/pibic-jr/2026/avaliacoes" replace />} />
                    <Route path="/classificacao" element={<Navigate to="/admin/pibic-jr/2026/classificacao" replace />} />
                    <Route path="/recursos" element={<Navigate to="/admin/pibic-jr/2026/recursos" replace />} />
                    <Route path="/bolsistas" element={<Navigate to="/admin/pibic-jr/2026/bolsistas" replace />} />
                    <Route path="/financeiro" element={<Navigate to="/admin/pibic-jr/2026/financeiro" replace />} />
                    <Route path="/historico" element={<Navigate to="/admin/pibic-jr/2026/historico" replace />} />
                    {/* Generalizado por :programa — 4+ segmentos, não colide com
                        as rotas admin de 1-2 segmentos acima. URLs antigas
                        /admin/pibic-jr/:ano/... continuam funcionando (programa="pibic-jr"). */}
                    <Route path="/admin/:programa/:ano/painel" element={<PainelModulo1 />} />
                    <Route path="/admin/:programa/:ano/configuracao" element={<ConfiguracaoInscricao />} />
                    <Route path="/admin/:programa/:ano/avaliacoes" element={<Avaliacoes />} />
                    <Route path="/admin/:programa/:ano/classificacao" element={<Classificacao />} />
                    <Route path="/admin/:programa/:ano/recursos" element={<ConvocacaoRecurso />} />
                    <Route path="/admin/:programa/:ano/recursos/:recursoId/painel" element={<PainelConsolidadoRecurso />} />
                    <Route path="/admin/:programa/:ano/recursos/:recursoId/decisao" element={<DecisaoFinalRecurso />} />
                    <Route path="/admin/:programa/:ano/bolsistas" element={<Bolsistas />} />
                    <Route path="/admin/:programa/:ano/financeiro" element={<Financeiro />} />
                    <Route path="/admin/:programa/:ano/historico" element={<Historico />} />
                    <Route path="/admin/:programa/:ano/m2" element={<SuperpainelM2 />} />
                    <Route path="/admin/:programa/:ano/m2/bolsista/:codigoBolsista" element={<BolsistaDetalhe />} />
                    <Route path="/admin/:programa/:ano/m2/contratos" element={<ContratosPainel />} />
                    <Route path="/admin/:programa/:ano/m2/contratos/:projetoId" element={<ContratoDetalhe />} />
                  </Routes>
                </Layout>
              </RequireAcessoSecretaria>
            </SecretariaAuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
