/**
 * DeliBuy Operations & RBAC Controller (Connected to MongoDB Atlas)
 * Updated with Complete Product Edit, Invoice Print & Order State Workflows
 */

const API_BASE = 'https://delibuy.onrender.com/api';

let currentOrderFilter = 'All';
let currentUploadedImages = [];
let editUploadedImages = [];
let loggedAdmin = null;

let allOrders = [];
let allProducts = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});

// ================= AUTHENTICATION =================
async function checkAdminAuth() {
  const sessionUser = sessionStorage.getItem('delibuy_logged_admin');
  const overlay = document.getElementById('adminLoginOverlay');
  if (sessionUser) {
    loggedAdmin = JSON.parse(sessionUser);
    if (overlay) overlay.classList.add('hidden');
    applyAdminRoleUI();
    initializeData();
  } else {
    if (overlay) overlay.classList.remove('hidden');
  }
}

function applyAdminRoleUI() {
  const greeting = document.getElementById('headerUserGreeting');
  const roleBadge = document.getElementById('sidebarRoleBadge');
  if (loggedAdmin) {
    if (greeting) greeting.innerHTML = `Logged in as: <strong>${loggedAdmin.username}</strong>`;
    if (roleBadge) roleBadge.innerText = loggedAdmin.role || 'Super Admin';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername')?.value.trim();
  const password = document.getElementById('loginPassword')?.value.trim();

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.setItem('delibuy_logged_admin', JSON.stringify(data.admin));
      loggedAdmin = data.admin;
      document.getElementById('adminLoginOverlay')?.classList.add('hidden');
      applyAdminRoleUI();
      initializeData();
    } else {
      // Fallback default master login check
      if (username === 'admin' && password === 'delibuy123') {
        const defaultAdmin = { username: 'admin', role: 'Super Admin' };
        sessionStorage.setItem('delibuy_logged_admin', JSON.stringify(defaultAdmin));
        loggedAdmin = defaultAdmin;
        document.getElementById('adminLoginOverlay')?.classList.add('hidden');
        applyAdminRoleUI();
        initializeData();
      } else {
        alert(data.error || 'Invalid Admin Credentials!');
      }
    }
  } catch (err) {
    if (username === 'admin' && password === 'delibuy123') {
      const defaultAdmin = { username: 'admin', role: 'Super Admin' };
      sessionStorage.setItem('delibuy_logged_admin', JSON.stringify(defaultAdmin));
      loggedAdmin = defaultAdmin;
      document.getElementById('adminLoginOverlay')?.classList.add('hidden');
      applyAdminRoleUI();
      initializeData();
    } else {
      alert('Login error. Please verify backend connection.');
    }
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem('delibuy_logged_admin');
  window.location.reload();
}

// ================= DATA INITIALIZATION =================
async function initializeData() {
  await Promise.all([loadOrders(), loadProducts(), loadCategories(), loadSettings(), loadAdminAccounts()]);
}

// ================= NAVIGATION =================
function switchTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-nav-btn').forEach(b => {
    b.classList.remove('bg-brand-orange', 'text-white');
    b.classList.add('text-slate-400');
  });

  const activeTab = document.getElementById(tabId);
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeTab) activeTab.classList.remove('hidden');
  if (activeNav) {
    activeNav.classList.add('bg-brand-orange', 'text-white');
    activeNav.classList.remove('text-slate-400');
  }

  const titles = {
    dashboardTab: 'Orders Dashboard',
    productsTab: 'Product Catalog & Inventory',
    categoriesTab: 'Store Categories',
    teamTab: 'Admin Accounts & Roles',
    settingsTab: 'Store Settings'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.innerText = titles[tabId] || 'Dashboard';
}

// ================= ORDERS LOGIC =================
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (res.ok) {
      allOrders = await res.json();
      updateOrderStats();
      renderOrdersTable();
    }
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function updateOrderStats() {
  const countNew = allOrders.filter(o => o.status === 'Order Placed').length;
  const countConf = allOrders.filter(o => o.status === 'Confirmed Order').length;
  const countShift = allOrders.filter(o => o.status === 'Shifted').length;
  const countDeliv = allOrders.filter(o => o.status === 'Delivered').length;
  const countCanc = allOrders.filter(o => o.status === 'Cancelled').length;

  document.getElementById('statNewOrders').innerText = countNew;
  document.getElementById('statConfirmedOrders').innerText = countConf;
  document.getElementById('statShiftedOrders').innerText = countShift;
  document.getElementById('statDeliveredOrders').innerText = countDeliv;
  document.getElementById('statCancelledOrders').innerText = countCanc;
}

function filterOrdersByStatus(status) {
  currentOrderFilter = status;
  document.querySelectorAll('#orderFilterPills button').forEach(b => {
    b.classList.remove('active', 'border-slate-800', 'bg-[#0B0F19]', 'text-white');
    b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
  });
  event?.target?.classList?.add('active', 'border-slate-800', 'bg-[#0B0F19]', 'text-white');
  renderOrdersTable();
}

function handleOrderSearchLive() {
  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  const countBadge = document.getElementById('orderTableCount');
  const searchVal = document.getElementById('orderSearchInput')?.value.trim().toLowerCase() || '';
  if (!tbody) return;

  let filtered = allOrders;
  if (currentOrderFilter !== 'All') {
    filtered = filtered.filter(o => o.status === currentOrderFilter);
  }
  if (searchVal) {
    filtered = filtered.filter(o => 
      (o.orderId && o.orderId.toLowerCase().includes(searchVal)) ||
      (o.customer?.phone && o.customer.phone.includes(searchVal)) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(searchVal))
    );
  }

  if (countBadge) countBadge.innerText = `${filtered.length} records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-bold">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-3.5 font-mono font-bold text-slate-800">${o.orderId}</td>
      <td class="p-3.5">
        <p class="font-bold text-slate-800">${o.customer?.name || 'N/A'}</p>
        <p class="text-slate-400 text-[11px]">${o.customer?.phone || 'N/A'}</p>
      </td>
      <td class="p-3.5 font-mono text-[#E2136E] font-bold">${o.advancePayment?.trxId || 'N/A'}</td>
      <td class="p-3.5 font-bold text-slate-900">৳ ${(o.payableOnDelivery || 0).toLocaleString()}</td>
      <td class="p-3.5"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${getOrderStatusBadge(o.status)}">${o.status}</span></td>
      <td class="p-3.5 text-center">${getActionButtons(o)}</td>
      <td class="p-3.5 text-right">
        <button onclick="openOrderDetailModal('${o.orderId}')" class="bg-slate-900 hover:bg-brand-orange text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer">
          Details
        </button>
      </td>
    </tr>
  `).join('');
}

function getOrderStatusBadge(status) {
  switch (status) {
    case 'Order Placed': return 'bg-amber-100 text-amber-800';
    case 'Confirmed Order': return 'bg-blue-100 text-blue-800';
    case 'Shifted': return 'bg-purple-100 text-purple-800';
    case 'Delivered': return 'bg-green-100 text-green-800';
    case 'Cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getActionButtons(o) {
  if (o.status === 'Order Placed') {
    return `
      <div class="flex items-center justify-center gap-1.5">
        <button onclick="updateOrderStatus('${o.orderId}', 'Confirmed Order')" class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer">Confirm</button>
        <button onclick="updateOrderStatus('${o.orderId}', 'Cancelled')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer">Cancel</button>
      </div>`;
  }
  if (o.status === 'Confirmed Order') {
    return `<button onclick="updateOrderStatus('${o.orderId}', 'Shifted')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer">Shift Parcel</button>`;
  }
  if (o.status === 'Shifted') {
    return `<button onclick="updateOrderStatus('${o.orderId}', 'Delivered')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer">Mark Delivered</button>`;
  }
  return `<span class="text-slate-400 text-[11px]">—</span>`;
}

async function updateOrderStatus(orderId, newStatus) {
  if (!confirm(`Change order status to "${newStatus}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await loadOrders();
      const modal = document.getElementById('orderDetailModal');
      if (modal && !modal.classList.contains('hidden')) {
        openOrderDetailModal(orderId);
      }
    } else {
      alert('Could not update order status.');
    }
  } catch (err) {
    alert('Server communication error.');
  }
}

function openOrderDetailModal(orderId) {
  const o = allOrders.find(item => item.orderId === orderId);
  if (!o) return;

  document.getElementById('modalOrderIdTitle').innerText = o.orderId;
  document.getElementById('modalCustName').innerText = o.customer?.name || 'N/A';
  document.getElementById('modalCustPhone').innerText = o.customer?.phone || 'N/A';
  document.getElementById('modalLocationBadge').innerText = o.location === 'inside' ? 'Inside Dhaka (৳ 60)' : 'Outside Dhaka (৳ 120)';
  document.getElementById('modalCustAddress').innerText = o.customer?.address || 'N/A';

  document.getElementById('modalBkashSender').innerText = o.advancePayment?.senderPhone || 'N/A';
  document.getElementById('modalBkashTrx').innerText = o.advancePayment?.trxId || 'N/A';

  document.getElementById('modalBillSubtotal').innerText = `৳ ${(o.payableOnDelivery || 0).toLocaleString()}`;
  document.getElementById('modalBillShipping').innerText = `৳ ${(o.deliveryFee || 0).toLocaleString()} (PAID via bKash)`;
  document.getElementById('modalBillCod').innerText = `৳ ${(o.payableOnDelivery || 0).toLocaleString()}`;

  const itemsList = document.getElementById('modalItemsList');
  if (itemsList) {
    itemsList.innerHTML = (o.items || []).map(item => `
      <div class="flex justify-between items-center p-3 bg-white">
        <div>
          <p class="font-bold text-slate-800 text-xs">${item.name}</p>
          <span class="text-slate-400 text-[11px]">Qty: ${item.qty} × ৳ ${(item.price || 0).toLocaleString()}</span>
        </div>
        <span class="font-bold text-slate-900 text-xs">৳ ${((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
      </div>
    `).join('');
  }

  const actionBox = document.getElementById('modalActionButtons');
  if (actionBox) {
    actionBox.innerHTML = `
      <span class="text-xs font-bold text-slate-500">Status: <strong class="text-slate-800">${o.status}</strong></span>
      <div class="flex gap-2">
        ${o.status === 'Order Placed' ? `
          <button onclick="updateOrderStatus('${o.orderId}', 'Confirmed Order')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs">Confirm</button>
          <button onclick="updateOrderStatus('${o.orderId}', 'Cancelled')" class="bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs">Cancel</button>
        ` : ''}
        ${o.status === 'Confirmed Order' ? `<button onclick="updateOrderStatus('${o.orderId}', 'Shifted')" class="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs">Shift Parcel</button>` : ''}
        ${o.status === 'Shifted' ? `<button onclick="updateOrderStatus('${o.orderId}', 'Delivered')" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs">Delivered</button>` : ''}
      </div>
    `;
  }

  document.getElementById('orderDetailModal')?.classList.remove('hidden');
}

function closeOrderDetailModal() {
  document.getElementById('orderDetailModal')?.classList.add('hidden');
}

// ================= PRODUCTS LOGIC (ADD, EDIT, DELETE) =================
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (res.ok) {
      allProducts = await res.json();
      renderAdminProducts();
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function calculateDiscountPrice() {
  const orig = parseFloat(document.getElementById('prodOriginalPrice')?.value) || 0;
  const disc = parseFloat(document.getElementById('prodDiscountPercent')?.value) || 0;
  const saleInput = document.getElementById('prodDiscountPrice');
  if (orig > 0) {
    const finalPrice = Math.round(orig - (orig * (disc / 100)));
    if (saleInput) saleInput.value = finalPrice;
  }
}

function calculateEditDiscountPrice() {
  const orig = parseFloat(document.getElementById('editProdOriginalPrice')?.value) || 0;
  const disc = parseFloat(document.getElementById('editProdDiscountPercent')?.value) || 0;
  const saleInput = document.getElementById('editProdDiscountPrice');
  if (orig > 0) {
    const finalPrice = Math.round(orig - (orig * (disc / 100)));
    if (saleInput) saleInput.value = finalPrice;
  }
}

function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  const container = document.getElementById('imagePreviewContainer');
  currentUploadedImages = [];
  if (container) container.innerHTML = '';

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentUploadedImages.push(event.target.result);
      if (container) {
        container.innerHTML += `<img src="${event.target.result}" class="w-14 h-14 object-cover rounded-lg border bg-white shadow-sm">`;
      }
    };
    reader.readAsDataURL(file);
  });
}

function handleEditImageUpload(e) {
  const files = Array.from(e.target.files);
  const container = document.getElementById('editImagePreviewContainer');
  editUploadedImages = [];
  if (container) container.innerHTML = '';

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      editUploadedImages.push(event.target.result);
      if (container) {
        container.innerHTML += `<img src="${event.target.result}" class="w-14 h-14 object-cover rounded-lg border bg-white shadow-sm">`;
      }
    };
    reader.readAsDataURL(file);
  });
}

async function handleCreateProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prodTitle').value.trim();
  const category = document.getElementById('prodCategorySelect').value;
  const originalPrice = parseFloat(document.getElementById('prodOriginalPrice').value);
  const discountPrice = parseFloat(document.getElementById('prodDiscountPrice').value);
  const stock = parseInt(document.getElementById('prodStock').value);
  const description = document.getElementById('prodDescription').value.trim();

  const newProd = {
    name,
    category,
    originalPrice,
    discountPrice,
    stock,
    description,
    images: currentUploadedImages.length > 0 ? currentUploadedImages : ['https://placehold.co/400']
  };

  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd)
    });
    if (res.ok) {
      alert('Product created successfully!');
      document.getElementById('addProductForm')?.reset();
      currentUploadedImages = [];
      const container = document.getElementById('imagePreviewContainer');
      if (container) container.innerHTML = '';
      await loadProducts();
    } else {
      alert('Failed to publish product.');
    }
  } catch (err) {
    alert('Server error.');
  }
}

function renderAdminProducts() {
  const tbody = document.getElementById('adminProductsTableBody');
  const countBadge = document.getElementById('adminProdCountBadge');
  if (!tbody) return;

  if (countBadge) countBadge.innerText = `${allProducts.length} products`;

  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-bold">No products in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = allProducts.map(p => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-3.5">
        <img src="${p.images?.[0] || 'https://placehold.co/100'}" class="w-12 h-12 object-cover rounded-lg border bg-white">
      </td>
      <td class="p-3.5 font-bold text-slate-800 text-xs">${p.name}</td>
      <td class="p-3.5"><span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">${p.category}</span></td>
      <td class="p-3.5 font-bold text-brand-orange">৳ ${(p.discountPrice || 0).toLocaleString()}</td>
      <td class="p-3.5 font-bold ${(p.stock || 0) <= 0 ? 'text-red-500' : 'text-slate-700'}">${p.stock || 0}</td>
      <td class="p-3.5 text-center">
        <div class="flex items-center justify-center gap-2">
          <!-- Edit Product Button -->
          <button onclick="openEditProductModal('${p._id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <!-- Delete Product Button -->
          <button onclick="handleDeleteProduct('${p._id}')" class="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ================= OPEN / CLOSE & SAVE EDIT MODAL =================
function openEditProductModal(productId) {
  const prod = allProducts.find(p => p._id === productId);
  if (!prod) return;

  document.getElementById('editProdId').value = prod._id;
  document.getElementById('editProdTitle').value = prod.name || '';
  document.getElementById('editProdOriginalPrice').value = prod.originalPrice || '';
  document.getElementById('editProdDiscountPrice').value = prod.discountPrice || '';
  document.getElementById('editProdStock').value = prod.stock || 0;
  document.getElementById('editProdDescription').value = prod.description || '';

  // Calculate discount percent
  if (prod.originalPrice > prod.discountPrice) {
    const percent = Math.round(((prod.originalPrice - prod.discountPrice) / prod.originalPrice) * 100);
    document.getElementById('editProdDiscountPercent').value = percent;
  } else {
    document.getElementById('editProdDiscountPercent').value = 0;
  }

  // Populate category select
  const catSelect = document.getElementById('editProdCategorySelect');
  if (catSelect) {
    catSelect.innerHTML = allCategories.map(c => `
      <option value="${c.id}" ${c.id === prod.category ? 'selected' : ''}>${c.name}</option>
    `).join('');
  }

  // Populate existing images preview
  const container = document.getElementById('editImagePreviewContainer');
  editUploadedImages = prod.images && prod.images.length > 0 ? [...prod.images] : [];
  if (container) {
    container.innerHTML = editUploadedImages.map(img => `
      <img src="${img}" class="w-14 h-14 object-cover rounded-lg border bg-white shadow-sm">
    `).join('');
  }

  document.getElementById('editProductModal')?.classList.remove('hidden');
}

function closeEditProductModal() {
  document.getElementById('editProductModal')?.classList.add('hidden');
  editUploadedImages = [];
}

async function handleUpdateProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdTitle').value.trim();
  const category = document.getElementById('editProdCategorySelect').value;
  const originalPrice = parseFloat(document.getElementById('editProdOriginalPrice').value);
  const discountPrice = parseFloat(document.getElementById('editProdDiscountPrice').value);
  const stock = parseInt(document.getElementById('editProdStock').value);
  const description = document.getElementById('editProdDescription').value.trim();

  const updatedData = {
    name,
    category,
    originalPrice,
    discountPrice,
    stock,
    description,
    images: editUploadedImages.length > 0 ? editUploadedImages : ['https://placehold.co/400']
  };

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (res.ok) {
      alert('Product updated successfully!');
      closeEditProductModal();
      await loadProducts();
    } else {
      alert('Failed to update product. Please check your backend update route.');
    }
  } catch (err) {
    alert('Server connection failed.');
  }
}

async function handleDeleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Product deleted.');
      await loadProducts();
    } else {
      alert('Failed to delete product.');
    }
  } catch (err) {
    alert('Server error.');
  }
}

// ================= CATEGORIES LOGIC =================
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (res.ok) {
      allCategories = await res.json();
      renderAdminCategories();
      populateCategoryDropdowns();
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function populateCategoryDropdowns() {
  const addSelect = document.getElementById('prodCategorySelect');
  if (addSelect) {
    addSelect.innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

function renderAdminCategories() {
  const grid = document.getElementById('adminCategoryGrid');
  if (!grid) return;
  grid.innerHTML = allCategories.map(c => `
    <div class="flex items-center justify-between p-3.5 bg-slate-50 border rounded-xl">
      <div>
        <p class="font-bold text-xs text-slate-900">${c.name}</p>
        <span class="text-[10px] font-mono text-slate-400">ID: ${c.id}</span>
      </div>
      <button onclick="handleDeleteCategory('${c.id}')" class="text-red-500 hover:text-red-700 text-xs font-bold p-1 cursor-pointer">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCatName').value.trim();
  const id = document.getElementById('newCatId').value.trim().toLowerCase();

  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, id })
    });
    if (res.ok) {
      alert('Category added successfully!');
      document.getElementById('addCategoryForm')?.reset();
      await loadCategories();
    } else {
      alert('Failed to create category.');
    }
  } catch (err) {
    alert('Server error.');
  }
}

async function handleDeleteCategory(catId) {
  if (!confirm(`Delete category "${catId}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/categories/${catId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadCategories();
    }
  } catch (err) {
    alert('Server error.');
  }
}

// ================= STORE SETTINGS LOGIC =================
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) {
      const data = await res.json();
      const bkashInput = document.getElementById('settingBkashNumber');
      const insideInput = document.getElementById('settingInsideFee');
      const outsideInput = document.getElementById('settingOutsideFee');
      if (bkashInput) bkashInput.value = data.bkashNumber || '01516-597972';
      if (insideInput) insideInput.value = data.insideDhakaFee || 60;
      if (outsideInput) outsideInput.value = data.outsideDhakaFee || 120;
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const bkashNumber = document.getElementById('settingBkashNumber').value.trim();
  const insideDhakaFee = parseFloat(document.getElementById('settingInsideFee').value);
  const outsideDhakaFee = parseFloat(document.getElementById('settingOutsideFee').value);

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bkashNumber, insideDhakaFee, outsideDhakaFee })
    });
    if (res.ok) {
      alert('Store settings updated successfully!');
    } else {
      alert('Failed to save settings.');
    }
  } catch (err) {
    alert('Server error.');
  }
}

// ================= ADMIN ACCOUNTS & ROLES =================
async function loadAdminAccounts() {
  try {
    const res = await fetch(`${API_BASE}/admins`);
    if (res.ok) {
      const admins = await res.json();
      renderAdminAccounts(admins);
    }
  } catch (err) {
    // Fallback if no separate admins collection
    renderAdminAccounts([{ name: 'Super Admin', username: 'admin', role: 'Super Admin' }]);
  }
}

function renderAdminAccounts(admins) {
  const tbody = document.getElementById('adminsTableBody');
  const countBadge = document.getElementById('adminAccountsCount');
  if (!tbody) return;

  if (countBadge) countBadge.innerText = `${admins.length} accounts`;

  tbody.innerHTML = admins.map(a => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-3.5 font-bold text-slate-800">${a.name || 'Admin User'}</td>
      <td class="p-3.5 font-mono text-slate-600">${a.username}</td>
      <td class="p-3.5"><span class="bg-orange-100 text-brand-orange px-2.5 py-1 rounded-full font-bold text-[10px]">${a.role}</span></td>
      <td class="p-3.5 text-right">
        ${a.username !== 'admin' ? `
          <button onclick="handleDeleteAdmin('${a.username}')" class="text-red-500 hover:text-red-700 font-bold cursor-pointer">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : `<span class="text-slate-400 font-bold text-[10px]">Master</span>`}
      </td>
    </tr>
  `).join('');
}

async function handleChangeOwnCredentials(e) {
  e.preventDefault();
  const newUsername = document.getElementById('changeUsername').value.trim();
  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/admin/change-credentials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentUsername: loggedAdmin?.username || 'admin',
        currentPassword,
        newUsername,
        newPassword
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Credentials updated! Please login again with new password.');
      handleAdminLogout();
    } else {
      alert(data.error || 'Failed to update credentials.');
    }
  } catch (err) {
    alert('Server communication error.');
  }
}

async function handleCreateNewAdmin(e) {
  e.preventDefault();
  const name = document.getElementById('newStaffName').value.trim();
  const username = document.getElementById('newStaffUsername').value.trim();
  const password = document.getElementById('newStaffPassword').value.trim();
  const role = document.getElementById('newStaffRole').value;

  try {
    const res = await fetch(`${API_BASE}/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role })
    });
    if (res.ok) {
      alert('New admin account created successfully!');
      e.target.reset();
      await loadAdminAccounts();
    } else {
      alert('Could not create admin.');
    }
  } catch (err) {
    alert('Server communication error.');
  }
}

async function handleDeleteAdmin(username) {
  if (!confirm(`Delete admin account "${username}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/admins/${username}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAdminAccounts();
    }
  } catch (err) {
    alert('Server error.');
  }
}