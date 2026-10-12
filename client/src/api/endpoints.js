import api from "./client";

export const authApi = {
  signup: (payload) => api.post("/auth/signup", payload),
  login: (payload) => api.post("/auth/login", payload),
  refresh: (payload) => api.post("/auth/refresh", payload),
  logout: (payload) => api.post("/auth/logout", payload),
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload)
};

export const productApi = {
  list: (params) => api.get("/products", { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (payload) => api.post("/products", payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  remove: (id) => api.delete(`/products/${id}`),
  bulkRemove: (productIds) => api.delete("/admin/products/bulk", { data: { productIds } }),
  coupons: () => api.get("/products/coupons")
};

export const userApi = {
  me: () => api.get("/users/me"),
  updateMe: (payload) => api.put("/users/me", payload),
  addAddress: (payload) => api.post("/users/me/addresses", payload),
  toggleWishlist: (productId) => api.post("/users/me/wishlist", { productId }),
  all: () => api.get("/users"),
  remove: (userId) => api.delete(`/users/${userId}`)
};

export const orderApi = {
  cart: () => api.get("/orders/cart"),
  addToCart: (payload) => api.post("/orders/cart", payload),
  updateCartItem: (productId, payload) => api.put(`/orders/cart/${productId}`, payload),
  removeCartItem: (productId) => api.delete(`/orders/cart/${productId}`),
  placeOrder: (payload) => api.post("/orders", payload),
  orders: () => api.get("/orders"),
  requestReturn: (payload) => api.post("/orders/return", payload)
};

export const rentalApi = {
  list: () => api.get("/rentals"),
  get: (id) => api.get(`/rentals/${id}`),
  create: (payload) => api.post("/rentals", payload),
  checkAvailability: (params) => api.get("/rentals/check-availability", { params }),
  acknowledgeHandover: (id) => api.post(`/rentals/${id}/acknowledge-handover`),
  requestExtension: (id, payload) => api.post(`/rentals/${id}/request-extension`, payload),
  plans: () => api.get("/rentals/plans")
};

export const adminApi = {
  dashboard: () => api.get("/admin/dashboard"),
  rentals: (params) => api.get("/admin/rentals", { params }),
  confirmPayment: (id) => api.patch(`/admin/rentals/${id}/payment-received`),
  confirmAdvance: (id) => api.patch(`/admin/rentals/${id}/payment-received`),
  markPaymentDone: (id) => api.patch(`/admin/rentals/${id}/payment-done`),
  initiateRent: (id) => api.patch(`/admin/rentals/${id}/initiate-rent`),
  startRentPeriod: (id) => api.patch(`/admin/rentals/${id}/start-period`),
  markRentReceived: (id) => api.patch(`/admin/rentals/${id}/rent-received`),
  handoverInspection: (id, payload) => api.post(`/admin/rentals/${id}/handover-inspection`, payload),
  recordRemainingPayment: (id) => api.patch(`/admin/rentals/${id}/remaining-payment`),
  reviewExtension: (id, payload) => api.patch(`/admin/rentals/${id}/extension`, payload),
  returnInspection: (id, payload) => api.post(`/admin/rentals/${id}/return-inspection`, payload),
  reportDamage: (id, payload) => api.post(`/admin/rentals/${id}/damage`, payload),
  resolveDamage: (id) => api.patch(`/admin/rentals/${id}/damage/resolve`),
  markProductReceived: (id) => api.patch(`/admin/rentals/${id}/product-received`),
  completeRental: (id) => api.patch(`/admin/rentals/${id}/product-received`),
  bulkRemoveProducts: (productIds) => api.delete("/admin/products/bulk", { data: { productIds } })
};

export const socialApi = {
  list: () => api.get("/social"),
  create: (payload) => api.post("/social", payload),
  like: (postId) => api.post(`/social/${postId}/like`),
  comment: (postId, payload) => api.post(`/social/${postId}/comments`, payload)
};

export const aiApi = {
  recommendations: (params) => api.get("/ai/recommendations", { params }),
  outfit: (payload) => api.post("/ai/outfit-generator", payload),
  chat: (payload) => api.post("/ai/chat", payload),
  size: (payload) => api.post("/ai/size-recommendation", payload)
};

export const uploadApi = {
  image: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  images: (files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("images", file);
    }
    return api.post("/upload/images", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  qr: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload/qr", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
};

export const configApi = {
  getPublic: () => api.get("/config/public"),
  getAdmin: () => api.get("/config/admin"),
  updateAdmin: (payload) => api.put("/config/admin", payload)
};

export const paymentApi = {
  list: (params) => api.get("/payments", { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (payload) => api.post("/payments", payload),
  verify: (id, payload) => api.patch(`/payments/${id}/verify`, payload),
  reject: (id, payload) => api.patch(`/payments/${id}/reject`, payload),
  cancel: (id) => api.patch(`/payments/${id}/cancel`)
};
