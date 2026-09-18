/**
 * DeliBuy Customer Storefront Controller
 * Complete with Product Click Details, Zoomable Gallery, Cart, Checkout & Tracking
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
  updateCartBadge();
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
      if (bkashEl) bkashEl.innerText = storeSettings.bkashNumber;
    }
  } catch (e) {
    console.error('Settings load error:', e);
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (res.ok) {
      categories = await res.json();
      renderCategories();
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

// ================= CATEGORIES & FILTER =================
function renderCategories() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button onclick="selectCategory('${cat.id}')"
      class="cat-pill px-4 py-2 rounded-full text-xs font-bold border transition flex items-center gap-2 whitespace-nowrap cursor-pointer
      ${activeCategory === cat.id ? 'bg-[#0B0F19] text-white border-slate-900 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}">
      <i class="fa-solid ${cat.icon || 'fa-tag'} text-brand-orange"></i>
      <span>${cat.name}</span>
    </button>
  `).join('');
}

function selectCategory(catId) {
  activeCategory = catId;
  renderCategories();
  
  const titleEl = document.getElementById('currentCategoryTitle');
  if (titleEl) {
    const target = categories.find(c => c.id === catId);
    titleEl.innerText = target ? target.name : 'All Products';
  }
  renderProducts();
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
  const countBadge = document.getElementById('productCountBadge');
  const titleEl = document.getElementById('currentCategoryTitle');

  if (!query) {
    if (titleEl) titleEl.innerText = 'All Products';
    renderProducts();
    return;
  }

  if (titleEl) titleEl.innerText = `Search: "${query}"`;
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.category.toLowerCase().includes(query)
  );

  if (countBadge) countBadge.innerText = `${filtered.length} products`;
  renderProductGrid(filtered);
}

// ================= PRODUCT DISPLAY (WITH CLICK TO VIEW) =================
function renderProducts() {
  const countBadge = document.getElementById('productCountBadge');
  let filtered = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  if (countBadge) countBadge.innerText = `${filtered.length} products`;
  renderProductGrid(filtered);
}

function renderProductGrid(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-bold">No products found.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => {
    const mainImg = p.images?.[0] || 'https://placehold.co/400';
    const isOutOfStock = (p.stock || 0) <= 0;

    return `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition flex flex-col group">
        <!-- পুরো ইমেজ ও টাইটেল ক্লিক করলে মোডাল ওপেন হবে -->
        <div onclick="openProductModal('${p._id}')" class="relative overflow-hidden bg-slate-50 h-52 flex items-center justify-center p-3 cursor-pointer">
          <img src="${mainImg}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300">
          ${p.originalPrice > p.discountPrice ? `
            <span class="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-black px-2 py-1 rounded-md shadow">
              SAVE ৳ ${(p.originalPrice - p.discountPrice).toLocaleString()}
            </span>
          ` : ''}
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
              <span class="bg-red-600 text-white text-xs font-black uppercase px-3 py-1.5 rounded-lg shadow">Out of Stock</span>
            </div>
          ` : ''}
        </div>

        <div class="p-4 flex flex-col flex-1 justify-between gap-3">
          <div onclick="openProductModal('${p._id}')" class="cursor-pointer">
            <span class="text-[10px] font-bold text-brand-orange uppercase tracking-wider">${p.category}</span>
            <h3 class="font-bold text-slate-900 text-sm line-clamp-2 mt-0.5 hover:text-brand-orange transition">${p.name}</h3>
          </div>

          <div>
            <div class="flex items-baseline gap-2 mb-3">
              <span class="text-lg font-black text-slate-900">৳ ${p.discountPrice.toLocaleString()}</span>
              ${p.originalPrice > p.discountPrice ? `
                <span class="text-xs text-slate-400 line-through">৳ ${p.originalPrice.toLocaleString()}</span>
              ` : ''}
            </div>

            <button onclick="event.stopPropagation(); addToCart('${p._id}')" ${isOutOfStock ? 'disabled' : ''}
              class="w-full ${isOutOfStock ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-[#0B0F19] hover:bg-brand-orange text-white cursor-pointer'} font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm">
              <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Stock Out' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ================= PRODUCT DETAILS MODAL & GALLERY =================
function openProductModal(productId) {
  const prod = products.find(p => p._id === productId);
  if (!prod) return;

  currentModalProduct = prod;
  currentModalQty = 1;

  document.getElementById('modalTitle').innerText = prod.name;
  document.getElementById('modalCategoryBadge').innerText = prod.category;
  document.getElementById('modalDiscountPrice').innerText = `৳ ${prod.discountPrice.toLocaleString()}`;
  document.getElementById('modalQtyVal').innerText = currentModalQty;

  // Price & Discount Calculations
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

  // Stock Status
  const stockEl = document.getElementById('modalStockStatus');
  const addBtn = document.getElementById('modalAddToCartBtn');
  if (prod.stock > 0) {
    stockEl.innerHTML = `<span class="text-xs font-bold text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i> In Stock (${prod.stock} items available)</span>`;
    addBtn.disabled = false;
    addBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
    addBtn.classList.add('bg-[#0B0F19]', 'hover:bg-brand-orange', 'cursor-pointer');
  } else {
    stockEl.innerHTML = `<span class="text-xs font-bold text-red-600"><i class="fa-solid fa-circle-xmark mr-1"></i> Out of Stock</span>`;
    addBtn.disabled = true;
    addBtn.classList.add('bg-slate-300', 'cursor-not-allowed');
    addBtn.classList.remove('bg-[#0B0F19]', 'hover:bg-brand-orange', 'cursor-pointer');
  }

  // Description
  document.getElementById('modalDescription').innerText = prod.description || 'No detailed description provided for this product.';

  // Images & Thumbnails
  const images = prod.images && prod.images.length > 0 ? prod.images : ['https://placehold.co/500'];
  const mainImg = document.getElementById('modalMainImg');
  mainImg.src = images[0];

  const thumbContainer = document.getElementById('modalThumbnails');
  thumbContainer.innerHTML = images.map((src, idx) => `
    <button onclick="selectModalImage('${src}', this)" class="w-14 h-14 rounded-xl border-2 overflow-hidden bg-white p-1 transition cursor-pointer ${idx === 0 ? 'border-brand-orange shadow' : 'border-slate-200 opacity-70 hover:opacity-100'}">
      <img src="${src}" class="w-full h-full object-contain">
    </button>
  `).join('');

  document.getElementById('productModal')?.classList.remove('hidden');
}

function selectModalImage(src, btn) {
  document.getElementById('modalMainImg').src = src;
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
  updateCartBadge();
  closeProductModal();
  openCartDrawer();
}

// Interactive Zoom Effect on Image Hover
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
function addToCart(productId) {
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
  updateCartBadge();
  openCartDrawer();
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
  updateCartBadge();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem('delibuy_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.cart-badge-count').forEach(el => {
    el.innerText = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cartDrawer')?.classList.remove('translate-x-full');
  document.getElementById('cartBackdrop')?.classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('translate-x-full');
  document.getElementById('cartBackdrop')?.classList.add('hidden');
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<div class="py-20 text-center text-slate-400 font-bold">Your cart is empty.</div>`;
    if (subtotalEl) subtotalEl.innerText = '৳ 0';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  if (subtotalEl) subtotalEl.innerText = `৳ ${subtotal.toLocaleString()}`;

  container.innerHTML = cart.map(item => `
    <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
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
    </div>
  `).join('');
}

// ================= CHECKOUT & ORDER SUBMISSION =================
function openCheckoutModal() {
  if (cart.length === 0) return alert('Your cart is empty!');
  closeCartDrawer();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const fee = selectedDeliveryLocation === 'inside' ? storeSettings.insideDhakaFee : storeSettings.outsideDhakaFee;

  document.getElementById('checkoutSubtotal').innerText = `৳ ${subtotal.toLocaleString()}`;
  document.getElementById('checkoutDeliveryFee').innerText = `৳ ${fee}`;
  document.getElementById('checkoutAdvanceAmount').innerText = `৳ ${fee}`;
  document.getElementById('checkoutCodPayable').innerText = `৳ ${subtotal.toLocaleString()}`;
  document.getElementById('checkoutBkashTarget').innerText = storeSettings.bkashNumber;

  document.getElementById('checkoutModal')?.classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal')?.classList.add('hidden');
}

function setDeliveryLocation(loc) {
  selectedDeliveryLocation = loc;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const fee = loc === 'inside' ? storeSettings.insideDhakaFee : storeSettings.outsideDhakaFee;

  document.getElementById('checkoutDeliveryFee').innerText = `৳ ${fee}`;
  document.getElementById('checkoutAdvanceAmount').innerText = `৳ ${fee}`;
  document.getElementById('checkoutCodPayable').innerText = `৳ ${subtotal.toLocaleString()}`;
}

async function handlePlaceOrder(e) {
  e.preventDefault();

  if (isSubmittingOrder) return;
  isSubmittingOrder = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Placing Order...';
  }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const bkashSender = document.getElementById('bkashSenderPhone').value.trim();
  const trxId = document.getElementById('bkashTrxId').value.trim();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const deliveryFee = selectedDeliveryLocation === 'inside' ? storeSettings.insideDhakaFee : storeSettings.outsideDhakaFee;

  const newOrder = {
    orderId: `DB-${Math.floor(100000 + Math.random() * 900000)}`,
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
    items: [...cart]
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
      updateCartBadge();
      closeCheckoutModal();
      document.getElementById('checkoutForm')?.reset();

      showSuccessModal(newOrder.orderId, newOrder.customer.name);
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

// ================= SUCCESS SCREEN =================
function showSuccessModal(orderId, name) {
  const modal = document.getElementById('successModal');
  if (modal) {
    document.getElementById('successOrderId').innerText = orderId;
    document.getElementById('successCustomerName').innerText = name;
    modal.classList.remove('hidden');
  } else {
    alert(`Order Placed Successfully!\n\nOrder ID: ${orderId}`);
  }
}

function closeSuccessModal() {
  document.getElementById('successModal')?.classList.add('hidden');
  window.location.reload();
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
  resBox.innerHTML = '<p class="text-xs text-slate-400 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Searching cloud database...</p>';

  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(query)}`);
    if (res.ok) {
      const ord = await res.json();
      resBox.innerHTML = `
        <div class="p-3 bg-slate-50 border rounded-xl space-y-1.5 text-xs text-left">
          <div class="flex justify-between items-center border-b pb-1.5">
            <span class="font-mono font-bold text-brand-orange text-sm">${ord.orderId}</span>
            <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${getStatusClass(ord.status)}">${ord.status}</span>
          </div>
          <p><strong>Customer:</strong> ${ord.customer?.name || 'N/A'}</p>
          <p><strong>Phone:</strong> ${ord.customer?.phone || 'N/A'}</p>
          <p><strong>Delivery Address:</strong> ${ord.customer?.address || 'N/A'}</p>
          <p><strong>COD Due on Delivery:</strong> <span class="font-bold text-slate-900">৳ ${(ord.payableOnDelivery || 0).toLocaleString()}</span></p>
        </div>
      `;
    } else {
      resBox.innerHTML = '<p class="text-xs text-red-500 font-bold py-2"><i class="fa-solid fa-circle-exclamation mr-1"></i> Order not found in database!</p>';
    }
  } catch (err) {
    resBox.innerHTML = '<p class="text-xs text-red-500 font-bold py-2">Server offline or connection error.</p>';
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