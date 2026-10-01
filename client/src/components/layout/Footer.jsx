import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-cm-black text-white py-12 border-t border-white/10">
      <div className="cm-container px-4 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <Link to="/" className="font-display font-bold text-xl tracking-tight text-white">
              Cloth Market<span className="text-cm-red">.</span>
            </Link>
            <p className="text-xs text-cm-muted mt-1 max-w-sm">
              Simple, flexible cloth rentals. Reserve designer and occasion wear with ₹50 cash advance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-cm-muted">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/?view=rental" className="hover:text-white transition-colors">
              Rent
            </Link>
            <a href="#catalog" className="hover:text-white transition-colors">
              Categories
            </a>
            <Link to="/profile" className="hover:text-white transition-colors">
              My Rentals
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs text-cm-muted">
          <p>© {new Date().getFullYear()} Cloth Market. All rights reserved. Cash on Delivery.</p>
          <div className="flex items-center gap-4">
            <span>₹50 Cash Advance</span>
            <span>•</span>
            <span>Handover Condition Inspection</span>
            <span>•</span>
            <span>Zero Gateway Fees</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
