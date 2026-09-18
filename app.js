/**
 * DeliBuy Customer Storefront Controller
 * Fully Cleaned: Zero Star Ratings, Dynamic Delivery Fees & Live Tracking
 */

const API_BASE = 'https://delibuy.onrender.com/api';

let products = [];
let categories = [];
let storeSettings = { insideDhakaFee: 60, outsideDhakaFee: 120, bkashNumber: '01516-597972' };
let activeCategory = 'all';
let cart = JSON.parse(localStorage.getItem('delibuy_cart')) || [];
let selectedDeliveryLocation = 'inside';
let isSubmittingOrder = false;

// Modal State
let currentModalProduct = null;
let currentModalQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadSettings(), loadCategories(), loadProducts()]);
  updateCartUI();
  setupEventListeners();
  setupZoomEffect();
});

// ================= LOAD INITIAL DATA =================
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) {
      storeSettings = await res.json();
      
      const bkashEl = document.getElementById('checkoutBkashTarget');
      if (bkashEl) bkashEl.innerText = storeSettings.bkashNumber || '01516-597972';

      const insideLabel = document.getElementById('labelFeeInside');
      const outsideLabel = document.getElementById('labelFeeOutside');
      if (insideLabel) insideLabel.innerText = storeSettings.insideDhakaFee ?? 60;
      if (outsideLabel) outsideLabel.innerText = storeSettings.outsideDhakaFee ?? 120;
    }
  } catch (e) {
    console.warn('Using default store settings');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (res.ok) {
      categories = await res.json();
      renderCategoryCards();
      renderCategoryFilterPills();
    }
  } catch (e) {
    console.error('Categories load error:', e);
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (res.ok) {
      products = await res.json();
      renderProducts();
    }
  } catch (e) {
    console.error('Products load error:', e);
  }
}

// ================= CATEGORIES & FILTER PILLS =================
function renderCategoryCards() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  const iconMap = {
    'all': 'fa-solid fa-border-all',
    'fashion': 'fa-solid fa-shirt',
    'electronics': 'fa-solid fa-mobile-screen',
    'home': 'fa-solid fa-house',
    'beauty': 'fa-solid fa-wand-magic-sparkles',
    'accessories': 'fa-solid fa-bag-shopping',
    'kitchen': 'fa-solid fa-utensils',
    'watches': 'fa-solid fa-clock'
  };

  container.innerHTML = categories.map(cat => {
    const icon = iconMap[cat.id] || 'fa-solid fa-tag';
    return `
      <div onclick="selectCategory('${cat.id}')" 
        class="bg-white p-4 rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-md hover:border-brand-orange/40 transition cursor-pointer flex flex-col items-center text-center group">
        <div class="w-12 h-12 rounded-full bg-orange-50 group-hover:bg-brand-orange text-brand-orange group-hover:text-white flex items-center justify-center text-lg mb-2.5 transition shadow-inner">
          <i class="${icon}"></i>
        </div>
        <h4 class="font-bold text-xs text-slate-800 group-hover:text-brand-orange transition">${cat.name}</h4>
        <span class="text-[10px] text-slate-400 mt-0.5">Explore Collection</span>
      </div>
    `;
  }).join('');
}

function renderCategoryFilterPills() {
  const container = document.getElementById('categoryFilterPills');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button onclick="selectCategory('${cat.id}')" class="px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
      activeCategory === cat.id 
      ? 'bg-brand-orange text-white shadow-md' 
      : 'bg-white text-slate-600 hover:bg-orange-50 border border-orange-100'
    }">
      ${cat.name}
    </button>
  `).join('');
}

function selectCategory(catId) {
  activeCategory = catId;
  renderCategoryFilterPills();
  renderProducts();

  const activeCat = categories.find(c => c.id === catId);
  const titleEl = document.getElementById('currentCategoryTitle');
  if (titleEl) {
    titleEl.innerText = activeCat && activeCat.id !== 'all' ? activeCat.name : 'Popular Products';
  }
}

// ================= SEARCH FUNCTIONALITY =================
function handleSearch() {
  const q = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  executeSearch(q);
}

function handleMobileSearch() {
  const q = document.getElementById('mobileSearchInput')?.value.trim().toLowerCase() || '';
  executeSearch(q);
}

function executeSearch(query) {
  const titleEl = document.getElementById('currentCategoryTitle');
  if (!query) {
    if (titleEl) titleEl.innerText = 'Popular Products';
    renderProducts();
    return;
  }

  if (titleEl) titleEl.innerText = `Search: "${query}"`;
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.category.toLowerCase().includes(query) ||
    (p.description && p.description.toLowerCase().includes(query))
  );

  renderProductGrid(filtered);
}

// ================= PRODUCT CARD DISPLAY (NO RATINGS) =================
function renderProducts() {
  let filtered = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  renderProductGrid(filtered);
}

function renderProductGrid(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-bold text-sm">No products found in this category.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => {
    const mainImg = p.images && p.images.length > 0 ? p.images[0] : 'https://placehold.co/400';
    const hasDiscount = p.originalPrice && p.originalPrice > p.discountPrice;
    const discountPercent = hasDiscount ? Math.round(((p.originalPrice - p.discountPrice) / p.originalPrice) * 100) : 0;
    const isOutOfStock = (p.stock || 0) <= 0;

    return `
      <div class="bg-white rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group relative">
        
        <!-- Discount Tag -->
        ${hasDiscount ? `
          <span class="absolute top-3 left-3 z-10 bg-brand-orange text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
            ${discountPercent}% OFF
          </span>
        ` : ''}

        <!-- Product Image -->
        <div onclick="openProductModal('${p._id}')" class="h-48 sm:h-52 bg-slate-50 flex items-center justify-center p-4 cursor-pointer overflow-hidden relative">
          <img src="${mainImg}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300">
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
              <span class="bg-red-600 text-white text-[11px] font-black uppercase px-3 py-1.5 rounded-lg shadow">Out of Stock</span>
            </div>
          ` : ''}
        </div>

        <!-- Product Meta (Clean without any Star Ratings) -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div class="mb-3">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">${p.category}</span>
            <h3 onclick="openProductModal('${p._id}')" class="font-extrabold text-sm text-slate-900 line-clamp-2 hover:text-brand-orange cursor-pointer transition">
              ${p.name}
            </h3>
          </div>

          <!-- Price & Round Orange Cart Button -->
          <div class="flex items-end justify-between pt-2.5 border-t border-slate-100">
            <div>
              <span class="text-base font-black text-brand-orange block leading-tight">৳ ${(p.discountPrice || 0).toLocaleString()}</span>
              ${hasDiscount ? `
                <span class="text-[11px] line-through text-slate-400 font-medium">৳ ${(p.originalPrice || 0).toLocaleString()}</span>
              ` : ''}
            </div>

            <!-- Round Orange Add to Cart Button -->
            <button onclick="event.stopPropagation(); addToCart('${p._id}')" ${isOutOfStock ? 'disabled' : ''} 
              class="w-9 h-9 rounded-full ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-orange hover:bg-orange-600 text-white shadow-md hover:shadow-lg active:scale-90 cursor-pointer'} flex items-center justify-center transition">
              <i class="fa-solid fa-cart-shopping text-xs"></i>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// ================= PRODUCT DETAILS MODAL =================
function openProductModal(productId) {
  const prod = products.find(p => p._id === productId);
  if (!prod) return;

  currentModalProduct = prod;
  currentModalQty = 1;

  document.getElementById('modalTitle').innerText = prod.name;
  document.getElementById('modalCategoryBadge').innerText = prod.category;
  document.getElementById('modalDiscountPrice').innerText = `৳ ${(prod.discountPrice || 0).toLocaleString()}`;
  document.getElementById('modalQtyVal').innerText = currentModalQty;

  const origPriceEl = document.getElementById('modalOriginalPrice');
  const discountBadge = document.getElementById('modalDiscountPercent');
  if (prod.originalPrice > prod.discountPrice) {
    origPriceEl.innerText = `৳ ${prod.originalPrice.toLocaleString()}`;
    const percent = Math.round(((prod.originalPrice - prod.discountPrice) / prod.originalPrice) * 100);
    discountBadge.innerText = `${percent}% OFF`;
    origPriceEl.classList.remove('hidden');
    discountBadge.classList.remove('hidden');
  } else {
    origPriceEl.classList.add('hidden');
    discountBadge.classList.add('hidden');
  }

  const stockEl = document.getElementById('modalStockStatus');
  const addBtn = document.getElementById('modalAddToCartBtn');
  if (prod.stock > 0) {
    stockEl.innerHTML = `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check mr-1"></i> In Stock (${prod.stock} items available)</span>`;
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
      addBtn.classList.add('bg-[#0B0F19]', 'hover:bg-brand-orange', 'cursor-pointer');
    }
  } else {
    stockEl.innerHTML = `<span class="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-xmark mr-1"></i> Out of Stock</span>`;
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.classList.add('bg-slate-300', 'cursor-not-allowed');
      addBtn.classList.remove('bg-[#0B0F19]', 'hover:bg-brand-orange', 'cursor-pointer');
    }
  }

  document.getElementById('modalDescription').innerText = prod.description || 'No detailed description provided for this product.';

  const images = prod.images && prod.images.length > 0 ? prod.images : ['https://placehold.co/500'];
  const mainImg = document.getElementById('modalMainImg');
  if (mainImg) mainImg.src = images[0];

  const thumbContainer = document.getElementById('modalThumbnails');
  if (thumbContainer) {
    thumbContainer.innerHTML = images.map((src, idx) => `
      <button onclick="selectModalImage('${src}', this)" class="w-12 h-12 rounded-xl border-2 overflow-hidden bg-white p-1 transition cursor-pointer ${idx === 0 ? 'border-brand-orange shadow' : 'border-slate-200 opacity-70 hover:opacity-100'}">
        <img src="${src}" class="w-full h-full object-contain">
      </button>
    `).join('');
  }

  document.getElementById('productModal')?.classList.remove('hidden');
}

function selectModalImage(src, btn) {
  const mainImg = document.getElementById('modalMainImg');
  if (mainImg) mainImg.src = src;

  document.querySelectorAll('#modalThumbnails button').forEach(b => {
    b.classList.remove('border-brand-orange', 'shadow');
    b.classList.add('border-slate-200', 'opacity-70');
  });
  btn.classList.add('border-brand-orange', 'shadow');
  btn.classList.remove('border-slate-200', 'opacity-70');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.add('hidden');
  currentModalProduct = null;
}

function adjustModalQty(delta) {
  if (!currentModalProduct) return;
  const newQty = currentModalQty + delta;
  if (newQty >= 1 && newQty <= currentModalProduct.stock) {
    currentModalQty = newQty;
    document.getElementById('modalQtyVal').innerText = currentModalQty;
  }
}

function addModalProductToCart() {
  if (!currentModalProduct || currentModalProduct.stock <= 0) return;

  const existing = cart.find(item => item.id === currentModalProduct._id);
  if (existing) {
    if (existing.qty + currentModalQty <= currentModalProduct.stock) {
      existing.qty += currentModalQty;
    } else {
      existing.qty = currentModalProduct.stock;
      alert('Available stock limit reached!');
    }
  } else {
    cart.push({
      id: currentModalProduct._id,
      name: currentModalProduct.name,
      price: currentModalProduct.discountPrice,
      image: currentModalProduct.images?.[0] || '',
      qty: currentModalQty
    });
  }

  saveCart();
  closeProductModal();
  openCartDrawer();
}

// Zoom Effect
function setupZoomEffect() {
  const container = document.getElementById('zoomContainer');
  const img = document.getElementById('modalMainImg');
  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(2.2)';
  });

  container.addEventListener('mouseleave', () => {
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = 'center center';
  });
}

// ================= CART LOGIC =================
function addToCart(productId, openDrawer = true) {
  const prod = products.find(p => p._id === productId);
  if (!prod || prod.stock <= 0) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < prod.stock) {
      existing.qty += 1;
    } else {
      alert('Available stock limit reached!');
      return;
    }
  } else {
    cart.push({
      id: prod._id,
      name: prod.name,
      price: prod.discountPrice,
      image: prod.images?.[0] || '',
      qty: 1
    });
  }

  saveCart();
  if (openDrawer) openCartDrawer();
}

function updateCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  const prod = products.find(p => p._id === id);
  if (!item) return;

  item.qty += delta;
  if (prod && item.qty > prod.stock) {
    item.qty = prod.stock;
    alert('Maximum stock reached');
  }

  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
}

function saveCart() {
  localStorage.setItem('delibuy_cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.innerText = totalCount;

  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.innerText = `৳ ${subtotal.toLocaleString()}`;

  const container = document.getElementById('cartItemsList');
  if (container) {
    if (cart.length === 0) {
      container.innerHTML = `<div class="py-20 text-center text-slate-400 font-bold text-xs">Your shopping cart is empty.</div>`;
    } else {
      container.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <img src="${item.image}" class="w-12 h-12 object-cover rounded-lg border bg-white">
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-xs text-slate-800 truncate">${item.name}</h4>
            <span class="text-brand-orange font-bold text-xs">৳ ${item.price.toLocaleString()}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-white border rounded-lg p-1">
            <button onclick="updateCartQty('${item.id}', -1)" class="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-black cursor-pointer">-</button>
            <span class="text-xs font-bold px-1">${item.qty}</span>
            <button onclick="updateCartQty('${item.id}', 1)" class="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-black cursor-pointer">+</button>
          </div>
          <button onclick="removeFromCart('${item.id}')" class="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `).join('');
    }
  }
}

function openCartDrawer() {
  updateCartUI();
  document.getElementById('cartDrawer')?.classList.remove('translate-x-full');
  document.getElementById('cartBackdrop')?.classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('translate-x-full');
  document.getElementById('cartBackdrop')?.classList.add('hidden');
}

// ================= CHECKOUT & ORDER SUBMISSION =================
function openCheckoutModal() {
  if (cart.length === 0) return alert('Your cart is empty!');
  closeCartDrawer();
  updateCheckoutBilling();
  document.getElementById('checkoutModal')?.classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal')?.classList.add('hidden');
}

function setDeliveryLocation(loc) {
  selectedDeliveryLocation = loc;
  updateCheckoutBilling();
}

function updateCheckoutBilling() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const fee = selectedDeliveryLocation === 'inside' ? (storeSettings.insideDhakaFee || 60) : (storeSettings.outsideDhakaFee || 120);

  document.getElementById('checkoutSubtotal').innerText = `৳ ${subtotal.toLocaleString()}`;
  document.getElementById('checkoutDeliveryFee').innerText = `৳ ${fee}`;
  document.getElementById('checkoutAdvanceAmount').innerText = `৳ ${fee}`;
  document.getElementById('checkoutCodPayable').innerText = `৳ ${subtotal.toLocaleString()}`;
  document.getElementById('checkoutBkashTarget').innerText = storeSettings.bkashNumber;
}

async function handlePlaceOrder(e) {
  e.preventDefault();

  if (isSubmittingOrder) return;
  isSubmittingOrder = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Booking Order...';
  }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const bkashSender = document.getElementById('bkashSenderPhone').value.trim();
  const trxId = document.getElementById('bkashTrxId').value.trim().toUpperCase();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const deliveryFee = selectedDeliveryLocation === 'inside' ? storeSettings.insideDhakaFee : storeSettings.outsideDhakaFee;
  const orderId = `DB-${Math.floor(100000 + Math.random() * 900000)}`;

  const newOrder = {
    orderId,
    customer: { name, phone, address },
    location: selectedDeliveryLocation,
    deliveryFee,
    advancePayment: {
      method: 'bKash Send Money',
      targetNumber: storeSettings.bkashNumber,
      amount: deliveryFee,
      senderPhone: bkashSender,
      trxId
    },
    payableOnDelivery: subtotal,
    grandTotal: subtotal + deliveryFee,
    items: [...cart],
    status: 'Order Placed'
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      cart = [];
      saveCart();
      closeCheckoutModal();
      document.getElementById('checkoutForm')?.reset();

      document.getElementById('successOrderId').innerText = orderId;
      document.getElementById('successCustomerName').innerText = name;
      document.getElementById('successModal')?.classList.remove('hidden');
    } else {
      alert(data.error || 'Failed to place order. Please try again.');
    }
  } catch (err) {
    alert('Could not submit order. Server is offline or unreachable.');
  } finally {
    isSubmittingOrder = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}

function closeSuccessModal() {
  document.getElementById('successModal')?.classList.add('hidden');
}

function copySuccessOrderId() {
  const orderId = document.getElementById('successOrderId')?.innerText;
  if (orderId) {
    navigator.clipboard.writeText(orderId).then(() => {
      alert('Order ID copied: ' + orderId);
    });
  }
}

function trackFromSuccess() {
  const orderId = document.getElementById('successOrderId')?.innerText;
  document.getElementById('successModal')?.classList.add('hidden');
  openTrackModal();
  const trackInput = document.getElementById('trackInput');
  if (trackInput && orderId) {
    trackInput.value = orderId;
    handleTrackSearch();
  }
}

// ================= TRACK ORDER MODAL =================
function openTrackModal() {
  document.getElementById('trackModal')?.classList.remove('hidden');
}

function closeTrackModal() {
  document.getElementById('trackModal')?.classList.add('hidden');
}

async function handleTrackSearch() {
  const input = document.getElementById('trackInput');
  const resBox = document.getElementById('trackResultContainer');
  if (!input || !resBox) return;

  const query = input.value.trim();
  if (!query) {
    resBox.classList.remove('hidden');
    resBox.innerHTML = '<p class="text-xs text-red-500 font-bold">Please enter an Order ID or Phone Number.</p>';
    return;
  }

  resBox.classList.remove('hidden');
  resBox.innerHTML = '<p class="text-xs text-slate-400 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Searching database...</p>';

  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(query)}`);
    if (res.ok) {
      const ord = await res.json();
      resBox.innerHTML = `
        <div class="p-3 bg-slate-50 border rounded-xl space-y-1.5 text-xs text-left">
          <div class="flex justify-between items-center border-b pb-1.5">
            <span class="font-mono font-bold text-brand-orange text-sm">${ord.orderId}</span>
            <span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] ${getStatusClass(ord.status)}">${ord.status}</span>
          </div>
          <p><strong>Customer:</strong> ${ord.customer?.name || 'N/A'}</p>
          <p><strong>Phone:</strong> ${ord.customer?.phone || 'N/A'}</p>
          <p><strong>Address:</strong> ${ord.customer?.address || 'N/A'}</p>
          <p><strong>COD Collectible:</strong> <span class="font-bold text-slate-900">৳ ${(ord.payableOnDelivery || 0).toLocaleString()}</span></p>
        </div>
      `;
    } else {
      resBox.innerHTML = '<p class="text-xs text-red-500 font-bold py-2"><i class="fa-solid fa-circle-exclamation mr-1"></i> Order not found in database!</p>';
    }
  } catch (err) {
    resBox.innerHTML = '<p class="text-xs text-red-500 font-bold py-2">Server connection error.</p>';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'Order Placed': return 'bg-amber-100 text-amber-800';
    case 'Confirmed Order': return 'bg-blue-100 text-blue-800';
    case 'Shifted': return 'bg-purple-100 text-purple-800';
    case 'Delivered': return 'bg-green-100 text-green-800';
    case 'Cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  document.getElementById('mobileSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleMobileSearch();
  });
  document.getElementById('trackInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleTrackSearch();
  });
}