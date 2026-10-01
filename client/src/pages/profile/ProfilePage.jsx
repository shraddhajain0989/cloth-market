import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  X
} from "lucide-react";
import { rentalApi, userApi } from "../../api/endpoints";
import SectionHeader from "../../components/common/SectionHeader";

const TIMELINE_STEPS = [
  { key: "PENDING_ADVANCE", label: "Booking Created" },
  { key: "CONFIRMED", label: "₹50 Advance Confirmed" },
  { key: "HANDOVER_INSPECTION", label: "Handover Inspection" },
  { key: "ACTIVE_RENTAL", label: "Rental Active" },
  { key: "RETURN_INSPECTION", label: "Return Inspection" },
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

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Extension Modal
  const [extensionModal, setExtensionModal] = useState(null); // rental
  const [extendedDate, setExtendedDate] = useState("");
  const [extending, setExtending] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [profRes, rentRes] = await Promise.all([
        userApi.me(),
        rentalApi.list()
      ]);
      setProfile(profRes.data.data);
      setRentals(rentRes.data.data || []);
    } catch {
      setMessage("❌ Failed to load account details.");
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
      setMessage("✅ You have confirmed receipt of the item and acknowledged the condition.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Acknowledgement failed."}`);
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
      setMessage("✅ Rental extension request submitted to Admin.");
      setExtensionModal(null);
      setExtendedDate("");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Extension request failed."}`);
    } finally {
      setExtending(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        eyebrow="My Account"
        title="My Rentals & Account"
        description="Track active rentals, inspect handover condition photos, request extensions, and review return settlements."
      />

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold border ${
          message.startsWith("✅")
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-cm-red border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* User Info Header Card */}
      <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cm-black text-white font-display font-bold text-xl flex items-center justify-center">
            {profile?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-cm-black">{profile?.name}</h2>
            <p className="text-xs text-cm-muted">{profile?.email} • Verified Customer</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-cm-soft border border-cm-border">
            <span className="text-cm-muted block text-2xs">Total Rentals</span>
            <strong className="text-sm font-bold text-cm-black">{rentals.length}</strong>
          </div>
        </div>
      </div>

      {/* ── MY RENTALS SECTION ────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-display font-bold text-cm-black">Rental Bookings ({rentals.length})</h3>
            <p className="text-xs text-cm-muted">Track delivery, condition photos, payments, and return timelines</p>
          </div>
        </div>

        {!rentals.length ? (
          <div className="rounded-3xl bg-white border border-cm-border p-12 text-center space-y-3">
            <Sparkles size={32} className="mx-auto text-cm-muted" />
            <h4 className="font-display font-bold text-base text-cm-black">No active rentals yet</h4>
            <p className="text-xs text-cm-muted max-w-sm mx-auto">
              Browse our catalog of luxury ethnic wear, designer suits, and evening gowns to rent your first outfit.
            </p>
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
                  className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-6"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-cm-border">
                    <div className="flex items-center gap-4">
                      {r.clothSnapshot?.image ? (
                        <img
                          src={r.clothSnapshot.image}
                          alt={r.clothSnapshot.name}
                          className="w-16 h-20 rounded-2xl object-cover border border-cm-border shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-20 rounded-2xl bg-cm-soft border border-cm-border flex items-center justify-center font-bold text-base">
                          {r.productName?.[0] || "C"}
                        </div>
                      )}
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-cm-soft text-cm-black border border-cm-border">
                          Rental #{id.slice(-6).toUpperCase()}
                        </span>
                        <h4 className="font-display font-bold text-lg text-cm-black mt-1">
                          {r.clothSnapshot?.name || r.productName}
                        </h4>
                        <p className="text-xs text-cm-muted">
                          Size: <strong className="text-cm-black">{r.size}</strong> • Period:{" "}
                          <strong className="text-cm-black">{r.rentalStartDate} → {r.currentEndDate}</strong> ({r.rentalDuration} days)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-cm-muted">Total Rental Amount</p>
                      <p className="text-2xl font-display font-bold text-cm-red">
                        ₹{r.rentalAmount?.toLocaleString("en-IN")}
                      </p>
                      <span className="px-3 py-1 rounded-full text-2xs font-bold border border-cm-border bg-cm-soft text-cm-black inline-block mt-1">
                        {r.rentalStatus}
                      </span>
                    </div>
                  </div>

                  {/* Visual Rental Timeline (Part 35) */}
                  <div>
                    <p className="text-2xs font-bold uppercase tracking-wider text-cm-muted mb-3">Rental Lifecycle Timeline</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isDone = idx <= stepIdx;
                        const isCurrent = idx === stepIdx;
                        return (
                          <div
                            key={step.key}
                            className={`p-2.5 rounded-2xl border transition-all text-xs flex flex-col items-center justify-center gap-1 ${
                              isCurrent
                                ? "bg-cm-black text-white border-cm-black shadow-md font-bold"
                                : isDone
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                                : "bg-cm-soft/40 text-cm-muted border-cm-border"
                            }`}
                          >
                            <span className="text-2xs opacity-75">Step {idx + 1}</span>
                            <span className="text-xs leading-tight">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1">
                      <span className="text-2xs uppercase tracking-wider font-bold text-cm-muted block">
                        Confirmation Advance (₹50)
                      </span>
                      <p className="text-sm font-bold text-cm-black">
                        {hasAdvance ? "✓ Paid / Confirmed" : "⏳ Pending Collection"}
                      </p>
                      <p className="text-2xs text-cm-muted">Collected in cash by Admin to confirm</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1">
                      <span className="text-2xs uppercase tracking-wider font-bold text-cm-muted block">
                        Remaining Payment (₹{r.remainingAmount})
                      </span>
                      <p className="text-sm font-bold text-cm-black">
                        {hasRemaining ? "✓ Paid at Handover" : "⏳ Due in Cash at Handover"}
                      </p>
                      <p className="text-2xs text-cm-muted">Collected when item is received</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1">
                      <span className="text-2xs uppercase tracking-wider font-bold text-cm-muted block">
                        Payment Method
                      </span>
                      <p className="text-sm font-bold text-cm-black">Cash on Delivery (Cash Only)</p>
                      <p className="text-2xs text-cm-muted">No tax or online gateway fees</p>
                    </div>
                  </div>

                  {/* Handover Inspection & Condition Evidence (Part 18, 19, 20) */}
                  {handover?.inspectedAt && (
                    <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera size={16} className="text-blue-600" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                            Handover Condition Evidence (Baseline)
                          </h5>
                        </div>
                        <span className="text-2xs text-blue-700 font-medium">
                          Inspected: {new Date(handover.inspectedAt).toLocaleDateString("en-IN")} by {handover.inspectedBy}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-2xs">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 font-bold text-blue-900">
                          Condition: {handover.condition}
                        </span>
                        {handover.stains && <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-semibold">Stains noted at handover</span>}
                        {handover.tears && <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-semibold">Tear noted at handover</span>}
                        {handover.notes && <span className="text-blue-800 italic">"{handover.notes}"</span>}
                      </div>

                      {handover.photos?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {handover.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt="Handover inspection"
                              className="w-16 h-20 rounded-xl object-cover border border-blue-200 bg-white shrink-0"
                            />
                          ))}
                        </div>
                      )}

                      {/* Customer Acknowledgement (Part 20) */}
                      {!handover.customerAcknowledged ? (
                        <div className="pt-2 border-t border-blue-200 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-2xs text-blue-900 font-medium">
                            Please confirm that you inspected the cloth and agree with the baseline evidence.
                          </p>
                          <button
                            onClick={() => handleAcknowledgeHandover(id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                          >
                            I have received the item and agree with the recorded condition
                          </button>
                        </div>
                      ) : (
                        <p className="text-2xs text-emerald-700 font-bold flex items-center gap-1 pt-1">
                          <CheckCircle2 size={14} /> You acknowledged this condition on {new Date(handover.customerAcknowledgedAt).toLocaleDateString("en-IN")}.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Return Inspection Evidence (Part 25, 26) */}
                  {returnInsp?.inspectedAt && (
                    <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera size={16} className="text-purple-600" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                            Return Inspection Condition
                          </h5>
                        </div>
                        <span className="text-2xs text-purple-700 font-medium">
                          Inspected: {new Date(returnInsp.inspectedAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-2xs">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-bold text-purple-900">
                          Condition: {returnInsp.condition}
                        </span>
                        {returnInsp.notes && <span className="text-purple-800 italic">"{returnInsp.notes}"</span>}
                      </div>

                      {returnInsp.photos?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {returnInsp.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt="Return inspection"
                              className="w-16 h-20 rounded-xl object-cover border border-purple-200 bg-white shrink-0"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Damage Settlement Card (Part 28) */}
                  {damage?.damageDetected && (
                    <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-cm-red font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={16} /> Damage Assessment Report
                        </span>
                        <span>Assessment: ₹{damage.amount}</span>
                      </div>
                      <p className="text-2xs text-slate-700">{damage.description} (Severity: {damage.severity})</p>
                      <p className="text-2xs text-cm-muted">
                        Status: <strong className="text-cm-black">{damage.status}</strong> • Note: Damage charges are settled separately from the base rental price.
                      </p>
                    </div>
                  )}

                  {/* Extension Action Button (Part 22) */}
                  <div className="flex items-center justify-between pt-2 border-t border-cm-border/60">
                    <p className="text-2xs text-cm-muted">
                      Scheduled Return: <strong className="text-cm-black">{r.currentEndDate}</strong>
                    </p>

                    {["CONFIRMED", "ACTIVE_RENTAL", "EXTENDED"].includes(r.rentalStatus) && (
                      <button
                        onClick={() => {
                          const base = new Date(r.currentEndDate);
                          base.setDate(base.getDate() + 2);
                          setExtendedDate(base.toISOString().split("T")[0]);
                          setExtensionModal(r);
                        }}
                        className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} />
                        <span>Extend Rental</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EXTENSION MODAL ───────────────────────────────────────────────── */}
      {extensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-cm-border shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-cm-border">
              <div>
                <span className="text-2xs uppercase tracking-widest font-bold text-cm-red">Rental Duration</span>
                <h3 className="font-display font-bold text-lg text-cm-black">Extend Rental Period</h3>
              </div>
              <button
                type="button"
                onClick={() => setExtensionModal(null)}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestExtension} className="space-y-4">
              <div className="p-3 rounded-2xl bg-cm-soft border border-cm-border text-xs space-y-1">
                <p className="text-cm-muted">Current Return Date: <strong className="text-cm-black">{extensionModal.currentEndDate}</strong></p>
                <p className="text-cm-muted">Daily Rate: <strong className="text-cm-black">₹{extensionModal.priceSnapshot?.dailyRate || 0} / day</strong></p>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">New Requested Return Date</label>
                <input
                  type="date"
                  min={extensionModal.currentEndDate}
                  required
                  value={extendedDate}
                  onChange={(e) => setExtendedDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-2xl border border-cm-border font-medium"
                />
              </div>

              <p className="text-2xs text-cm-muted">
                Note: No additional ₹50 confirmation advance is charged for extensions. Additional days are charged at the original daily rate upon return.
              </p>

              <button
                type="submit"
                disabled={extending}
                className="btn btn-primary w-full py-3 text-xs font-bold rounded-2xl"
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
