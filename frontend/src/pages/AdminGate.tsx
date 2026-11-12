import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminLoginPage } from './AdminLoginPage';
import { useAdminSession, signOutAdmin } from '../features/admin/useAdminSession';

// Controla el acceso a /admin: muestra el login si no hay sesión, o el panel si la hay.
export function AdminGate() {
  const { session, loading, refresh } = useAdminSession();

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-[#f5f5f4] text-sm text-[#6b6b6b] font-sans">Cargando...</div>;
  }

  if (!session?.authenticated) {
    return <AdminLoginPage onLoggedIn={refresh} />;
  }

  return <AdminDashboardPage email={session.email} onLogout={async () => { await signOutAdmin(); await refresh(); }} />;
}