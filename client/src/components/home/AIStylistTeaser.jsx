import { Sparkles, Upload, Palette, Shirt, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function AIStylistTeaser() {
  return (
    <section className="cm-section bg-cm-black text-white relative overflow-hidden">
      {/* Background Subtle Mesh */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cm-red/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="cm-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Text & Features */}
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-flex items-center gap-2 text-2xs uppercase tracking-[0.25em] font-bold text-cm-red bg-cm-red/15 px-3.5 py-1 rounded-full border border-cm-red/30">
              <Sparkles size={14} /> CLOTH MARKET AI LAB
            </span>

            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              Personal Fashion Assistant Powered by AI
            </h2>

            <p className="text-cm-muted text-base leading-relaxed max-w-lg">
              Not sure how to pair your jacket? Planning a festive look for Diwali or Freshers? Upload any picture or input your budget to get instant AI recommendations.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Upload size={20} className="text-cm-red shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Image Match</h4>
                  <p className="text-xs text-cm-muted mt-0.5">Upload any outfit photo to find matching pieces in stock.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Palette size={20} className="text-cm-red shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Color Curation</h4>
                  <p className="text-xs text-cm-muted mt-0.5">Harmonized color combinations based on skin tone & occasion.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Shirt size={20} className="text-cm-red shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Size Fit Genius</h4>
                  <p className="text-xs text-cm-muted mt-0.5">Precise chest & waist measurement sizing recommendations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <Sparkles size={20} className="text-cm-red shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Budget Outfit Builder</h4>
                  <p className="text-xs text-cm-muted mt-0.5">Complete looks generated within your set spending limit.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                to="/ai-lab"
                className="btn btn-red text-base py-3.5 px-8 inline-flex items-center gap-2 shadow-2xl hover:bg-white hover:text-cm-black"
              >
                <span>Launch AI Stylist Studio</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Right: Simulated AI Studio Interactive Card */}
          <div className="lg:col-span-6">
            <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cm-red" />
                  <span className="font-display font-bold text-sm tracking-wider uppercase text-white/90">AI Outfit Generator Demo</span>
                </div>
                <span className="text-2xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">LIVE ENGINE</span>
              </div>

              {/* Sample Prompt Box */}
              <div className="space-y-2 text-left">
                <label className="text-2xs uppercase tracking-widest text-cm-muted font-bold">Input Occasion & Budget</label>
                <div className="bg-cm-black/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm text-white/90 font-medium">"Freshers Party outfit under ₹2,500"</span>
                  <span className="badge badge-sale">AUTO GENERATED</span>
                </div>
              </div>

              {/* Generated Result Output */}
              <div className="space-y-3 text-left">
                <p className="text-2xs uppercase tracking-widest text-cm-red font-bold flex items-center gap-1">
                  <Sparkles size={12} /> AI Recommendation Result
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3 items-center">
                    <img
                      src="https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=300&auto=format&fit=crop"
                      alt="Oversized Jacket"
                      className="w-12 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div>
                      <h5 className="font-display text-xs font-bold text-white line-clamp-1">Denim Jacket</h5>
                      <p className="text-2xs text-cm-muted">₹1,999 • Rent ₹299</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3 items-center">
                    <img
                      src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=300&auto=format&fit=crop"
                      alt="Black Cargo"
                      className="w-12 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div>
                      <h5 className="font-display text-xs font-bold text-white line-clamp-1">Wide Cargo</h5>
                      <p className="text-2xs text-cm-muted">₹1,299 • Rent ₹199</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center text-xs text-white/50">
                ✨ Confidence Match 98% • Try your own prompts in the AI Lab
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
