import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Users,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  Activity,
  Layers,
  DollarSign,
  FileText
} from "lucide-react";
import api from "../../api/client";
import SectionHeader from "../../components/common/SectionHeader";

export default function MasterAdminPage() {
  const [analytics, setAnalytics] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Create Admin Form
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [analyticsRes, adminsRes, logsRes] = await Promise.all([
        api.get("/master-admin/analytics"),
        api.get("/master-admin/admins"),
        api.get("/master-admin/logs")
      ]);
      setAnalytics(analyticsRes.data.data?.kpis || {});
      setAdmins(adminsRes.data.data || []);
      setAuditLogs(logsRes.data.data || []);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to load master admin console."}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setCreating(true);
    setMessage("");
    try {
      await api.post("/master-admin/admins", newAdmin);
      setMessage("✅ New Admin staff account created successfully.");
      setNewAdmin({ name: "", email: "", password: "" });
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to create Admin."}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(adminId, currentStatus) {
    const nextStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await api.patch(`/master-admin/admins/${adminId}/status`, { status: nextStatus });
      setMessage(`✅ Admin status updated to ${nextStatus}.`);
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to update status."}`);
    }
  }

  async function handleDeleteAdmin(adminId) {
    if (!window.confirm("Are you sure you want to permanently delete this Admin account?")) return;
    try {
      await api.delete(`/master-admin/admins/${adminId}`);
      setMessage("✅ Admin account removed.");
      loadData();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to delete Admin."}`);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader
        eyebrow="Master Console"
        title="Master Admin Command & Governance"
        description="Oversee enterprise platform analytics, govern Admin accounts, monitor audit trails, and control platform financial metrics."
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

      {/* Platform-Wide Financial & Operational KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Total Users</p>
          <h3 className="mt-1 text-2xl font-display font-bold">{analytics?.totalUsers ?? 0}</h3>
        </article>

        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Active Admins</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-blue-400">{analytics?.totalAdmins ?? admins.length}</h3>
        </article>

        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Total Clothes</p>
          <h3 className="mt-1 text-2xl font-display font-bold">{analytics?.totalClothes ?? 0}</h3>
        </article>

        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Units Available</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-emerald-400">{analytics?.availableInventory ?? 0}</h3>
        </article>

        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Total Rental Value</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-amber-400">
            ₹{(analytics?.totalRentalValue ?? 0).toLocaleString("en-IN")}
          </h3>
        </article>

        <article className="rounded-3xl bg-neutral-900 text-white p-5 border border-neutral-800 shadow-md">
          <p className="text-2xs uppercase tracking-widest font-bold text-neutral-400">Advances Collected</p>
          <h3 className="mt-1 text-2xl font-display font-bold text-emerald-400">
            ₹{(analytics?.advanceCollected ?? 0).toLocaleString("en-IN")}
          </h3>
        </article>
      </div>

      {/* Admin Management Section + Create Admin Form */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Admin Staff Table */}
        <section className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-cm-border">
            <div>
              <h3 className="text-lg font-display font-bold text-cm-black">Admin Accounts</h3>
              <p className="text-xs text-cm-muted">Manage staff privileges and activation status</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {admins.length} Staff Members
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {!admins.length ? (
              <p className="text-xs text-cm-muted py-6 text-center">No Admin accounts created yet.</p>
            ) : (
              admins.map((adm) => {
                const id = adm.id || adm._id;
                const isActive = adm.status === "active";
                return (
                  <div
                    key={id}
                    className="p-4 rounded-2xl border border-cm-border bg-cm-soft/40 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="font-display text-sm font-bold text-cm-black truncate">{adm.name}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                          isActive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                          {adm.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-cm-muted truncate mt-0.5">{adm.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(id, adm.status)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border ${
                          isActive
                            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        }`}
                        title={isActive ? "Disable admin account" : "Activate admin account"}
                      >
                        {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                        <span className="hidden sm:inline">{isActive ? "Disable" : "Activate"}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAdmin(id)}
                        className="p-2 rounded-xl text-cm-muted hover:text-cm-red hover:bg-red-50 transition-colors border border-cm-border"
                        title="Delete admin account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Create New Admin Form */}
        <form onSubmit={handleCreateAdmin} className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cm-border">
            <UserPlus size={18} className="text-cm-red" />
            <h3 className="text-lg font-display font-bold text-cm-black">Create Admin Staff</h3>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Operations Manager"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin((c) => ({ ...c, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Work Email</label>
            <input
              type="email"
              required
              placeholder="staff@clothmarket.com"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin((c) => ({ ...c, email: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin((c) => ({ ...c, password: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-cm-border focus:border-cm-black"
            />
          </div>

          <p className="text-2xs text-cm-muted">
            The newly created Admin will receive staff permissions to manage clothes, inspections, and rental fulfillments, but will NOT receive Master Admin governance rights.
          </p>

          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary w-full py-3 text-xs font-bold rounded-2xl shadow-md disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Admin Account"}
          </button>
        </form>
      </div>

      {/* Platform Audit Trail (Part 38) */}
      <section className="rounded-3xl bg-white border border-cm-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-cm-border">
          <Activity size={18} className="text-blue-600" />
          <h3 className="text-lg font-display font-bold text-cm-black">Platform Audit Trail</h3>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {!auditLogs.length ? (
            <p className="text-xs text-cm-muted py-4 text-center">No recent audit logs.</p>
          ) : (
            auditLogs.map((log) => {
              const id = log._id || log.id;
              return (
                <div key={id} className="p-3 rounded-xl border border-cm-border bg-cm-soft/30 text-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-cm-black text-white text-2xs font-bold uppercase">
                      {log.actorRole}
                    </span>
                    <span className="font-semibold text-cm-black">{log.action}</span>
                    {log.targetId && (
                      <span className="text-2xs text-cm-muted">Target: {log.targetId}</span>
                    )}
                  </div>
                  <span className="text-2xs text-cm-muted shrink-0">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
