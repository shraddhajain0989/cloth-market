import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, ShoppingBag, Menu, X, ChevronDown, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import CartDrawer from "../cart/CartDrawer";

// ── Announcement messages ──────────────────────────────────────
const MESSAGES = [
  { text: "🔥 FLASH SALE — 40% OFF ALL ITEMS", code: "STUDENT40", hasTimer: true },
  { text: "🎓 STUDENT DISCOUNT — 15% off with .edu email", code: null, hasTimer: false },
  { text: "🚚 FREE SHIPPING on orders above ₹999", code: null, hasTimer: false },
  { text: "✨ NEW ARRIVALS drop every Friday — Don't miss out", code: null, hasTimer: false },
];

function useCountdown(targetMs) {
  const [timeLeft, setTimeLeft] = useState(targetMs - Date.now());
  useEffect(() => {
    const iv = setInterval(() => setTimeLeft(targetMs - Date.now()), 1000);
    return () => clearInterval(iv);
  }, [targetMs]);
  const total = Math.max(0, timeLeft);
  const h = Math.floor(total / 3600000).toString().padStart(2, "0");
  const m = Math.floor((total % 3600000) / 60000).toString().padStart(2, "0");
  const s = Math.floor((total % 60000) / 1000).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const targetRef = useRef(Date.now() + 48 * 3600 * 1000);
  const countdown = useCountdown(targetRef.current);
  const msg = MESSAGES[idx];

  useEffect(() => {
    const iv = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  function copyCode() {
    if (!msg.code) return;
    navigator.clipboard.writeText(msg.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-cm-black text-white text-xs font-medium tracking-wide" style={{ height: "40px" }}>
      <div className="cm-container h-full flex items-center justify-between gap-4 overflow-hidden">
        {/* Cycling message */}
        <div className="flex-1 flex items-center justify-center gap-3 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="truncate"
            >
              {msg.text}
            </motion.span>
          </AnimatePresence>

          {msg.hasTimer && (
            <span className="hidden sm:flex items-center gap-1 shrink-0">
              <span className="text-cm-muted">Ends in</span>
              <span className="font-bold text-cm-red tabular-nums">{countdown}</span>
            </span>
          )}

          {msg.code && (
            <button
              onClick={copyCode}
              className="shrink-0 hidden sm:inline-flex items-center gap-1 border border-white/30 rounded-full px-3 py-0.5 text-2xs font-bold tracking-widest hover:bg-white hover:text-cm-black transition-all"
            >
              {copied ? "✓ COPIED" : `CODE: ${msg.code}`}
            </button>
          )}
        </div>

        {/* Dots */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {MESSAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nav links ─────────────────────────────────────────────────
const NAV_LINKS = [
  { to: "/", label: "New Collection", exact: true },
  { to: "/?category=seasonal", label: "Seasonal" },
  { to: "/?view=rental", label: "Rent" },
  { to: "/social", label: "Creators" },
  { to: "/ai-lab", label: "AI Stylist" },
];

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleCartClick() {
    if (!user) {
      navigate("/login");
    } else {
      setCartOpen(true);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-50">
        <AnnouncementBar />

        {/* Main navbar */}
        <motion.header
          animate={{ paddingTop: scrolled ? "10px" : "16px", paddingBottom: scrolled ? "10px" : "16px" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`glass border-b border-cm-border/60 transition-shadow duration-300 ${scrolled ? "shadow-glass" : ""}`}
        >
          <div className="cm-container flex items-center gap-6">
            {/* Logo */}
            <Link
              to="/"
              className="font-display font-bold text-xl tracking-tight text-cm-black shrink-0 hover:opacity-70 transition-opacity"
            >
              Cloth<span className="text-cm-red">.</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              {NAV_LINKS.map(({ to, label, exact }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      isActive
                        ? "text-cm-black"
                        : "text-cm-muted hover:text-cm-black hover:bg-cm-soft"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute inset-0 bg-cm-soft rounded-full -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-full hover:bg-cm-soft transition-colors text-cm-muted hover:text-cm-black"
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => user ? navigate("/profile") : navigate("/login")}
                className="relative p-2.5 rounded-full hover:bg-cm-soft transition-colors text-cm-muted hover:text-cm-black"
                aria-label="Wishlist"
              >
                <Heart size={18} />
              </button>

              {/* Cart */}
              <button
                onClick={handleCartClick}
                className="relative p-2.5 rounded-full hover:bg-cm-soft transition-colors text-cm-muted hover:text-cm-black"
                aria-label="Cart"
              >
                <ShoppingBag size={18} />
              </button>

              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-2 ml-2">
                  <Link
                    to={["admin", "master"].includes(user.role) ? "/admin" : "/profile"}
                    className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-cm-soft hover:bg-cm-border transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-cm-black flex items-center justify-center text-white text-xs font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-cm-text hidden sm:block">{user.name?.split(" ")[0]}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:block text-xs text-cm-muted hover:text-cm-black transition-colors px-3 py-2"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-cm-muted hover:text-cm-black transition-colors rounded-full hover:bg-cm-soft"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 text-sm font-semibold bg-cm-black text-white rounded-full hover:bg-cm-red transition-all duration-200 hover:shadow-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="lg:hidden p-2.5 rounded-full hover:bg-cm-soft transition-colors text-cm-muted ml-1"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </motion.header>
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onOrderPlaced={() => navigate("/profile")}
      />

      {/* ── Search overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-start pt-32 px-6"
          >
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-cm-soft"
            >
              <X size={22} />
            </button>
            <p className="text-cm-muted text-sm uppercase tracking-widest mb-6">Search Cloth Market</p>
            <form onSubmit={handleSearch} className="w-full max-w-xl">
              <div className="flex items-center gap-3 border-b-2 border-cm-black pb-3">
                <Search size={22} className="text-cm-muted shrink-0" />
                <input
                  autoFocus
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search products, categories, styles..."
                  className="flex-1 text-2xl font-display text-cm-black placeholder-cm-border bg-transparent border-none focus:ring-0 p-0"
                />
                <button type="submit" className="btn btn-primary text-sm !py-2">Go</button>
              </div>
            </form>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {["Denim Jacket", "Kurti", "Sneakers", "Streetwear", "Rental", "Ethnic"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSearchVal(tag); }}
                  className="px-4 py-1.5 rounded-full border border-cm-border text-sm text-cm-muted hover:border-cm-black hover:text-cm-black transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile menu drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-xs bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-cm-border">
                <span className="font-display font-bold text-lg">Cloth<span className="text-cm-red">.</span></span>
                <button onClick={() => setMenuOpen(false)} className="p-2 rounded-full hover:bg-cm-soft">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-6 space-y-1">
                {NAV_LINKS.map(({ to, label }) => (
                  <Link
                    key={label}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base font-medium text-cm-text hover:bg-cm-soft transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-cm-border mt-4 space-y-2">
                  {user ? (
                    <>
                      <Link to={["admin","master"].includes(user.role) ? "/admin" : "/profile"} onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-cm-text hover:bg-cm-soft">
                        My Account
                      </Link>
                      <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-cm-muted hover:bg-cm-soft">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-cm-text hover:bg-cm-soft">Login</Link>
                      <Link to="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-semibold bg-cm-black text-white text-center">Sign Up Free</Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
