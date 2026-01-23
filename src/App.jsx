import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cells from './pages/Cells';
import CellDetails from './pages/CellDetails';
import Scale from './pages/Scale';
import Accommodation from './pages/Accommodation';
import Prayer from './pages/Prayer';
import Settings from './pages/Settings';
import Attendance from './pages/Attendance';
import Expenses from './pages/Expenses';
import Setup from './pages/Setup';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      cacheTime: 1000 * 60 * 30, // 30 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Only retry failed requests once
    },
  },
});

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { session, loading, isAdmin } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  if (!session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Admin-only Route Wrapper
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return isAdmin ? children : <Navigate to="/cells" replace />;
};

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FilterProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/setup" element={<Setup />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
                  <Route path="/cells" element={<Cells />} />
                  <Route path="/cells/:id" element={<CellDetails />} />
                  <Route path="/scales" element={<AdminRoute><Scale /></AdminRoute>} />
                  <Route path="/accommodation" element={<AdminRoute><Accommodation /></AdminRoute>} />
                  <Route path="/prayer" element={<AdminRoute><Prayer /></AdminRoute>} />
                  <Route path="/attendance" element={<AdminRoute><Attendance /></AdminRoute>} />
                  <Route path="/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
                  <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                </Route>
              </Routes>
            </Router>
            <InstallPrompt />
          </FilterProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
