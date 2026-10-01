import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const session = await login(form);
      if (session?.user?.role === "master") {
        navigate("/master-admin");
      } else if (session?.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/profile");
      }
    } catch {
      /* handled in store error */
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-cm-soft/40 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-cm-border p-6 sm:p-8 shadow-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <Link
            to="/"
            className="font-display font-bold text-2xl tracking-tight text-cm-black inline-block"
          >
            Cloth Market<span className="text-cm-red">.</span>
          </Link>
          <h1 className="font-bold text-lg text-cm-black pt-2">Sign In</h1>
          <p className="text-xs text-cm-muted">Enter your email and password to access your rentals.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-cm-red text-xs font-semibold border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1 text-left">
            <label className="font-bold text-2xs uppercase tracking-wider text-cm-muted block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-cm-border text-xs focus:border-cm-black font-medium"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="font-bold text-2xs uppercase tracking-wider text-cm-muted block">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-cm-border text-xs focus:border-cm-black font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-cm-black text-white text-xs font-bold uppercase tracking-wider hover:bg-cm-red transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center text-xs text-cm-muted pt-2 border-t border-cm-border">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-cm-black hover:text-cm-red transition-colors">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
