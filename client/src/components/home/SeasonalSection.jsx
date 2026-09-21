import { useMemo } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "../common/SectionHeader";
import Badge from "../common/Badge";

const SEASONS = [
  {
    key: "festive",
    title: "Diwali & Navratri Glam",
    subtitle: "Silk Lehengas & Designer Sherwanis",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop",
    tag: "FESTIVE SEASON",
    months: [8, 9, 10] // Sept, Oct, Nov
  },
  {
    key: "wedding",
    title: "Royal Wedding Closet",
    subtitle: "Heavy Ethnic Suits, Bandhgalas & Sarees",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
    tag: "WEDDING COLLECTION",
    months: [11, 0, 1] // Dec, Jan, Feb
  },
  {
    key: "freshers",
    title: "Freshers & Prom Party",
    subtitle: "Blazers, Bodycon Dresses & Cocktail Wear",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    tag: "CAMPUS EVENT",
    months: [6, 7] // July, August
  },
  {
    key: "summer",
    title: "Breeze & Linen Drops",
    subtitle: "Breathable Cotton, Pastels & Beach Fits",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop",
    tag: "SUMMER SPECIAL",
    months: [2, 3, 4, 5] // March - June
  }
];

export default function SeasonalSection({ onSelectCategory }) {
  // Determine current season dynamically based on month
  const sortedSeasons = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const current = SEASONS.find((s) => s.months.includes(currentMonth)) || SEASONS[0];
    const others = SEASONS.filter((s) => s.key !== current.key);
    return [current, ...others];
  }, []);

  const activeSeason = sortedSeasons[0];

  return (
    <section className="cm-section bg-cm-soft border-b border-cm-border">
      <div className="cm-container">
        <SectionHeader
          eyebrow="SEASONAL CURATION"
          title={`${activeSeason.title}`}
          description="Handpicked wardrobe collections synced live with India's festival calendar and college season transitions."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Featured Current Season Card (Large Hero Box) */}
          <div className="lg:col-span-7 relative group rounded-3xl overflow-hidden min-h-[420px] bg-cm-black shadow-card-hover">
            <img
              src={activeSeason.image}
              alt={activeSeason.title}
              className="w-full h-full object-cover object-center opacity-85 transition-transform duration-700 ease-spring group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cm-black via-cm-black/40 to-transparent flex flex-col justify-end p-8 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="hot">{activeSeason.tag}</Badge>
                <span className="text-2xs font-bold tracking-widest text-cm-red bg-white/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                  <Sparkles size={12} /> LIVE NOW
                </span>
              </div>

              <h3 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                {activeSeason.title}
              </h3>
              <p className="text-sm text-white/80 max-w-md mb-6 leading-relaxed">
                {activeSeason.subtitle}. Available for immediate delivery or 3-14 day rental bookings.
              </p>

              <div>
                <button
                  onClick={() => onSelectCategory?.(activeSeason.key)}
                  className="btn btn-red text-sm py-3 px-6 inline-flex items-center gap-2"
                >
                  <span>Explore {activeSeason.title}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Season Cards */}
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            {sortedSeasons.slice(1, 3).map((season) => (
              <div
                key={season.key}
                className="group relative rounded-3xl overflow-hidden flex-1 min-h-[200px] bg-cm-black shadow-card"
              >
                <img
                  src={season.image}
                  alt={season.title}
                  className="w-full h-full object-cover opacity-75 transition-transform duration-700 ease-spring group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cm-black/90 via-cm-black/30 to-transparent p-6 flex flex-col justify-end text-white">
                  <Badge variant="rent" className="mb-1.5 self-start">{season.tag}</Badge>
                  <h4 className="font-display text-xl font-bold">{season.title}</h4>
                  <p className="text-xs text-white/70 mt-1 line-clamp-1">{season.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
