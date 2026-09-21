const STORAGE_KEYS = {
    users: "users",
    currentUser: "currentUser",
    products: "productsDb",
    cartByUser: "cartByUser",
    favoritesByUser: "favoritesByUser",
    reviewsByProduct: "reviewsByProduct",
    ordersByUser: "ordersByUser",
    newsletter: "newsletterSubscribers",
    darkMode: "darkMode"
};

const DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Denim Jacket",
        category: "jacket",
        price: 1999,
        rent: 299,
        size: "M",
        available: true,
        badge: "Trending",
        description: "Classic denim jacket with a modern relaxed fit.",
        images: ["images/jacket1.jpg", "images/jacket1.jpg", "images/jacket1.jpg", "images/jacket1.jpg"]
    },
    {
        id: 2,
        name: "Simple Kurti",
        category: "kurti",
        price: 1399,
        rent: 129,
        size: "L",
        available: true,
        badge: "Best Seller",
        description: "Lightweight kurti perfect for daily and festive styling.",
        images: ["images/kurti1.png", "images/kurti2.png", "images/kurti3.png", "images/kurti4.png"]
    },
    {
        id: 3,
        name: "Pink Sweatshirt",
        category: "shirt",
        price: 599,
        rent: 99,
        size: "S",
        available: true,
        badge: "New",
        description: "Soft fleece sweatshirt for everyday comfort.",
        images: ["images/pink_sweatshirt1.png", "images/pink_sweatshirt2.png", "images/pink_sweatshirt3.png", "images/pink_sweatshirt4.png"]
    },
    {
        id: 4,
        name: "Toe Midtop Bottom Wear",
        category: "top",
        price: 1299,
        rent: 109,
        size: "M",
        available: true,
        badge: "Editor Pick",
        description: "Sporty premium look for casual outings.",
        images: ["images/Toe_midtop1.png", "images/Toe_midtop2.png", "images/Toe_midtop3.png", "images/Toe_midtop4.png"]
    },
    {
        id: 5,
        name: "Pointed Toe Block Pumps",
        category: "footwear",
        price: 899,
        rent: 149,
        size: "XS",
        available: true,
        badge: "Trending",
        description: "Comfort-first block heels for sharp statement fits.",
        images: ["images/boots1.png", "images/boots2.png", "images/boots3.png", "images/boots4.png"]
    },
    {
        id: 6,
        name: "White Modern Top",
        category: "top",
        price: 499,
        rent: 69,
        size: "XL",
        available: false,
        badge: "Limited",
        description: "Minimal top with modern silhouette and premium finish.",
        images: ["images/white_top1.png", "images/white_top2.png", "images/white_top3.png", "images/white_top4.png"]
    }
];

let filteredProducts = [];
let currentRent = 0;
let activeHeroIndex = 0;
let heroIntervalId = null;

function safeRead(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Failed to read ${key}:`, error);
        return fallback;
    }
}

function safeWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function seedDefaultUsers() {
    const users = safeRead(STORAGE_KEYS.users, []);
    const hasAdmin = users.some(user => user.email === "admin@example.com");
    const hasMaster = users.some(user => user.email === "master@example.com");
    if (hasAdmin && hasMaster) return;

    const nextUsers = [...users];
    if (!hasAdmin) {
        nextUsers.push({
            id: "u-admin-001",
            name: "Admin User",
            email: "admin@example.com",
            password: btoa("Admin@123"),
            role: "admin",
            createdAt: new Date().toISOString()
        });
    }
    if (!hasMaster) {
        nextUsers.push({
            id: "u-master-001",
            name: "Master User",
            email: "master@example.com",
            password: btoa("Master@123"),
            role: "master",
            createdAt: new Date().toISOString()
        });
    }
    safeWrite(STORAGE_KEYS.users, nextUsers);
}

function migrateLegacyUser() {
    const legacyEmail = localStorage.getItem("email");
    const legacyPassword = localStorage.getItem("password");
    if (!legacyEmail || !legacyPassword) return;

    const users = safeRead(STORAGE_KEYS.users, []);
    const normalized = legacyEmail.toLowerCase();
    const alreadyExists = users.some(user => user.email === normalized);
    if (!alreadyExists) {
        users.push({
            id: `u-legacy-${Date.now()}`,
            name: normalized.split("@")[0],
            email: normalized,
            password: btoa(legacyPassword),
            role: "user",
            createdAt: new Date().toISOString()
        });
        safeWrite(STORAGE_KEYS.users, users);
    }
}

function seedProductsIfMissing() {
    const stored = safeRead(STORAGE_KEYS.products, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
        safeWrite(STORAGE_KEYS.products, DEFAULT_PRODUCTS);
    }
}

function getProducts() {
    return safeRead(STORAGE_KEYS.products, []);
}

function setProducts(nextProducts) {
    safeWrite(STORAGE_KEYS.products, nextProducts);
}

function getCurrentUser() {
    return safeRead(STORAGE_KEYS.currentUser, null);
}

function getSystemSettings() {
    return safeRead("systemSettings", { maintenanceMode: false, allowRentals: true });
}

function isLoggedIn() {
    return !!getCurrentUser();
}

function isAdminOrMaster() {
    const user = getCurrentUser();
    return user && (user.role === "admin" || user.role === "master");
}

function isMaster() {
    const user = getCurrentUser();
    return user && user.role === "master";
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("email");
    localStorage.removeItem("password");
    alert("Logged out successfully.");
    window.location.href = "home.html";
}

function getUserScopedData(key) {
    const currentUser = getCurrentUser();
    const all = safeRead(key, {});
    if (!currentUser) return [];
    return all[currentUser.id] || [];
}

function setUserScopedData(key, value) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const all = safeRead(key, {});
    all[currentUser.id] = value;
    safeWrite(key, all);
}

function getCart() {
    return getUserScopedData(STORAGE_KEYS.cartByUser);
}

function setCart(cart) {
    setUserScopedData(STORAGE_KEYS.cartByUser, cart);
}

function getFavorites() {
    return getUserScopedData(STORAGE_KEYS.favoritesByUser);
}

function setFavorites(favorites) {
    setUserScopedData(STORAGE_KEYS.favoritesByUser, favorites);
}

function getReviewsMap() {
    return safeRead(STORAGE_KEYS.reviewsByProduct, {});
}

function setReviewsMap(nextMap) {
    safeWrite(STORAGE_KEYS.reviewsByProduct, nextMap);
}

function averageRating(productId) {
    const map = getReviewsMap();
    const reviews = map[productId] || [];
    if (!reviews.length) return "No ratings yet";
    const avg = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
    return `${avg.toFixed(1)} / 5 (${reviews.length})`;
}

function updateNavForRole() {
    const user = getCurrentUser();
    const loginLink = document.getElementById("loginLink");
    const signupLink = document.getElementById("signupLink");
    const welcomeUser = document.getElementById("welcomeUser");
    const logoutBtn = document.getElementById("logoutBtn");
    const profileLink = document.getElementById("profileLink");
    const adminPanelLink = document.getElementById("adminPanelLink");
    const cartButton = document.getElementById("cartButton");

    if (!user) {
        loginLink?.classList.remove("hidden");
        signupLink?.classList.remove("hidden");
        welcomeUser?.classList.add("hidden");
        logoutBtn?.classList.add("hidden");
        profileLink?.classList.add("hidden");
        adminPanelLink?.classList.add("hidden");
        cartButton?.classList.add("hidden");
        return;
    }

    loginLink?.classList.add("hidden");
    signupLink?.classList.add("hidden");
    if (welcomeUser) {
        welcomeUser.innerText = `Hi, ${user.name || user.email.split("@")[0]} (${user.role})`;
        welcomeUser.classList.remove("hidden");
    }
    logoutBtn?.classList.remove("hidden");

    if (user.role === "user") {
        profileLink?.classList.remove("hidden");
        cartButton?.classList.remove("hidden");
        adminPanelLink?.classList.add("hidden");
    } else {
        profileLink?.classList.add("hidden");
        cartButton?.classList.add("hidden");
        adminPanelLink?.classList.remove("hidden");
    }
}

function changeSlide(productId, slideIndex) {
    const slides = document.querySelectorAll(`[id^="product-${productId}-slide-"]`);
    const dots = document.querySelectorAll(`[data-dot-product="${productId}"]`);
    slides.forEach(slide => slide.classList.remove("active"));
    dots.forEach(dot => dot.classList.remove("active-dot"));
    slides[slideIndex]?.classList.add("active");
    dots[slideIndex]?.classList.add("active-dot");
}

function displayProducts(productList) {
    const container = document.getElementById("products");
    if (!container) return;
    const favorites = getFavorites();

    container.innerHTML = "";
    productList.forEach((product, index) => {
        const slidesHTML = product.images.map((img, i) => (
            `<img src="${img}" class="slide ${i === 0 ? "active" : ""}" id="product-${product.id}-slide-${i}" alt="${product.name}">`
        )).join("");

        const dotsHTML = product.images.map((_, i) => (
            `<span class="dot ${i === 0 ? "active-dot" : ""}" data-dot-product="${product.id}" onclick="changeSlide(${product.id}, ${i})"></span>`
        )).join("");

        const canShop = !isAdminOrMaster();
        const settings = getSystemSettings();
        const favoriteActive = favorites.includes(product.id) ? "active" : "";

        container.innerHTML += `
            <article class="card" style="animation-delay:${index * 60}ms;">
                <span class="badge">${product.badge}</span>
                <button class="favorite-btn ${favoriteActive}" type="button" onclick="toggleFavorite(${product.id})" title="Favorite">❤</button>

                <div class="slider" onclick="openProductModal(${product.id})">
                    ${slidesHTML}
                    <div class="dots">${dotsHTML}</div>
                </div>

                <h3>${product.name}</h3>
                <p class="price">₹${product.price} | Rent ₹${product.rent}/day</p>
                <p class="size">Size: ${product.size}</p>
                <p class="stock ${product.available ? "available" : "not-available"}">${product.available ? "Available" : "Out of stock"}</p>
                <p class="rating">Rating: ${averageRating(product.id)}</p>

                <div class="btn-group">
                    <button type="button" ${!product.available || !canShop ? "disabled" : ""} onclick="addToCart(${product.id})">Add to Cart</button>
                    <button type="button" ${!product.available || !canShop || !settings.allowRentals ? "disabled" : ""} onclick="openRent(${product.rent})">Rent</button>
                </div>
            </article>
        `;
    });
}

function filterProducts() {
    const products = getProducts();
    const search = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
    const category = document.getElementById("categoryFilter")?.value || "all";
    const size = document.getElementById("sizeFilter")?.value || "all";
    const priceRange = document.getElementById("priceFilter")?.value || "all";
    const availableOnly = document.getElementById("availableOnly")?.checked || false;

    filteredProducts = products.filter(product => {
        const matchesSearch = !search || product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search);
        const matchesCategory = category === "all" || product.category === category;
        const matchesSize = size === "all" || product.size === size;
        const matchesAvailability = !availableOnly || product.available;

        let matchesPrice = true;
        if (priceRange !== "all") {
            const [min, max] = priceRange.split("-").map(Number);
            matchesPrice = product.price >= min && product.price <= max;
        }

        return matchesSearch && matchesCategory && matchesSize && matchesAvailability && matchesPrice;
    });

    displayProducts(filteredProducts);
}

function resetFilters() {
    const defaults = {
        categoryFilter: "all",
        sizeFilter: "all",
        priceFilter: "all"
    };
    Object.entries(defaults).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    const availableOnly = document.getElementById("availableOnly");
    if (availableOnly) availableOnly.checked = false;

    filterProducts();
}

function showTrending() {
    const products = getProducts();
    const trendingContainer = document.getElementById("trendingProducts");
    if (!trendingContainer) return;

    const map = getReviewsMap();
    const sorted = [...products].sort((a, b) => {
        const aScore = (map[a.id] || []).length + (a.badge === "Trending" ? 2 : 0);
        const bScore = (map[b.id] || []).length + (b.badge === "Trending" ? 2 : 0);
        return bScore - aScore;
    }).slice(0, 3);

    trendingContainer.innerHTML = sorted.map(product => `
        <article class="trending-card">
            <img src="${product.images[0]}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p>₹${product.price}</p>
            <button class="ghost-btn" type="button" onclick="openProductModal(${product.id})">Quick View</button>
        </article>
    `).join("");
}

function addToCart(productId) {
    const settings = getSystemSettings();
    if (settings.maintenanceMode) {
        alert("Store is in maintenance mode. Shopping is temporarily disabled.");
        return;
    }

    const user = getCurrentUser();
    if (!user || user.role !== "user") {
        alert("Please login with a user account to use cart.");
        return;
    }

    const product = getProducts().find(item => item.id === productId);
    if (!product || !product.available) {
        alert("This item is not available.");
        return;
    }

    const cart = getCart();
    cart.push({ ...product, addedAt: new Date().toISOString() });
    setCart(cart);
    updateCartCount();
    alert(`${product.name} added to cart.`);
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    setCart(cart);
    renderCart();
    updateCartCount();
}

function updateCartCount() {
    const count = document.getElementById("cart-count");
    if (count) count.innerText = String(getCart().length);
}

function toggleCart(show) {
    const modal = document.getElementById("cartModal");
    if (!modal) return;
    if (show) {
        renderCart();
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
    }
}

function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");
    if (!cartItems || !totalEl) return;

    const cart = getCart();
    if (!cart.length) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        totalEl.innerText = "";
        return;
    }

    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        total += Number(item.price || 0);
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <p>₹${item.price}</p>
                </div>
                <button type="button" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
    }).join("");
    totalEl.innerText = `Total: ₹${total}`;
}

function checkoutCart() {
    const user = getCurrentUser();
    if (!user) return;

    const cart = getCart();
    if (!cart.length) {
        alert("Your cart is empty.");
        return;
    }

    const allOrders = safeRead(STORAGE_KEYS.ordersByUser, {});
    allOrders[user.id] = allOrders[user.id] || [];
    allOrders[user.id].push({
        id: `o-${Date.now()}`,
        items: cart,
        total: cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
        createdAt: new Date().toISOString()
    });
    safeWrite(STORAGE_KEYS.ordersByUser, allOrders);

    setCart([]);
    updateCartCount();
    renderCart();
    alert("Order placed successfully.");
}

function toggleFavorite(productId) {
    const user = getCurrentUser();
    if (!user || user.role !== "user") {
        alert("Login as user to manage favorites.");
        return;
    }

    const favorites = getFavorites();
    const index = favorites.indexOf(productId);
    if (index >= 0) {
        favorites.splice(index, 1);
    } else {
        favorites.push(productId);
    }
    setFavorites(favorites);
    filterProducts();
}

function openProductModal(productId) {
    const product = getProducts().find(item => item.id === productId);
    const modal = document.getElementById("productModal");
    const modalBody = document.getElementById("modalBody");
    if (!product || !modal || !modalBody) return;

    const reviewsMap = getReviewsMap();
    const reviews = reviewsMap[product.id] || [];

    modalBody.innerHTML = `
        <img src="${product.images[0]}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p><strong>Price:</strong> ₹${product.price}</p>
        <p><strong>Size:</strong> ${product.size}</p>
        <p><strong>Availability:</strong> ${product.available ? "In stock" : "Out of stock"}</p>
        <h4>Reviews</h4>
        <div>
            ${reviews.length ? reviews.map(review => `
                <div class="review-item">
                    <strong>${review.userName}</strong> - ${review.rating}/5
                    <p>${review.comment}</p>
                </div>
            `).join("") : "<p>No reviews yet.</p>"}
        </div>

        <div class="review-input">
            <input type="hidden" id="reviewProductId" value="${product.id}">
            <select id="reviewRating">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Very good</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
                <option value="1">1 - Poor</option>
            </select>
            <textarea id="reviewComment" rows="3" placeholder="Write your review"></textarea>
            <button type="button" onclick="submitReview()">Submit Review</button>
        </div>
    `;

    modal.classList.remove("hidden");
}

function closeProductModal() {
    document.getElementById("productModal")?.classList.add("hidden");
}

function submitReview() {
    const user = getCurrentUser();
    if (!user) {
        alert("Please login to post review.");
        return;
    }

    const productId = Number(document.getElementById("reviewProductId")?.value);
    const rating = Number(document.getElementById("reviewRating")?.value || 5);
    const comment = (document.getElementById("reviewComment")?.value || "").trim();

    if (!comment) {
        alert("Please add a review comment.");
        return;
    }

    const map = getReviewsMap();
    map[productId] = map[productId] || [];
    map[productId].push({
        userId: user.id,
        userName: user.name || user.email,
        rating,
        comment,
        createdAt: new Date().toISOString()
    });
    setReviewsMap(map);
    alert("Review added.");
    openProductModal(productId);
    filterProducts();
    showTrending();
}

function openRent(price) {
    const settings = getSystemSettings();
    if (!settings.allowRentals) {
        alert("Rentals are currently disabled by system settings.");
        return;
    }
    currentRent = price;
    document.getElementById("rentPopup")?.style.setProperty("display", "flex");
    calculateTotal();
}

function closePopup() {
    document.getElementById("rentPopup")?.style.setProperty("display", "none");
}

function calculateTotal() {
    const days = Number(document.getElementById("rentDays")?.value || 1);
    const total = days * currentRent;
    const totalEl = document.getElementById("rentTotal");
    if (totalEl) totalEl.innerText = String(total);
}

function confirmRent() {
    alert("Rent request confirmed.");
    closePopup();
}

function setupDarkMode() {
    const enabled = safeRead(STORAGE_KEYS.darkMode, false);
    document.body.classList.toggle("dark-mode", !!enabled);

    document.getElementById("darkToggle")?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        safeWrite(STORAGE_KEYS.darkMode, isDark);
    });
}

function changeHeroSlide(step) {
    const slides = document.querySelectorAll(".hero-slide");
    const track = document.getElementById("heroTrack");
    if (!slides.length || !track) return;

    slides[activeHeroIndex].classList.remove("active");
    activeHeroIndex = (activeHeroIndex + step + slides.length) % slides.length;
    slides[activeHeroIndex].classList.add("active");
    track.style.background = slides[activeHeroIndex].dataset.bg;
}

function setupHeroCarousel() {
    const slides = document.querySelectorAll(".hero-slide");
    const track = document.getElementById("heroTrack");
    if (!slides.length || !track) return;

    activeHeroIndex = 0;
    slides.forEach((slide, index) => slide.classList.toggle("active", index === 0));
    track.style.background = slides[0].dataset.bg;

    if (heroIntervalId) clearInterval(heroIntervalId);
    heroIntervalId = setInterval(() => changeHeroSlide(1), 5000);
}

function scrollToProducts() {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
}

function openTryOnPlaceholder() {
    alert("Virtual Try-On is coming soon.");
}

function subscribeNewsletter() {
    const input = document.getElementById("newsletterEmail");
    const email = input?.value.trim().toLowerCase() || "";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        alert("Enter a valid email.");
        return;
    }

    const subscribers = safeRead(STORAGE_KEYS.newsletter, []);
    if (subscribers.includes(email)) {
        alert("This email is already subscribed.");
        return;
    }

    subscribers.push(email);
    safeWrite(STORAGE_KEYS.newsletter, subscribers);
    if (input) input.value = "";
    alert("Subscribed to newsletter.");
}

function toggleChat() {
    document.getElementById("chatBox")?.classList.toggle("hidden");
}

function sendChatPrompt() {
    const input = document.getElementById("chatInput");
    const output = document.getElementById("chatResponse");
    const prompt = (input?.value || "").toLowerCase();

    let answer = "Try our Trending section for ideas.";
    if (prompt.includes("party")) {
        answer = "Party pick: Denim Jacket + White Modern Top + Block Pumps.";
    } else if (prompt.includes("budget") || prompt.includes("1000")) {
        answer = "Budget options: Pink Sweatshirt and White Modern Top are under 1000.";
    } else if (prompt.includes("office")) {
        answer = "Office style: Simple Kurti paired with neutral footwear works well.";
    }

    if (output) output.innerText = answer;
    if (input) input.value = "";
}

function initIndexPage() {
    updateNavForRole();
    setupDarkMode();

    filteredProducts = getProducts();
    displayProducts(filteredProducts);
    showTrending();
    updateCartCount();

    setupHeroCarousel();

    ["searchInput", "categoryFilter", "sizeFilter", "priceFilter", "availableOnly"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventName = element.tagName === "INPUT" && element.type !== "checkbox" ? "input" : "change";
            element.addEventListener(eventName, filterProducts);
            if (eventName !== "input") element.addEventListener("input", filterProducts);
        }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("cartButton")?.addEventListener("click", () => toggleCart(true));
    document.getElementById("rentDays")?.addEventListener("input", calculateTotal);
}

function initHomePage() {
    updateNavForRole();
    setupDarkMode();
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
}

window.addEventListener("DOMContentLoaded", () => {
    seedDefaultUsers();
    migrateLegacyUser();
    seedProductsIfMissing();

    if (document.getElementById("products")) {
        initIndexPage();
    }

    if (document.getElementById("homePageMarker")) {
        initHomePage();
    }
});

window.changeSlide = changeSlide;
window.filterProducts = filterProducts;
window.resetFilters = resetFilters;
window.showTrending = showTrending;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.checkoutCart = checkoutCart;
window.toggleFavorite = toggleFavorite;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.submitReview = submitReview;
window.openRent = openRent;
window.closePopup = closePopup;
window.confirmRent = confirmRent;
window.changeHeroSlide = changeHeroSlide;
window.scrollToProducts = scrollToProducts;
window.openTryOnPlaceholder = openTryOnPlaceholder;
window.subscribeNewsletter = subscribeNewsletter;
window.toggleChat = toggleChat;
window.sendChatPrompt = sendChatPrompt;
window.logout = logout;
