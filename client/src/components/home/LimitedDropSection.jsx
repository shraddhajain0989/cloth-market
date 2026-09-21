import { Flame, Clock, ShoppingBag } from "lucide-react";
import Badge from "../common/Badge";

export default function LimitedDropSection({ products = [], onCart, onRent }) {
  // Filter products that have stock <= 10 or flash sale
  const limitedItems = products.filter((p) => p.stock > 0 && p.stock <= 10).slice(0, 3);

  // Fallback demo items if backend has no low-stock products
  const displayItems = limitedItems.length > 0 ? limitedItems : [
    {
      id: "drop-1",
      name: "Cyberpunk Oversized Acid Hoodie",
      category: "Streetwear",
      price: 2499,
      flashSalePrice: 1899,
      rentPrice: 349,
      stock: 3,
      badge: "LIMITED DROP",
      images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop"]
    },
    {
      id: "drop-2",
      name: "Embroidered Velvet Sherwani Set",
      category: "Ethnic",
      price: 6999,
      flashSalePrice: 4999,
      rentPrice: 899,
      stock: 2,
      badge: "STUDENT FAVORITE",
      images: ["https://images.unsplash.com/photo-1597983073493-88cd35cf03b0?q=80&w=800&auto=format&fit=crop"]
    }
  ];

  return (
    <section className="cm-section bg-cm-black text-white relative overflow-hidden">
      {/* Red Ambient Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cm-red/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="cm-container relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.25em] font-bold text-cm-red bg-cm-red/15 px-3.5 py-1 rounded-full border border-cm-red/30">
              <Flame size={13} /> EXCLUSIVE DROPS
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Limited Edition & Flash Stock
            </h2>
            <p className="text-cm-muted text-sm sm:text-base leading-relaxed">
              Once sold out, these high-demand items won't restock until next season. Grab your size before it's gone.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cm-red bg-white/5 border border-white/10 px-4 py-2 rounded-full self-start md:self-auto">
            <Clock size={15} />
            <span>Refreshes Weekly</span>
          </div>
        </div>

        {/* Grid of Limited Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayItems.map((item) => (
            <div
              key={item.id || item._id}
              className="group bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-center hover:border-cm-red/50 transition-all duration-300 shadow-2xl"
            >
              {/* Product Image */}
              <div className="relative w-full sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden bg-cm-black shrink-0">
                <img
                  src={item.images?.[0]}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="limited">ONLY {item.stock} LEFT</Badge>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1 space-y-3 text-left w-full">
                <span className="text-2xs font-bold uppercase tracking-widest text-cm-red">{item.category}</span>
                <h3 className="font-display text-xl font-bold tracking-tight text-white group-hover:text-cm-red transition-colors line-clamp-2">
                  {item.name}
                </h3>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-2xl font-bold text-cm-red">
                    ₹{(item.flashSalePrice || item.price)?.toLocaleString("en-IN")}
                  </span>
                  {item.flashSalePrice && (
                    <span className="text-sm text-cm-muted line-through">
                      ₹{item.price?.toLocaleString("en-IN")}
                    </span>
                  )}
                  {item.rentPrice > 0 && (
                    <span className="text-xs text-white/70">
                      or Rent ₹{item.rentPrice}/day
                    </span>
                  )}
                </div>

                {/* Stock Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-2xs font-semibold text-cm-muted">
                    <span>Stock status</span>
                    <span className="text-cm-red font-bold">{item.stock} pieces remaining</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cm-red rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (item.stock / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    onClick={() => onCart?.(item.id || item._id)}
                    className="btn btn-red text-xs py-2.5 px-5 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} />
                    <span>Claim Item</span>
                  </button>
                  {item.rentPrice > 0 && (
                    <button
                      onClick={() => onRent?.(item)}
                      className="btn btn-secondary text-xs py-2.5 px-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-cm-black"
                    >
                      Rent
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
