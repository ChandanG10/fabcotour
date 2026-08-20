import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./routes/AppRouter";

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("Application render failed", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="container-shell py-20">
          <div className="rounded-[36px] bg-white p-8 text-center shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-black/50">Something went wrong</p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold">We couldn’t load this page.</h1>
            <p className="mt-4 text-brand-black/65">Refresh the page or return to the storefront.</p>
            <a href="/" className="button-primary mt-6 inline-flex">Return home</a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
      <HelmetProvider>
      <AppErrorBoundary>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AppErrorBoundary>
      </HelmetProvider>
  </React.StrictMode>
);
