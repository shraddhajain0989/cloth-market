import { Heart, Sparkles } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import Badge from "../common/Badge";

const TRENDING_MOODBOARD = [
  {
    id: "m-1",
    title: "Oversized Streetwear Aesthetics",
    likes: "2.4k",
    tag: "STREETWEAR",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[3/4]"
  },
  {
    id: "m-2",
    title: "Minimal High-Street Everyday",
    likes: "4.1k",
    tag: "MINIMALIST",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[3/5]"
  },
  {
    id: "m-3",
    title: "Festive Silk & Velvet Rentals",
    likes: "1.8k",
    tag: "ETHNIC",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[4/3]"
  },
  {
    id: "m-4",
    title: "Campus Layering & Outerwear",
    likes: "3.2k",
    tag: "CAMPUS FITS",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[3/4]"
  },
  {
    id: "m-5",
    title: "Monochrome Tailored Suits",
    likes: "5.6k",
    tag: "LUXURY",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[4/5]"
  },
  {
    id: "m-6",
    title: "Retro Denim & Leather Drops",
    likes: "1.9k",
    tag: "VINTAGE",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
    aspect: "aspect-[3/4]"
  }
];

export default function TrendingGrid() {
  return (
    <section className="cm-section bg-white border-b border-cm-border">
      <div className="cm-container">
        <SectionHeader
          eyebrow="TRENDING NOW"
          title="Pinterest Aesthetic Moodboard"
          description="Visual outfit inspirations trending across college campuses and creator social feeds this week."
        />

        {/* Pinterest Masonry Layout */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {TRENDING_MOODBOARD.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-3xl overflow-hidden bg-cm-soft border border-cm-border shadow-card hover:shadow-card-hover transition-all duration-500 cursor-pointer"
            >
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-105"
              />

              {/* Top Tag */}
              <div className="absolute top-4 left-4 z-10">
                <Badge variant="trending">{item.tag}</Badge>
              </div>

              {/* Bottom Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-cm-black/85 via-cm-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end text-white">
                <h4 className="font-display font-bold text-lg leading-snug line-clamp-2">
                  {item.title}
                </h4>

                <div className="flex items-center justify-between pt-3 text-xs text-white/80 border-t border-white/15 mt-3">
                  <span className="flex items-center gap-1 font-semibold text-cm-red">
                    <Heart size={14} className="fill-current" /> {item.likes} saved
                  </span>
                  <span className="text-2xs uppercase tracking-widest font-bold flex items-center gap-1 text-white/60">
                    <Sparkles size={11} /> Explore Look
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
