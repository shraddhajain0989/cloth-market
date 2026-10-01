import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";
import { rentalApi, userApi } from "../../api/endpoints";

const TIMELINE_STEPS = [
  { key: "PENDING_ADVANCE", label: "Booking Created" },
  { key: "CONFIRMED", label: "₹50 Advance" },
  { key: "HANDOVER_INSPECTION", label: "Handover" },
  { key: "ACTIVE_RENTAL", label: "Rental Active" },
  { key: "RETURN_INSPECTION", label: "Return" },
  { key: "COMPLETED", label: "Completed" }
];

function getTimelineIndex(status) {
  if (status === "PENDING_ADVANCE") return 0;
  if (status === "CONFIRMED" || status === "READY_FOR_HANDOVER") return 1;
  if (status === "HANDOVER_INSPECTION") return 2;
  if (status === "ACTIVE_RENTAL" || status === "EXTENSION_REQUESTED" || status === "EXTENDED") return 3;
  if (status === "RETURN_INSPECTION" || status === "DAMAGE_REPORTED") return 4;
  if (status === "COMPLETED") return 5;
  return 0;
}

function getHumanStatus(status) {
  switch (status) {
    case "PENDING_ADVANCE":
      return "Booking Created";
    case "CONFIRMED":
    case "READY_FOR_HANDOVER":
      return "Advance Confirmed";
    case "HANDOVER_INSPECTION":
      return "Handover Inspection";
    case "ACTIVE_RENTAL":
      return "Rental Active";
    case "EXTENSION_REQUESTED":
      return "Extension Requested";
    case "EXTENDED":
      return "Rental Extended";
    case "RETURN_INSPECTION":
      return "Return Inspection";
    case "DAMAGE_REPORTED":
      return "Damage Reported";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Extension Modal
  const [extensionModal, setExtensionModal] = useState(null);
  const [extendedDate, setExtendedDate] = useState("");
  const [extending, setExtending] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [profRes, rentRes] = await Promise.all([
        userApi.me(),
        rentalApi.list()
      ]);
      setProfile(profRes.data?.data || null);
      setRentals(rentRes.data?.data || []);
    } catch {
      setMessage("Failed to load your rentals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAcknowledgeHandover(rentalId) {
    try {
      await rentalApi.acknowledgeHandover(rentalId);
      setMessage("You have confirmed receipt of the item and verified condition.");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Acknowledgement failed.");
    }
  }

  async function handleRequestExtension(e) {
    e.preventDefault();
    if (!extensionModal || !extendedDate) return;
    setExtending(true);
    try {
      await rentalApi.requestExtension(extensionModal.id || extensionModal._id, {
        requestedEndDate: extendedDate
      });
      setMessage("Rental extension request submitted to Admin.");
      setExtensionModal(null);
      setExtendedDate("");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Extension request failed.");
    } finally {
      setExtending(false);
    }
  }

  return (
    <div className="cm-container py-8 max-w-4xl mx-auto space-y-6 px-4">
      {/* Page Header */}
      <div className="pb-4 border-b border-cm-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-cm-black">
            My Rentals
          </h1>
          <p className="text-xs sm:text-sm text-cm-muted mt-1">
            Track your rental bookings, cash advance status, and handover condition.
          </p>
        </div>
        {profile && (
          <div className="text-right text-xs">
            <p className="font-bold text-cm-black">{profile.name}</p>
            <p className="text-cm-muted">{profile.email}</p>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-cm-soft border border-cm-border text-xs font-semibold text-cm-black">
          {message}
        </div>
      )}

      {/* Rentals List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-cm-soft/60 animate-pulse rounded-2xl border border-cm-border" />
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <div className="rounded-2xl bg-white border border-cm-border p-12 text-center space-y-3">
          <Sparkles size={28} className="mx-auto text-cm-muted" />
          <h3 className="font-bold text-base text-cm-black">No active rentals yet</h3>
          <p className="text-xs text-cm-muted max-w-sm mx-auto">
            Browse our catalog to select your favorite designer outfits for simple, flexible rentals.
          </p>
          <a
            href="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-full bg-cm-black text-white text-xs font-bold hover:bg-cm-red transition-colors"
          >
            Explore Clothes
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {rentals.map((r) => {
            const id = r.id || r._id;
            const stepIdx = getTimelineIndex(r.rentalStatus);
            const hasAdvance = r.advanceStatus === "ADVANCE_RECEIVED";
            const hasRemaining = r.remainingPaymentStatus === "REMAINING_RECEIVED";
            const handover = r.handoverInspection;
            const returnInsp = r.returnInspection;
            const damage = r.damageReport;

            return (
              <article
                key={id}
                className="rounded-2xl bg-white border border-cm-border p-5 sm:p-6 shadow-sm space-y-5"
              >
                {/* Rental Top Bar */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-cm-border">
                  <div className="flex items-center gap-3.5">
                    {r.clothSnapshot?.image ? (
                      <img
                        src={r.clothSnapshot.image}
                        alt={r.clothSnapshot.name || "Cloth"}
                        className="w-14 h-18 rounded-xl object-cover border border-cm-border shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-18 rounded-xl bg-cm-soft border border-cm-border flex items-center justify-center font-bold text-base">
                        {r.productName?.[0] || "C"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-cm-black">
                        {r.clothSnapshot?.name || r.productName || "Designer Outfit"}
                      </h3>
                      <p className="text-xs text-cm-muted mt-0.5">
                        Size: <strong className="text-cm-black">{r.size}</strong> • Dates:{" "}
                        <strong className="text-cm-black">
                          {r.rentalStartDate} → {r.currentEndDate}
                        </strong>{" "}
                        ({r.rentalDuration} days)
                      </p>
                      <p className="text-xs font-bold text-cm-black mt-1">
                        ₹{r.rentalAmount?.toLocaleString("en-IN")}{" "}
                        <span className="text-2xs font-normal text-cm-muted">total</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-2xs font-bold border border-cm-border bg-cm-soft text-cm-black inline-block">
                      Status: {getHumanStatus(r.rentalStatus)}
                    </span>
                  </div>
                </div>

                {/* Notice for Pending ₹50 Cash Advance Collection */}
                {!hasAdvance && (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                    <Clock size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-amber-950">BOOKING CREATED</span>
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-200 text-amber-900">
                          ₹50 CASH ADVANCE PENDING
                        </span>
                      </div>
                      <p className="text-2xs text-amber-900">
                        Pay ₹50 cash to the Admin to confirm your rental.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6-Step Rental Lifecycle Timeline */}
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wider text-cm-muted mb-2.5">
                    Rental Timeline
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isDone = idx <= stepIdx;
                      const isCurrent = idx === stepIdx;
                      return (
                        <div
                          key={step.key}
                          className={`p-2 rounded-xl border text-xs flex flex-col items-center justify-center gap-0.5 ${
                            isCurrent
                              ? "bg-cm-black text-white border-cm-black font-bold shadow-sm"
                              : isDone
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                              : "bg-cm-soft/40 text-cm-muted border-cm-border"
                          }`}
                        >
                          <span className="text-2xs opacity-80">
                            {isDone && !isCurrent ? "✓" : `Step ${idx + 1}`}
                          </span>
                          <span className="text-2xs leading-tight font-medium">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-cm-soft/50 border border-cm-border space-y-0.5">
                    <span className="text-2xs font-bold uppercase text-cm-muted block">
                      ₹50 Cash Advance
                    </span>
                    <p className="font-bold text-cm-black">
                      {hasAdvance ? "✓ Paid / Confirmed" : "⏳ Pending Cash Collection"}
                    </p>
                    <p className="text-2xs text-cm-muted">
                      {hasAdvance ? "Confirmed by Admin" : "Pay ₹50 cash to Admin"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-cm-soft/50 border border-cm-border space-y-0.5">
                    <span className="text-2xs font-bold uppercase text-cm-muted block">
                      Remaining Cash
                    </span>
                    <p className="font-bold text-cm-black">
                      {hasRemaining ? "✓ Paid at Handover" : `₹${r.remainingAmount} Due at Handover`}
                    </p>
                    <p className="text-2xs text-cm-muted">Payable when receiving item</p>
                  </div>

                  <div className="p-3 rounded-xl bg-cm-soft/50 border border-cm-border space-y-0.5">
                    <span className="text-2xs font-bold uppercase text-cm-muted block">
                      Payment Mode
                    </span>
                    <p className="font-bold text-cm-black">Cash on Delivery</p>
                    <p className="text-2xs text-cm-muted">Cash only • Zero extra fees</p>
                  </div>
                </div>

                {/* Handover Inspection & Condition Evidence */}
                {handover?.inspectedAt && (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Camera size={14} className="text-blue-600" />
                        <span>Handover Inspection (Baseline)</span>
                      </div>
                      <span className="text-2xs text-blue-700">
                        Condition: <strong>{handover.condition}</strong>
                      </span>
                    </div>

                    {handover.photos?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pt-1">
                        {handover.photos.map((photo, i) => (
                          <img
                            key={i}
                            src={photo}
                            alt="Handover inspection"
                            className="w-14 h-18 rounded-lg object-cover border border-blue-200 bg-white shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {!handover.customerAcknowledged ? (
                      <div className="pt-2 border-t border-blue-200 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-2xs text-blue-900">
                          Please verify you have inspected the garment condition.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeHandover(id)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                        >
                          I Agree & Receive Item
                        </button>
                      </div>
                    ) : (
                      <p className="text-2xs text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Condition verified on{" "}
                        {new Date(handover.customerAcknowledgedAt).toLocaleDateString("en-IN")}.
                      </p>
                    )}
                  </div>
                )}

                {/* Return Inspection */}
                {returnInsp?.inspectedAt && (
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900">
                        <Camera size={14} className="text-purple-600" />
                        <span>Return Inspection</span>
                      </div>
                      <span className="text-2xs text-purple-700 font-semibold">
                        Condition: {returnInsp.condition}
                      </span>
                    </div>
                    {returnInsp.notes && <p className="text-2xs text-purple-800">"{returnInsp.notes}"</p>}
                  </div>
                )}

                {/* Action: Request Extension */}
                {["ACTIVE_RENTAL", "CONFIRMED"].includes(r.rentalStatus) && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setExtensionModal(r);
                        setExtendedDate(r.currentEndDate);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-cm-border text-xs font-bold text-cm-black hover:border-cm-black transition-colors"
                    >
                      Request Extension
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Extension Modal */}
      {extensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 border border-cm-border shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-cm-border">
              <h4 className="font-bold text-sm text-cm-black">Extend Rental</h4>
              <button
                type="button"
                onClick={() => setExtensionModal(null)}
                className="p-1 text-cm-muted hover:text-cm-black"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestExtension} className="space-y-3">
              <p className="text-cm-muted">
                Current return date: <strong>{extensionModal.currentEndDate}</strong>
              </p>
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase text-cm-muted block">
                  New Return Date
                </label>
                <input
                  type="date"
                  min={extensionModal.currentEndDate}
                  value={extendedDate}
                  onChange={(e) => setExtendedDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-cm-border text-xs font-medium"
                />
              </div>

              <p className="text-2xs text-cm-muted">
                Note: No additional ₹50 advance is charged for extensions. Additional days are calculated at the original daily rate.
              </p>

              <button
                type="submit"
                disabled={extending}
                className="w-full py-2.5 rounded-xl bg-cm-black text-white text-xs font-bold uppercase hover:bg-cm-red transition-colors disabled:opacity-50"
              >
                {extending ? "Submitting..." : "Submit Extension Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
