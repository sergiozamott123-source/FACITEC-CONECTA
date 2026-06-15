import FacitecConecta from './FacitecConecta';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Edicoes } from '@/pages/Edicoes'
import { Avaliacoes } from '@/pages/Avaliacoes'
import { Equipes } from '@/pages/Equipes'
import { Contratos } from '@/pages/Contratos'
import { Bolsistas } from '@/pages/Bolsistas'
import { Financeiro } from '@/pages/Financeiro'
import { Historico } from '@/pages/Historico'
import { Importacao } from '@/pages/Importacao'
import { LoginInscricao } from '@/pages/inscricao/LoginInscricao'
import { FormularioInscricao } from '@/pages/inscricao/FormularioInscricao'
import { ConfirmacaoInscricao } from '@/pages/inscricao/ConfirmacaoInscricao'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal público de inscrições PibicJr */}
        <Route path="/inscricao" element={<LoginInscricao />} />
        <Route path="/inscricao/formulario" element={<FormularioInscricao />} />
        <Route path="/inscricao/confirmacao" element={<ConfirmacaoInscricao />} />
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
