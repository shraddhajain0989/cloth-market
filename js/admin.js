const KEYS = {
    users: "users",
    currentUser: "currentUser",
    products: "productsDb",
    orders: "ordersByUser",
    newsletter: "newsletterSubscribers",
    settings: "systemSettings"
};

function read(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
    return read(KEYS.currentUser, null);
}

function guardRole() {
    const user = getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "master")) {
        alert("Access denied.");
        window.location.href = "login_page/login.html";
        return false;
    }
    return true;
}

function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(item => item.classList.remove("active"));
            btn.classList.add("active");
            const tab = btn.dataset.tab;
            if (tab === "products") document.getElementById("productsTab").classList.add("active");
            if (tab === "users") document.getElementById("usersTabContent").classList.add("active");
            if (tab === "analytics") document.getElementById("analyticsTab").classList.add("active");
            if (tab === "settings") document.getElementById("settingsTabContent").classList.add("active");
        });
    });
}

function getProducts() {
    return read(KEYS.products, []);
}

function setProducts(products) {
    write(KEYS.products, products);
}

function renderProductsTable() {
    const products = getProducts();
    const target = document.getElementById("productsTable");
    target.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Size</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.id}</td>
                            <td>${product.name}</td>
                            <td>${product.category}</td>
                            <td>₹${product.price}</td>
                            <td>${product.size}</td>
                            <td>${product.available ? "Available" : "Out"}</td>
                            <td>
                                <button type="button" onclick="editProduct(${product.id})">Edit</button>
                                <button type="button" onclick="deleteProduct(${product.id})">Delete</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function resetForm() {
    document.getElementById("productForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("productAvailable").checked = true;
}

function upsertProduct(event) {
    event.preventDefault();
    const products = getProducts();

    const productId = document.getElementById("productId").value;
    const product = {
        id: productId ? Number(productId) : Date.now(),
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value.trim().toLowerCase(),
        price: Number(document.getElementById("productPrice").value),
        rent: Number(document.getElementById("productRent").value),
        size: document.getElementById("productSize").value.trim().toUpperCase(),
        available: document.getElementById("productAvailable").checked,
        badge: document.getElementById("productBadge").value.trim() || "New",
        description: document.getElementById("productDescription").value.trim(),
        images: [document.getElementById("productImage").value.trim()]
    };

    const index = products.findIndex(item => item.id === product.id);
    if (index >= 0) {
        products[index] = product;
    } else {
        products.push(product);
    }

    setProducts(products);
    renderProductsTable();
    renderAnalytics();
    resetForm();
}

function editProduct(id) {
    const product = getProducts().find(item => item.id === id);
    if (!product) return;

    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productRent").value = product.rent;
    document.getElementById("productSize").value = product.size;
    document.getElementById("productAvailable").checked = product.available;
    document.getElementById("productBadge").value = product.badge;
    document.getElementById("productImage").value = (product.images && product.images[0]) || "";
    document.getElementById("productDescription").value = product.description || "";
}

function deleteProduct(id) {
    const products = getProducts();
    const updated = products.filter(item => item.id !== id);
    setProducts(updated);
    renderProductsTable();
    renderAnalytics();
}

function renderUsersTable() {
    const currentUser = getCurrentUser();
    const users = read(KEYS.users, []);
    const target = document.getElementById("usersTable");
    const usersHint = document.getElementById("usersHint");

    if (currentUser.role !== "master") {
        usersHint.innerText = "Admins can view users but only Masters can delete users.";
    } else {
        usersHint.innerText = "Master access: full user management enabled.";
    }

    target.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.name || "-"}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>
                                ${currentUser.role === "master" && user.role !== "master" ? `<button type="button" onclick="deleteUser('${user.id}')">Delete</button>` : "-"}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function deleteUser(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "master") {
        alert("Only master can delete users.");
        return;
    }
    const users = read(KEYS.users, []);
    const nextUsers = users.filter(user => user.id !== userId);
    write(KEYS.users, nextUsers);
    renderUsersTable();
    renderAnalytics();
}

function renderAnalytics() {
    const users = read(KEYS.users, []);
    const products = getProducts();
    const orders = read(KEYS.orders, {});
    const subscribers = read(KEYS.newsletter, []);

    const totalOrders = Object.values(orders).reduce((sum, userOrders) => sum + userOrders.length, 0);

    document.getElementById("totalUsers").innerText = String(users.length);
    document.getElementById("totalProducts").innerText = String(products.length);
    document.getElementById("totalOrders").innerText = String(totalOrders);
    document.getElementById("totalSubscribers").innerText = String(subscribers.length);
}

function renderSettings() {
    const currentUser = getCurrentUser();
    const settingsHint = document.getElementById("settingsHint");
    const settings = read(KEYS.settings, { maintenanceMode: false, allowRentals: true });
    document.getElementById("maintenanceMode").checked = !!settings.maintenanceMode;
    document.getElementById("allowRentals").checked = !!settings.allowRentals;

    if (currentUser.role === "master") {
        settingsHint.innerText = "Master access enabled. You can change global system settings.";
    } else {
        settingsHint.innerText = "Only master can edit system settings. Admins can view current values.";
        document.querySelectorAll("#settingsForm input, #settingsForm button").forEach(element => {
            element.disabled = true;
        });
    }
}

function saveSettings(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (currentUser.role !== "master") {
        alert("Only master can update settings.");
        return;
    }

    const nextSettings = {
        maintenanceMode: document.getElementById("maintenanceMode").checked,
        allowRentals: document.getElementById("allowRentals").checked
    };
    write(KEYS.settings, nextSettings);
    alert("System settings updated.");
}

function init() {
    if (!guardRole()) return;

    const currentUser = getCurrentUser();
    const usersTab = document.getElementById("usersTab");
    const settingsTab = document.getElementById("settingsTab");
    if (currentUser.role !== "master") {
        usersTab.innerText = "User List";
        settingsTab.innerText = "System Settings (View)";
    }

    bindTabs();
    renderProductsTable();
    renderUsersTable();
    renderAnalytics();
    renderSettings();

    document.getElementById("productForm").addEventListener("submit", upsertProduct);
    document.getElementById("resetForm").addEventListener("click", resetForm);
    document.getElementById("settingsForm").addEventListener("submit", saveSettings);
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(KEYS.currentUser);
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("email");
        localStorage.removeItem("password");
        window.location.href = "home.html";
    });
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.deleteUser = deleteUser;

document.addEventListener("DOMContentLoaded", init);
