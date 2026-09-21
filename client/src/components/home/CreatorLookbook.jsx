import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import Badge from "../common/Badge";

function InstagramIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const CREATOR_LOOKS = [
  {
    id: "creator-1",
    authorName: "Ananya Sharma",
    handle: "@ananya_fits",
    followers: "124k",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    caption: "Monochrome layering for campus mornings. Denim jacket + wide cargo pants 🖤",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop",
    likes: "4.8k",
    itemsCount: 2,
    totalBundlePrice: 3298
  },
  {
    id: "creator-2",
    authorName: "Rohan Verma",
    handle: "@rohan_street",
    followers: "89k",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    caption: "Ethnic rental drop for best friend's Sangeet night! Felt like royalty.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
    likes: "6.2k",
    itemsCount: 1,
    totalBundlePrice: 899
  },
  {
    id: "creator-3",
    authorName: "Priya Kapoor",
    handle: "@priya_style",
    followers: "210k",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop",
    caption: "Minimal chic for weekend cafe hopping. White cropped tee & linen shorts.",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    likes: "3.9k",
    itemsCount: 2,
    totalBundlePrice: 2298
  }
];

export default function CreatorLookbook({ onCart }) {
  return (
    <section className="cm-section bg-cm-soft border-b border-cm-border">
      <div className="cm-container">
        <SectionHeader
          eyebrow="COMMUNITY LOOKBOOK"
          title="Styled by Top Campus Creators"
          description="Explore real outfit posts from fashion creators. Shop the exact items or save looks to your moodboard."
          actionText="Explore Creator Hub"
          actionLink="/social"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CREATOR_LOOKS.map((look) => (
            <article
              key={look.id}
              className="bg-white border border-cm-border rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
            >
              {/* Header: Creator Info */}
              <div className="p-4 flex items-center justify-between border-b border-cm-border/60">
                <div className="flex items-center gap-3">
                  <img
                    src={look.avatar}
                    alt={look.authorName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-cm-black/10"
                  />
                  <div>
                    <h4 className="font-display text-sm font-bold text-cm-black line-clamp-1">{look.authorName}</h4>
                    <p className="text-2xs text-cm-muted flex items-center gap-1">
                      <InstagramIcon size={11} /> {look.handle} • {look.followers}
                    </p>
                  </div>
                </div>

                <Badge variant="trending">CREATOR</Badge>
              </div>

              {/* Look Image */}
              <div className="relative aspect-[3/4] w-full bg-cm-soft overflow-hidden group">
                <img
                  src={look.image}
                  alt={look.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-spring"
                />

                <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Heart size={14} className="fill-cm-red text-cm-red" /> {look.likes}
                </div>
              </div>

              {/* Footer: Caption & Action */}
              <div className="p-5 space-y-4">
                <p className="text-xs text-cm-text leading-relaxed line-clamp-2">
                  "{look.caption}"
                </p>

                <div className="pt-2 border-t border-cm-border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-2xs text-cm-muted uppercase font-bold tracking-wider">Complete Look</span>
                    <p className="font-display font-bold text-sm text-cm-black">₹{look.totalBundlePrice.toLocaleString("en-IN")}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCart?.()}
                    className="btn btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
                  >
                    <ShoppingBag size={14} />
                    <span>Shop Look</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
