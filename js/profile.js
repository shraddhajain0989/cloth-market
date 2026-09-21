const PROFILE_KEYS = {
    users: "users",
    currentUser: "currentUser",
    products: "productsDb",
    favorites: "favoritesByUser",
    orders: "ordersByUser"
};

function readValue(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

function writeValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function currentUser() {
    return readValue(PROFILE_KEYS.currentUser, null);
}

function guardUser() {
    const user = currentUser();
    if (!user || user.role !== "user") {
        alert("User account required.");
        window.location.href = "login_page/login.html";
        return false;
    }
    return true;
}

function populateProfile() {
    const user = currentUser();
    if (!user) return;

    document.getElementById("profileName").value = user.name || "";
    document.getElementById("profileEmail").value = user.email || "";
    document.getElementById("profileRole").value = user.role || "user";
}

function saveProfile(event) {
    event.preventDefault();
    const user = currentUser();
    if (!user) return;

    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim().toLowerCase();

    const users = readValue(PROFILE_KEYS.users, []);
    const duplicate = users.find(candidate => candidate.email === email && candidate.id !== user.id);
    if (duplicate) {
        alert("Email already used by another account.");
        return;
    }

    const userIndex = users.findIndex(candidate => candidate.id === user.id);
    if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], name, email };
        writeValue(PROFILE_KEYS.users, users);
    }

    const nextCurrent = { ...user, name, email };
    writeValue(PROFILE_KEYS.currentUser, nextCurrent);
    localStorage.setItem("email", email);
    alert("Profile updated.");
}

function renderFavorites() {
    const user = currentUser();
    if (!user) return;

    const favoriteMap = readValue(PROFILE_KEYS.favorites, {});
    const favoriteIds = favoriteMap[user.id] || [];

    const products = readValue(PROFILE_KEYS.products, []);
    const favoriteProducts = products.filter(product => favoriteIds.includes(product.id));

    const target = document.getElementById("favoriteList");
    if (!favoriteProducts.length) {
        target.innerHTML = "<p class='meta'>No favorites yet.</p>";
        return;
    }

    target.innerHTML = favoriteProducts.map(product => `
        <article class="favorite-item">
            <strong>${product.name}</strong>
            <p class="meta">₹${product.price} | ${product.category}</p>
        </article>
    `).join("");
}

function renderOrders() {
    const user = currentUser();
    if (!user) return;

    const orderMap = readValue(PROFILE_KEYS.orders, {});
    const orders = orderMap[user.id] || [];
    const target = document.getElementById("orderList");

    if (!orders.length) {
        target.innerHTML = "<p class='meta'>No orders yet. Checkout from your cart to see history.</p>";
        return;
    }

    target.innerHTML = orders.map(order => `
        <article class="order-item">
            <strong>Order ${order.id}</strong>
            <p class="meta">${new Date(order.createdAt).toLocaleString()}</p>
            <p class="meta">Items: ${order.items.length} | Total: ₹${order.total}</p>
        </article>
    `).join("");
}

function initProfile() {
    if (!guardUser()) return;

    populateProfile();
    renderFavorites();
    renderOrders();

    document.getElementById("profileForm").addEventListener("submit", saveProfile);
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(PROFILE_KEYS.currentUser);
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("email");
        localStorage.removeItem("password");
        window.location.href = "home.html";
    });
}

document.addEventListener("DOMContentLoaded", initProfile);
