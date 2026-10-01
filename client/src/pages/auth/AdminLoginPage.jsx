import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Lock } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const session = await login(form);
      if (!["admin", "master"].includes(session?.user?.role)) {
        setError("Access Denied: Your account does not have Admin staff privileges.");
        return;
      }
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid administrative credentials.");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-1">
            <Shield size={24} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="text-xs text-slate-400">Restricted staff access for cloth rental operations</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
            <Lock size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-300">Staff Email</label>
            <input
              type="email"
              required
              placeholder="admin@clothmarket.com"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-300">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Admin Portal"}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
