// ===============================
// PRODUCT DATABASE
// ===============================

const products = [
    {
        id: 1,
        name: "Denim Jacket",
        category: "jacket",
        price: 1999,
        rent: 299,
        size: "M",
        available: true,
        badge: "Trending",
        images: [
            "images/jacket1.jpg",
            "images/jacket1.jpg",
            "images/jacket1.jpg",
            "images/jacket1.jpg"
        ]
    },
    {
        id: 2,
        name: "Simple Kurti",
        category: "kurti",
        price: 1399,
        rent: 59,
        size: "M",
        available: true,
        badge: "New",
        images: [
            "images/kurti1.png",
            "images/kurti2.png",
            "images/kurti3.png",
            "images/kurti4.png"
        ]
    },
    {
        id: 3,
        name: "Pink Sweatshirt",
        category: "shirt",
        price: 599,
        rent: 99,
        size: "M",
        available: true,
        badge: "New",
        images: [
            "images/pink_sweatshirt1.png",
            "images/pink_sweatshirt2.png",
            "images/pink_sweatshirt3.png",
            "images/pink_sweatshirt4.png"
        ]
    },
    {
        id: 4,
        name: "Toe midtop Bottom wear",
        category: "shirt",
        price: 1299,
        rent: 109,
        size: "M",
        available: true,
        badge: "New",
        images: [
            "images/Toe_midtop1.png",
            "images/Toe_midtop2.png",
            "images/Toe_midtop3.png",
            "images/Toe_midtop4.png"
        ]
    },
    {
        id: 5,
        name: "Women Pointed Toe Block Pumps",
        category: "shirt",
        price: 899,
        rent: 149,
        size: "M",
        available: true,
        badge: "New",
        images: [
            "images/boots1.png",
            "images/boots2.png",
            "images/boots3.png",
            "images/boots4.png"
        ]
    },
      {
        id: 6,
        name: "Women white modern top",
        category: "shirt",
        price: 499,
        rent: 69,
        size: "M",
        available: true,
        badge: "New",
        images: [
            "images/white_top1.png",
            "images/white_top2.png",
            "images/white_top3.png",
            "images/white_top4.png"
        ]
    }
];
// ===============================
// DISPLAY PRODUCTS
// ===============================
function displayProducts(productList) {

    const container = document.getElementById("products");
    container.innerHTML = "";

    productList.forEach((product, index) => {

        let slidesHTML = "";
        let dotsHTML = "";

        product.images.forEach((img, i) => {

            slidesHTML += `
                <img src="${img}" 
                     class="slide ${i === 0 ? 'active' : ''}" 
                     id="product-${index}-slide-${i}">
            `;

            dotsHTML += `
                <span class="dot ${i === 0 ? 'active-dot' : ''}" 
                      onclick="changeSlide(${index}, ${i})"></span>
            `;
        });

        container.innerHTML += `
        <div class="card">

            <div class="badge">${product.badge}</div>

            <div class="slider">
                ${slidesHTML}
                <div class="dots">${dotsHTML}</div>
            </div>

            <h3>${product.name}</h3>

            <p class="price">
                ₹${product.price} | Rent ₹${product.rent}/day
            </p>

            <p class="size">Size: ${product.size}</p>

            <p class="${product.available ? 'available' : 'not-available'}">
                ${product.available ? 'Available' : 'Out of Stock'}
            </p>

            <div class="btn-group">
                <button ${!product.available ? 'disabled' : ''} 
                    onclick="addToCart(${product.id})">
                    Buy
                </button>

                ${product.available 
                    ? `<button onclick="openRent(${product.rent})">Rent</button>` 
                    : ''
                }
            </div>

        </div>
        `;
    });
}

// ===============================
// SEARCH FUNCTION
// ===============================

document.getElementById("searchInput")?.addEventListener("input", function(e){

    const value = e.target.value.toLowerCase();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(value)
    );

    displayProducts(filtered);
});


// ===============================
// CATEGORY FILTER
// ===============================

function filterCategory(category){

    if(category === "all"){
        displayProducts(products);
        return;
    }

    const filtered = products.filter(p => p.category === category);
    displayProducts(filtered);
}


// ===============================
// PRICE FILTER
// ===============================

function filterUnder1000(){
    const filtered = products.filter(p => p.price < 1000);
    displayProducts(filtered);
}

function filterAvailable(){
    const filtered = products.filter(p => p.available);
    displayProducts(filtered);
}


// ===============================
// CART SYSTEM
// ===============================

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(id){

    const product = products.find(p => p.id === id);

    cart.push(product);
    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();
    alert(product.name + " added to cart!");
}

function updateCartCount(){
    const count = document.getElementById("cart-count");
    if(count){
        count.innerText = cart.length;
    }
}

function openCart(){

    if(cart.length === 0){
        alert("Cart is empty");
        return;
    }

    let message = "Your Cart:\n\n";

    cart.forEach((item, index) => {
        message += `${index+1}. ${item.name} - ₹${item.price}\n`;
    });

    alert(message);
}


// ===============================
// RENT SYSTEM
// ===============================

let currentRent = 0;

function openRent(price){
    currentRent = price;
    document.getElementById("rentPopup").style.display = "flex";
    calculateTotal();
}

function closePopup(){
    document.getElementById("rentPopup").style.display = "none";
}

function calculateTotal(){
    let days = document.getElementById("rentDays").value;
    document.getElementById("rentTotal").innerText = days * currentRent;
}

function confirmRent(){
    alert("Rent Confirmed!");
    closePopup();
}


// ===============================
// DARK MODE
// ===============================

document.getElementById("darkToggle")?.addEventListener("click", function(){
    document.body.classList.toggle("dark-mode");
});


// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", function(){

    displayProducts(products);
    updateCartCount();

    document.getElementById("rentDays")?.addEventListener("input", calculateTotal);
});

// ===============================
// SLIDER FUNCTION
// // ===============================
function changeSlide(productIndex, slideIndex) {

    const slides = document.querySelectorAll(
        `[id^="product-${productIndex}-slide-"]`
    );

    const dots = document.querySelectorAll(
        `.card:nth-child(${productIndex+1}) .dot`
    );

    slides.forEach(slide => slide.classList.remove("active"));
    dots.forEach(dot => dot.classList.remove("active-dot"));

    slides[slideIndex].classList.add("active");
    dots[slideIndex].classList.add("active-dot");
}