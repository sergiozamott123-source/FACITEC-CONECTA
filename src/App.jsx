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
import { PortalOrientadorProvider, usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { OrientadorLogin } from '@/pages/orientador/OrientadorLogin'
import { OrientadorDashboard } from '@/pages/orientador/OrientadorDashboard'
import { OrientadorDados } from '@/pages/orientador/OrientadorDados'
import { OrientadorMeusDados } from '@/pages/orientador/OrientadorMeusDados'
import { OrientadorEquipe } from '@/pages/orientador/OrientadorEquipe'
import { OrientadorBolsistas } from '@/pages/orientador/OrientadorBolsistas'
import { OrientadorDocumentos } from '@/pages/orientador/OrientadorDocumentos'
import ContratosPainel from '@/pages/admin/m2/ContratosPainel'
import ContratoDetalhe from '@/pages/admin/m2/ContratoDetalhe'
import SuperpainelM2 from '@/pages/admin/m2/SuperpainelM2'
import BolsistaDetalhe from '@/pages/admin/m2/BolsistaDetalhe'

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

function ProtectedOrientador({ children }) {
  const { orientador, loading } = usePortalOrientador()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }
  if (!orientador) return <Navigate to="/orientador/login" replace />
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
              <Route path="login" element={<OrientadorLogin />} />
              <Route path="dashboard" element={<ProtectedOrientador><OrientadorDashboard /></ProtectedOrientador>} />
              <Route path="dados" element={<ProtectedOrientador><OrientadorDados /></ProtectedOrientador>} />
              <Route path="meus-dados" element={<ProtectedOrientador><OrientadorMeusDados /></ProtectedOrientador>} />
              <Route path="equipe" element={<ProtectedOrientador><OrientadorEquipe /></ProtectedOrientador>} />
              <Route path="bolsistas" element={<ProtectedOrientador><OrientadorBolsistas /></ProtectedOrientador>} />
              <Route path="documentos" element={<ProtectedOrientador><OrientadorDocumentos /></ProtectedOrientador>} />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </PortalOrientadorProvider>
        } />
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
        {/* Portal de entrada — redireciona para o painel admin */}
        <Route path="/" element={<Navigate to="/admin/pibic-jr/2026/painel" replace />} />
        {/* Hub de programas */}
        <Route path="/hub" element={<HubProgramas />} />
        {/* PIBIC Jr — visão geral e módulos */}
        <Route path="/pibic-jr" element={<PibicJr />} />
        <Route path="/pibic-jr/selecao" element={<SelecaoM1 />} />
        {/* redirect de URL antiga */}
        <Route path="/painel" element={<Navigate to="/pibic-jr" replace />} />
        {/* Área administrativa */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/edicoes" element={<Edicoes />} />
                <Route path="/avaliacoes" element={<Avaliacoes />} />
                <Route path="/equipes" element={<Equipes />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/bolsistas" element={<Bolsistas />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/historico" element={<Historico />} />
                <Route path="/classificacao" element={<Classificacao />} />
                <Route path="/recursos" element={<ConvocacaoRecurso />} />
                <Route path="/recursos/:recursoId/painel" element={<PainelConsolidadoRecurso />} />
                <Route path="/recursos/:recursoId/decisao" element={<DecisaoFinalRecurso />} />
                <Route path="/importacao" element={<Importacao />} />
                <Route path="/admin" element={<HomeAdmin />} />
                <Route path="/admin/classificacao" element={<ClassificacaoAdmin />} />
                <Route path="/admin/configuracao-inscricao" element={<ConfiguracaoInscricao />} />
                <Route path="/admin/pibic-jr/:ano/painel" element={<PainelModulo1 />} />
                <Route path="/admin/pibic-jr/:ano/configuracao" element={<ConfiguracaoInscricao />} />
                <Route path="/admin/pibic-jr/:ano/m2" element={<SuperpainelM2 />} />
                <Route path="/admin/pibic-jr/:ano/m2/bolsista/:codigoBolsista" element={<BolsistaDetalhe />} />
                <Route path="/admin/pibic-jr/:ano/m2/contratos" element={<ContratosPainel />} />
                <Route path="/admin/pibic-jr/:ano/m2/contratos/:projetoId" element={<ContratoDetalhe />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
