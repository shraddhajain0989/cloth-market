"use client";
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AppShell() {
  const location = useLocation();
  const lenisRef = useRef(null);

  // ── Lenis smooth scroll ────────────────────────────────────
  useEffect(() => {
    let lenis = null;
    let raf = null;

    async function initLenis() {
      try {
        const { default: Lenis } = await import("lenis");
        lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothTouch: false,
          touchMultiplier: 2,
        });
        lenisRef.current = lenis;

        function tick(time) {
          lenis.raf(time);
          raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
      } catch {
        /* Lenis not available — degrade gracefully */
      }
    }

    initLenis();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, []);

  // ── Scroll to top on route change ─────────────────────────
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white text-cm-text">
      <Navbar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Footer />
    </div>
  );
}
