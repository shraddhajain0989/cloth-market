import { useState } from "react";
import { Heart, ShoppingBag, RefreshCw, Eye, Star } from "lucide-react";
import Badge from "../common/Badge";

export default function ProductCard({
  product,
  onWishlist,
  onCart,
  onRent,
  onQuickView,
  isWishlisted
}) {
  const [hovered, setHovered] = useState(false);

  // Price calculations
  const hasFlashSale = Boolean(product.flashSalePrice);
  const displayPrice = hasFlashSale ? product.flashSalePrice : product.price;
  const originalPrice = hasFlashSale ? product.price : null;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group cm-card flex flex-col h-full bg-white relative overflow-hidden transition-all duration-300"
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] w-full bg-cm-soft overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-spring group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cm-muted font-display text-2xl font-bold bg-cm-soft">
            {product.name?.[0]}
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
          {product.badge && (
            <Badge variant={product.badge?.toLowerCase().includes("sale") ? "sale" : "new"}>
              {product.badge}
            </Badge>
          )}
          {hasFlashSale && (
            <span className="badge badge-sale">
              FLASH SALE
            </span>
          )}
          {isLowStock && (
            <span className="badge badge-limited animate-pulse">
              ONLY {product.stock} LEFT
            </span>
          )}
        </div>

        {/* Wishlist Button (Top Right) */}
        <button
          type="button"
          onClick={() => onWishlist?.(product.id || product._id)}
          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
            isWishlisted
              ? "bg-cm-red text-white shadow-lg scale-110"
              : "bg-white/80 text-cm-black hover:bg-white hover:scale-110"
          }`}
          aria-label="Wishlist"
        >
          <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
        </button>

        {/* Hover Quick Actions Bar (Slide up on hover) */}
        <div
          className={`absolute inset-x-3 bottom-3 z-10 flex items-center justify-center gap-2 transition-all duration-300 transform ${
            hovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => onCart?.(product.id || product._id)}
            className="flex-1 bg-cm-black text-white py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-cm-red transition-colors shadow-lg"
          >
            <ShoppingBag size={14} />
            <span>Add to Cart</span>
          </button>

          {product.rentPrice > 0 && (
            <button
              type="button"
              onClick={() => onRent?.(product)}
              className="bg-white text-cm-black py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1 hover:bg-cm-soft transition-colors shadow-lg border border-cm-border"
              title="Rent this item"
            >
              <RefreshCw size={13} />
              <span>Rent</span>
            </button>
          )}

          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="w-9 h-9 bg-white text-cm-black rounded-full flex items-center justify-center hover:bg-cm-soft transition-colors shadow-lg border border-cm-border shrink-0"
              title="Quick View"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-2xs text-cm-muted uppercase font-bold tracking-wider mb-1">
            <span>{product.category}</span>
            {product.rating > 0 && (
              <span className="flex items-center gap-1 text-cm-black font-semibold">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {product.rating}
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-sm text-cm-black tracking-tight line-clamp-1 group-hover:text-cm-red transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Pricing & Stock */}
        <div className="flex items-end justify-between pt-2 border-t border-cm-border/60">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`font-bold text-base ${hasFlashSale ? "text-cm-red" : "text-cm-black"}`}>
                ₹{displayPrice?.toLocaleString("en-IN")}
              </span>
              {originalPrice && (
                <span className="text-xs text-cm-muted line-through">
                  ₹{originalPrice?.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {product.rentPrice > 0 && (
              <p className="text-2xs text-cm-muted font-medium">
                Rent from <span className="text-cm-black font-bold">₹{product.rentPrice}/day</span>
              </p>
            )}
          </div>

          <span className={`text-2xs font-bold uppercase tracking-wider ${product.stock > 0 ? "text-emerald-600" : "text-cm-red"}`}>
            {product.stock > 0 ? "In Stock" : "Sold Out"}
          </span>
        </div>
      </div>
    </article>
  );
}
