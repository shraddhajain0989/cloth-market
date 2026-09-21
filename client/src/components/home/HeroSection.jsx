import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Flame, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../common/Badge";

const FLOATING_ITEMS = [
  {
    id: 1,
    title: "Oversized Vintage Jacket",
    badge: "TRENDING",
    price: "₹1,999",
    rent: "₹299/day",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop",
    style: "top-0 right-0 sm:-right-4 w-52 sm:w-64"
  },
  {
    id: 2,
    title: "Minimal High-Street Kurti",
    badge: "BESTSELLER",
    price: "₹1,399",
    rent: "₹129/day",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
    style: "bottom-8 left-0 sm:-left-6 w-48 sm:w-56"
  }
];

export default function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    }

    const el = containerRef.current;
    if (el) el.addEventListener("mousemove", handleMouseMove);
    return () => {
      if (el) el.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-cm-soft pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background Subtle Gradient Mesh */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />

      <div className="cm-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-left">
            {/* Top Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-cm-border shadow-sm text-xs font-semibold uppercase tracking-widest text-cm-black"
            >
              <Sparkles size={14} className="text-cm-red" />
              <span>India's #1 Campus & Student Fashion Hub</span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-cm-black leading-[1.02]"
              >
                WEAR TOMORROW'S <br className="hidden sm:block" />
                <span className="relative inline-block text-cm-black">
                  TREND TODAY.
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-cm-red" viewBox="0 0 300 20" fill="none" preserveAspectRatio="none">
                    <path d="M5 15 Q 150 5, 295 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-cm-muted text-base sm:text-lg max-w-xl leading-relaxed"
              >
                Discover streetwear drops, festive ethnic rentals, creator-curated looks, and AI styling. High fashion without the luxury price tag.
              </motion.p>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link
                to="/"
                className="btn btn-primary text-base py-3.5 px-8 shadow-xl flex items-center gap-2 group hover:bg-cm-red"
              >
                <span>Shop New Collection</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/?view=rental"
                className="btn btn-secondary text-base py-3.5 px-8 bg-white hover:bg-cm-black hover:text-white transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} />
                <span>Explore Rentals</span>
              </Link>
            </motion.div>

            {/* Quick Proof Metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-6 border-t border-cm-border/80 flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-cm-muted"
            >
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-cm-red" />
                <span>50k+ Active Shoppers</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>100% Guaranteed Fits</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Editorial Visual Composition & Parallax Cards */}
          <div className="lg:col-span-5 relative min-h-[460px] sm:min-h-[540px] flex items-center justify-center">
            
            {/* Main Editorial Hero Image */}
            <motion.div
              style={{
                x: mousePos.x * -20,
                y: mousePos.y * -20,
              }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="relative z-10 w-full max-w-sm sm:max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-card-hover border-4 border-white"
            >
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop"
                alt="Editorial Fashion Look"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cm-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                <Badge variant="hot" className="mb-2">EDITORIAL PICK</Badge>
                <h3 className="font-display text-xl font-bold">Fall / Winter Runway Drop</h3>
                <p className="text-xs text-white/80 mt-1">Available for purchase & 3-day rental</p>
              </div>
            </motion.div>

            {/* Floating Card 1 (Top Right) */}
            <motion.div
              style={{
                x: mousePos.x * 35,
                y: mousePos.y * 35,
              }}
              transition={{ type: "spring", stiffness: 100, damping: 12 }}
              className={`absolute ${FLOATING_ITEMS[0].style} z-20 hidden sm:block bg-white p-3 rounded-2xl shadow-editorial border border-cm-border animate-float-slow`}
            >
              <div className="flex gap-3 items-center">
                <img src={FLOATING_ITEMS[0].image} alt="Product" className="w-16 h-20 object-cover rounded-xl shrink-0" />
                <div className="space-y-1">
                  <Badge variant="trending">{FLOATING_ITEMS[0].badge}</Badge>
                  <p className="font-display text-xs font-bold text-cm-black line-clamp-1">{FLOATING_ITEMS[0].title}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-cm-black">{FLOATING_ITEMS[0].price}</span>
                    <span className="text-2xs text-cm-muted font-medium">Rent {FLOATING_ITEMS[0].rent}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 2 (Bottom Left) */}
            <motion.div
              style={{
                x: mousePos.x * -30,
                y: mousePos.y * -30,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className={`absolute ${FLOATING_ITEMS[1].style} z-20 hidden sm:block bg-white p-3 rounded-2xl shadow-editorial border border-cm-border animate-float-mid`}
            >
              <div className="flex gap-3 items-center">
                <img src={FLOATING_ITEMS[1].image} alt="Product" className="w-16 h-20 object-cover rounded-xl shrink-0" />
                <div className="space-y-1">
                  <Badge variant="new">{FLOATING_ITEMS[1].badge}</Badge>
                  <p className="font-display text-xs font-bold text-cm-black line-clamp-1">{FLOATING_ITEMS[1].title}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-cm-black">{FLOATING_ITEMS[1].price}</span>
                    <span className="text-2xs text-cm-muted font-medium">Rent {FLOATING_ITEMS[1].rent}</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}
