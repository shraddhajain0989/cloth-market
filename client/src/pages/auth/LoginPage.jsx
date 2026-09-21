import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const [form, setForm] = useState({ email: "user@example.com", password: "User@123" });

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const session = await login(form);
      navigate(session.user.role === "user" ? "/profile" : "/admin");
    } catch {
      /* handled in store error */
    }
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white text-cm-text">
      
      {/* Left Editorial Visual (7 Cols) */}
      <div className="hidden lg:flex lg:col-span-7 relative bg-cm-black overflow-hidden flex-col justify-between p-12 text-white">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
          alt="Luxury Fashion Editorial"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cm-black via-cm-black/30 to-transparent" />

        {/* Brand Logo Header */}
        <div className="relative z-10">
          <Link to="/" className="font-display font-bold text-2xl tracking-tight text-white">
            Cloth<span className="text-cm-red">.</span>
          </Link>
        </div>

        {/* Editorial Text Overlay */}
        <div className="relative z-10 space-y-4 max-w-xl">
          <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.25em] font-bold text-cm-red bg-cm-red/20 px-3 py-1 rounded-full border border-cm-red/30">
            <Sparkles size={12} /> STUDENT & CREATOR ACCESS
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Unlock India's Most Premium Fashion Closet.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Access exclusive streetwear drops, 3-day rental passes, creator lookbooks, and AI styling.
          </p>
        </div>

        {/* Footer Trust Proof */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
          <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} className="text-emerald-400" /> 100% Verified Authentic</span>
          <span>50,000+ Active Shoppers</span>
        </div>
      </div>

      {/* Right Minimalist Form (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Brand Link */}
          <div className="lg:hidden">
            <Link to="/" className="font-display font-bold text-2xl tracking-tight text-cm-black">
              Cloth<span className="text-cm-red">.</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-cm-black">
              Welcome Back
            </h1>
            <p className="text-cm-muted text-sm">
              Sign in to your Cloth Market account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-cm-black">Email Address</label>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-cm-border text-sm focus:border-cm-black focus:ring-0 transition-colors"
                type="email"
                placeholder="name@example.com"
                required
                value={form.email}
                onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1 text-left">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-cm-black">Password</label>
                <a href="#forgot" className="text-2xs text-cm-muted hover:text-cm-red transition-colors">Forgot?</a>
              </div>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-cm-border text-sm focus:border-cm-black focus:ring-0 transition-colors"
                type="password"
                placeholder="••••••••"
                required
                value={form.password}
                onChange={(e) => setForm((curr) => ({ ...curr, password: e.target.value }))}
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-cm-red bg-cm-red/10 p-3 rounded-xl border border-cm-red/20">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="btn btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 group shadow-xl"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Demo Users Notice */}
          <div className="bg-cm-soft border border-cm-border p-4 rounded-2xl text-xs space-y-1 text-left">
            <p className="font-bold text-cm-black">Quick Demo Credentials:</p>
            <p className="text-cm-muted">User: <code className="text-cm-black font-semibold">user@example.com</code> / <code className="text-cm-black font-semibold">User@123</code></p>
            <p className="text-cm-muted">Admin: <code className="text-cm-black font-semibold">admin@example.com</code> / <code className="text-cm-black font-semibold">Admin@123</code></p>
          </div>

          <div className="text-center text-xs text-cm-muted pt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-cm-black hover:text-cm-red transition-colors">
              Create Account Free
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
