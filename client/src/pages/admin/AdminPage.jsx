import { useEffect, useState, useRef } from "react";
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
  X,
  QrCode,
  MessageCircle,
  Download,
  ShieldCheck,
  Filter,
  Copy,
  ExternalLink,
  Images,
  ShieldAlert
} from "lucide-react";
import { adminApi, productApi, paymentApi, configApi, uploadApi } from "../../api/endpoints";
import ImageUpload from "../../components/admin/ImageUpload";
import SectionHeader from "../../components/common/SectionHeader";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("rentals"); // 'rentals' | 'inventory' | 'add' | 'payments' | 'settings'
  const [dashboard, setDashboard] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [message, setMessage] = useState("");

  // Bulk Cloth Removal State
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkBlockedDetails, setBulkBlockedDetails] = useState(null);

  // Product Form
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Ethnic",
    gender: "Women",
    listingType: "RENT", // 'RENT' | 'RESELL' | 'BOTH'
    condition: "Like new", // 'New with tags' | 'Like new' | 'Gently used'
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

  // Payments & Manual Verification State
  const [payments, setPayments] = useState([]);
  const [paymentFilterStatus, setPaymentFilterStatus] = useState("ALL");
  const [paymentFilterType, setPaymentFilterType] = useState("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verifyModal, setVerifyModal] = useState({
    open: false,
    payment: null,
    confirmed: false,
    transactionReference: "",
    notes: ""
  });
  const [rejectModal, setRejectModal] = useState({
    open: false,
    payment: null,
    rejectionReason: "",
    notes: ""
  });

  // Business QR & WhatsApp Config State
  const [businessConfig, setBusinessConfig] = useState({
    businessName: "Cloth Market",
    whatsappNumber: "",
    paymentQrUrl: "",
    upiId: "",
    paymentInstructions: ""
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef(null);

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
      const [dashRes, rentalsRes, prodRes, payRes, cfgRes] = await Promise.allSettled([
        adminApi.dashboard(),
        adminApi.rentals(),
        productApi.list(),
        paymentApi.list(),
        configApi.getAdmin()
      ]);

      // Check if backend rejected administrative requests
      const isForbidden = [dashRes, rentalsRes, payRes, cfgRes].some(
        (res) => res.status === "rejected" && [401, 403].includes(res.reason?.response?.status)
      );

      if (isForbidden) {
        setUnauthorized(true);
        setDashboard(null);
        setRentals([]);
        setCatalog([]);
        setPayments([]);
        setBusinessConfig({});
        setLoading(false);
        return;
      }

      if (dashRes.status === "fulfilled") setDashboard(dashRes.value.data?.data);
      if (rentalsRes.status === "fulfilled") setRentals(rentalsRes.value.data?.data || []);
      if (prodRes.status === "fulfilled") setCatalog(prodRes.value.data?.data?.items || []);
      if (payRes.status === "fulfilled") setPayments(payRes.value.data?.data || []);
      if (cfgRes.status === "fulfilled") setBusinessConfig(cfgRes.value.data?.data || {});
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
    const existingImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : prod.image
      ? [prod.image]
      : [];

    setForm({
      name: prod.name,
      category: prod.category,
      gender: prod.gender || "Women",
      listingType: prod.listingType || "RENT",
      condition: prod.condition || "Like new",
      rentPrice: prod.rentPrice || 0,
      price: prod.price || 0,
      securityDeposit: prod.securityDeposit || 0,
      description: prod.description || "",
      images: existingImages
    });

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
      listingType: "RENT",
      condition: "Like new",
      rentPrice: 500,
      price: 3500,
      securityDeposit: 0,
      description: "",
      images: []
    });
    setSizeStocks({ S: 2, M: 5, L: 4, XL: 2 });
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    if (savingProduct) return;
    setMessage("");

    // 1. Validate images: 1 to 5 images
    if (!form.images || form.images.length === 0) {
      setMessage("❌ Please upload at least 1 cloth image (up to 5 maximum).");
      return;
    }
    if (form.images.length > 5) {
      setMessage(`❌ A maximum of 5 images is allowed per product (currently ${form.images.length}).`);
      return;
    }

    // 2. Validate pricing based on listing type
    if (form.listingType === "RENT" && Number(form.rentPrice) <= 0) {
      setMessage("❌ Rental price per day is required for RENT listings.");
      return;
    }
    if (form.listingType === "RESELL" && Number(form.price) <= 0) {
      setMessage("❌ Selling price is required for RESELL listings.");
      return;
    }
    if (form.listingType === "BOTH") {
      if (Number(form.rentPrice) <= 0 || Number(form.price) <= 0) {
        setMessage("❌ Both rental price and selling price are required for BOTH (RENT & RESELL) listings.");
        return;
      }
    }

    // 3. Validate size variants stock
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

    const payload = {
      ...form,
      rentPrice: Number(form.rentPrice),
      price: Number(form.price),
      securityDeposit: Number(form.securityDeposit),
      sizeVariants,
      sizes: sizeVariants.map((v) => v.size),
      images: form.images
    };

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id || editingProduct._id, payload);
        setMessage("✅ Cloth product updated successfully.");
      } else {
        await productApi.create(payload);
        setMessage("✅ New cloth added to catalog.");
      }
      handleResetForm();
      setActiveTab("inventory");
      loadData();
    } catch (err) {
      setMessage(`❌ Save failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingProduct(false);
    }
  }

  // Payment Verification Handlers
  async function handleVerifyPaymentSubmit(e) {
    e.preventDefault();
    if (!verifyModal.confirmed) {
      setMessage("❌ Please explicitly check the confirmation box verifying actual receipt of payment.");
      return;
    }

    setVerifyingPayment(true);
    try {
      const paymentId = verifyModal.payment?._id || verifyModal.payment?.id;
      await paymentApi.verify(paymentId, {
        confirmed: true,
        transactionReference: verifyModal.transactionReference,
        notes: verifyModal.notes
      });
      setMessage("✅ Payment marked as VERIFIED successfully.");
      setVerifyModal({ open: false, payment: null, confirmed: false, transactionReference: "", notes: "" });
      loadData();
    } catch (err) {
      setMessage(`❌ Verification failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setVerifyingPayment(false);
    }
  }

  async function handleRejectPaymentSubmit(e) {
    e.preventDefault();
    if (!rejectModal.rejectionReason.trim()) {
      setMessage("❌ A valid rejection reason is required.");
      return;
    }

    setVerifyingPayment(true);
    try {
      const paymentId = rejectModal.payment?._id || rejectModal.payment?.id;
      await paymentApi.reject(paymentId, {
        rejectionReason: rejectModal.rejectionReason,
        notes: rejectModal.notes
      });
      setMessage("⚠️ Payment marked as REJECTED.");
      setRejectModal({ open: false, payment: null, rejectionReason: "", notes: "" });
      loadData();
    } catch (err) {
      setMessage(`❌ Rejection failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setVerifyingPayment(false);
    }
  }

  // Business Config (WhatsApp & QR) Handlers
  async function handleSaveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await configApi.updateAdmin(businessConfig);
      setMessage("✅ Business WhatsApp and Payment QR configuration saved successfully.");
      loadData();
    } catch (err) {
      setMessage(`❌ Failed to save settings: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleQrFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const { data } = await uploadApi.qr(file);
      const url = data?.data?.url || data?.url;
      if (url) {
        setBusinessConfig((curr) => ({ ...curr, paymentQrUrl: url }));
        await configApi.updateAdmin({ ...businessConfig, paymentQrUrl: url });
        setMessage("✅ Official Payment QR Code uploaded and saved.");
      }
    } catch (err) {
      setMessage(`❌ Failed to upload QR image: ${err.response?.data?.message || err.message}`);
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm("Are you sure you want to deactivate/delete this cloth item?")) return;
    try {
      await productApi.remove(id);
      setMessage("✅ Product removed.");
      setSelectedProductIds((prev) => prev.filter((item) => item !== id));
      loadData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  }

  function handleToggleSelect(id) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll() {
    if (selectedProductIds.length === catalog.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(catalog.map((cloth) => cloth.id || cloth._id));
    }
  }

  async function handleExecuteBulkRemove() {
    if (selectedProductIds.length === 0) return;
    setBulkLoading(true);
    setBulkBlockedDetails(null);

    try {
      const res = await adminApi.bulkRemoveProducts(selectedProductIds);
      const data = res.data?.data || {};
      const { removed = [], blocked = [] } = data;

      if (blocked.length > 0 && removed.length === 0) {
        setBulkBlockedDetails(blocked);
        setMessage(`⚠️ 0 clothes removed. ${blocked.length} items could not be removed because they have active/upcoming rentals.`);
      } else if (blocked.length > 0) {
        setBulkBlockedDetails(blocked);
        const removedIds = new Set(removed.map((r) => r.productId));
        setSelectedProductIds((prev) => prev.filter((id) => !removedIds.has(id)));
        setBulkConfirmOpen(false);
        setMessage(`⚠️ ${removed.length} clothes removed. ${blocked.length} could not be removed because they have active/upcoming rentals.`);
        loadData();
      } else {
        setSelectedProductIds([]);
        setBulkConfirmOpen(false);
        setMessage(`✅ ${removed.length} ${removed.length === 1 ? "cloth" : "clothes"} removed successfully.`);
        loadData();
      }
    } catch (err) {
      setMessage(`❌ Bulk removal failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setBulkLoading(false);
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

  if (unauthorized) {
    return (
      <div className="rounded-3xl bg-white border border-red-200 p-12 text-center shadow-sm max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-display font-bold text-cm-black">Access Denied</h2>
        <p className="text-sm text-cm-muted mt-2">
          You do not have administrative privileges to access this console. This request has been rejected by server-side role authorization.
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="mt-6 px-6 py-2.5 rounded-full bg-cm-black text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
        >
          Return to Storefront
        </button>
      </div>
    );
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
      <div className="flex border-b border-cm-border gap-2 text-sm font-bold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("rentals")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "rentals"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <Package size={16} />
          <span>Rental Orders ({rentals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
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
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "add"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <Plus size={16} />
          <span>{editingProduct ? "Edit Cloth" : "Add New Cloth"}</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "payments"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <ShieldCheck size={16} />
          <span>Payment Verifications ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "settings"
              ? "border-cm-black text-cm-black"
              : "border-transparent text-cm-muted hover:text-cm-black"
          }`}
        >
          <QrCode size={16} />
          <span>WhatsApp & Payment QR</span>
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
        <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

          {/* Bulk Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-cm-soft border border-cm-border">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-cm-black">
              <input
                type="checkbox"
                checked={catalog.length > 0 && selectedProductIds.length === catalog.length}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-cm-border text-cm-black focus:ring-0 cursor-pointer"
                aria-label="Select all clothes"
              />
              <span>Select All ({catalog.length} clothes)</span>
            </label>

            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-cm-black">
                  <strong className="text-cm-red">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? "cloth" : "clothes"} selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIds([]);
                    setBulkBlockedDetails(null);
                  }}
                  className="text-xs text-cm-muted hover:text-cm-black underline cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkBlockedDetails(null);
                    setBulkConfirmOpen(true);
                  }}
                  className="px-4 py-2 rounded-full bg-cm-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>REMOVE SELECTED</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((cloth) => {
              const id = cloth.id || cloth._id;
              const isSelected = selectedProductIds.includes(id);

              return (
                <div
                  key={id}
                  className={`rounded-2xl border p-4 bg-cm-soft/30 flex flex-col justify-between space-y-3 transition-all ${
                    isSelected ? "border-cm-black bg-white ring-2 ring-cm-black/10" : "border-cm-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <label className="flex items-center pt-1 cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(id)}
                        className="w-4 h-4 rounded border-cm-border text-cm-black focus:ring-0 cursor-pointer"
                        aria-label={`Select ${cloth.name}`}
                      />
                    </label>
                    <div className="relative shrink-0">
                      <img
                        src={cloth.images?.[0] || "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"}
                        alt={cloth.name}
                        className="w-16 h-20 rounded-xl object-cover border border-cm-border shrink-0"
                      />
                      {cloth.images?.length > 1 && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold flex items-center gap-0.5">
                          <Images size={9} /> {cloth.images.length}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-display font-bold text-sm text-cm-black truncate">{cloth.name}</h4>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          cloth.listingType === "BOTH"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : cloth.listingType === "RESELL"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {cloth.listingType === "BOTH" ? "Rent & Resell" : cloth.listingType === "RESELL" ? "Resale Only" : "Rent Only"}
                        </span>
                      </div>
                      <p className="text-xs text-cm-muted">{cloth.category} • {cloth.gender}</p>
                      {cloth.listingType !== "RESELL" && (
                        <p className="text-xs font-bold text-cm-red mt-0.5">Rent: ₹{cloth.rentPrice}/day</p>
                      )}
                      {(cloth.listingType === "RESELL" || cloth.listingType === "BOTH") && (
                        <p className="text-xs font-bold text-blue-700">Resale: ₹{cloth.price}</p>
                      )}
                      {cloth.listingType === "RENT" && (
                        <p className="text-2xs text-cm-muted">Retail ref: ₹{cloth.price}</p>
                      )}
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

      {/* ── BULK REMOVE CONFIRMATION MODAL ───────────────────────────────────── */}
      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-cm-border space-y-4">
            <div className="flex items-center gap-3 text-cm-red">
              <div className="p-2.5 rounded-full bg-red-50 text-cm-red">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-cm-black">
                  Remove {selectedProductIds.length} {selectedProductIds.length === 1 ? "cloth" : "clothes"}?
                </h3>
                <p className="text-xs text-cm-muted">Bulk inventory removal</p>
              </div>
            </div>

            <div className="p-3.5 bg-cm-soft rounded-2xl text-xs text-cm-muted leading-relaxed">
              Selected clothes will be removed from the active inventory. Historical rental records will be preserved.
            </div>

            {bulkBlockedDetails && bulkBlockedDetails.length > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1.5 max-h-48 overflow-y-auto">
                <p className="font-bold">⚠️ Some items cannot safely be removed:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {bulkBlockedDetails.map((b, i) => (
                    <li key={i}>
                      <strong>{b.name || b.productId}</strong>: {b.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBulkConfirmOpen(false);
                  setBulkBlockedDetails(null);
                }}
                disabled={bulkLoading}
                className="px-4 py-2 rounded-full border border-cm-border text-xs font-semibold text-cm-black hover:bg-cm-soft transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkRemove}
                disabled={bulkLoading || selectedProductIds.length === 0}
                className="px-5 py-2 rounded-full bg-cm-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {bulkLoading ? "Removing..." : "REMOVE SELECTED"}
              </button>
            </div>
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

          {/* Image Upload (1 to 5 Photos) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                Clothing Photos (1 to 5 Images) <span className="text-cm-red">*</span>
              </label>
              <span className="text-2xs font-semibold text-cm-muted">{form.images.length}/5 uploaded</span>
            </div>
            <p className="text-2xs text-cm-muted mb-2">
              The first image is used as the primary cover card. Use the arrows or drag to reorder.
            </p>
            <ImageUpload
              value={form.images}
              onChange={(newImgs) => setForm((c) => ({ ...c, images: newImgs }))}
              disabled={savingProduct}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-left sm:col-span-2">
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
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Listing Type</label>
              <select
                value={form.listingType}
                onChange={(e) => setForm((c) => ({ ...c, listingType: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black bg-white font-semibold"
              >
                <option value="RENT">Rent Only</option>
                <option value="RESELL">Resell Only (Buy)</option>
                <option value="BOTH">Both (Rent & Resell)</option>
              </select>
            </div>

            {(form.listingType === "RESELL" || form.listingType === "BOTH") ? (
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Garment Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm((c) => ({ ...c, condition: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black bg-white"
                >
                  <option value="New with tags">New with tags</option>
                  <option value="Like new">Like new</option>
                  <option value="Gently used">Gently used</option>
                </select>
              </div>
            ) : (
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
            )}

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

            {(form.listingType === "RESELL" || form.listingType === "BOTH") && (
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
            )}

            {/* Dynamic Pricing Fields */}
            {(form.listingType === "RENT" || form.listingType === "BOTH") && (
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
            )}

            {(form.listingType === "RESELL" || form.listingType === "BOTH") && (
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Resale Selling Price (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.price}
                  onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-bold text-blue-700"
                />
              </div>
            )}

            {form.listingType === "RENT" && (
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
            )}

            {(form.listingType === "RENT" || form.listingType === "BOTH") && (
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
            )}
          </div>

          {/* Clothing Size Variants & Stock per Size */}
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
            disabled={savingProduct}
            className="btn btn-primary w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg disabled:opacity-50"
          >
            {savingProduct ? "Saving Cloth..." : editingProduct ? "Save Changes" : "Create Cloth in Catalog"}
          </button>
        </form>
      )}

      {/* ── TAB 4: MANUAL PAYMENT VERIFICATIONS ──────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-cm-border">
              <div>
                <h3 className="text-xl font-display font-bold text-cm-black">Payment Verifications</h3>
                <p className="text-xs text-cm-muted">
                  Review customer UPI payments, verify transaction receipts, and approve booking advances
                </p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search customer, ref, or cloth..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-cm-border focus:border-cm-black"
                />

                <select
                  value={paymentFilterStatus}
                  onChange={(e) => setPaymentFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-cm-border bg-white font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Enquiry Initiated">WhatsApp Enquiries (Unpaid)</option>
                  <option value="Awaiting Confirmation">Awaiting Confirmation</option>
                  <option value="Awaiting Payment">Awaiting Payment</option>
                  <option value="Payment Reported">Payment Reported</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={paymentFilterType}
                  onChange={(e) => setPaymentFilterType(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-cm-border bg-white font-medium"
                >
                  <option value="ALL">All Types</option>
                  <option value="RENT">Rental Bookings</option>
                  <option value="BUY">Resale Purchases</option>
                </select>
              </div>
            </div>

            {/* Quick Status KPI summary */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 pb-2">
              <div className="p-3 rounded-2xl bg-cm-soft border border-cm-border">
                <span className="text-[10px] uppercase font-bold text-cm-muted block">Total Tracked</span>
                <span className="text-lg font-bold text-cm-black">{payments.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Enquiries</span>
                <span className="text-lg font-bold text-slate-700">
                  {payments.filter((p) => p.status === "Enquiry Initiated").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Awaiting Payment</span>
                <span className="text-lg font-bold text-amber-700">
                  {payments.filter((p) => p.status === "Awaiting Payment" || p.status === "Awaiting Confirmation").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Payment Reported</span>
                <span className="text-lg font-bold text-blue-700">
                  {payments.filter((p) => p.status === "Payment Reported").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verified</span>
                <span className="text-lg font-bold text-emerald-700">
                  {payments.filter((p) => p.status === "Verified").length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                <span className="text-[10px] uppercase font-bold text-cm-red block">Rejected</span>
                <span className="text-lg font-bold text-cm-red">
                  {payments.filter((p) => p.status === "Rejected").length}
                </span>
              </div>
            </div>
          </div>

          {/* List of Payments */}
          {(() => {
            const filteredPayments = payments.filter((p) => {
              if (paymentFilterStatus !== "ALL" && p.status !== paymentFilterStatus) return false;
              if (paymentFilterType !== "ALL" && p.transactionType !== paymentFilterType) return false;
              if (paymentSearch.trim()) {
                const q = paymentSearch.toLowerCase();
                const ref = (p.customerReference || "").toLowerCase();
                const name = (p.customer?.name || "").toLowerCase();
                const email = (p.customer?.email || "").toLowerCase();
                const phone = (p.customer?.phone || "").toLowerCase();
                const prod = (p.product?.name || "").toLowerCase();
                if (!ref.includes(q) && !name.includes(q) && !email.includes(q) && !phone.includes(q) && !prod.includes(q)) {
                  return false;
                }
              }
              return true;
            });

            if (filteredPayments.length === 0) {
              return (
                <div className="rounded-3xl bg-white border border-cm-border p-12 text-center shadow-sm">
                  <ShieldCheck size={36} className="mx-auto text-cm-muted mb-2" />
                  <p className="text-sm font-semibold text-cm-black">No payment records found.</p>
                  <p className="text-xs text-cm-muted mt-1">
                    When customers enquire or book clothes via WhatsApp, payment tracking records are automatically logged here.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredPayments.map((p) => {
                  const id = p._id || p.id;
                  const isRent = p.transactionType === "RENT";
                  const statusColors = {
                    "Enquiry Initiated": "bg-slate-100 text-slate-800 border-slate-300",
                    "Awaiting Confirmation": "bg-yellow-100 text-yellow-900 border-yellow-300",
                    "Awaiting Payment": "bg-amber-100 text-amber-900 border-amber-300",
                    "Payment Reported": "bg-blue-100 text-blue-900 border-blue-300",
                    "Verified": "bg-emerald-100 text-emerald-900 border-emerald-300",
                    "Rejected": "bg-red-100 text-red-900 border-red-300",
                    "Cancelled": "bg-gray-100 text-gray-800 border-gray-300"
                  };

                  return (
                    <div
                      key={id}
                      className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-4"
                    >
                      {/* Top Bar: Customer & Status */}
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-cm-border">
                        <div className="flex items-center gap-3">
                          {p.product?.images?.[0] ? (
                            <img
                              src={p.product.images[0]}
                              alt={p.product.name}
                              className="w-14 h-16 rounded-xl object-cover border border-cm-border shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-16 rounded-xl bg-cm-soft border border-cm-border flex items-center justify-center font-bold text-xs text-cm-muted shrink-0">
                              No Pic
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-display font-bold text-base text-cm-black">
                                {p.product?.name || "Cloth Item"}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isRent ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {isRent ? "Rental Booking" : "Resale Purchase"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-cm-soft text-cm-black border border-cm-border">
                                Size: {p.size}
                              </span>
                            </div>
                            <p className="text-2xs text-cm-muted mt-1">
                              Ref: <strong className="font-mono text-cm-black">{p.customerReference}</strong> • Created:{" "}
                              {new Date(p.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              statusColors[p.status] || "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle Grid: Customer Details & Financial Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Customer Information */}
                        <div className="p-3.5 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-cm-muted">Customer Details</p>
                          <p className="font-bold text-cm-black">{p.customer?.name || "Customer"}</p>
                          <p className="text-2xs text-cm-muted truncate">{p.customer?.email}</p>
                          {p.customer?.phone && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-2xs font-mono font-semibold text-cm-black">{p.customer.phone}</span>
                              <a
                                href={`https://wa.me/${p.customer.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                              >
                                <MessageCircle size={12} /> Chat
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Order & Dates Breakdown */}
                        <div className="p-3.5 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-cm-muted">
                            {isRent ? "Rental Schedule" : "Purchase Quantity"}
                          </p>
                          {isRent ? (
                            <>
                              <p className="font-semibold text-cm-black">
                                {p.rentalStartDate} → {p.rentalEndDate}
                              </p>
                              <p className="text-2xs text-cm-muted">{p.rentalDuration} Days Duration</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-cm-black">Quantity: {p.quantity || 1} item(s)</p>
                              <p className="text-2xs text-cm-muted">Direct Resale Purchase</p>
                            </>
                          )}
                        </div>

                        {/* Financial Amounts */}
                        <div className="p-3.5 rounded-2xl bg-cm-soft/50 border border-cm-border space-y-1">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-cm-muted">Payment Calculation</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-cm-muted">Total Amount:</span>
                            <span className="font-bold text-cm-black">₹{p.totalAmount}</span>
                          </div>
                          {isRent ? (
                            <>
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-amber-700">₹50 Advance (Booking):</span>
                                <span className="font-bold text-amber-700">₹{p.advanceAmount || 50}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-cm-muted">Remaining at Handover:</span>
                                <span className="font-semibold text-cm-black">₹{p.remainingAmount}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-blue-700">Expected Total:</span>
                              <span className="font-bold text-blue-700">₹{p.expectedAmount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Proof / Notes / Verification History */}
                      {(p.transactionReference || p.paymentProofUrl || p.customerNotes || p.verifiedAt || p.rejectionReason) && (
                        <div className="p-3.5 rounded-2xl bg-white border border-cm-border/80 text-xs space-y-1.5">
                          {p.transactionReference && (
                            <p>
                              <strong className="text-cm-black">UTR / Transaction Ref:</strong>{" "}
                              <span className="font-mono bg-cm-soft px-2 py-0.5 rounded text-2xs">{p.transactionReference}</span>
                            </p>
                          )}
                          {p.customerNotes && (
                            <p className="text-2xs text-cm-muted">
                              <strong>Customer Note:</strong> {p.customerNotes}
                            </p>
                          )}
                          {p.verifiedAt && (
                            <p className="text-2xs text-emerald-700 font-semibold">
                              ✓ Verified by {p.verifiedBy?.name || "Admin"} on {new Date(p.verifiedAt).toLocaleString()}
                              {p.adminNotes && ` — "${p.adminNotes}"`}
                            </p>
                          )}
                          {p.rejectionReason && (
                            <p className="text-2xs text-cm-red font-semibold">
                              ✕ Rejection Reason: {p.rejectionReason}
                              {p.adminNotes && ` — "${p.adminNotes}"`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cm-border">
                        <div className="flex items-center gap-2">
                          {/* Share Payment QR / Instructions on WhatsApp button */}
                          {businessConfig.whatsappNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                const phone = (p.customer?.phone || "").replace(/[^0-9]/g, "");
                                const msg = isRent
                                  ? `Hello ${p.customer?.name || ""}! Regarding your rental request for *${p.product?.name}* (Ref: ${p.customerReference}):\nPlease pay the ₹50 booking advance to confirm your rental dates (${p.rentalStartDate} to ${p.rentalEndDate}).\n\nOfficial UPI ID: ${businessConfig.upiId || "N/A"}\nPayment QR: ${businessConfig.paymentQrUrl || "Available on request"}\n\nRemaining ₹${p.remainingAmount} is payable in cash at handover!`
                                  : `Hello ${p.customer?.name || ""}! Regarding your purchase request for *${p.product?.name}* (Ref: ${p.customerReference}):\nPlease pay the total amount ₹${p.totalAmount} to complete your order.\n\nOfficial UPI ID: ${businessConfig.upiId || "N/A"}\nPayment QR: ${businessConfig.paymentQrUrl || "Available on request"}`;
                                const url = phone
                                  ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                                  : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                                window.open(url, "_blank");
                              }}
                              className="px-3.5 py-1.5 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageCircle size={14} />
                              <span>Send Payment Info on WhatsApp</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {p.status !== "Verified" && (
                            <button
                              type="button"
                              onClick={() =>
                                setVerifyModal({
                                  open: true,
                                  payment: p,
                                  confirmed: false,
                                  transactionReference: p.transactionReference || "",
                                  notes: ""
                                })
                              }
                              className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShieldCheck size={14} />
                              <span>Verify Payment</span>
                            </button>
                          )}

                          {p.status !== "Rejected" && p.status !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() =>
                                setRejectModal({
                                  open: true,
                                  payment: p,
                                  rejectionReason: "Payment not received in account",
                                  notes: ""
                                })
                              }
                              className="px-3.5 py-1.5 rounded-full border border-cm-border text-cm-red hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB 5: WHATSAPP & PAYMENT QR CONFIGURATION ────────────────────────── */}
      {activeTab === "settings" && (
        <div className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-6 max-w-3xl">
          <div className="pb-4 border-b border-cm-border">
            <h3 className="text-xl font-display font-bold text-cm-black">
              Official WhatsApp & Payment QR Management
            </h3>
            <p className="text-xs text-cm-muted">
              Configure your business phone number and official payment QR code for automated customer enquiry links
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* WhatsApp Business Phone Number */}
            <div className="space-y-1.5 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                Official Business WhatsApp Phone Number <span className="text-cm-red">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. 919876543210 (with country code, no + or spaces)"
                  value={businessConfig.whatsappNumber}
                  onChange={(e) => setBusinessConfig((c) => ({ ...c, whatsappNumber: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-mono"
                />
                {businessConfig.whatsappNumber && (
                  <a
                    href={`https://wa.me/${businessConfig.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink size={14} /> Test Link
                  </a>
                )}
              </div>
              <p className="text-2xs text-cm-muted">
                Format: International country code + mobile number (e.g. India is 91 followed by 10 digits). Do not include + or dashes.
              </p>
            </div>

            {/* Official Payment QR Code */}
            <div className="space-y-2 text-left p-4 rounded-2xl bg-cm-soft/50 border border-cm-border">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black block">
                Official Payment QR Code
              </label>
              <p className="text-2xs text-cm-muted">
                Upload your official UPI QR code (Google Pay, PhonePe, Paytm, or bank UPI). Customers can scan this to pay the ₹50 booking advance or buy resale items.
              </p>

              {businessConfig.paymentQrUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="w-40 h-40 p-2 bg-white rounded-2xl border border-cm-border flex items-center justify-center shrink-0">
                    <img
                      src={businessConfig.paymentQrUrl}
                      alt="Business Payment QR"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck size={14} /> QR Code is currently active
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={businessConfig.paymentQrUrl}
                        download="cloth-market-payment-qr.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-cm-border bg-white text-xs font-bold text-cm-black hover:bg-cm-soft flex items-center gap-1.5"
                      >
                        <Download size={13} /> Download QR
                      </a>
                      <button
                        type="button"
                        onClick={() => qrInputRef.current?.click()}
                        disabled={uploadingQr}
                        className="px-3 py-1.5 rounded-xl bg-cm-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode size={13} /> {uploadingQr ? "Uploading..." : "Replace QR"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-cm-border rounded-2xl text-center space-y-3 bg-white">
                  <QrCode size={36} className="mx-auto text-cm-muted" />
                  <p className="text-xs text-cm-muted">No QR code uploaded yet.</p>
                  <button
                    type="button"
                    onClick={() => qrInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="px-4 py-2 rounded-full bg-cm-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode size={14} /> {uploadingQr ? "Uploading..." : "Upload QR Image"}
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={qrInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleQrFileUpload}
                className="hidden"
              />
            </div>

            {/* Official UPI ID */}
            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Official UPI ID (VPA)</label>
              <input
                type="text"
                placeholder="e.g. clothmarket@upi or shop@okhdfcbank"
                value={businessConfig.upiId}
                onChange={(e) => setBusinessConfig((c) => ({ ...c, upiId: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black font-mono"
              />
            </div>

            {/* Payment Instructions */}
            <div className="space-y-1 text-left">
              <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                Payment Instructions for Customers
              </label>
              <textarea
                rows={3}
                placeholder="Step 1: Scan the QR code to pay ₹50 booking advance. Step 2: Share transaction screenshot on WhatsApp..."
                value={businessConfig.paymentInstructions}
                onChange={(e) => setBusinessConfig((c) => ({ ...c, paymentInstructions: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="btn btn-primary w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg disabled:opacity-50"
            >
              {savingConfig ? "Saving Settings..." : "Save WhatsApp & Payment Settings"}
            </button>
          </form>
        </div>
      )}

      {/* ── VERIFY PAYMENT MODAL ─────────────────────────────────────────────── */}
      {verifyModal.open && verifyModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-cm-border shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-cm-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-cm-black">Verify Customer Payment</h3>
                  <p className="text-2xs text-cm-muted">Confirm actual receipt in bank/UPI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal({ open: false, payment: null, confirmed: false, transactionReference: "", notes: "" })}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVerifyPaymentSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-cm-soft border border-cm-border text-xs space-y-1.5">
                <p>
                  <strong>Customer:</strong> {verifyModal.payment.customer?.name} ({verifyModal.payment.customer?.phone || verifyModal.payment.customer?.email})
                </p>
                <p>
                  <strong>Cloth:</strong> {verifyModal.payment.product?.name} (Size: {verifyModal.payment.size})
                </p>
                <p>
                  <strong>Transaction:</strong> {verifyModal.payment.transactionType === "RENT" ? "Rental Booking Advance" : "Resale Purchase"}
                </p>
                <div className="pt-1 border-t border-cm-border flex justify-between items-center text-sm font-bold">
                  <span>Amount to Verify:</span>
                  <span className="text-emerald-700 text-base">
                    ₹{verifyModal.payment.expectedAmount || (verifyModal.payment.transactionType === "RENT" ? 50 : verifyModal.payment.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                  Transaction / UTR Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012 or UPI Ref"
                  value={verifyModal.transactionReference}
                  onChange={(e) => setVerifyModal((c) => ({ ...c, transactionReference: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border font-mono"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                  Internal Verification Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about verification..."
                  value={verifyModal.notes}
                  onChange={(e) => setVerifyModal((c) => ({ ...c, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              {/* Explicit Mandatory Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer text-xs text-emerald-900 select-none">
                <input
                  type="checkbox"
                  required
                  checked={verifyModal.confirmed}
                  onChange={(e) => setVerifyModal((c) => ({ ...c, confirmed: e.target.checked }))}
                  className="mt-0.5 rounded border-emerald-400 text-emerald-700 focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold leading-relaxed">
                  I explicitly confirm that I have verified receipt of this payment in our bank account / UPI app.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModal({ open: false, payment: null, confirmed: false, transactionReference: "", notes: "" })}
                  className="px-4 py-2 rounded-full border border-cm-border text-xs font-semibold text-cm-black hover:bg-cm-soft cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!verifyModal.confirmed || verifyingPayment}
                  className="px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {verifyingPayment ? "Verifying..." : "Confirm Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT PAYMENT MODAL ─────────────────────────────────────────────── */}
      {rejectModal.open && rejectModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-cm-border shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-cm-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-50 text-cm-red">
                  <X size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-cm-black">Reject Payment</h3>
                  <p className="text-2xs text-cm-muted">Mark transaction as rejected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, payment: null, rejectionReason: "", notes: "" })}
                className="p-1.5 rounded-full hover:bg-cm-soft text-cm-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectPaymentSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                  Reason for Rejection <span className="text-cm-red">*</span>
                </label>
                <select
                  value={rejectModal.rejectionReason}
                  onChange={(e) => setRejectModal((c) => ({ ...c, rejectionReason: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border bg-white"
                >
                  <option value="Payment not received in account">Payment not received in bank/UPI account</option>
                  <option value="Incorrect amount paid">Incorrect amount paid</option>
                  <option value="Invalid or fake transaction screenshot">Invalid or fake transaction screenshot</option>
                  <option value="Booking date unavailable / conflict">Booking date unavailable / conflict</option>
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain rejection details for records..."
                  value={rejectModal.notes}
                  onChange={(e) => setRejectModal((c) => ({ ...c, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, payment: null, rejectionReason: "", notes: "" })}
                  className="px-4 py-2 rounded-full border border-cm-border text-xs font-semibold text-cm-black hover:bg-cm-soft cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectModal.rejectionReason.trim() || verifyingPayment}
                  className="px-5 py-2 rounded-full bg-cm-red text-white text-xs font-bold hover:bg-red-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {verifyingPayment ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
