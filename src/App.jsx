import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cells from './pages/Cells';
import CellDetails from './pages/CellDetails';
import Scale from './pages/Scale';
import Accommodation from './pages/Accommodation';
import Prayer from './pages/Prayer';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return session ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cells" element={<Cells />} />
              <Route path="/cells/:id" element={<CellDetails />} />
              <Route path="/scales" element={<Scale />} />
              <Route path="/accommodation" element={<Accommodation />} />
              <Route path="/prayer" element={<Prayer />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
