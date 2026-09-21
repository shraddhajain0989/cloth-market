import ProductCard from "../product/ProductCard";
import SkeletonCard from "../common/SkeletonCard";
import SectionHeader from "../common/SectionHeader";

export default function NewCollectionSection({
  products = [],
  loading = false,
  profileWishlist = [],
  onWishlist,
  onCart,
  onRent,
  onQuickView
}) {
  return (
    <section className="cm-section bg-white border-b border-cm-border">
      <div className="cm-container">
        <SectionHeader
          eyebrow="FRESH DROPS"
          title="New Collection & Runway Arrivals"
          description="Straight from high-street studios and designer lookbooks. Every piece comes with purchase & flexi-rental options."
          actionText="View All Products"
          actionLink="/"
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-cm-soft rounded-3xl border border-cm-border">
            <p className="text-cm-muted text-sm font-medium">No fresh drops matching current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isWishlisted={profileWishlist.includes(product.id || product._id)}
                onWishlist={onWishlist}
                onCart={onCart}
                onRent={onRent}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
