import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function MasterAdminLoginPage() {
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
      if (session?.user?.role !== "master") {
        setError("Access Denied: Master Admin authority required.");
        return;
      }
      navigate("/master-admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid master credentials.");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md bg-neutral-900 rounded-3xl p-8 border border-neutral-800 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-1">
            <KeyRound size={24} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Master Admin HQ</h1>
          <p className="text-xs text-neutral-400">Highest privilege administrative console</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-neutral-300">Master Email</label>
            <input
              type="email"
              required
              placeholder="master@clothmarket.com"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-neutral-300">Master Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Access Master Console"}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
