import { useState, useEffect } from "react";
import { X, Calendar, Check, AlertCircle } from "lucide-react";
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

  const dailyRate = product.rentPrice || product.price || 0;
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
      <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-cm-border my-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-cm-border">
          <div>
            <h3 className="font-bold text-base text-cm-black line-clamp-1">{product.name}</h3>
            <p className="text-sm font-semibold text-cm-black mt-0.5">
              ₹{dailyRate.toLocaleString("en-IN")} <span className="text-xs font-normal text-cm-muted">/ day</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted hover:text-cm-black transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-cm-red text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Size Selector */}
          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-muted block mb-2">
              Select Size
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-10 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "border-cm-black bg-cm-black text-white shadow-sm"
                        : "border-cm-border bg-white text-cm-black hover:border-cm-black"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rental Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-muted flex items-center gap-1">
                <Calendar size={11} />
                <span>Rental Start</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border focus:border-cm-black font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-muted flex items-center gap-1">
                <Calendar size={11} />
                <span>Return Date</span>
              </label>
              <input
                type="date"
                min={startDate || todayStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border focus:border-cm-black font-medium"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="p-2.5 rounded-xl bg-cm-soft border border-cm-border flex items-center justify-between">
            <span className="text-cm-muted font-medium">
              Duration: <strong className="text-cm-black">{durationDays} day(s)</strong>
            </span>
            {checking ? (
              <span className="text-2xs text-cm-muted animate-pulse">Checking...</span>
            ) : availability?.available ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check size={13} /> Available
              </span>
            ) : (
              <span className="text-cm-red font-bold flex items-center gap-1">
                <AlertCircle size={13} /> Fully Booked
              </span>
            )}
          </div>

          {/* Rental Summary */}
          <div className="rounded-2xl border border-cm-border bg-white p-3.5 space-y-2">
            <p className="text-2xs font-bold uppercase tracking-wider text-cm-muted pb-1 border-b border-cm-border">
              Rental Summary
            </p>
            <div className="flex justify-between text-cm-muted">
              <span>{durationDays} days × ₹{dailyRate.toLocaleString("en-IN")}</span>
              <span className="font-semibold text-cm-black">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-cm-muted">
              <span>₹50 cash advance</span>
              <span className="font-semibold text-emerald-700">₹{advanceAmount}</span>
            </div>
            <div className="flex justify-between text-cm-muted">
              <span>Remaining at handover</span>
              <span className="font-semibold text-cm-black">₹{remainingAtHandover.toLocaleString("en-IN")}</span>
            </div>
            <div className="pt-2 border-t border-cm-border flex justify-between items-baseline font-bold">
              <span className="text-xs uppercase text-cm-muted">Total Rental</span>
              <span className="text-base text-cm-black">₹{totalRentalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Cash Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-2xs space-y-1">
            <p className="font-bold">Payment: CASH ONLY</p>
            <p>• <strong>₹50 cash advance</strong> is required to confirm the rental.</p>
            <p>• Remaining amount is paid in cash at handover.</p>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading || checking || (availability && !availability.available)}
            className="w-full py-3 px-4 rounded-xl bg-cm-black text-white text-xs font-bold uppercase tracking-wider hover:bg-cm-red disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {loading ? "Processing..." : "Book Rental"}
          </button>
          <p className="text-center text-2xs text-cm-muted">
            Pay ₹50 cash to the Admin to confirm your rental.
          </p>
        </form>
      </div>
    </div>
  );
}
