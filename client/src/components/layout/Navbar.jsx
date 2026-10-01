import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, Menu, X, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/?search=${encodeURIComponent(searchVal.trim())}#catalog`);
      setSearchOpen(false);
      setSearchVal("");
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-cm-border transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6">
          {/* Brand Logo */}
          <Link
            to="/"
            className="font-display font-bold text-xl tracking-tight text-cm-black shrink-0"
          >
            Cloth Market<span className="text-cm-red">.</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-semibold transition-colors ${
                  isActive ? "text-cm-black" : "text-cm-muted hover:text-cm-black"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/?view=rental"
              className="text-sm font-semibold text-cm-muted hover:text-cm-black transition-colors"
            >
              Rent
            </NavLink>
            <a
              href="#catalog"
              className="text-sm font-semibold text-cm-muted hover:text-cm-black transition-colors"
            >
              Categories
            </a>
          </nav>

          {/* Right Actions: Search + Login / Profile */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-cm-muted hover:text-cm-black hover:bg-cm-soft transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={["admin", "master"].includes(user.role) ? "/admin" : "/profile"}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cm-soft hover:bg-cm-border transition-colors text-xs font-semibold text-cm-black"
                  >
                    <User size={14} />
                    <span>{user.name?.split(" ")[0] || "My Rentals"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-cm-muted hover:text-cm-black transition-colors px-2 py-1"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-white bg-cm-black rounded-full hover:bg-cm-red transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-cm-muted hover:text-cm-black hover:bg-cm-soft transition-colors"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {searchOpen && (
          <div className="border-t border-cm-border bg-cm-soft/50 px-4 py-3">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Search size={16} className="text-cm-muted shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search clothes, categories, styles..."
                  className="flex-1 bg-transparent border-none text-sm text-cm-black placeholder:text-cm-muted focus:ring-0 p-1"
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-bold bg-cm-black text-white rounded-lg hover:bg-cm-red transition-colors"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-cm-muted hover:text-cm-black"
                >
                  <X size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col p-6 z-10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-cm-border">
              <span className="font-display font-bold text-lg text-cm-black">
                Cloth Market<span className="text-cm-red">.</span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted hover:text-cm-black"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-3 text-sm font-semibold">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-cm-black hover:bg-cm-soft"
              >
                Home
              </Link>
              <Link
                to="/?view=rental"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-cm-black hover:bg-cm-soft"
              >
                Rent
              </Link>
              <a
                href="#catalog"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-cm-black hover:bg-cm-soft"
              >
                Categories
              </a>
              {user && (
                <Link
                  to={["admin", "master"].includes(user.role) ? "/admin" : "/profile"}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-cm-black hover:bg-cm-soft"
                >
                  My Rentals
                </Link>
              )}
            </nav>

            <div className="pt-4 border-t border-cm-border space-y-3">
              {user ? (
                <>
                  <div className="px-3 py-2 bg-cm-soft rounded-xl text-xs">
                    <p className="text-2xs text-cm-muted font-bold uppercase">Signed in as</p>
                    <p className="font-semibold text-cm-black truncate">{user.name || user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 px-3 text-xs font-bold text-center text-cm-muted hover:text-cm-black border border-cm-border rounded-xl"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full py-2.5 px-3 text-xs font-bold text-center bg-cm-black text-white rounded-xl hover:bg-cm-red transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
