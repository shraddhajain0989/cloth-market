import { useEffect, useState } from "react";
import { orderApi, rentalApi, userApi } from "../../api/endpoints";
import SectionHeader from "../../components/common/SectionHeader";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [profileResponse, orderResponse, rentalResponse] = await Promise.all([
        userApi.me(),
        orderApi.orders(),
        rentalApi.list()
      ]);
      setProfile(profileResponse.data.data);
      setOrders(orderResponse.data.data);
      setRentals(rentalResponse.data.data);
      setForm({ name: profileResponse.data.data.name, email: profileResponse.data.data.email });
    }

    load();
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    const { data } = await userApi.updateMe(form);
    setProfile((current) => ({ ...current, ...data.data }));
    setMessage("Profile saved.");
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="My Account" title="Profile and Membership" description="Manage personal details, loyalty, wishlist sync, order history, and rental activity from one place." />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSave} className="rounded-[28px] bg-white/90 p-6 shadow-glow">
          <h3 className="text-xl font-bold text-slate-950">Profile details</h3>
          <div className="mt-4 grid gap-4">
            <input className="rounded-2xl border-slate-200" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="rounded-2xl border-slate-200" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Save profile</button>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          </div>
          <div className="mt-6 rounded-[24px] bg-sand p-4 text-sm text-slate-700">
            Wallet ₹{profile?.walletBalance || 0} • Loyalty points {profile?.loyaltyPoints || 0}
          </div>
        </form>
        <div className="grid gap-6">
          <section className="rounded-[28px] bg-white/90 p-6 shadow-glow">
            <h3 className="text-xl font-bold text-slate-950">Order history</h3>
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{order.id}</strong>
                    <span className="text-sm text-slate-500">{order.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Total ₹{order.total} • {order.items.length} items</p>
                </article>
              ))}
              {!orders.length ? <p className="text-sm text-slate-500">No orders yet.</p> : null}
            </div>
          </section>
          <section className="rounded-[28px] bg-white/90 p-6 shadow-glow">
            <h3 className="text-xl font-bold text-slate-950">Rental history</h3>
            <div className="mt-4 space-y-3">
              {rentals.map((rental) => (
                <article key={rental.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{rental.productName}</strong>
                    <span className="text-sm text-slate-500">{rental.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {rental.durationDays} days • ₹{rental.total} • deposit ₹{rental.deposit}
                  </p>
                </article>
              ))}
              {!rentals.length ? <p className="text-sm text-slate-500">No rentals yet.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
