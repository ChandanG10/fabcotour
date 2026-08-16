import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../components/common/Ui";
import { adminService, type AdminProfile } from "../services/api";

interface AdminAuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setAdmin: (admin: AdminProfile | null) => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sessionCheckStarted = useRef(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(location.pathname !== "/admin/login");

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await adminService.me();
      setAdmin(response.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname === "/admin/login" || sessionCheckStarted.current) {
      setLoading(false);
      return;
    }

    sessionCheckStarted.current = true;
    void refresh();
    // Only restore a session when the admin route shell first mounts. Login
    // verifies its newly-created session explicitly before navigating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refresh, setAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider.");
  }
  return context;
}

export function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <LoadingState label="Checking admin session" />
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function AdminEntryRedirect() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <LoadingState label="Loading admin panel" />
        </div>
      </div>
    );
  }

  return <Navigate to={admin ? "/admin/dashboard" : "/admin/login"} replace />;
}
