import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await signup(form);
      setMessage("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch {
      /* handled in store error */
    }
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white text-cm-text">
      
      {/* Left Editorial Visual (7 Cols) */}
      <div className="hidden lg:flex lg:col-span-7 relative bg-cm-black overflow-hidden flex-col justify-between p-12 text-white">
        <img
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop"
          alt="Fashion Creator Editorial"
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
            <Sparkles size={12} /> JOIN THE MOVEMENT
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Claim Your ₹500 Welcome Discount & Student Pass.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Create an account to start renting luxury festive wear, saving creator moodboards, and getting AI size fits.
          </p>
        </div>

        {/* Footer Trust Proof */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
          <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} className="text-emerald-400" /> Free Student Membership</span>
          <span>Zero Monthly Fees</span>
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
              Create Your Account
            </h1>
            <p className="text-cm-muted text-sm">
              Join India's premiere student & creator fashion platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-cm-black">Full Name</label>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-cm-border text-sm focus:border-cm-black focus:ring-0 transition-colors"
                type="text"
                placeholder="Ananya Sharma"
                required
                value={form.name}
                onChange={(e) => setForm((curr) => ({ ...curr, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-cm-black">Email Address</label>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-cm-border text-sm focus:border-cm-black focus:ring-0 transition-colors"
                type="email"
                placeholder="ananya@college.edu.in"
                required
                value={form.email}
                onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-cm-black">Password</label>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-cm-border text-sm focus:border-cm-black focus:ring-0 transition-colors"
                type="password"
                placeholder="At least 6 characters"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((curr) => ({ ...curr, password: e.target.value }))}
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-cm-red bg-cm-red/10 p-3 rounded-xl border border-cm-red/20">
                {error}
              </p>
            )}

            {message && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                {message}
              </p>
            )}

            <button
              disabled={loading}
              className="btn btn-red w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 group shadow-xl"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-cm-muted pt-2">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-cm-black hover:text-cm-red transition-colors">
              Sign In Here
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
