/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../components/common/Ui";
import { accountService } from "../services/api";
import { useAppStore } from "../store/useAppStore";

interface CustomerAuthContextValue {
  loading: boolean;
  refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children?: ReactNode }) {
  const started = useRef(false);
  const setUser = useAppStore((state) => state.setUser);
  const setWishlist = useAppStore((state) => state.setWishlist);
  const setOrders = useAppStore((state) => state.setOrders);
  const logout = useAppStore((state) => state.logout);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const customer = await accountService.me();
      setUser(customer);
      const [wishlist, orders] = await Promise.all([accountService.getWishlist(), accountService.getOrders()]);
      setWishlist(wishlist);
      setOrders(orders);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refresh();
    // Restore the HttpOnly customer session once when the application mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CustomerAuthContext.Provider value={{ loading, refresh }}>{children ?? <Outlet />}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider.");
  return context;
}

export function ProtectedCustomerRoute({ children }: { children: ReactNode }) {
  const { loading } = useCustomerAuth();
  const user = useAppStore((state) => state.user);
  const location = useLocation();
  if (loading) return <div className="container-shell py-20"><LoadingState label="Checking your session" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  return <>{children}</>;
}
