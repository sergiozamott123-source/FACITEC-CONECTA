import FacitecConecta from './FacitecConecta';
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
import { Importacao } from '@/pages/Importacao'
import { LoginInscricao } from '@/pages/inscricao/LoginInscricao'
import { FormularioInscricao } from '@/pages/inscricao/FormularioInscricao'
import { ConfirmacaoInscricao } from '@/pages/inscricao/ConfirmacaoInscricao'
import { AvaliadorProvider, useAvaliador } from '@/contexts/AvaliadorContext'
import { LoginAvaliador } from '@/pages/avaliador/LoginAvaliador'
import { ProjetosAvaliador } from '@/pages/avaliador/ProjetosAvaliador'
import { FichaAvaliacao } from '@/pages/avaliador/FichaAvaliacao'
import { RedefinirSenhaAvaliador } from '@/pages/avaliador/RedefinirSenhaAvaliador'

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal público de inscrições PibicJr */}
        <Route path="/inscricao" element={<LoginInscricao />} />
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
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </AvaliadorProvider>
        } />
        {/* Painel conceitual FACITEC CONECTA */}
        <Route path="/painel" element={<FacitecConecta />} />
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
                <Route path="/importacao" element={<Importacao />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
