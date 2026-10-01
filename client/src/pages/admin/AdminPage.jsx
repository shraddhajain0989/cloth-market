import { useEffect, useState } from "react";
import {
  Package,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Check,
  X
} from "lucide-react";
import { adminApi, productApi } from "../../api/endpoints";
import ImageUpload from "../../components/admin/ImageUpload";
import SectionHeader from "../../components/common/SectionHeader";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("rentals"); // 'rentals' | 'inventory' | 'add'
  const [dashboard, setDashboard] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Product Form
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "Ethnic",
    gender: "Women",
    rentPrice: 500,
    price: 3500,
    securityDeposit: 0,
    description: "",
    images: []
  });
  const [sizeStocks, setSizeStocks] = useState({
    S: 2,
    M: 5,
    L: 4,
    XL: 2
  });
  const [imageUrl, setImageUrl] = useState("");

  // Inspection Modal State
  const [inspectionModal, setInspectionModal] = useState(null); // { type: 'handover' | 'return', rental: {...} }
  const [inspectionData, setInspectionData] = useState({
    condition: "Good",
    stains: false,
    tears: false,
    brokenButtons: false,
    brokenZipper: false,
    fabricDamage: false,
    missingAccessories: false,
    notes: "",
    photoUrl: ""
  });

  // Damage Modal State
  const [damageModal, setDamageModal] = useState(null); // rental
  const [damageData, setDamageData] = useState({
    description: "Tear on hemline",
    severity: "minor",
    amount: 300,
    photoUrl: ""
  });

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, rentalsRes, prodRes] = await Promise.all([
        adminApi.dashboard(),
        adminApi.rentals(),
        productApi.list()
      ]);
      setDashboard(dashRes.data.data);
      setRentals(rentalsRes.data.data || []);
      setCatalog(prodRes.data.data.items || []);
    } catch {
      setMessage("❌ Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenEdit(prod) {
    setEditingProduct(prod);
    setForm({
      name: prod.name,
      category: prod.category,
      gender: prod.gender || "Women",
      rentPrice: prod.rentPrice || 0,
      price: prod.price || 0,
      securityDeposit: prod.securityDeposit || 0,
      description: prod.description || "",
      images: prod.images || []
    });
    setImageUrl(prod.images?.[0] || "");
    const initialStocks = {};
    if (prod.sizeVariants?.length) {
      prod.sizeVariants.forEach((v) => {
        initialStocks[v.size] = v.stock;
      });
    } else {
      (prod.sizes || ["S", "M", "L"]).forEach((s) => {
        initialStocks[s] = Math.max(1, Math.floor((prod.stock || 6) / (prod.sizes?.length || 3)));
      });
    }
    setSizeStocks(initialStocks);
    setActiveTab("add");
  }

  function handleResetForm() {
    setEditingProduct(null);
    setForm({
      name: "",
      category: "Ethnic",
      gender: "Women",
      rentPrice: 500,
      price: 3500,
      securityDeposit: 0,
      description: "",
      images: []
    });
    setSizeStocks({ S: 2, M: 5, L: 4, XL: 2 });
    setImageUrl("");
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    setMessage("");

    const sizeVariants = Object.entries(sizeStocks)
      .filter(([_, stock]) => Number(stock) > 0)
      .map(([size, stock]) => ({
        size,
        stock: Number(stock),
        available: true
      }));

    if (!sizeVariants.length) {
      setMessage("❌ Please assign quantity for at least one size variant.");
      return;
    }

    const images = imageUrl ? [imageUrl] : form.images?.length ? form.images : ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"];

    const payload = {
      ...form,
      rentPrice: Number(form.rentPrice),
      price: Number(form.price),
      securityDeposit: Number(form.securityDeposit),
      sizeVariants,
      sizes: sizeVariants.map((v) => v.size),
      images
    };

    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id || editingProduct._id, payload);
        setMessage("✅ Cloth product updated successfully.");
      } else {
        await productApi.create(payload);
        setMessage("✅ New cloth added to rental catalog.");
      }
      handleResetForm();
      setActiveTab("inventory");
      loadData();
    } catch (err) {
      setMessage(`❌ Save failed: ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm("Are you sure you want to deactivate/delete this cloth item?")) return;
    try {
      await productApi.remove(id);
      setMessage("✅ Product removed.");
      loadData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  }

  // Rental Lifecycle Operations
  async function handleConfirmAdvance(id) {
    try {
      await adminApi.confirmAdvance(id);
      setMessage("✅ ₹50 advance confirmed received. Rental is CONFIRMED.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleRecordRemaining(id) {
    try {
      await adminApi.recordRemainingPayment(id);
      setMessage("✅ Remaining payment recorded. Rental is now ACTIVE.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleReviewExtension(id, decision) {
    try {
      await adminApi.reviewExtension(id, { decision });
      setMessage(`✅ Extension ${decision.toLowerCase()} successfully.`);
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleSubmitInspection(e) {
    e.preventDefault();
    if (!inspectionModal) return;
    const { type, rental } = inspectionModal;

    const photos = inspectionData.photoUrl ? [inspectionData.photoUrl] : [];
    const payload = {
      ...inspectionData,
      photos
    };

    try {
      if (type === "handover") {
        await adminApi.handoverInspection(rental.id || rental._id, payload);
        setMessage("✅ Handover inspection and baseline evidence recorded.");
      } else {
        await adminApi.returnInspection(rental.id || rental._id, payload);
        setMessage("✅ Return inspection recorded.");
      }
      setInspectionModal(null);
      loadData();
    } catch (err) {
      setMessage(`❌ Inspection error: ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleSubmitDamage(e) {
    e.preventDefault();
    if (!damageModal) return;

    try {
      const photos = damageData.photoUrl ? [damageData.photoUrl] : [];
      await adminApi.reportDamage(damageModal.id || damageModal._id, {
        ...damageData,
        photos
      });
      setMessage("✅ Damage report registered. Customer settlement pending.");
      setDamageModal(null);
      loadData();
    } catch (err) {
      setMessage(`❌ Damage report failed: ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleResolveDamage(id) {
    try {
      await adminApi.resolveDamage(id);
      setMessage("✅ Damage settlement resolved and rental completed.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleComplete(id) {
    try {
      await adminApi.completeRental(id);
      setMessage("✅ Rental marked as COMPLETED.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        eyebrow="Admin Operations"
        title="Cloth Rental Management Console"
        description="Inspect handovers, manage size inventory, approve extensions, and enforce rental fulfillment."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Total Rentals</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-cm-black">{dashboard?.kpis?.rentals || rentals.length}</h3>
        </article>
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Active Rentals</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-emerald-600">{dashboard?.kpis?.activeRentals || 0}</h3>
        </article>
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Pending Advance</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-amber-600">{dashboard?.kpis?.pendingAdvance || 0}</h3>
        </article>
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Completed</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-blue-600">{dashboard?.kpis?.completedRentals || 0}</h3>
        </article>
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Total Clothes</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-cm-black">{catalog.length}</h3>
        </article>
        <article className="rounded-3xl bg-white border border-cm-border p-4 shadow-sm">
          <p className="text-2xs uppercase tracking-widest font-bold text-cm-muted">Total Revenue</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-cm-red">
            ₹{(dashboard?.kpis?.revenue || 0).toLocaleString("en-IN")}
          </h3>
        </article>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold border ${
          message.startsWith("✅")
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-cm-red border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cm-border gap-3 text-sm font-bold">
        <button
          onClick={() => setActiveTab("rentals")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "rentals"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <Package size={16} />
          <span>Rental Orders & Handovers ({rentals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "inventory"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <Layers size={16} />
          <span>Cloth Inventory ({catalog.length})</span>
        </button>

        <button
          onClick={() => {
            handleResetForm();
            setActiveTab("add");
          }}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "add"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <Plus size={16} />
          <span>{editingProduct ? "Edit Cloth" : "Add New Cloth"}</span>
        </button>
      </div>

      {/* ── TAB 1: RENTALS MANAGEMENT ────────────────────────────────────────── */}
      {activeTab === "rentals" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm overflow-x-auto">
            <h3 className="text-lg font-display font-bold text-cm-black mb-4">Rental Orders & Lifecycle Fulfillments</h3>
            
            {!rentals.length ? (
              <p className="text-xs text-cm-muted py-8 text-center">No rental orders placed yet.</p>
            ) : (
              <div className="space-y-4">
                {rentals.map((r) => {
                  const id = r.id || r._id;
                  const hasAdvance = r.advanceStatus === "ADVANCE_RECEIVED";
                  const hasHandover = r.rentalStatus === "HANDOVER_INSPECTION" || r.handoverInspection?.inspectedAt;
                  const hasRemaining = r.remainingPaymentStatus === "REMAINING_RECEIVED";
                  const hasExtension = r.extensionHistory?.some((e) => e.status === "REQUESTED");
                  const hasDamage = r.rentalStatus === "DAMAGE_REPORTED" || r.damageReport?.damageDetected;

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-cm-border p-5 bg-cm-soft/40 space-y-3"
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cm-border">
                        <div className="flex items-center gap-3">
                          {r.clothSnapshot?.image ? (
                            <img
                              src={r.clothSnapshot.image}
                              alt={r.clothSnapshot.name}
                              className="w-12 h-12 rounded-xl object-cover border border-cm-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-cm-soft border border-cm-border flex items-center justify-center font-bold text-xs">
                              {r.productName?.[0] || "C"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-bold text-sm text-cm-black">{r.clothSnapshot?.name || r.productName}</h4>
                              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-cm-black text-white">Size: {r.size}</span>
                              <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold border border-cm-border bg-white text-cm-black">
                                Status: {r.rentalStatus}
                              </span>
                            </div>
                            <p className="text-2xs text-cm-muted mt-0.5">
                              Customer: <strong className="text-cm-black">{r.customer?.name}</strong> ({r.customer?.email}) • ID: {id}
                            </p>
                          </div>
                        </div>

                        {/* Dates & Financials */}
                        <div className="text-right text-xs">
                          <p className="font-bold text-cm-red text-sm">₹{r.rentalAmount} Total</p>
                          <p className="text-2xs text-cm-muted">
                            Period: {r.rentalStartDate} → {r.currentEndDate} ({r.rentalDuration} days)
                          </p>
                        </div>
                      </div>

                      {/* Payment & Inspection Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
                        <div className="p-2 rounded-xl bg-white border border-cm-border">
                          <span className="text-cm-muted block">₹50 Advance:</span>
                          <span className={`font-bold ${hasAdvance ? "text-emerald-700" : "text-amber-600"}`}>
                            {hasAdvance ? "✓ RECEIVED" : "⏳ PENDING"}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-cm-border">
                          <span className="text-cm-muted block">Remaining (₹{r.remainingAmount}):</span>
                          <span className={`font-bold ${hasRemaining ? "text-emerald-700" : "text-amber-600"}`}>
                            {hasRemaining ? "✓ RECEIVED" : "⏳ DUE AT HANDOVER"}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-cm-border">
                          <span className="text-cm-muted block">Handover Inspection:</span>
                          <span className={`font-bold ${hasHandover ? "text-emerald-700" : "text-cm-muted"}`}>
                            {hasHandover ? `✓ ${r.handoverInspection?.condition}` : "NOT PERFORMED"}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-cm-border">
                          <span className="text-cm-muted block">Damage Status:</span>
                          <span className={`font-bold ${hasDamage ? "text-cm-red" : "text-emerald-700"}`}>
                            {hasDamage ? `⚠️ ₹${r.damageReport?.amount || 0} (${r.damageReport?.status})` : "✓ NONE"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for Lifecycle Transitions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cm-border/60">
                        {/* 1. Confirm Advance */}
                        {!hasAdvance && (
                          <button
                            onClick={() => handleConfirmAdvance(id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                          >
                            Mark ₹50 Advance Received
                          </button>
                        )}

                        {/* 2. Handover Inspection */}
                        {hasAdvance && !hasHandover && (
                          <button
                            onClick={() => {
                              setInspectionData({
                                condition: "Good",
                                stains: false,
                                tears: false,
                                brokenButtons: false,
                                brokenZipper: false,
                                fabricDamage: false,
                                missingAccessories: false,
                                notes: "",
                                photoUrl: ""
                              });
                              setInspectionModal({ type: "handover", rental: r });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Camera size={14} />
                            <span>Perform Handover Inspection</span>
                          </button>
                        )}

                        {/* 3. Record Remaining Cash Payment at Handover */}
                        {hasHandover && !hasRemaining && (
                          <button
                            onClick={() => handleRecordRemaining(id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                          >
                            Collect Remaining ₹{r.remainingAmount} & Activate
                          </button>
                        )}

                        {/* 4. Handle Extension Requests */}
                        {hasExtension && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-xl">
                              Extension Requested
                            </span>
                            <button
                              onClick={() => handleReviewExtension(id, "APPROVED")}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewExtension(id, "REJECTED")}
                              className="px-2.5 py-1 rounded-xl bg-cm-red hover:bg-red-700 text-white text-xs font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* 5. Return Inspection */}
                        {hasRemaining && r.rentalStatus !== "COMPLETED" && (
                          <button
                            onClick={() => {
                              setInspectionData({
                                condition: "Good",
                                stains: false,
                                tears: false,
                                brokenButtons: false,
                                brokenZipper: false,
                                fabricDamage: false,
                                missingAccessories: false,
                                notes: "",
                                photoUrl: ""
                              });
                              setInspectionModal({ type: "return", rental: r });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Camera size={14} />
                            <span>Return Inspection</span>
                          </button>
                        )}

                        {/* 6. Report Damage */}
                        {r.rentalStatus !== "COMPLETED" && !hasDamage && (
                          <button
                            onClick={() => {
                              setDamageData({
                                description: "Tear observed on sleeve",
                                severity: "minor",
                                amount: 300,
                                photoUrl: ""
                              });
                              setDamageModal(r);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-cm-red text-cm-red hover:bg-red-50 text-xs font-bold transition-colors"
                          >
                            Report Damage
                          </button>
                        )}

                        {/* 7. Resolve Damage */}
                        {hasDamage && r.damageReport?.status !== "DAMAGE_RESOLVED" && (
                          <button
                            onClick={() => handleResolveDamage(id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                          >
                            Resolve Damage (₹{r.damageReport?.amount}) & Complete
                          </button>
                        )}

                        {/* 8. Mark Completed */}
                        {r.rentalStatus !== "COMPLETED" && !hasDamage && (
                          <button
                            onClick={() => handleComplete(id)}
                            className="px-3 py-1.5 rounded-xl border border-cm-border text-cm-black hover:bg-cm-soft text-xs font-bold transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: INVENTORY CATALOG ────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-display font-bold text-cm-black">Cloth Rental Catalog</h3>
              <p className="text-xs text-cm-muted">Manage cloth sizes, pricing, and availability</p>
            </div>
            <button
              onClick={() => {
                handleResetForm();
                setActiveTab("add");
              }}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add New Cloth</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((cloth) => {
              const id = cloth.id || cloth._id;
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-cm-border p-4 bg-cm-soft/30 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={cloth.images?.[0] || "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"}
                      alt={cloth.name}
                      className="w-16 h-20 rounded-xl object-cover border border-cm-border shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-cm-black truncate">{cloth.name}</h4>
                      <p className="text-xs text-cm-muted">{cloth.category} • {cloth.gender}</p>
                      <p className="text-xs font-bold text-cm-red mt-1">Rent: ₹{cloth.rentPrice}/day</p>
                      <p className="text-2xs text-cm-muted">Retail: ₹{cloth.price}</p>
                    </div>
                  </div>

                  {/* Size Variants */}
                  <div className="pt-2 border-t border-cm-border">
                    <p className="text-2xs uppercase tracking-wider font-bold text-cm-muted mb-1.5">Size Inventory</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cloth.sizeVariants?.length ? (
                        cloth.sizeVariants.map((v) => (
                          <span
                            key={v.size}
                            className={`px-2 py-0.5 rounded-lg text-2xs font-bold border ${
                              v.stock > 0
                                ? "bg-white border-cm-border text-cm-black"
                                : "bg-red-50 border-red-200 text-cm-red line-through"
                            }`}
                          >
                            {v.size}: {v.stock}
                          </span>
                        ))
                      ) : (
                        <span className="text-2xs text-cm-muted">Total stock: {cloth.stock}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-cm-border">
                    <button
                      onClick={() => handleOpenEdit(cloth)}
                      className="p-2 rounded-xl text-cm-muted hover:text-cm-black hover:bg-white transition-colors"
                      title="Edit cloth"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(id)}
                      className="p-2 rounded-xl text-cm-muted hover:text-cm-red hover:bg-red-50 transition-colors"
                      title="Delete cloth"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: ADD / EDIT CLOTH ─────────────────────────────────────────── */}
      {activeTab === "add" && (
        <form onSubmit={handleSaveProduct} className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-6 max-w-3xl">
          <div className="flex justify-between items-center pb-4 border-b border-cm-border">
            <div>
              <h3 className="text-xl font-display font-bold text-cm-black">
                {editingProduct ? "Edit Cloth Product" : "Add New Cloth to Rental Catalog"}
              </h3>
              <p className="text-xs text-cm-muted">Set cloth details, images, rental pricing, and size quantities</p>
            </div>
            {editingProduct && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-semibold text-cm-muted hover:text-cm-black"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-black block mb-2">Cloth Image</label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Cloth Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Embroidered Sherwani"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black bg-white"
              >
                <option value="Ethnic">Ethnic / Traditional</option>
                <option value="Suits">Suits & Blazers</option>
                <option value="Dresses">Evening Dresses</option>
                <option value="Bridal">Bridal & Groom</option>
                <option value="Casual">Luxury Casual</option>
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((c) => ({ ...c, gender: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black bg-white"
              >
                <option value="Women">Women</option>
                <option value="Men">Men</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Rental Price (₹ / day)</label>
              <input
                type="number"
                min="0"
                required
                value={form.rentPrice}
                onChange={(e) => setForm((c) => ({ ...c, rentPrice: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-bold text-cm-red"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Retail Reference Value (₹)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Security Deposit (₹)</label>
              <input
                type="number"
                min="0"
                value={form.securityDeposit}
                onChange={(e) => setForm((c) => ({ ...c, securityDeposit: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
              />
            </div>
          </div>

          {/* Clothing Size Variants & Stock per Size (Part 6 & 7) */}
          <div className="p-4 rounded-2xl bg-cm-soft/60 border border-cm-border space-y-3">
            <div>
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black block">
                Clothing Size Inventory (Quantity per Size)
              </label>
              <p className="text-2xs text-cm-muted">Set available units for each size variant (XS - 3XL)</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ALL_SIZES.map((size) => (
                <div key={size} className="space-y-1 text-center bg-white p-2 rounded-xl border border-cm-border">
                  <span className="text-xs font-bold text-cm-black block">{size}</span>
                  <input
                    type="number"
                    min="0"
                    value={sizeStocks[size] ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setSizeStocks((curr) => ({ ...curr, [size]: val }));
                    }}
                    className="w-full text-center text-xs p-1 rounded-lg border border-cm-border focus:border-cm-black font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Description & Care Notes</label>
            <textarea
              rows={3}
              placeholder="Fabric details, accessories included, dry clean instructions..."
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg"
          >
            {editingProduct ? "Save Changes" : "Create Cloth in Catalog"}
          </button>
        </form>
      )}

      {/* ── INSPECTION MODAL (Handover or Return) ────────────────────────────── */}
      {inspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-cm-border shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-cm-border">
              <div>
                <span className="text-2xs uppercase tracking-widest font-bold text-cm-red">Inspection Form</span>
                <h3 className="font-display font-bold text-lg text-cm-black">
                  {inspectionModal.type === "handover" ? "Handover Baseline Inspection" : "Return Condition Inspection"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectionModal(null)}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Overall Condition</label>
                <select
                  value={inspectionData.condition}
                  onChange={(e) => setInspectionData((c) => ({ ...c, condition: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border bg-white font-medium"
                >
                  <option value="Pristine">Pristine / Like New</option>
                  <option value="Good">Good / Standard</option>
                  <option value="Fair">Fair / Noticeable Wear</option>
                  <option value="Damaged">Damaged / Stained</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.stains}
                    onChange={(e) => setInspectionData((c) => ({ ...c, stains: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Stains present</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.tears}
                    onChange={(e) => setInspectionData((c) => ({ ...c, tears: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Tears / Rips</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.brokenButtons}
                    onChange={(e) => setInspectionData((c) => ({ ...c, brokenButtons: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Broken Buttons</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.brokenZipper}
                    onChange={(e) => setInspectionData((c) => ({ ...c, brokenZipper: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Broken Zipper</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.fabricDamage}
                    onChange={(e) => setInspectionData((c) => ({ ...c, fabricDamage: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Fabric Damage</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-cm-border bg-cm-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inspectionData.missingAccessories}
                    onChange={(e) => setInspectionData((c) => ({ ...c, missingAccessories: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Missing Accessories</span>
                </label>
              </div>

              {/* Inspection Photo URL (Persistent) */}
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Inspection Photo URL</label>
                <input
                  type="url"
                  placeholder="https://... or uploaded image URL"
                  value={inspectionData.photoUrl}
                  onChange={(e) => setInspectionData((c) => ({ ...c, photoUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Inspection Notes</label>
                <textarea
                  rows={2}
                  placeholder="Note specific details observed during mutual inspection..."
                  value={inspectionData.notes}
                  onChange={(e) => setInspectionData((c) => ({ ...c, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 text-xs font-bold rounded-xl"
              >
                Save Inspection Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── DAMAGE REPORT MODAL ─────────────────────────────────────────────── */}
      {damageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-cm-border shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-cm-border">
              <div>
                <span className="text-2xs uppercase tracking-widest font-bold text-cm-red">Incident Assessment</span>
                <h3 className="font-display font-bold text-lg text-cm-black">Report Rental Damage</h3>
              </div>
              <button
                type="button"
                onClick={() => setDamageModal(null)}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDamage} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Damage Description</label>
                <input
                  type="text"
                  required
                  value={damageData.description}
                  onChange={(e) => setDamageData((c) => ({ ...c, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Severity</label>
                  <select
                    value={damageData.severity}
                    onChange={(e) => setDamageData((c) => ({ ...c, severity: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border bg-white"
                  >
                    <option value="minor">Minor (Stain/Loose stitch)</option>
                    <option value="moderate">Moderate (Torn hem/zipper)</option>
                    <option value="severe">Severe (Irreparable/Burn)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Repair Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={damageData.amount}
                    onChange={(e) => setDamageData((c) => ({ ...c, amount: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border font-bold text-cm-red"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Damage Photo Evidence URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={damageData.photoUrl}
                  onChange={(e) => setDamageData((c) => ({ ...c, photoUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              <p className="text-2xs text-cm-muted">
                Note: Damage charge is tracked as an isolated settlement and is NOT added to the original rental fee.
              </p>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 text-xs font-bold rounded-xl"
              >
                Register Damage Report
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
