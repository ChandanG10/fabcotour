import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "../../components/common/BrandLogo";
import { adminService } from "../../services/api";
import { useAdminAuth } from "../AdminAuth";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdmin } = useAdminAuth();
  const [email, setEmail] = useState("admin@fabcouture.in");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await adminService.login({ email, password });
      const session = await adminService.me();
      if (!session.admin) {
        throw new Error("The admin session could not be verified.");
      }
      setAdmin(session.admin);
      toast.success("Admin login successful.");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#111111] shadow-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(255,201,40,0.22),_transparent_40%),linear-gradient(180deg,_rgba(255,201,40,0.14),_rgba(17,17,17,1)_55%)] p-8 sm:p-10">
          <div>
            <BrandLogo className="h-[56px] w-[240px]" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-[#ffc928]">
              Secure Admin Access
            </p>
            <h1 className="mt-4 max-w-md font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Manage products, orders, content and storefront media from one panel.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/72">
              Authentication is cookie-based, rate limited and isolated from the storefront. No admin token is written to local storage.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "JWT Cookies", copy: "httpOnly session" },
              { label: "Uploads", copy: "Cloudinary-backed" },
              { label: "Database", copy: "MySQL + TypeScript" }
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-2 text-sm text-white/60">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center bg-[#f7f2e8] p-6 text-brand-black sm:p-10">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[30px] border border-black/8 bg-white p-6 shadow-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-black/45">
              FAB COUTURE
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-brand-black">
              Admin Login
            </h2>
            <p className="mt-3 text-sm leading-7 text-brand-black/62">
              Use the seeded administrator account or another authorized admin record from the database.
            </p>

            <label className="mt-8 block">
              <span className="mb-2 block text-sm font-semibold text-brand-black">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                <Mail className="h-4 w-4 text-brand-black/45" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full border-0 bg-transparent outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-brand-black">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-brand-black/45" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full border-0 bg-transparent outline-none"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-yellow px-6 py-3.5 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowdark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Open Admin Dashboard"}
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-brand-black/54">
              Login failures return generic errors and are rate-limited server-side.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
