export default function RentalModal({ product, open, onClose, onSubmit, loading }) {
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-glow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">Rental Flow</p>
            <h3 className="font-display text-2xl font-bold">{product.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1">
            Close
          </button>
        </div>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit({
              productId: product.id,
              durationDays: Number(formData.get("durationDays")),
              pickupDate: formData.get("pickupDate"),
              returnDate: formData.get("returnDate")
            });
          }}
        >
          <input className="rounded-2xl border-slate-200" name="durationDays" type="number" min="1" defaultValue="3" />
          <input className="rounded-2xl border-slate-200" name="pickupDate" type="date" required />
          <input className="rounded-2xl border-slate-200" name="returnDate" type="date" required />
          <div className="rounded-2xl bg-sand p-4 text-sm text-slate-700">
            Deposit ₹{product.securityDeposit} • Late fee ₹150/day • Flexible pickup and return scheduling.
          </div>
          <button disabled={loading} type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">
            {loading ? "Booking..." : "Confirm Rental"}
          </button>
        </form>
      </div>
    </div>
  );
}
