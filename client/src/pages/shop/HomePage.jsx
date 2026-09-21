import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { orderApi, productApi, rentalApi, userApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";

// Components
import HeroSection from "../../components/home/HeroSection";
import TrustStrip from "../../components/home/TrustStrip";
import CategoryScroll from "../../components/home/CategoryScroll";
import SeasonalSection from "../../components/home/SeasonalSection";
import NewCollectionSection from "../../components/home/NewCollectionSection";
import LimitedDropSection from "../../components/home/LimitedDropSection";
import TrendingGrid from "../../components/home/TrendingGrid";
import AIStylistTeaser from "../../components/home/AIStylistTeaser";
import RentalSection from "../../components/home/RentalSection";
import CreatorLookbook from "../../components/home/CreatorLookbook";
import RentalModal from "../../components/product/RentalModal";
import ProductFilters from "../../components/product/ProductFilters";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    sort: searchParams.get("sort") || "featured",
    budget: ""
  });

  const [catalog, setCatalog] = useState({ items: [], facets: { categories: [] } });
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Rental modal state
  const [rentalProduct, setRentalProduct] = useState(null);
  const [renting, setRenting] = useState(false);

  // Sync URL search params
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category") || "";
    const searchFromUrl = searchParams.get("search") || "";
    if (categoryFromUrl !== filters.category || searchFromUrl !== filters.search) {
      setFilters((curr) => ({ ...curr, category: categoryFromUrl, search: searchFromUrl }));
    }
  }, [searchParams]);

  // Load products & user profile
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [productsResponse, profileResponse] = await Promise.allSettled([
        productApi.list({ search: filters.search, category: filters.category, sort: filters.sort }),
        user ? userApi.me() : Promise.resolve(null)
      ]);

      if (productsResponse.status === "fulfilled") {
        setCatalog(productsResponse.value.data.data);
      }
      if (profileResponse.status === "fulfilled" && profileResponse.value) {
        setProfile(profileResponse.value.data.data);
      }
      setLoading(false);
    }

    load();
  }, [filters.category, filters.search, filters.sort, user]);

  // Visible products filter
  const visibleProducts = useMemo(() => {
    const budget = Number(filters.budget || 0);
    if (!budget) return catalog.items;
    return catalog.items.filter((item) => item.price <= budget);
  }, [catalog.items, filters.budget]);

  // Handler: Category Select
  function handleCategorySelect(categoryName) {
    setFilters((prev) => ({ ...prev, category: categoryName }));
    if (categoryName) {
      setSearchParams({ category: categoryName });
    } else {
      setSearchParams({});
    }
  }

  // Handler: Wishlist Sync
  async function handleWishlist(productId) {
    if (!user) return setMessage("Please login to sync your wishlist across devices.");
    try {
      const { data } = await userApi.toggleWishlist(productId);
      setProfile((current) => ({ ...current, wishlist: data.data }));
      setMessage("Wishlist updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to update wishlist.");
    }
  }

  // Handler: Add to Cart
  async function handleCart(productId) {
    if (!user) return setMessage("Please login to add items to your cart.");
    try {
      await orderApi.addToCart({ productId: productId || catalog.items[0]?.id, quantity: 1 });
      setMessage("Item added to your shopping cart!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to add item to cart.");
    }
  }

  // Handler: Rental Booking
  async function handleRental(payload) {
    setRenting(true);
    try {
      await rentalApi.create(payload);
      setMessage("Rental booked successfully! Check your profile for tracking.");
      setRentalProduct(null);
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setMessage("Failed to process rental booking.");
    } finally {
      setRenting(false);
    }
  }

  return (
    <div className="space-y-0">
      {/* Toast Notification Banner */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 bg-cm-black text-white px-5 py-3 rounded-full shadow-2xl text-sm font-semibold flex items-center gap-2 border border-white/20 animate-fade-up">
          <span>✨</span>
          <span>{message}</span>
        </div>
      )}

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Trust Strip */}
      <TrustStrip />

      {/* 3. Category Circles */}
      <CategoryScroll
        selectedCategory={filters.category}
        onSelectCategory={handleCategorySelect}
      />

      {/* 4. Seasonal Section */}
      <SeasonalSection
        onSelectCategory={handleCategorySelect}
      />

      {/* Product Filters Bar (Search & Sort) */}
      <div className="bg-cm-soft py-6 border-b border-cm-border">
        <div className="cm-container">
          <ProductFilters
            filters={filters}
            categories={catalog.facets.categories || []}
            onChange={(event) =>
              setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
            }
          />
        </div>
      </div>

      {/* 5. New Collection Grid */}
      <NewCollectionSection
        products={visibleProducts}
        loading={loading}
        profileWishlist={profile?.wishlist || []}
        onWishlist={handleWishlist}
        onCart={handleCart}
        onRent={setRentalProduct}
        onQuickView={(p) => setRentalProduct(p)}
      />

      {/* 6. Limited Drop & Urgency */}
      <LimitedDropSection
        products={catalog.items}
        onCart={handleCart}
        onRent={setRentalProduct}
      />

      {/* 7. Trending Pinterest Moodboard */}
      <TrendingGrid />

      {/* 8. AI Stylist Feature Teaser */}
      <AIStylistTeaser />

      {/* 9. Circular Rental Section */}
      <RentalSection
        onSelectRental={() => handleCategorySelect("Rental")}
      />

      {/* 10. Creator Lookbook */}
      <CreatorLookbook
        onCart={handleCart}
      />

      {/* Rental Booking Modal */}
      <RentalModal
        product={rentalProduct}
        open={Boolean(rentalProduct)}
        onClose={() => setRentalProduct(null)}
        onSubmit={handleRental}
        loading={renting}
      />
    </div>
  );
}
