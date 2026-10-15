import { Link } from "react-router-dom";
import { ShieldCheck, Camera, Sparkles, MessageCircle } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cm-black text-white pt-14 pb-10 border-t border-white/10">
      <div className="cm-container px-4 space-y-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10">
          
          {/* Brand & Purpose (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <Link to="/" className="font-display font-bold text-2xl tracking-tight text-white inline-block">
              Cloth Market<span className="text-cm-red">.</span>
            </Link>
            <p className="text-xs text-cm-muted max-w-sm leading-relaxed">
              Simple, flexible cloth rentals and curated occasion wear. Reserve designer outfits with seamless WhatsApp coordination, physical handover inspection, and ₹50 booking advance.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-bold bg-white/5 border border-white/10 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live WhatsApp Booking Available
              </span>
            </div>
          </div>

          {/* Quick Navigation (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-white/50">
              Explore
            </p>
            <ul className="space-y-2 text-xs text-cm-muted">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/?view=rental" className="hover:text-white transition-colors">
                  Rent Catalog
                </Link>
              </li>
              <li>
                <a href="#catalog" className="hover:text-white transition-colors">
                  Browse by Category
                </a>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  My Rentals & Bookings
                </Link>
              </li>
              <li>
                <Link to="/ai-lab" className="hover:text-white transition-colors">
                  AI Stylist Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policies (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-white/50">
              Policies & Customer Trust
            </p>
            <ul className="space-y-2 text-xs text-cm-muted">
              <li>
                <Link to="/terms" className="hover:text-white transition-colors flex items-center gap-1.5 font-medium">
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors flex items-center gap-1.5 font-medium">
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms#handover" className="hover:text-white transition-colors">
                  Handover Inspection Protocol
                </Link>
              </li>
              <li>
                <Link to="/terms#damage" className="hover:text-white transition-colors">
                  Garment Care & Fair Damage Policy
                </Link>
              </li>
              <li>
                <Link to="/terms#cancellation" className="hover:text-white transition-colors">
                  Cancellations & Refund Guidelines
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Trust & Legal Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 text-2xs text-cm-muted">
          
          {/* Copyright & Direct Legal Links */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-center lg:text-left">
            <p>© {currentYear} Cloth Market. All rights reserved.</p>
            <span className="hidden sm:inline text-white/20">•</span>
            <Link to="/terms" className="hover:text-white font-medium underline underline-offset-4 transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/privacy" className="hover:text-white font-medium underline underline-offset-4 transition-colors">
              Privacy Policy
            </Link>
          </div>

          {/* Trust Value Propositions */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-3xs sm:text-2xs text-white/70">
            <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <Sparkles size={11} className="text-amber-400" /> ₹50 Cash Advance
            </span>
            <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <Camera size={11} className="text-blue-400" /> Handover Inspection
            </span>
            <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <ShieldCheck size={11} className="text-emerald-400" /> Zero Gateway Fees
            </span>
          </div>

        </div>

      </div>
    </footer>
  );
}
