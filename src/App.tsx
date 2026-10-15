import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import CardDetail from './pages/CardDetail'
import Cards from './pages/Cards'
import Home from './pages/Home'
import Login from './pages/Login'
import NewOrder from './pages/NewOrder'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import ProcedureImport from './pages/ProcedureImport'
import Procedures from './pages/Procedures'
import Profile from './pages/Profile'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner full />
  if (!me) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="guias" element={<Orders />} />
        <Route path="guias/nova" element={<NewOrder />} />
        <Route path="guias/:id" element={<OrderDetail />} />
        <Route path="carteirinhas" element={<Cards />} />
        <Route path="carteirinhas/:id" element={<CardDetail />} />
        <Route path="procedimentos" element={<Procedures kind="procedures" />} />
        <Route path="procedimentos/especialidades" element={<Procedures kind="specialties" />} />
        <Route path="procedimentos/importar" element={<ProcedureImport />} />
        <Route path="perfil" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
