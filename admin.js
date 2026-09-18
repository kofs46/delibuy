/**
 * DeliBuy Operations & RBAC Controller (Connected to MongoDB Atlas)
 * Updated with parcel rejection/return workflows across active delivery states.
 */

const API_BASE = 'https://delibuy.onrender.com/api';

let currentOrderFilter = 'All';
let currentUploadedImages = [];
let loggedAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});

// ================= AUTHENTICATION =================
async function checkAdminAuth() {
  const sessionUser = sessionStorage.getItem('delibuy_logged_admin');
  const overlay = document.getElementById('adminLoginOverlay');

  if (sessionUser) {
    loggedAdmin = JSON.parse(sessionUser);
    overlay.classList.add('hidden');
    applyRolePermissions(loggedAdmin);
    
    // Fetch live data from MongoDB
    await Promise.all([
      fetchDashboardOrders(),
      fetchAdminProducts(),
      fetchAdminCategories(),
      fetchAdminsList(),
      fetchSettings()
    ]);
  } else {
    overlay.classList.remove('hidden');
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      sessionStorage.setItem('delibuy_logged_admin', JSON.stringify(data.admin));
      document.getElementById('loginUsername').value = '';
      document.getElementById('loginPassword').value = '';
      checkAdminAuth();
    } else {
      alert(data.message || 'Invalid username or password!');
    }
  } catch (err) {
    alert('Server connection error! Ensure server.js is running.');
  }
}

function handleAdminLogout() {
  if (confirm('Log out from DeliBuy Admin?')) {
    sessionStorage.removeItem('delibuy_logged_admin');
    window.location.reload();
  }
}

// ================= ROLE BASED PERMISSIONS =================
function applyRolePermissions(admin) {
  document.getElementById('sidebarRoleBadge').innerText = admin.role;
  document.getElementById('headerUserGreeting').innerHTML = `Logged in as: <strong>${admin.name} (${admin.role})</strong>`;

  const navOrders = document.getElementById('nav-dashboardTab');
  const navProducts = document.getElementById('nav-productsTab');
  const navCategories = document.getElementById('nav-categoriesTab');
  const navTeam = document.getElementById('nav-teamTab');
  const navSettings = document.getElementById('nav-settingsTab');

  if (admin.role === 'Order Manager') {
    navProducts.classList.add('hidden');
    navCategories.classList.add('hidden');
    navTeam.classList.add('hidden');
    navSettings.classList.add('hidden');
    switchTab('dashboardTab');
  } else if (admin.role === 'Product Manager') {
    navOrders.classList.add('hidden');
    navTeam.classList.add('hidden');
    navSettings.classList.add('hidden');
    switchTab('productsTab');
  } else {
    navOrders.classList.remove('hidden');
    navProducts.classList.remove('hidden');
    navCategories.classList.remove('hidden');
    navTeam.classList.remove('hidden');
    navSettings.classList.remove('hidden');
  }
}

// ================= ADMIN & CREDENTIALS MANAGEMENT =================
async function handleChangeOwnCredentials(e) {
  e.preventDefault();
  const newUsername = document.getElementById('changeUsername').value.trim();
  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/change-credentials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: loggedAdmin._id,
        currentPassword,
        newUsername,
        newPassword
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      sessionStorage.setItem('delibuy_logged_admin', JSON.stringify(data.admin));
      loggedAdmin = data.admin;
      alert('Credentials updated successfully in Cloud Database!');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      fetchAdminsList();
      applyRolePermissions(data.admin);
    } else {
      alert(data.error || 'Failed to update credentials');
    }
  } catch (err) {
    alert('Failed to connect to database');
  }
}

async function handleCreateNewAdmin(e) {
  e.preventDefault();
  if (loggedAdmin.role !== 'Super Admin') return alert('Access Denied');

  const name = document.getElementById('newStaffName').value.trim();
  const username = document.getElementById('newStaffUsername').value.trim();
  const password = document.getElementById('newStaffPassword').value.trim();
  const role = document.getElementById('newStaffRole').value;

  try {
    const res = await fetch(`${API_BASE}/auth/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role })
    });
    const data = await res.json();

    if (res.ok) {
      alert(`New staff (${role}) created successfully!`);
      document.getElementById('newStaffName').value = '';
      document.getElementById('newStaffUsername').value = '';
      document.getElementById('newStaffPassword').value = '';
      fetchAdminsList();
    } else {
      alert(data.error || 'Failed to create staff');
    }
  } catch (err) {
    alert('Server connection error');
  }
}

async function fetchAdminsList() {
  if (loggedAdmin?.role !== 'Super Admin') return;
  try {
    const res = await fetch(`${API_BASE}/auth/admins`);
    const admins = await res.json();
    renderAdminsList(admins);
  } catch (err) {
    console.error(err);
  }
}

function renderAdminsList(admins) {
  const tbody = document.getElementById('adminsTableBody');
  const count = document.getElementById('adminAccountsCount');
  if (!tbody) return;

  count.innerText = `${admins.length} accounts`;
  tbody.innerHTML = admins.map(a => `
    <tr class="hover:bg-slate-50 border-b">
      <td class="p-3 font-bold text-slate-800">${a.name} ${a._id === loggedAdmin?._id ? '<span class="text-[10px] text-brand-orange font-normal">(You)</span>' : ''}</td>
      <td class="p-3 font-mono text-slate-600">${a.username}</td>
      <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeClass(a.role)}">${a.role}</span></td>
      <td class="p-3 text-right">
        ${a._id !== loggedAdmin?._id ? `
          <button onclick="deleteAdmin('${a._id}')" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        ` : '<span class="text-slate-400 text-[10px]">Protected</span>'}
      </td>
    </tr>
  `).join('');
}

async function deleteAdmin(id) {
  if (!confirm('Remove this admin account?')) return;
  try {
    await fetch(`${API_BASE}/auth/admins/${id}`, { method: 'DELETE' });
    fetchAdminsList();
  } catch (err) {
    alert('Error deleting admin');
  }
}

function getRoleBadgeClass(role) {
  if (role === 'Super Admin') return 'bg-orange-100 text-brand-orange';
  if (role === 'Order Manager') return 'bg-blue-100 text-blue-700';
  return 'bg-purple-100 text-purple-700';
}

// ================= ORDERS PIPELINE =================
let cachedOrders = [];

async function fetchDashboardOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    cachedOrders = await res.json();
    renderDashboardStats();
    renderOrdersTable();
  } catch (err) {
    console.error(err);
  }
}

function renderDashboardStats() {
  document.getElementById('statNewOrders').innerText = cachedOrders.filter(o => o.status === 'Order Placed').length;
  document.getElementById('statConfirmedOrders').innerText = cachedOrders.filter(o => o.status === 'Confirmed Order').length;
  document.getElementById('statShiftedOrders').innerText = cachedOrders.filter(o => o.status === 'Shifted').length;
  document.getElementById('statDeliveredOrders').innerText = cachedOrders.filter(o => o.status === 'Delivered').length;
  document.getElementById('statCancelledOrders').innerText = cachedOrders.filter(o => o.status === 'Cancelled').length;
}

function filterOrdersByStatus(status) {
  currentOrderFilter = status;
  renderOrdersTable();
}

function handleOrderSearchLive() {
  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  const countBadge = document.getElementById('orderTableCount');
  const searchVal = document.getElementById('orderSearchInput')?.value.trim().toLowerCase() || '';

  let filtered = [...cachedOrders];
  if (currentOrderFilter !== 'All') filtered = filtered.filter(o => o.status === currentOrderFilter);

  if (searchVal) {
    filtered = filtered.filter(o =>
      o.orderId.toLowerCase().includes(searchVal) ||
      o.customer?.phone?.includes(searchVal) ||
      o.customer?.name?.toLowerCase().includes(searchVal)
    );
  }

  if (!countBadge || !tbody) return;
  countBadge.innerText = `${filtered.length} records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No matching orders found in cloud database.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(order => `
    <tr class="hover:bg-slate-50 border-b">
      <td class="p-3.5"><span class="font-mono font-black text-brand-orange">${order.orderId}</span></td>
      <td class="p-3.5"><p class="font-bold text-slate-800">${order.customer.name}</p><p class="text-[11px] text-slate-500">${order.customer.phone}</p></td>
      <td class="p-3.5"><span class="font-mono text-[11px] text-[#E2136E] font-bold">${order.advancePayment?.trxId || 'N/A'}</span></td>
      <td class="p-3.5 font-bold text-slate-900">৳ ${order.payableOnDelivery.toLocaleString()}</td>
      <td class="p-3.5"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusClass(order.status)}">${order.status}</span></td>
      <td class="p-3.5 text-center">${renderWorkflowButtons(order)}</td>
      <td class="p-3.5 text-right"><button onclick="inspectOrder('${order.orderId}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold">Inspect</button></td>
    </tr>
  `).join('');
}

// কুরিয়ার শিফট বা কনফার্মের পর কাস্টমার পার্সেল না নিলে Return / Cancel করার অপশনসহ বাটন লজিক
function renderWorkflowButtons(order) {
  if (order.status === 'Order Placed') {
    return `
      <div class="flex items-center justify-center gap-1.5">
        <button onclick="updateOrderStatus('${order.orderId}', 'Confirmed Order')" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-[11px] font-bold transition">Confirm</button>
        <button onclick="updateOrderStatus('${order.orderId}', 'Cancelled')" class="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded text-[11px] font-bold transition">Cancel</button>
      </div>
    `;
  } else if (order.status === 'Confirmed Order') {
    return `
      <div class="flex items-center justify-center gap-1.5">
        <button onclick="updateOrderStatus('${order.orderId}', 'Shifted')" class="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded text-[11px] font-bold transition">Shifted</button>
        <button onclick="updateOrderStatus('${order.orderId}', 'Cancelled')" class="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded text-[11px] font-bold transition">Cancel</button>
      </div>
    `;
  } else if (order.status === 'Shifted') {
    return `
      <div class="flex items-center justify-center gap-1.5">
        <button onclick="updateOrderStatus('${order.orderId}', 'Delivered')" class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-bold transition">Delivered</button>
        <button onclick="updateOrderStatus('${order.orderId}', 'Cancelled')" class="bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded text-[11px] font-bold transition" title="Customer rejected parcel">Return/Cancel</button>
      </div>
    `;
  } else {
    return `<span class="text-slate-400 text-[11px] italic">Completed</span>`;
  }
}

async function updateOrderStatus(orderId, status) {
  if (status === 'Cancelled') {
    const isSure = confirm(`Are you sure you want to cancel / mark return order ${orderId}?`);
    if (!isSure) return;
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      await fetchDashboardOrders();
      closeOrderDetailModal();
    }
  } catch (err) {
    alert('Failed to update status in cloud database');
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

function inspectOrder(orderId) {
  const order = cachedOrders.find(o => o.orderId === orderId);
  if (!order) return;

  document.getElementById('modalOrderIdTitle').innerText = order.orderId;
  document.getElementById('modalCustName').innerText = order.customer.name;
  document.getElementById('modalCustPhone').innerText = order.customer.phone;
  document.getElementById('modalCustAddress').innerText = order.customer.address;
  document.getElementById('modalLocationBadge').innerText = order.location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka';
  document.getElementById('modalBkashSender').innerText = order.advancePayment?.senderPhone || 'N/A';
  document.getElementById('modalBkashTrx').innerText = order.advancePayment?.trxId || 'N/A';

  document.getElementById('modalItemsList').innerHTML = order.items.map(item => `
    <div class="flex items-center justify-between p-2.5 bg-white">
      <div class="flex items-center gap-3">
        <img src="${item.image}" class="w-10 h-10 object-cover rounded border">
        <div><p class="font-bold text-slate-800">${item.name}</p><span class="text-[11px] text-slate-400">Qty: ${item.qty} × ৳ ${item.price}</span></div>
      </div>
      <span class="font-bold text-slate-900">৳ ${(item.price * item.qty).toLocaleString()}</span>
    </div>
  `).join('');

  document.getElementById('modalBillSubtotal').innerText = `৳ ${(order.grandTotal - order.deliveryFee).toLocaleString()}`;
  document.getElementById('modalBillShipping').innerText = `৳ ${order.deliveryFee}`;
  document.getElementById('modalBillCod').innerText = `৳ ${order.payableOnDelivery.toLocaleString()}`;

  document.getElementById('modalActionButtons').innerHTML = `
    <span class="text-xs text-slate-500 font-bold">Status: <strong>${order.status}</strong></span>
    <div class="flex gap-2">${renderWorkflowButtons(order)}</div>
  `;

  document.getElementById('orderDetailModal').classList.remove('hidden');
}

function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').classList.add('hidden');
}

// ================= PRODUCT & STOCK MANAGEMENT =================
let cachedProducts = [];

async function fetchAdminProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    cachedProducts = await res.json();
    renderAdminProducts();
  } catch (err) {
    console.error(err);
  }
}

function calculateDiscountPrice() {
  const original = parseFloat(document.getElementById('prodOriginalPrice').value) || 0;
  const percent = parseFloat(document.getElementById('prodDiscountPercent').value) || 0;
  const discountInput = document.getElementById('prodDiscountPrice');

  if (percent > 0 && original > 0) {
    discountInput.value = Math.round(original - (original * (percent / 100)));
  } else {
    discountInput.value = original;
  }
}

function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  if (!files || files.length === 0) return;

  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        currentUploadedImages.push(canvas.toDataURL('image/jpeg', 0.82));
        renderImagePreviews();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviewContainer');
  if (!container) return;

  container.innerHTML = currentUploadedImages.map((src, index) => `
    <div class="relative w-16 h-16 rounded-lg border overflow-hidden bg-white shadow-sm">
      <img src="${src}" class="w-full h-full object-cover">
      ${index === 0 ? '<span class="absolute bottom-0 left-0 right-0 bg-[#0B0F19]/80 text-white text-[8px] font-bold text-center py-0.5">Primary</span>' : ''}
      <button type="button" onclick="removeUploadedImage(${index})" class="absolute top-1 right-1 bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function removeUploadedImage(index) {
  currentUploadedImages.splice(index, 1);
  renderImagePreviews();
}

async function handleCreateProduct(e) {
  e.preventDefault();
  if (currentUploadedImages.length === 0) return alert('Upload at least one photo!');

  const newProd = {
    name: document.getElementById('prodTitle').value.trim(),
    category: document.getElementById('prodCategorySelect').value,
    originalPrice: parseFloat(document.getElementById('prodOriginalPrice').value),
    discountPrice: parseFloat(document.getElementById('prodDiscountPrice').value),
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    images: [...currentUploadedImages],
    description: document.getElementById('prodDescription').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd)
    });
    if (res.ok) {
      alert('Product saved directly to MongoDB Atlas!');
      document.getElementById('addProductForm').reset();
      currentUploadedImages = [];
      renderImagePreviews();
      fetchAdminProducts();
    }
  } catch (err) {
    alert('Failed to save product to database');
  }
}

async function deleteProduct(id) {
  if (!confirm('Permanently delete this product from database?')) return;
  try {
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    fetchAdminProducts();
  } catch (err) {
    alert('Error deleting product');
  }
}

async function updateStock(id, delta) {
  try {
    await fetch(`${API_BASE}/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    fetchAdminProducts();
  } catch (err) {
    console.error(err);
  }
}

function renderAdminProducts() {
  const tbody = document.getElementById('adminProductsTableBody');
  const countBadge = document.getElementById('adminProdCountBadge');
  if (!tbody) return;

  countBadge.innerText = `${cachedProducts.length} products`;
  tbody.innerHTML = cachedProducts.map(p => `
    <tr class="hover:bg-slate-50 border-b">
      <td class="p-3"><img src="${p.images?.[0] || 'https://placehold.co/100'}" class="w-12 h-12 object-cover rounded-lg border"></td>
      <td class="p-3 font-bold text-slate-800 max-w-xs truncate">${p.name}</td>
      <td class="p-3 uppercase text-[11px] font-bold text-slate-500">${p.category}</td>
      <td class="p-3"><p class="font-black text-brand-orange">৳ ${p.discountPrice.toLocaleString()}</p></td>
      <td class="p-3">
        <div class="flex items-center gap-1.5">
          <button onclick="updateStock('${p._id}', -1)" class="w-5 h-5 bg-slate-200 rounded font-bold cursor-pointer">-</button>
          <span class="font-bold px-1.5">${p.stock || 0}</span>
          <button onclick="updateStock('${p._id}', 1)" class="w-5 h-5 bg-slate-200 rounded font-bold cursor-pointer">+</button>
        </div>
      </td>
      <td class="p-3 text-right">
        <button onclick="deleteProduct('${p._id}')" class="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg cursor-pointer">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ================= CATEGORIES & SETTINGS =================
let cachedCategories = [];

async function fetchAdminCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    cachedCategories = await res.json();
    renderAdminCategories();
    populateCategoryDropdown();
  } catch (err) {
    console.error(err);
  }
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCatName').value.trim();
  const id = document.getElementById('newCatId').value.trim().toLowerCase().replace(/\s+/g, '-');

  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, icon: 'fa-tag' })
    });
    if (res.ok) {
      document.getElementById('addCategoryForm').reset();
      fetchAdminCategories();
    } else {
      alert('Category ID already exists!');
    }
  } catch (err) {
    alert('Failed to create category');
  }
}

async function deleteCategory(catId) {
  if (catId === 'all') return alert('Cannot delete master category!');
  if (!confirm('Remove category?')) return;
  try {
    await fetch(`${API_BASE}/categories/${catId}`, { method: 'DELETE' });
    fetchAdminCategories();
  } catch (err) {
    alert('Error deleting category');
  }
}

function renderAdminCategories() {
  const container = document.getElementById('adminCategoryGrid');
  if (!container) return;
  container.innerHTML = cachedCategories.map(c => `
    <div class="flex items-center justify-between p-3 bg-slate-50 border rounded-xl">
      <span class="font-bold text-slate-800 text-xs">${c.name} (${c.id})</span>
      ${c.id !== 'all' ? `<button onclick="deleteCategory('${c.id}')" class="text-red-500 p-1 cursor-pointer"><i class="fa-regular fa-trash-can"></i></button>` : ''}
    </div>
  `).join('');
}

function populateCategoryDropdown() {
  const select = document.getElementById('prodCategorySelect');
  if (!select) return;
  select.innerHTML = cachedCategories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const s = await res.json();
    document.getElementById('settingBkashNumber').value = s.bkashNumber;
    document.getElementById('settingInsideFee').value = s.insideDhakaFee;
    document.getElementById('settingOutsideFee').value = s.outsideDhakaFee;
  } catch (err) {
    console.error(err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const settings = {
    bkashNumber: document.getElementById('settingBkashNumber').value.trim(),
    insideDhakaFee: Number(document.getElementById('settingInsideFee').value),
    outsideDhakaFee: Number(document.getElementById('settingOutsideFee').value)
  };

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) alert('Settings saved directly to MongoDB Atlas!');
  } catch (err) {
    alert('Failed to save settings');
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.remove('bg-brand-orange', 'text-white');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-brand-orange', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  const titles = {
    dashboardTab: 'Orders Dashboard',
    productsTab: 'Product Catalog & Stocks',
    categoriesTab: 'Category Management',
    teamTab: 'Admin & Role Management',
    settingsTab: 'Store Settings'
  };
  document.getElementById('pageTitle').innerText = titles[tabId] || 'Admin Center';
}