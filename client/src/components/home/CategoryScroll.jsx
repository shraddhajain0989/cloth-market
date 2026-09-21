import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

const CATEGORIES = [
  { id: "Men", name: "Men", image: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=400&auto=format&fit=crop" },
  { id: "Women", name: "Women", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop" },
  { id: "Oversized", name: "Oversized", image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=400&auto=format&fit=crop" },
  { id: "Streetwear", name: "Streetwear", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=400&auto=format&fit=crop" },
  { id: "Ethnic", name: "Ethnic Wear", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=400&auto=format&fit=crop" },
  { id: "Sneakers", name: "Sneakers", image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=400&auto=format&fit=crop" },
  { id: "Accessories", name: "Accessories", image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=400&auto=format&fit=crop" },
  { id: "Luxury", name: "Luxury Fits", image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=400&auto=format&fit=crop" },
  { id: "Rental", name: "Rental Closet", image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop" },
  { id: "Sports", name: "Active & Sports", image: "https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=400&auto=format&fit=crop" },
  { id: "Campus", name: "Campus Wear", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=400&auto=format&fit=crop" }
];

export default function CategoryScroll({ selectedCategory, onSelectCategory }) {
  const scrollRef = useRef(null);

  function scroll(direction) {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="cm-section bg-white border-b border-cm-border">
      <div className="cm-container">
        <div className="flex items-end justify-between mb-8">
          <SectionHeader
            eyebrow="EXPLORE CATEGORIES"
            title="Curated Aesthetic Circles"
            description="Swipe through curated wardrobes tailored for campus fits, high-street streetwear, and formal rentals."
            className="mb-0"
          />

          {/* Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full border border-cm-border flex items-center justify-center text-cm-black hover:bg-cm-black hover:text-white transition-colors"
              aria-label="Previous categories"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full border border-cm-border flex items-center justify-center text-cm-black hover:bg-cm-black hover:text-white transition-colors"
              aria-label="Next categories"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Categories Drag Scroll Track */}
        <div
          ref={scrollRef}
          className="drag-scroll flex items-center gap-6 sm:gap-8 pb-4 pt-2 no-scrollbar"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory?.(isSelected ? "" : cat.id)}
                className="group flex flex-col items-center gap-3 shrink-0 focus:outline-none"
              >
                {/* Circle Image Wrapper */}
                <div
                  className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-cm-red ring-offset-4 scale-105"
                      : "group-hover:scale-105 group-hover:ring-2 group-hover:ring-cm-black group-hover:ring-offset-2"
                  }`}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors rounded-full" />
                </div>

                {/* Label */}
                <span
                  className={`font-display text-xs sm:text-sm font-semibold tracking-tight transition-colors ${
                    isSelected ? "text-cm-red font-bold" : "text-cm-text group-hover:text-cm-black"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
