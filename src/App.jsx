import PortalAdmin from '@/pages/PortalAdmin';
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
import { ConvocacaoRecurso } from '@/pages/admin/ConvocacaoRecurso'
import { PainelConsolidadoRecurso } from '@/pages/admin/PainelConsolidadoRecurso'
import { DecisaoFinalRecurso } from '@/pages/admin/DecisaoFinalRecurso'
import { Importacao } from '@/pages/Importacao'
import { LoginInscricao } from '@/pages/inscricao/LoginInscricao'
import { FormularioInscricao } from '@/pages/inscricao/FormularioInscricao'
import { ConfirmacaoInscricao } from '@/pages/inscricao/ConfirmacaoInscricao'
import { FichaInscricao } from '@/pages/candidato/FichaInscricao'
import { ConfiguracaoInscricao } from '@/pages/admin/ConfiguracaoInscricao'
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
        {/* Portal de entrada */}
        <Route path="/" element={<PortalAdmin />} />
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
                <Route path="/admin/configuracao-inscricao" element={<ConfiguracaoInscricao />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
