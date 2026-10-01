export default function ProductCard({ product, onRent }) {
  const dailyRate = product.rentPrice || product.price || 0;
  const isAvailable = product.available !== false && (product.stock === undefined || product.stock > 0);

  return (
    <article className="group flex flex-col h-full bg-white rounded-2xl border border-cm-border overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Product Image */}
      <div className="relative aspect-[3/4] w-full bg-cm-soft overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cm-muted font-display text-2xl font-bold bg-cm-soft">
            {product.name?.[0] || "C"}
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
          <p className="font-bold text-base text-cm-black">
            ₹{dailyRate.toLocaleString("en-IN")}<span className="text-xs font-normal text-cm-muted">/day</span>
          </p>
        </div>

        {/* Availability & Rent Action */}
        <div className="space-y-2 pt-1 border-t border-cm-border/60">
          <div className="flex items-center gap-1.5 text-2xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-red-500"}`}
            />
            <span className={isAvailable ? "text-emerald-700" : "text-cm-muted"}>
              {isAvailable ? "Available" : "Currently Booked"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onRent?.(product)}
            disabled={!isAvailable}
            className="w-full py-2.5 px-3 rounded-xl bg-cm-black text-white text-xs font-bold uppercase tracking-wider hover:bg-cm-red disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Rent Now
          </button>
        </div>
      </div>
    </article>
  );
}
