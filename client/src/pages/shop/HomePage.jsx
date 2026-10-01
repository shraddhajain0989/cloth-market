import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowDown } from "lucide-react";
import { productApi, rentalApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import ProductCard from "../../components/product/ProductCard";
import RentalModal from "../../components/product/RentalModal";

const CATEGORY_CHIPS = [
  "All",
  "Women",
  "Men",
  "Ethnic",
  "Western",
  "Formal",
  "Party",
  "Festive"
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active query parameters
  const activeCategory = searchParams.get("category") || "All";
  const activeSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [sortBy, setSortBy] = useState("featured");
  const [selectedSize, setSelectedSize] = useState("all");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentalProduct, setRentalProduct] = useState(null);
  const [renting, setRenting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync search input with URL search param
  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
  }, [searchParams]);

  // Load products from API
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await productApi.list();
        const list = res.data?.data?.items || res.data?.data || [];
        setProducts(list);
      } catch {
        setErrorMessage("Failed to load catalog. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Search filter
      if (searchInput.trim()) {
        const q = searchInput.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesDesc) return false;
      }

      // 2. Category chip filter
      if (activeCategory && activeCategory !== "All") {
        const cat = activeCategory.toLowerCase();
        if (cat === "women") {
          const isWomen = item.gender?.toLowerCase() === "women" || item.category?.toLowerCase().includes("women");
          if (!isWomen) return false;
        } else if (cat === "men") {
          const isMen = item.gender?.toLowerCase() === "men" || item.category?.toLowerCase().includes("men");
          if (!isMen) return false;
        } else {
          const matchCat = item.category?.toLowerCase().includes(cat);
          const matchTags = item.tags?.some((t) => t.toLowerCase().includes(cat));
          const matchName = item.name?.toLowerCase().includes(cat);
          if (!matchCat && !matchTags && !matchName) return false;
        }
      }

      // 3. Size filter
      if (selectedSize !== "all") {
        const hasSize = item.sizeVariants?.some((v) => v.size === selectedSize && v.stock > 0)
          || item.sizes?.includes(selectedSize);
        if (!hasSize) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = a.rentPrice || a.price || 0;
      const priceB = b.rentPrice || b.price || 0;
      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      return 0; // featured/default
    });
  }, [products, searchInput, activeCategory, selectedSize, sortBy]);

  function handleCategoryClick(cat) {
    if (cat === "All") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat);
    }
    setSearchParams(searchParams);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (searchInput.trim()) {
      searchParams.set("search", searchInput.trim());
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams);
  }

  function handleClearFilters() {
    setSearchInput("");
    setSelectedSize("all");
    setSortBy("featured");
    setSearchParams({});
  }

  // Handle Rental submission
  async function handleRental(payload) {
    if (!user) {
      navigate("/login");
      return;
    }
    setRenting(true);
    try {
      await rentalApi.create(payload);
      setRentalProduct(null);
      navigate("/profile");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to process rental booking.");
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setRenting(false);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Alert */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* 1. Short Hero Section */}
      <section className="bg-cm-soft/60 border-b border-cm-border py-10 sm:py-14 text-center">
        <div className="w-full max-w-2xl mx-auto space-y-4 px-4 sm:px-6">
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-cm-black break-words max-w-full">
            Rent the look you love.
          </h1>
          <p className="text-sm sm:text-base text-cm-muted leading-relaxed">
            Designer & occasion wear, available for simple, flexible rentals.
          </p>
          <div className="pt-2">
            <a
              href="#catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cm-black text-white text-xs font-bold uppercase tracking-wider hover:bg-cm-red transition-colors shadow-sm"
            >
              <span>Explore Rentals</span>
              <ArrowDown size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Search & Filter Bar */}
      <section id="catalog" className="w-full max-w-7xl mx-auto space-y-4 px-4 sm:px-6 lg:px-8 pt-2">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cm-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search clothes, categories..."
            className="w-full pl-11 pr-24 py-3 rounded-full border border-cm-border bg-white text-sm text-cm-black placeholder:text-cm-muted focus:border-cm-black focus:ring-0 transition-colors shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-cm-black text-white text-xs font-bold hover:bg-cm-red transition-colors"
          >
            Search
          </button>
        </form>

        {/* 3. Category Chips */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_CHIPS.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? "bg-cm-black text-white shadow-sm"
                    : "bg-white border border-cm-border text-cm-muted hover:text-cm-black hover:border-cm-black"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Secondary controls: Count + Sort + Size */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-cm-muted border-t border-cm-border/60">
          <span>
            Showing <strong className="text-cm-black">{filteredProducts.length}</strong> rental items
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Size filter */}
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-cm-border bg-white text-2xs font-semibold text-cm-black focus:ring-0"
              aria-label="Filter by size"
            >
              <option value="all">All Sizes</option>
              {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((s) => (
                <option key={s} value={s}>
                  Size {s}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-cm-border bg-white text-2xs font-semibold text-cm-black focus:ring-0"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* 4. Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-cm-border overflow-hidden">
                <div className="aspect-[3/4] bg-cm-soft" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 bg-cm-soft rounded" />
                  <div className="h-4 w-3/4 bg-cm-soft rounded" />
                  <div className="h-4 w-1/2 bg-cm-soft rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-cm-border p-8 space-y-3">
            <p className="text-base font-bold text-cm-black">No clothing items match your selection</p>
            <p className="text-xs text-cm-muted">Try clearing your search query or picking another category.</p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-full bg-cm-black text-white text-xs font-bold hover:bg-cm-red transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pt-2">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                onRent={setRentalProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Clean Rental Booking Modal */}
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
