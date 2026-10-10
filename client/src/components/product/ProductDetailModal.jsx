import { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Calendar,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Tag
} from "lucide-react";
import { configApi, paymentApi, rentalApi } from "../../api/endpoints";

export default function ProductDetailModal({
  product,
  open,
  onClose,
  initialMode = "rent" // 'rent' | 'buy'
}) {
  if (!open || !product) return null;

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const listingType = product.listingType || "RENT"; // 'RENT' | 'RESELL' | 'BOTH'
  
  // Transaction mode: 'rent' or 'buy'
  const defaultMode = listingType === "RESELL" ? "buy" : initialMode === "buy" && listingType === "BOTH" ? "buy" : "rent";
  const [mode, setMode] = useState(defaultMode);

  // Business config (WhatsApp number & QR)
  const [businessConfig, setBusinessConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    configApi
      .getPublic()
      .then((res) => {
        setBusinessConfig(res.data?.data || {});
        setConfigLoaded(true);
      })
      .catch(() => {
        setConfigLoaded(true);
      });
  }, []);

  // Available sizes
  const sizeVariants = product.sizeVariants || [];
  const availableSizes = sizeVariants.length > 0
    ? sizeVariants.filter((v) => v.stock > 0 && v.available !== false).map((v) => v.size)
    : product.sizes?.length
    ? product.sizes
    : ["S", "M", "L", "XL"];

  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || "M");
  const [quantity, setQuantity] = useState(1);

  // Rental date state (tomorrow to 4 days later by default)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split("T")[0];
  const future = new Date(tomorrow);
  future.setDate(future.getDate() + 3);
  const defaultEnd = future.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [whatsappNotice, setWhatsappNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionRef, setSessionRef] = useState("");

  // Reset session reference when switching products
  useEffect(() => {
    setSessionRef("");
  }, [product?.id, product?._id]);

  // Check rental availability when size or dates change
  useEffect(() => {
    if (mode !== "rent") return;
    const prodId = product.id || product._id;
    if (!prodId || !selectedSize || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setErrorMsg("Return date must be after pickup date.");
      setAvailability(null);
      return;
    }

    setErrorMsg("");
    setCheckingAvailability(true);
    rentalApi
      .checkAvailability({
        productId: prodId,
        size: selectedSize,
        pickupDate: startDate,
        returnDate: endDate
      })
      .then((res) => {
        setAvailability(res.data?.data || null);
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || "Failed to check date availability.");
        setAvailability(null);
      })
      .finally(() => {
        setCheckingAvailability(false);
      });
  }, [product, selectedSize, startDate, endDate, mode]);

  // Duration & Pricing Calculations
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = !isNaN(start) && !isNaN(end) && end > start
    ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    : 1;

  const rentDaily = Number(product.rentPrice) || 0;
  const totalRentalAmount = durationDays * rentDaily;

  const sellPrice = Number(product.price) || 0;
  const totalBuyAmount = sellPrice * quantity;

  // Selected variant stock
  const currentVariant = sizeVariants.find((v) => v.size === selectedSize);
  const availableStock = currentVariant ? currentVariant.stock : product.stock || 1;

  // Next / Prev image navigation
  function handlePrevImage() {
    setActiveImageIndex((curr) => (curr === 0 ? images.length - 1 : curr - 1));
  }

  function handleNextImage() {
    setActiveImageIndex((curr) => (curr === images.length - 1 ? 0 : curr + 1));
  }

  // Generate WhatsApp Redirection
  async function handleWhatsAppSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const rawPhone = businessConfig?.whatsappNumber || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

    if (!cleanPhone) {
      setErrorMsg(
        "Business WhatsApp number is not yet configured. Please contact the administrator to set the business WhatsApp number in Admin Settings."
      );
      return;
    }

    if (product.available === false) {
      setErrorMsg("This outfit is currently unavailable.");
      return;
    }

    if (!selectedSize) {
      setErrorMsg("Please select a clothing size.");
      return;
    }

    const prodId = product.id || product._id;
    const refCode = sessionRef || `CM-${mode.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (!sessionRef) setSessionRef(refCode);
    let messageText = "";

    if (mode === "rent") {
      if (!startDate || !endDate || isNaN(start.getTime()) || isNaN(end.getTime())) {
        setErrorMsg("Please select valid rental start and return dates.");
        return;
      }

      if (end <= start) {
        setErrorMsg("Return date must be after pickup date.");
        return;
      }

      if (availability && !availability.available) {
        setErrorMsg("This outfit is fully booked for the selected dates. Please choose different dates or size.");
        return;
      }

      messageText =
`Hello Cloth Market! I would like to rent this outfit:

*Outfit:* ${product.name}
*Product ID:* ${prodId}
*Size:* ${selectedSize}
*Rental Dates:* ${startDate} to ${endDate} (${durationDays} days)
*Total Rental Price:* ₹${totalRentalAmount.toLocaleString("en-IN")}
*Reference:* ${refCode}

Please confirm availability and share payment instructions.`;

      // Log payment tracking record as customer enquiry initiation
      setSubmitting(true);
      try {
        await paymentApi.create({
          customerReference: refCode,
          productId: prodId,
          productName: product.name,
          transactionType: "RENT",
          size: selectedSize,
          rentalStartDate: startDate,
          rentalEndDate: endDate,
          rentalDuration: durationDays,
          expectedAmount: totalRentalAmount,
          totalAmount: totalRentalAmount,
          advanceAmount: 0,
          remainingAmount: 0,
          status: "Enquiry Initiated"
        });
      } catch (err) {
        console.warn("Payment tracking record log notice:", err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      // mode === 'buy' (Resale)
      if (availableStock <= 0) {
        setErrorMsg(`Size ${selectedSize} is currently out of stock.`);
        return;
      }

      if (quantity > availableStock) {
        setErrorMsg(`Only ${availableStock} unit(s) available in size ${selectedSize}.`);
        return;
      }

      messageText =
`Hello Cloth Market! I would like to purchase this outfit:

*Outfit:* ${product.name}
*Reference:* ${refCode}
*Product ID:* ${prodId}
*Condition:* ${product.condition || "Like new"}
*Size:* ${selectedSize}
*Quantity:* ${quantity}
*Total Purchase Price:* ₹${totalBuyAmount.toLocaleString("en-IN")}

Please confirm availability and share the payment QR code and payment instructions.`;

      // Log payment tracking record as customer enquiry initiation
      setSubmitting(true);
      try {
        await paymentApi.create({
          customerReference: refCode,
          productId: prodId,
          productName: product.name,
          transactionType: "BUY",
          size: selectedSize,
          quantity,
          expectedAmount: totalBuyAmount,
          totalAmount: totalBuyAmount,
          status: "Enquiry Initiated"
        });
      } catch (err) {
        console.warn("Payment tracking record log notice:", err.message);
      } finally {
        setSubmitting(false);
      }
    }

    // Build URL and open WhatsApp
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    setWhatsappNotice(true);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-cm-border shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-cm-black shadow-md hover:bg-cm-black hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* ── LEFT: PROFESSIONAL IMAGE GALLERY (UP TO 5 IMAGES) ───────────────── */}
        <div className="w-full md:w-1/2 bg-cm-soft/40 p-4 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-cm-border">
          {/* Main Large Image */}
          <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
            <img
              src={images[activeImageIndex]}
              alt={`${product.name} - view ${activeImageIndex + 1}`}
              className="h-full w-full object-cover object-center transition-all duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop";
              }}
            />

            {/* Badges on main image */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              <span className="px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-cm-black text-white shadow-xs">
                {listingType === "BOTH" ? "Rent or Buy" : listingType === "RESELL" ? "For Resale" : "For Rent"}
              </span>
              {product.condition && listingType !== "RENT" && (
                <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-white/90 text-slate-800 shadow-xs">
                  {product.condition}
                </span>
              )}
            </div>

            {/* Prev / Next buttons if multiple images */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md hover:bg-white transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md hover:bg-white transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-3xs font-semibold text-white backdrop-blur-xs">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2 overflow-x-auto py-1">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-14 w-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-cm-black ring-2 ring-cm-black/20 scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: PRODUCT DETAILS & TRANSACTION ACTION ────────────────────── */}
        <div className="w-full md:w-1/2 p-5 sm:p-7 overflow-y-auto flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header info */}
            <div className="space-y-1.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-cm-muted">
                {product.category || "Designer Wear"}
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-cm-black leading-tight">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-xs text-cm-muted line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Mode Selector if product is BOTH */}
            {listingType === "BOTH" && (
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode("rent")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === "rent"
                      ? "bg-white text-cm-black shadow-xs"
                      : "text-slate-600 hover:text-cm-black"
                  }`}
                >
                  Rent Outfit (₹{rentDaily}/day)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("buy")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === "buy"
                      ? "bg-white text-cm-black shadow-xs"
                      : "text-slate-600 hover:text-cm-black"
                  }`}
                >
                  Buy Outfit (₹{sellPrice})
                </button>
              </div>
            )}

            {/* Price display */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
                  {mode === "rent" ? "Rental Daily Rate" : "Selling Price"}
                </span>
                <span className="text-2xl font-display font-bold text-cm-black">
                  ₹{(mode === "rent" ? rentDaily : sellPrice).toLocaleString("en-IN")}
                  {mode === "rent" && <span className="text-xs font-normal text-cm-muted"> / day</span>}
                </span>
              </div>
              
            </div>

            {/* Form */}
            <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
              {/* Size Selector */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center text-2xs font-bold uppercase tracking-wider text-cm-black">
                  <span>Select Size</span>
                  <span className="text-cm-muted font-normal">
                    {availableStock} unit(s) available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-10 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "border-cm-black bg-cm-black text-white shadow-xs"
                            : "border-cm-border bg-white text-cm-black hover:border-slate-400"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RENT: Dates & Duration */}
              {mode === "rent" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-3xs font-bold uppercase tracking-wider text-cm-muted block">
                        Pickup Date
                      </label>
                      <input
                        type="date"
                        min={tomorrow.toISOString().split("T")[0]}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border font-medium focus:border-cm-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-3xs font-bold uppercase tracking-wider text-cm-muted block">
                        Return Date
                      </label>
                      <input
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border font-medium focus:border-cm-black"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>{durationDays} days × ₹{rentDaily.toLocaleString("en-IN")}</span>
                      <span className="font-semibold text-cm-black">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline font-bold">
                      <span className="text-xs uppercase text-slate-500">Total Rental</span>
                      <span className="text-sm text-cm-black">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* RESELL: Quantity */
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-semibold text-cm-black">Quantity</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="h-7 w-7 rounded-lg border border-cm-border bg-white text-xs font-bold disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                        disabled={quantity >= availableStock}
                        className="h-7 w-7 rounded-lg border border-cm-border bg-white text-xs font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Purchase ({quantity} item)</span>
                      <span className="text-base font-bold text-cm-black">₹{totalBuyAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* WhatsApp Redirection Button */}
              <button
                type="submit"
                disabled={
                  submitting ||
                  product.available === false ||
                  (mode === "rent" && availability && !availability.available) ||
                  (mode === "buy" && availableStock <= 0)
                }
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <MessageCircle size={16} />
                <span>
                  {product.available === false
                    ? "Currently Unavailable"
                    : mode === "rent"
                    ? "Rent Now"
                    : availableStock <= 0
                    ? "Out of Stock"
                    : "Buy Now"}
                </span>
              </button>

              <p className="text-center text-3xs text-cm-muted leading-relaxed">
                Opens WhatsApp with prefilled order details. You will send the message manually, and the administrator will share payment instructions.
              </p>
            </form>
          </div>

          {/* WhatsApp Sent Notice */}
          {whatsappNotice && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Check size={14} className="text-emerald-700" /> WhatsApp Opened
              </p>
              <p className="text-2xs">
                Please click <strong>Send</strong> in WhatsApp. The administrator will reply to confirm your reservation and share the payment QR code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
