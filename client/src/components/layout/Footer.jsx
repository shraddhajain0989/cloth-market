import { Link } from "react-router-dom";
import { ArrowUpRight, ShieldCheck, RefreshCw, Sparkles, Truck, Globe, Share2 } from "lucide-react";

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function YoutubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-cm-black text-white pt-20 pb-12 border-t border-cm-border/10">
      <div className="cm-container">
        {/* Top features strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-16 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/5 text-cm-red shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Express Shipping</h4>
              <p className="text-xs text-cm-muted mt-1">Free delivery over ₹999 across all India campus pin codes.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/5 text-cm-red shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">100% Authentic</h4>
              <p className="text-xs text-cm-muted mt-1">Directly sourced from verified high-street & designer brands.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/5 text-cm-red shrink-0">
              <RefreshCw size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Seamless Rentals</h4>
              <p className="text-xs text-cm-muted mt-1">Flexi-rental durations, security deposit refund guarantee.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/5 text-cm-red shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">AI Fit Genius</h4>
              <p className="text-xs text-cm-muted mt-1">Computer vision size recommendation & full-outfit curation.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 py-16">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-6">
            <Link to="/" className="font-display font-bold text-3xl tracking-tight">
              Cloth<span className="text-cm-red">.</span>
            </Link>
            <p className="text-cm-muted text-sm max-w-sm leading-relaxed">
              India's premier fashion discovery & rental ecosystem tailored for students, creators, and style pioneers.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-cm-black transition-all" aria-label="Instagram">
                <InstagramIcon size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-cm-black transition-all" aria-label="Twitter">
                <TwitterIcon size={18} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-cm-black transition-all" aria-label="Youtube">
                <YoutubeIcon size={18} />
              </a>
            </div>
          </div>

          {/* Col 1 */}
          <div>
            <h5 className="font-display font-semibold text-sm uppercase tracking-widest text-white/50 mb-4">Shop & Rent</h5>
            <ul className="space-y-3 text-sm text-cm-muted">
              <li><Link to="/?category=Oversized" className="hover:text-white transition-colors">Oversized Tees</Link></li>
              <li><Link to="/?category=Streetwear" className="hover:text-white transition-colors">Streetwear Fits</Link></li>
              <li><Link to="/?category=Ethnic" className="hover:text-white transition-colors">Festive Ethnic</Link></li>
              <li><Link to="/?category=Sneakers" className="hover:text-white transition-colors">Limited Sneakers</Link></li>
              <li><Link to="/?view=rental" className="hover:text-white transition-colors text-cm-red font-medium">Rental Closet</Link></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h5 className="font-display font-semibold text-sm uppercase tracking-widest text-white/50 mb-4">Experience</h5>
            <ul className="space-y-3 text-sm text-cm-muted">
              <li><Link to="/ai-lab" className="hover:text-white transition-colors flex items-center gap-1">AI Stylist Studio <ArrowUpRight size={14} /></Link></li>
              <li><Link to="/social" className="hover:text-white transition-colors flex items-center gap-1">Creator Lookbook <ArrowUpRight size={14} /></Link></li>
              <li><Link to="/?category=seasonal" className="hover:text-white transition-colors">Campus Favorites</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Student Discount Pass</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h5 className="font-display font-semibold text-sm uppercase tracking-widest text-white/50 mb-4">Company</h5>
            <ul className="space-y-3 text-sm text-cm-muted">
              <li><a href="#about" className="hover:text-white transition-colors">About Cloth Market</a></li>
              <li><a href="#sustainability" className="hover:text-white transition-colors">Circular Fashion</a></li>
              <li><a href="#careers" className="hover:text-white transition-colors">Campus Ambassador</a></li>
              <li><a href="#support" className="hover:text-white transition-colors">Support & FAQs</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cm-muted">
          <p>© {new Date().getFullYear()} Cloth Market Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            <a href="#security" className="hover:underline">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
