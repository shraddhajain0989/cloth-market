import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, Tag, Plus, Minus } from "lucide-react";
import { orderApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";

export default function CartDrawer({ open, onClose, onOrderPlaced }) {
  const user = useAuthStore((state) => state.user);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [address, setAddress] = useState({
    line1: user?.addresses?.[0]?.line1 || "12 Campus Drive",
    city: user?.addresses?.[0]?.city || "Bengaluru",
    state: user?.addresses?.[0]?.state || "Karnataka",
    postalCode: user?.addresses?.[0]?.postalCode || "560001",
    country: "India"
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");

  useEffect(() => {
    if (open && user) {
      loadCart();
    }
  }, [open, user]);

  async function loadCart() {
    setLoading(true);
    try {
      const { data } = await orderApi.cart();
      setCartItems(data.data || []);
    } catch {
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleQtyChange(productId, currentQty, delta) {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      return handleRemove(productId);
    }
    try {
      const { data } = await orderApi.updateCartItem(productId, { quantity: newQty });
      setCartItems(data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update quantity.");
    }
  }

  async function handleRemove(productId) {
    try {
      const { data } = await orderApi.removeCartItem(productId);
      setCartItems(data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to remove item.");
    }
  }

  function handleApplyCoupon(e) {
    e.preventDefault();
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === "STUDENT40") {
      setAppliedCoupon({ code, type: "percent", value: 40, minOrderValue: 0 });
    } else if (code === "FLAT100") {
      setAppliedCoupon({ code, type: "fixed", value: 100, minOrderValue: 500 });
    } else if (code === "WELCOME10") {
      setAppliedCoupon({ code, type: "percent", value: 10, minOrderValue: 0 });
    } else {
      setCouponError("Invalid coupon code. Try STUDENT40 or FLAT100.");
    }
  }

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.08);
  const deliveryFee = subtotal > 1499 || subtotal === 0 ? 0 : 99;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      discount = Math.round((subtotal * appliedCoupon.value) / 100);
    } else {
      discount = appliedCoupon.value;
    }
  }

  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - discount);

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!cartItems.length) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        couponCode: appliedCoupon?.code,
        paymentMethod,
        shippingAddress: address
      };

      const { data } = await orderApi.placeOrder(payload);
      setSuccessMsg("🎉 Order placed successfully!");
      setCartItems([]);
      setAppliedCoupon(null);
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
        if (onOrderPlaced) onOrderPlaced(data.data);
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-[71] w-full max-w-lg bg-white shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-cm-border bg-cm-soft">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-cm-black" />
                <h3 className="font-display font-bold text-lg text-cm-black">Your Shopping Cart</h3>
                <span className="badge badge-new">{cartItems.length} items</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-cm-border transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="p-3 bg-cm-red/10 border border-cm-red/20 rounded-2xl text-xs font-semibold text-cm-red">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-700">
                  {successMsg}
                </div>
              )}

              {!user ? (
                <div className="text-center py-16 space-y-4">
                  <p className="text-cm-muted text-sm">Please log in to view and manage your cart.</p>
                </div>
              ) : loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 skeleton rounded-2xl" />
                  ))}
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-cm-soft flex items-center justify-center mx-auto text-cm-muted">
                    <ShoppingBag size={28} />
                  </div>
                  <p className="font-display font-bold text-base text-cm-black">Your cart is empty</p>
                  <p className="text-xs text-cm-muted max-w-xs mx-auto">
                    Explore our fresh drops or rental closet to add items to your bag.
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Item List */}
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="flex gap-4 p-3 border border-cm-border rounded-2xl bg-white shadow-sm items-center">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=200&auto=format&fit=crop"}
                          alt={item.name}
                          className="w-16 h-20 object-cover rounded-xl bg-cm-soft shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-display font-bold text-sm text-cm-black truncate">{item.name}</h4>
                          <p className="font-bold text-xs text-cm-red">₹{item.price?.toLocaleString("en-IN")}</p>

                          {/* Qty Counter */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center border border-cm-border rounded-lg bg-cm-soft">
                              <button
                                onClick={() => handleQtyChange(item.productId, item.quantity, -1)}
                                className="p-1 hover:bg-cm-border rounded-l-lg"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-2 text-xs font-bold text-cm-black">{item.quantity}</span>
                              <button
                                onClick={() => handleQtyChange(item.productId, item.quantity, 1)}
                                className="p-1 hover:bg-cm-border rounded-r-lg"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="p-2 text-cm-muted hover:text-cm-red transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Box */}
                  <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2">
                    <label className="text-2xs font-bold uppercase tracking-wider text-cm-black flex items-center gap-1">
                      <Tag size={12} className="text-cm-red" /> Apply Promo Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Try STUDENT40 or FLAT100"
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-cm-border focus:border-cm-black"
                      />
                      <button type="submit" className="btn btn-secondary text-xs py-2 px-4">Apply</button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-2xs font-bold text-emerald-600">✓ Coupon {appliedCoupon.code} applied!</p>
                    )}
                    {couponError && (
                      <p className="text-2xs font-semibold text-cm-red">{couponError}</p>
                    )}
                  </form>

                  {/* Shipping Address */}
                  <div className="space-y-2 pt-2 border-t border-cm-border">
                    <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Shipping Address</label>
                    <input
                      value={address.line1}
                      onChange={(e) => setAddress((curr) => ({ ...curr, line1: e.target.value }))}
                      placeholder="Street address / Hostel room"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-cm-border mb-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={address.city}
                        onChange={(e) => setAddress((curr) => ({ ...curr, city: e.target.value }))}
                        placeholder="City"
                        className="px-3 py-2 text-xs rounded-xl border border-cm-border"
                      />
                      <input
                        value={address.postalCode}
                        onChange={(e) => setAddress((curr) => ({ ...curr, postalCode: e.target.value }))}
                        placeholder="Postal Code"
                        className="px-3 py-2 text-xs rounded-xl border border-cm-border"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2 pt-2 border-t border-cm-border">
                    <label className="text-2xs font-bold uppercase tracking-wider text-cm-black">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cod")}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "cod" ? "border-cm-black bg-cm-black text-white" : "border-cm-border text-cm-muted"
                        }`}
                      >
                        Cash on Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("upi")}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "upi" ? "border-cm-black bg-cm-black text-white" : "border-cm-border text-cm-muted"
                        }`}
                      >
                        UPI / Card
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary & Checkout Action */}
            {user && cartItems.length > 0 && (
              <div className="p-6 border-t border-cm-border bg-cm-soft space-y-4">
                <div className="space-y-1.5 text-xs text-cm-muted">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-cm-black">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8%)</span>
                    <span className="font-semibold text-cm-black">₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-cm-black">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-cm-border text-base font-bold text-cm-black">
                    <span>Total</span>
                    <span className="text-cm-red">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                  className="btn btn-red w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 group shadow-xl"
                >
                  {submitting ? (
                    <span>Placing Order...</span>
                  ) : (
                    <>
                      <span>Place Order • ₹{grandTotal.toLocaleString("en-IN")}</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-2xs text-cm-muted">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Encrypted 256-bit Secure Checkout</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
