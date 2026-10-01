import { useState, useEffect } from "react";
import { X, Calendar, Check, AlertCircle, ShieldCheck } from "lucide-react";
import { rentalApi } from "../../api/endpoints";

export default function RentalModal({ product, open, onClose, onSubmit, loading }) {
  if (!open || !product) return null;

  // Available sizes
  const availableSizes = product.sizeVariants?.length
    ? product.sizeVariants.filter((v) => v.stock > 0 && v.available !== false).map((v) => v.size)
    : product.sizes?.length
    ? product.sizes
    : ["S", "M", "L", "XL"];

  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || "M");
  
  // Default dates: tomorrow to 4 days later (3 days rental)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split("T")[0];

  const future = new Date(tomorrow);
  future.setDate(future.getDate() + 3);
  const defaultEnd = future.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Live availability check whenever size or dates change
  useEffect(() => {
    if (!product?.id && !product?._id) return;
    const prodId = product.id || product._id;
    if (!selectedSize || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setErrorMsg("Return date must be at least 1 day after start date.");
      setAvailability(null);
      return;
    }

    setErrorMsg("");
    setChecking(true);
    rentalApi
      .checkAvailability({
        productId: prodId,
        size: selectedSize,
        pickupDate: startDate,
        returnDate: endDate
      })
      .then((res) => {
        setAvailability(res.data.data);
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || "Failed to check availability.");
        setAvailability(null);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [product, selectedSize, startDate, endDate]);

  // Pricing calculations
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = !isNaN(start) && !isNaN(end) && end > start
    ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    : 1;

  const dailyRate = product.rentPrice || 0;
  const totalRentalAmount = durationDays * dailyRate;
  const advanceAmount = 50; // INCLUDED in total rental amount
  const remainingAtHandover = Math.max(0, totalRentalAmount - advanceAmount);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSize) {
      setErrorMsg("Please select a size.");
      return;
    }
    if (availability && !availability.available) {
      setErrorMsg("This size is fully booked for the selected dates. Please adjust dates or size.");
      return;
    }

    onSubmit({
      productId: product.id || product._id,
      size: selectedSize,
      pickupDate: startDate,
      returnDate: endDate
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-cm-border my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-cm-border">
          <div className="flex items-center gap-3">
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-14 h-14 object-cover rounded-2xl border border-cm-border"
              />
            )}
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-cm-muted">Cloth Rental</p>
              <h3 className="font-display text-lg font-bold text-cm-black line-clamp-1">{product.name}</h3>
              <p className="text-xs text-cm-muted font-medium">₹{dailyRate} / day</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-cm-soft text-cm-muted hover:text-cm-black transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 text-cm-red text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Size Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Select Size</label>
              <span className="text-2xs text-cm-muted font-medium">Mandatory</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const variant = product.sizeVariants?.find((v) => v.size === size);
                const stock = variant ? variant.stock : product.stock;
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "border-cm-black bg-cm-black text-white shadow-md scale-105"
                        : "border-cm-border bg-white text-cm-black hover:border-cm-black"
                    }`}
                  >
                    <span>{size}</span>
                    {stock !== undefined && (
                      <span className={`text-2xs opacity-75 font-normal ${isSelected ? "text-white" : "text-cm-muted"}`}>
                        ({stock})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rental Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black flex items-center gap-1">
                <Calendar size={12} />
                <span>Rental Start Date</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-medium"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black flex items-center gap-1">
                <Calendar size={12} />
                <span>Return Date</span>
              </label>
              <input
                type="date"
                min={startDate || todayStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-medium"
              />
            </div>
          </div>

          {/* Date-Aware Availability Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-cm-soft border border-cm-border text-xs">
            <span className="text-cm-muted">
              Period: <strong className="text-cm-black">{durationDays} day(s)</strong> ({startDate} → {endDate})
            </span>
            {checking ? (
              <span className="text-cm-muted text-2xs animate-pulse font-semibold">Checking availability...</span>
            ) : availability?.available ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check size={14} /> Available ({availability.availableUnits} left)
              </span>
            ) : (
              <span className="text-cm-red font-bold flex items-center gap-1">
                <AlertCircle size={14} /> Fully Booked
              </span>
            )}
          </div>

          {/* Explicit Rental Summary as specified in Part 12, 14, 42 */}
          <div className="rounded-3xl border border-cm-border bg-white p-4 space-y-2.5 text-xs">
            <p className="text-2xs font-bold uppercase tracking-widest text-cm-muted pb-1 border-b border-cm-border">
              Rental Summary
            </p>

            <div className="flex justify-between text-cm-muted">
              <span>Cloth</span>
              <span className="font-semibold text-cm-black">{product.name}</span>
            </div>

            <div className="flex justify-between text-cm-muted">
              <span>Selected Size</span>
              <span className="font-semibold text-cm-black">{selectedSize}</span>
            </div>

            <div className="flex justify-between text-cm-muted">
              <span>Rental Period</span>
              <span className="font-semibold text-cm-black">{startDate} → {endDate} ({durationDays} days)</span>
            </div>

            <div className="flex justify-between text-cm-muted">
              <span>Rental Price (₹{dailyRate} × {durationDays}d)</span>
              <span className="font-semibold text-cm-black">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Confirmation Advance (Required)</span>
              <span className="font-bold">₹{advanceAmount} (Payable to Admin to confirm)</span>
            </div>

            <div className="flex justify-between text-cm-muted">
              <span>Remaining Amount</span>
              <span className="font-semibold text-cm-black">₹{remainingAtHandover.toLocaleString("en-IN")} (Payable when receiving item)</span>
            </div>

            <div className="flex justify-between text-cm-muted">
              <span>Payment Mode</span>
              <span className="font-semibold text-cm-black">Cash (No electronic/gateway payment)</span>
            </div>

            <div className="pt-2 border-t border-cm-border flex justify-between items-baseline">
              <span className="text-sm font-bold text-cm-black">TOTAL RENTAL VALUE</span>
              <span className="text-lg font-bold text-cm-red">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-2xs space-y-0.5">
              <p className="font-bold">Payment Schedule:</p>
              <p>• <strong>₹50 advance</strong> required to confirm rental.</p>
              <p>• <strong>Remaining ₹{remainingAtHandover}</strong> payable in cash when receiving the rented item at handover.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-2xs text-cm-muted bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Mutual condition inspection with baseline photos performed prior to handover. Cash only.</span>
          </div>

          <button
            type="submit"
            disabled={loading || checking || (availability && !availability.available)}
            className="btn btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl disabled:opacity-50"
          >
            {loading ? "Processing Booking..." : `Confirm Rental (₹${advanceAmount} Advance Due)`}
          </button>
        </form>
      </div>
    </div>
  );
}
