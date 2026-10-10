import { Sparkles, MessageCircle, ShoppingBag, Images } from "lucide-react";

export default function ProductCard({ product, onRent, onBuy, onSelect }) {
  const listingType = product.listingType || "RENT"; // 'RENT' | 'RESELL' | 'BOTH'
  const rentPrice = Number(product.rentPrice) || 0;
  const sellPrice = Number(product.price) || 0;
  const isAvailable = product.available !== false && (product.stock === undefined || product.stock > 0);
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const primaryImage = images[0];

  return (
    <article
      onClick={() => onSelect?.(product)}
      className="group flex flex-col h-full bg-white rounded-2xl border border-cm-border overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer text-left"
    >
      {/* Product Image Cover */}
      <div className="relative aspect-[3/4] w-full bg-cm-soft overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cm-muted font-display text-2xl font-bold bg-cm-soft">
            {product.name?.[0] || "C"}
          </div>
        )}

        {/* Listing Type & Image Count Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
          <span
            className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider shadow-xs ${
              listingType === "BOTH"
                ? "bg-purple-900 text-white"
                : listingType === "RESELL"
                ? "bg-emerald-900 text-white"
                : "bg-cm-black text-white"
            }`}
          >
            {listingType === "BOTH" ? "Rent & Buy" : listingType === "RESELL" ? "For Resale" : "For Rent"}
          </span>
          {product.condition && listingType !== "RENT" && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-medium bg-white/90 text-slate-800 shadow-xs">
              {product.condition}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-3xs font-semibold text-white backdrop-blur-xs">
            <Images size={11} />
            <span>{images.length}</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          {product.category && (
            <p className="text-2xs font-bold uppercase tracking-wider text-cm-muted">
              {product.category}
            </p>
          )}
          <h3 className="font-semibold text-sm text-cm-black line-clamp-1 group-hover:text-cm-red transition-colors">
            {product.name}
          </h3>

          {/* Pricing based on Listing Type */}
          <div className="pt-0.5">
            {listingType === "BOTH" ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-bold text-sm text-cm-black">
                  ₹{rentPrice.toLocaleString("en-IN")}<span className="text-3xs font-normal text-cm-muted">/day</span>
                </span>
                <span className="text-2xs font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  Buy ₹{sellPrice.toLocaleString("en-IN")}
                </span>
              </div>
            ) : listingType === "RESELL" ? (
              <p className="font-bold text-base text-cm-black">
                ₹{sellPrice.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-cm-muted ml-1.5">(Selling Price)</span>
              </p>
            ) : (
              <p className="font-bold text-base text-cm-black">
                ₹{rentPrice.toLocaleString("en-IN")}<span className="text-xs font-normal text-cm-muted">/day</span>
              </p>
            )}
          </div>
        </div>

        {/* Availability & Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-cm-border/60">
          <div className="flex items-center gap-1.5 text-2xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-red-500"}`}
            />
            <span className={isAvailable ? "text-emerald-700" : "text-cm-muted"}>
              {isAvailable ? "Available" : "Currently Unavailable"}
            </span>
          </div>

          {/* Primary Action Button(s) */}
          {listingType === "BOTH" ? (
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRent ? onRent(product) : onSelect?.(product);
                }}
                disabled={!isAvailable}
                className="w-full py-2 px-1 rounded-xl bg-cm-black text-white text-3xs font-bold uppercase tracking-wider hover:bg-cm-red disabled:opacity-50 transition-colors text-center"
              >
                Rent Outfit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy ? onBuy(product) : onSelect?.(product);
                }}
                disabled={!isAvailable}
                className="w-full py-2 px-1 rounded-xl bg-emerald-700 text-white text-3xs font-bold uppercase tracking-wider hover:bg-emerald-800 disabled:opacity-50 transition-colors text-center"
              >
                Buy Outfit
              </button>
            </div>
          ) : listingType === "RESELL" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBuy ? onBuy(product) : onSelect?.(product);
              }}
              disabled={!isAvailable}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Buy This Outfit
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRent ? onRent(product) : onSelect?.(product);
              }}
              disabled={!isAvailable}
              className="w-full py-2.5 px-3 rounded-xl bg-cm-black text-white text-xs font-bold uppercase tracking-wider hover:bg-cm-red disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Rent This Outfit
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
