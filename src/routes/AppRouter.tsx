import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { LoadingState } from "../components/common/Ui";
import { AdminAuthProvider, AdminEntryRedirect, ProtectedAdminRoute } from "../admin/AdminAuth";

const HomePage = lazy(() => import("../pages/HomePage"));
const ShopPage = lazy(() => import("../pages/ShopPage"));
const ProductPage = lazy(() => import("../pages/ProductPage"));
const CustomizerPage = lazy(() => import("../pages/CustomizerPage"));
const CustomDesignerPage = lazy(() => import("../pages/CustomDesignerPage"));
const CorporatePage = lazy(() => import("../pages/BusinessPages").then((module) => ({ default: module.CorporatePage })));
const BulkOrdersPage = lazy(() => import("../pages/BusinessPages").then((module) => ({ default: module.BulkOrdersPage })));
const SellerPage = lazy(() => import("../pages/BusinessPages").then((module) => ({ default: module.SellerPage })));
const CartPage = lazy(() => import("../pages/CommercePages").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("../pages/CommercePages").then((module) => ({ default: module.CheckoutPage })));
const AuthPage = lazy(() => import("../pages/CommercePages").then((module) => ({ default: module.AuthPage })));
const AccountPage = lazy(() => import("../pages/CommercePages").then((module) => ({ default: module.AccountPage })));
const TrackOrderPage = lazy(() => import("../pages/CommercePages").then((module) => ({ default: module.TrackOrderPage })));
const InfoPage = lazy(() => import("../pages/InfoPages"));
const AdminLoginPage = lazy(() => import("../admin/pages/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("../admin/pages/AdminDashboardPage"));

function RouteFallback() {
  return (
    <div className="container-shell py-20">
      <LoadingState label="Loading page" />
    </div>
  );
}

function AdminRouteShell() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AdminRouteShell />}>
          <Route path="/admin" element={<AdminEntryRedirect />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />
        </Route>

        <Route path="/customise/:productSlug/design" element={<CustomDesignerPage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ShopPage />} />
          <Route path="/shop/:categorySlug/:subcategorySlug" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/customise" element={<CustomizerPage />} />
          <Route path="/corporate-gifting" element={<CorporatePage />} />
          <Route path="/bulk-orders" element={<BulkOrdersPage />} />
          <Route path="/start-selling" element={<SellerPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/about" element={<InfoPage />} />
          <Route path="/contact" element={<InfoPage />} />
          <Route path="/privacy-policy" element={<InfoPage />} />
          <Route path="/terms-and-conditions" element={<InfoPage />} />
          <Route path="/shipping-policy" element={<InfoPage />} />
          <Route path="/return-and-refund-policy" element={<InfoPage />} />
          <Route path="/cancellation-policy" element={<InfoPage />} />
          <Route path="/customised-product-policy" element={<InfoPage />} />
          <Route path="/payment-policy" element={<InfoPage />} />
          <Route path="/faqs" element={<Navigate to="/contact" replace />} />
          <Route path="*" element={<InfoPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
