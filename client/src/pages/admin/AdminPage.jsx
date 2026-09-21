import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi, productApi, userApi } from "../../api/endpoints";
import ImageUpload from "../../components/admin/ImageUpload";
import SectionHeader from "../../components/common/SectionHeader";
import { Trash2 } from "lucide-react";

const emptyProduct = {
  name: "",
  category: "",
  price: 0,
  rentPrice: 0,
  securityDeposit: 0,
  stock: 10,
  sizes: "S,M,L",
  badge: "New",
  description: "",
  tags: "new",
  sku: "",
  barcode: ""
};

const NUMBER_FIELDS = ["price", "rentPrice", "securityDeposit", "stock"];

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [dashboardResponse, usersResponse, productsResponse] = await Promise.all([
        adminApi.dashboard(),
        userApi.all(),
        productApi.list()
      ]);
      setDashboard(dashboardResponse.data.data);
      setUsers(usersResponse.data.data);
      setCatalog(productsResponse.data.data.items);
    } catch {
      setMessage("❌ Failed to load admin dashboard data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await productApi.create({
        ...form,
        sizes: typeof form.sizes === "string" ? form.sizes.split(",").map((item) => item.trim()) : form.sizes,
        tags: typeof form.tags === "string" ? form.tags.split(",").map((item) => item.trim()) : form.tags,
        images: imageUrl ? [imageUrl] : ["https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"],
        available: true
      });
      setForm(emptyProduct);
      setImageUrl("");
      setMessage("✅ Product saved successfully.");
      load();
    } catch (err) {
      setMessage(`❌ Failed to save product: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await productApi.remove(productId);
      setMessage("✅ Product removed from catalog.");
      load();
    } catch (err) {
      setMessage(`❌ Failed to delete product: ${err.response?.data?.message || err.message}`);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await userApi.remove(userId);
      setMessage("✅ User removed.");
      load();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Failed to delete user."}`);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Admin HQ"
        title="Revenue, Operations, and Inventory"
        description="Monitor top-line health, manage products, view sales trends, and manage operations."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {Object.entries(dashboard?.kpis || {}).map(([key, value]) => (
          <article key={key} className="rounded-3xl bg-white border border-cm-border p-5 shadow-card">
            <p className="text-2xs uppercase tracking-[0.2em] font-bold text-cm-muted">{key}</p>
            <h3 className="mt-2 text-3xl font-display font-bold text-cm-black">
              {key === "revenue" ? `₹${Number(value).toLocaleString("en-IN")}` : value}
            </h3>
          </article>
        ))}
      </div>

      {/* Sales Chart + Add Product */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl bg-white border border-cm-border p-6 shadow-card">
          <h3 className="text-xl font-display font-bold text-cm-black">Sales Performance</h3>
          <p className="text-xs text-cm-muted mt-1">Monthly order revenue aggregation</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.salesChart || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#777777" fontSize={12} />
                <YAxis stroke="#777777" fontSize={12} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                <Bar dataKey="sales" fill="#d62828" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-cm-border p-6 shadow-card space-y-4">
          <h3 className="text-xl font-display font-bold text-cm-black">Add New Product</h3>
          {message && (
            <p className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${message.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-cm-red/10 text-cm-red border border-cm-red/20"}`}>
              {message}
            </p>
          )}

          <ImageUpload value={imageUrl} onChange={setImageUrl} />

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {Object.entries(form).map(([key, value]) => (
              <div key={key} className="space-y-1 text-left">
                <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </label>
                <input
                  type={NUMBER_FIELDS.includes(key) ? "number" : "text"}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border focus:border-cm-black"
                  value={value}
                  min={NUMBER_FIELDS.includes(key) ? 0 : undefined}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {saving ? "Saving Product..." : "Save Product"}
          </button>
        </form>
      </div>

      {/* Catalog + Customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white border border-cm-border p-6 shadow-card">
          <h3 className="text-xl font-display font-bold text-cm-black">Catalog ({catalog.length})</h3>
          <div className="mt-4 space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {catalog.map((product) => (
              <div key={product.id || product._id} className="flex items-center justify-between gap-3 rounded-2xl border border-cm-border p-3.5 bg-cm-soft">
                <div className="flex items-center gap-3 min-w-0">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-12 w-12 rounded-xl object-cover bg-white shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-cm-black truncate">{product.name}</h4>
                    <p className="text-xs text-cm-muted">
                      {product.category} • ₹{product.price}
                      {product.rentPrice ? ` • Rent ₹${product.rentPrice}/day` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-cm-black">{product.stock} units</span>
                  <button
                    onClick={() => handleDeleteProduct(product.id || product._id)}
                    className="p-2 text-cm-muted hover:text-cm-red transition-colors"
                    title="Delete product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-cm-border p-6 shadow-card">
          <h3 className="text-xl font-display font-bold text-cm-black">Users ({users.length})</h3>
          <div className="mt-4 space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {users.map((u) => (
              <div key={u.id || u._id} className="flex items-center justify-between gap-3 rounded-2xl border border-cm-border p-3.5 bg-cm-soft">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="font-display text-sm font-bold text-cm-black truncate">{u.name}</strong>
                    <span className={`badge ${
                      u.role === "master" ? "bg-purple-600 text-white" :
                      u.role === "admin" ? "bg-blue-600 text-white" :
                      "badge-rent"
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-cm-muted mt-0.5 truncate">{u.email}</p>
                </div>

                {u.role !== "master" && (
                  <button
                    onClick={() => handleDeleteUser(u.id || u._id)}
                    className="p-2 text-cm-muted hover:text-cm-red transition-colors shrink-0"
                    title="Delete user"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
