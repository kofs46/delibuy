/**
 * DeliBuy Customer Storefront Controller
 * - Dedicated 3D Interactive DeliBuy Brand Logo in Hero
 * - Authentic 2D High-Resolution Product Showcase with Cursor Zoom
 * - Dynamic Color & Size Variant Selection with Real-Time Stock Tracking
 * - Complimentary Custom Engraving / Gift Note
 * - Animated Particle Add-to-Cart & Confetti Celebrations
 * - Interactive Parallax Card Tilts & Fluid Scroll Animations
 */

const API_BASE = 'https://delibuy.onrender.com/api';

let products = [];
let categories = [];
let storeSettings = { insideDhakaFee: 60, outsideDhakaFee: 120, bkashNumber: '01516-597972' };
let activeCategory = 'all';
let searchQuery = '';
let productSort = 'featured';
let cart = JSON.parse(localStorage.getItem('delibuy_cart')) || [];
let selectedDeliveryLocation = 'inside';
let isSubmittingOrder = false;

// Product Modal & Variant Selection State
let currentModalProduct = null;
let currentModalQty = 1;
let currentSelectedColor = null; // { name, code, stock }
let currentSelectedSize = null;  // { name, stock }
let currentActiveStock = 0;

// Three.js 3D Hero Logo Engine Variables
let heroScene, heroCamera, heroRenderer, heroLogoMesh, heroLogoGroup;
let isDraggingHeroLogo = false;
let previousLogoMousePos = { x: 0, y: 0 };
let heroLogoAnimationId = null;

document.addEventListener('DOMContentLoaded', async () => {
  updateCartUI();
  setupEventListeners();
  initScrollAnimations();
  initScrollProgress();
  initNavbarScroll();
  initHeroParticles();
  initCounters();
  initZoomFeature();
  initHero3DLogo();
  await Promise.all([loadSettings(), loadCategories(), loadProducts()]);
});

// ================= HERO 3D DELIBUY LOGO EMBLEM =================

function initHero3DLogo() {
  const container = document.getElementById('hero3DLogoContainer');
  const canvas = document.getElementById('heroLogoCanvas');
  if (!container || !canvas || typeof THREE === 'undefined') return;

  const width = container.clientWidth || 240;
  const height = container.clientHeight || 240;

  // Scene
  heroScene = new THREE.Scene();

  // Camera
  heroCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  heroCamera.position.set(0, 0, 4.2);

  // Renderer
  heroRenderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  heroRenderer.setSize(width, height);
  heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  heroScene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(4, 5, 5);
  heroScene.add(keyLight);

  const crimsonRim = new THREE.DirectionalLight(0xe10000, 1.2);
  crimsonRim.position.set(-4, -2, -2);
  heroScene.add(crimsonRim);

  const mintRim = new THREE.DirectionalLight(0xa0ee73, 0.9);
  mintRim.position.set(0, -4, 3);
  heroScene.add(mintRim);

  // Group for Logo
  heroLogoGroup = new THREE.Group();
  heroScene.add(heroLogoGroup);

  // Load DeliBuy Logo Texture onto Medallion
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('delibuy-logo.jpeg', (texture) => {
    // 3D Medallion Block
    const geometry = new THREE.BoxGeometry(1.85, 1.85, 0.28);

    // Beveled rim with dark metallic finish
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x162227,
      metalness: 0.85,
      roughness: 0.25
    });

    // Face with the logo
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.2,
      metalness: 0.15
    });

    const materials = [
      rimMaterial,  // right
      rimMaterial,  // left
      rimMaterial,  // top
      rimMaterial,  // bottom
      faceMaterial, // front
      faceMaterial  // back
    ];

    heroLogoMesh = new THREE.Mesh(geometry, materials);
    heroLogoGroup.add(heroLogoMesh);

    // Glowing Neon Ring beneath logo
    const ringGeo = new THREE.TorusGeometry(1.35, 0.035, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe10000,
      transparent: true,
      opacity: 0.75
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.15;
    heroLogoGroup.add(ring);
  }, undefined, () => {
    // Fallback metallic emblem
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 0.3);
    const material = new THREE.MeshStandardMaterial({ color: 0xe10000, roughness: 0.3, metalness: 0.7 });
    heroLogoMesh = new THREE.Mesh(geometry, material);
    heroLogoGroup.add(heroLogoMesh);
  });

  // Drag interaction to spin freely
  setupHeroLogoDrag(container);

  // Animation Loop: smooth auto-spin when idle
  function animateHeroLogo() {
    heroLogoAnimationId = requestAnimationFrame(animateHeroLogo);

    if (heroLogoGroup && !isDraggingHeroLogo) {
      heroLogoGroup.rotation.y += 0.008;
    }

    heroRenderer.render(heroScene, heroCamera);
  }
  animateHeroLogo();

  // Resize listener
  window.addEventListener('resize', () => {
    if (!container || !heroCamera || !heroRenderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    heroCamera.aspect = w / h;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(w, h);
  });
}

function setupHeroLogoDrag(container) {
  let touchStartX = 0;
  let touchStartY = 0;

  // Mouse drag
  container.addEventListener('mousedown', (e) => {
    isDraggingHeroLogo = true;
    previousLogoMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDraggingHeroLogo = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingHeroLogo || !heroLogoGroup) return;
    const deltaX = e.clientX - previousLogoMousePos.x;
    const deltaY = e.clientY - previousLogoMousePos.y;

    heroLogoGroup.rotation.y += deltaX * 0.015;
    heroLogoGroup.rotation.x += deltaY * 0.015;

    // Pitch constraint
    heroLogoGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, heroLogoGroup.rotation.x));
    previousLogoMousePos = { x: e.clientX, y: e.clientY };
  });

  // Touch drag
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDraggingHeroLogo = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDraggingHeroLogo = false;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDraggingHeroLogo || !heroLogoGroup || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    heroLogoGroup.rotation.y += deltaX * 0.015;
    heroLogoGroup.rotation.x += deltaY * 0.015;
    heroLogoGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, heroLogoGroup.rotation.x));

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
}

// ================= 2D IMAGE ZOOM FEATURE =================

function initZoomFeature() {
  const container = document.getElementById('zoomContainer');
  const img = document.getElementById('modalMainImg');
  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(2)';
  });

  container.addEventListener('mouseleave', () => {
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = 'center center';
  });
}

// ================= 3D MOUSE PARALLAX TILT FOR CARDS =================

function apply3DCardTilt(card) {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  });
}

function initCardTilts() {
  document.querySelectorAll('.product-card').forEach(card => apply3DCardTilt(card));
}

// ================= ANIMATED ADD TO CART (FLY PROJECTILE) =================

function triggerFlyToCartAnimation(startElement, imageSrc) {
  const cartBtn = document.getElementById('navCartBtn');
  if (!cartBtn || !startElement) return;

  const startRect = startElement.getBoundingClientRect();
  const endRect = cartBtn.getBoundingClientRect();

  const projectile = document.createElement('img');
  projectile.src = imageSrc || 'delibuy-logo.jpeg';
  projectile.className = 'cart-flying-projectile';
  projectile.style.width = '55px';
  projectile.style.height = '55px';
  projectile.style.left = `${startRect.left + startRect.width / 2 - 27}px`;
  projectile.style.top = `${startRect.top + startRect.height / 2 - 27}px`;

  document.body.appendChild(projectile);

  requestAnimationFrame(() => {
    projectile.style.left = `${endRect.left + endRect.width / 2 - 15}px`;
    projectile.style.top = `${endRect.top + endRect.height / 2 - 15}px`;
    projectile.style.transform = 'scale(0.2) rotate(720deg)';
    projectile.style.opacity = '0.4';
  });

  setTimeout(() => {
    if (projectile.parentElement) projectile.parentElement.removeChild(projectile);

    const badge = document.getElementById('cartCountBadge');
    if (badge) {
      badge.classList.remove('cart-bump');
      void badge.offsetWidth; // reflow
      badge.classList.add('cart-bump');
    }

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: (endRect.left + endRect.width / 2) / window.innerWidth,
          y: (endRect.top + endRect.height / 2) / window.innerHeight
        },
        colors: ['#E10000', '#A0EE73', '#FFAA7C', '#B8F296', '#FFFFFF']
      });
    }
  }, 750);
}

// ================= SCROLL & NAVBAR ENGINES =================

function initScrollAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  window._scrollObserver = observer;
}

function observeNewElements(container) {
  if (!window._scrollObserver) return;
  container.querySelectorAll('[data-reveal]').forEach(el => {
    if (!el.classList.contains('revealed')) window._scrollObserver.observe(el);
  });
}

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }, { passive: true });
}

function initNavbarScroll() {
  const header = document.getElementById('mainHeader');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('shadow-2xl', 'py-1');
    } else {
      header.classList.remove('shadow-2xl', 'py-1');
    }
  }, { passive: true });
}

function initHeroParticles() {
  // Handled via CSS ambient orbs
}

function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.count);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

function animateCounter(element, target) {
  const duration = 1800;
  const increment = target / (duration / 16);
  let current = 0;
  const suffix = '+';

  function step() {
    current += increment;
    if (current >= target) {
      element.textContent = target.toLocaleString() + suffix;
      return;
    }
    element.textContent = Math.floor(current).toLocaleString() + suffix;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ================= LOAD DATA =================

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
    console.warn('Default store settings active');
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
    if (!res.ok) throw new Error('Catalog unavailable');
    products = await res.json();
    renderProducts();
  } catch (e) {
    console.error('Products load error:', e);
    const count = document.getElementById('resultCount');
    if (count) count.textContent = 'Collection temporarily offline';
  }
}

// ================= RENDER CATEGORIES =================

function renderCategoryCards() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  const iconMap = {
    'all': 'fa-solid fa-border-all',
    'fashion': 'fa-solid fa-shirt',
    'electronics': 'fa-solid fa-headphones',
    'home': 'fa-solid fa-house',
    'beauty': 'fa-solid fa-wand-magic-sparkles',
    'accessories': 'fa-solid fa-bag-shopping',
    'watches': 'fa-solid fa-clock'
  };

  container.innerHTML = categories.map((cat, idx) => {
    const icon = iconMap[cat.id] || 'fa-solid fa-tag';
    return `
      <button type="button" onclick="selectCategory('${cat.id}')"
        data-reveal="up" data-delay="${(idx + 1) * 80}"
        class="wm-card p-4 rounded-3xl flex flex-col items-center text-center group cursor-pointer transition">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-100 group-hover:from-[#E10000] group-hover:to-[#A0EE73] text-[#E10000] group-hover:text-white flex items-center justify-center text-xl mb-2.5 transition shadow-sm">
          <i class="${icon}"></i>
        </div>
        <h4 class="font-extrabold text-xs text-slate-800 group-hover:text-[#E10000] transition">${cat.name}</h4>
        <span class="text-[10px] text-slate-400 mt-0.5">Explore <i class="fa-solid fa-arrow-right text-[8px]" aria-hidden="true"></i></span>
      </button>
    `;
  }).join('');

  observeNewElements(container);
}

function renderCategoryFilterPills() {
  const container = document.getElementById('categoryFilterPills');
  if (!container) return;

  const displayCategories = categories.some(c => c.id === 'all') ? categories : [{ id: 'all', name: 'All Products' }, ...categories];
  container.innerHTML = displayCategories.map(cat => `
    <button onclick="selectCategory('${cat.id}')" class="px-4 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap cursor-pointer ${
      activeCategory === cat.id
      ? 'bg-gradient-to-r from-[#E10000] to-[#FFAA7C] text-white shadow-lg shadow-rose-300'
      : 'bg-white text-slate-600 hover:bg-rose-50 border border-rose-100'
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

// ================= RENDER PRODUCTS =================

function executeSearch(query) {
  searchQuery = query.trim().toLowerCase();
  ['searchInput', 'mobileSearchInput'].forEach(id => {
    const input = document.getElementById(id);
    if (input && input.value.toLowerCase() !== searchQuery) input.value = query;
  });
  renderProducts();
}

function handleSearch() {
  const input = document.getElementById('searchInput');
  if (input) executeSearch(input.value);
}

function handleMobileSearch() {
  const input = document.getElementById('mobileSearchInput');
  if (input) executeSearch(input.value);
}

function renderProducts() {
  let filtered = products.filter(p =>
    (activeCategory === 'all' || p.category === activeCategory) &&
    (!searchQuery || [p.name, p.category, p.description].some(value =>
      String(value || '').toLowerCase().includes(searchQuery)))
  );

  if (productSort === 'price-low') filtered.sort((a, b) => a.discountPrice - b.discountPrice);
  if (productSort === 'price-high') filtered.sort((a, b) => b.discountPrice - a.discountPrice);
  if (productSort === 'discount') {
    const saving = p => p.originalPrice > 0 ? 1 - p.discountPrice / p.originalPrice : 0;
    filtered.sort((a, b) => saving(b) - saving(a));
  }

  const count = document.getElementById('resultCount');
  if (count) count.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'} available`;

  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-slate-400 font-bold text-sm">No matching items found.<br><span class="text-xs text-rose-500 font-normal">Try another search or select another category.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map((p, idx) => {
    const mainImg = p.images && p.images.length > 0 ? p.images[0] : 'delibuy-logo.jpeg';
    const hasDiscount = p.originalPrice && p.originalPrice > p.discountPrice;
    const discountPercent = hasDiscount ? Math.round(((p.originalPrice - p.discountPrice) / p.originalPrice) * 100) : 0;
    const isOutOfStock = (p.stock || 0) <= 0;

    return `
      <div class="product-card tilt-card-3d flex flex-col justify-between group" data-reveal="up" data-delay="${(idx % 4) * 80 + 80}">
        <div class="tilt-glare"></div>

        <!-- Discount & Featured Badges -->
        <div class="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          ${hasDiscount ? `
            <span class="bg-[#A0EE73] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
              ${discountPercent}% OFF
            </span>
          ` : `
            <span class="bg-rose-100 text-[#E10000] text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">
              Featured
            </span>
          `}
        </div>

        <!-- 2D Image with Clean Quick View Trigger -->
        <button type="button" aria-label="View product" onclick="openProductModal('${p._id}')" class="product-image h-48 sm:h-52 w-full flex items-center justify-center p-5 cursor-pointer relative overflow-hidden">
          <img loading="lazy" src="${mainImg}" alt="${p.name}" class="max-h-full max-w-full object-contain pointer-events-none">
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-3 transition-opacity">
            <span class="text-white text-xs font-black tracking-wide flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
              <i class="fa-solid fa-eye text-emerald-400"></i> Quick View
            </span>
          </div>
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
              <span class="bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow">Out of Stock</span>
            </div>
          ` : ''}
        </button>

        <!-- Product Meta -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div class="mb-3">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">${p.category}</span>
            <h3 onclick="openProductModal('${p._id}')" class="font-extrabold text-sm text-slate-900 line-clamp-2 hover:text-[#E10000] cursor-pointer transition leading-snug">
              ${p.name}
            </h3>
          </div>

          <div class="flex items-end justify-between pt-2.5 border-t border-slate-100">
            <div>
              <span class="text-base font-black text-[#E10000] block leading-tight">৳ ${(p.discountPrice || 0).toLocaleString()}</span>
              ${hasDiscount ? `
                <span class="text-[11px] line-through text-slate-400 font-medium">৳ ${(p.originalPrice || 0).toLocaleString()}</span>
              ` : ''}
            </div>

            <!-- Add to Cart with Fly Animation -->
            <button aria-label="Add to cart" onclick="event.stopPropagation(); handleDirectAddToCart('${p._id}', this)" ${isOutOfStock ? 'disabled' : ''}
              class="w-10 h-10 rounded-full ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-tr from-[#E10000] to-[#FFAA7C] text-white hover:scale-110 active:scale-90 shadow-md shadow-rose-300'} flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-cart-shopping text-xs"></i>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');

  observeNewElements(grid);
  initCardTilts();
}

// ================= PRODUCT DETAILS MODAL (2D & VARIANTS) =================

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

  document.getElementById('modalDescription').innerText = prod.description || 'Delivered with premium packaging and verified quality.';

  const images = prod.images && prod.images.length > 0 ? prod.images : ['delibuy-logo.jpeg'];

  // Setup 2D Primary Showcase Image
  const mainImg = document.getElementById('modalMainImg');
  if (mainImg) {
    mainImg.src = images[0];
    mainImg.style.transform = 'scale(1)';
    mainImg.style.transformOrigin = 'center center';
  }

  // Setup Multiple Thumbnails
  const thumbContainer = document.getElementById('modalThumbnails');
  if (thumbContainer) {
    thumbContainer.innerHTML = images.map((src, idx) => `
      <button onclick="selectModalImage('${src}', this)" class="w-12 h-12 rounded-xl border-2 overflow-hidden bg-white p-1 transition cursor-pointer ${idx === 0 ? 'border-[#E10000] shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'}">
        <img src="${src}" class="w-full h-full object-contain">
      </button>
    `).join('');
  }

  // Render Color Variants
  const colorSec = document.getElementById('modalColorSection');
  const colorSwatches = document.getElementById('modalColorSwatches');
  const colorLabel = document.getElementById('selectedColorName');
  if (prod.colors && prod.colors.length > 0) {
    colorSec.classList.remove('hidden');
    currentSelectedColor = prod.colors[0];
    if (colorLabel) {
      colorLabel.innerText = currentSelectedColor.name;
      colorLabel.style.color = currentSelectedColor.code || '#E10000';
    }
    colorSwatches.innerHTML = prod.colors.map((c, i) => `
      <button type="button" onclick="selectModalColor('${encodeURIComponent(JSON.stringify(c))}', this)"
        class="color-swatch-item ${i === 0 ? 'active' : ''} flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-rose-400 transition cursor-pointer text-xs font-bold text-slate-700">
        <span class="w-3.5 h-3.5 rounded-full inline-block shadow-xs" style="background:${c.code || '#E10000'};"></span>
        <span>${c.name}</span>
        ${c.stock !== undefined ? `<span class="text-[10px] text-slate-400 font-normal">(${c.stock})</span>` : ''}
      </button>
    `).join('');
  } else {
    colorSec.classList.add('hidden');
    currentSelectedColor = null;
  }

  // Render Size Variants
  const sizeSec = document.getElementById('modalSizeSection');
  const sizePills = document.getElementById('modalSizePills');
  const sizeLabel = document.getElementById('selectedSizeName');
  if (prod.sizes && prod.sizes.length > 0) {
    sizeSec.classList.remove('hidden');
    currentSelectedSize = prod.sizes[0];
    if (sizeLabel) {
      sizeLabel.innerText = currentSelectedSize.name;
    }
    sizePills.innerHTML = prod.sizes.map((s, i) => `
      <button type="button" onclick="selectModalSize('${encodeURIComponent(JSON.stringify(s))}', this)"
        class="size-pill ${i === 0 ? 'active' : ''} ${s.stock === 0 ? 'out-of-stock' : ''}" ${s.stock === 0 ? 'disabled' : ''}>
        <span>${s.name}</span>
        ${s.stock !== undefined ? `<span class="text-[10px] opacity-75">(${s.stock})</span>` : ''}
      </button>
    `).join('');
  } else {
    sizeSec.classList.add('hidden');
    currentSelectedSize = null;
  }

  // Dynamic stock tracking
  updateModalStockDisplay();

  // Clear customization input
  const customInput = document.getElementById('modalCustomText');
  if (customInput) customInput.value = '';

  document.getElementById('productModal')?.classList.remove('hidden');
}

function selectModalColor(colorJsonStr, btn) {
  const color = JSON.parse(decodeURIComponent(colorJsonStr));
  currentSelectedColor = color;
  const colorLabel = document.getElementById('selectedColorName');
  if (colorLabel) {
    colorLabel.innerText = color.name;
    colorLabel.style.color = color.code || '#E10000';
  }
  document.querySelectorAll('#modalColorSwatches button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  updateModalStockDisplay();

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 16,
      spread: 40,
      origin: { y: 0.65 },
      colors: [color.code || '#E10000', '#FFFFFF', '#A0EE73']
    });
  }
}

function selectModalSize(sizeJsonStr, btn) {
  const size = JSON.parse(decodeURIComponent(sizeJsonStr));
  currentSelectedSize = size;
  const sizeLabel = document.getElementById('selectedSizeName');
  if (sizeLabel) {
    sizeLabel.innerText = size.name;
  }
  document.querySelectorAll('#modalSizePills button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  updateModalStockDisplay();
}

function updateModalStockDisplay() {
  if (!currentModalProduct) return;

  // Determine stock from selected size or color if available, or overall product stock
  let availableStock = currentModalProduct.stock || 0;
  if (currentSelectedSize && typeof currentSelectedSize.stock === 'number') {
    availableStock = currentSelectedSize.stock;
  } else if (currentSelectedColor && typeof currentSelectedColor.stock === 'number') {
    availableStock = currentSelectedColor.stock;
  }
  currentActiveStock = availableStock;

  const stockEl = document.getElementById('modalStockStatus');
  const addBtn = document.getElementById('modalAddToCartBtn');

  if (availableStock > 0) {
    stockEl.innerHTML = `<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-check mr-1"></i> In Stock (${availableStock} available)</span>`;
    if (addBtn) addBtn.disabled = false;
  } else {
    stockEl.innerHTML = `<span class="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full"><i class="fa-solid fa-circle-xmark mr-1"></i> Out of Stock for selected variant</span>`;
    if (addBtn) addBtn.disabled = true;
  }

  if (currentModalQty > availableStock) {
    currentModalQty = Math.max(1, availableStock);
    const qtyVal = document.getElementById('modalQtyVal');
    if (qtyVal) qtyVal.innerText = currentModalQty;
  }
}

function selectModalImage(src, btn) {
  const mainImg = document.getElementById('modalMainImg');
  if (mainImg) mainImg.src = src;

  document.querySelectorAll('#modalThumbnails button').forEach(b => {
    b.classList.remove('border-[#E10000]', 'shadow-md');
    b.classList.add('border-slate-200', 'opacity-70');
  });
  if (btn) {
    btn.classList.add('border-[#E10000]', 'shadow-md');
    btn.classList.remove('border-slate-200', 'opacity-70');
  }
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.add('hidden');
  currentModalProduct = null;
}

function adjustModalQty(delta) {
  if (!currentModalProduct) return;
  const newQty = currentModalQty + delta;
  if (newQty >= 1 && newQty <= currentActiveStock) {
    currentModalQty = newQty;
    document.getElementById('modalQtyVal').innerText = currentModalQty;
  }
}

// Add to Cart from Details Modal (Includes Color Variant, Size Variant & Custom Engraving)
function addModalProductToCart(event) {
  if (!currentModalProduct || currentActiveStock <= 0) return;

  const customText = document.getElementById('modalCustomText')?.value.trim() || '';
  const colorPart = currentSelectedColor ? currentSelectedColor.name : 'default';
  const sizePart = currentSelectedSize ? currentSelectedSize.name : 'standard';
  const itemCartId = `${currentModalProduct._id}-${colorPart}-${sizePart}-${customText || 'none'}`;

  const existing = cart.find(item => item.cartItemId === itemCartId);
  if (existing) {
    if (existing.qty + currentModalQty <= currentActiveStock) {
      existing.qty += currentModalQty;
    } else {
      existing.qty = currentActiveStock;
      alert('Available stock limit reached!');
    }
  } else {
    cart.push({
      cartItemId: itemCartId,
      id: currentModalProduct._id,
      name: currentModalProduct.name,
      price: currentModalProduct.discountPrice,
      image: currentModalProduct.images?.[0] || 'delibuy-logo.jpeg',
      qty: currentModalQty,
      color: currentSelectedColor,
      size: currentSelectedSize ? currentSelectedSize.name : null,
      customization: customText
    });
  }

  saveCart();

  const imgToFly = currentModalProduct.images?.[0] || 'delibuy-logo.jpeg';
  triggerFlyToCartAnimation(event.target, imgToFly);

  closeProductModal();
}

function handleDirectAddToCart(productId, buttonElement) {
  const prod = products.find(p => p._id === productId);
  if (!prod || prod.stock <= 0) return;

  const defaultColor = (prod.colors && prod.colors.length > 0) ? prod.colors[0] : null;
  const defaultSize = (prod.sizes && prod.sizes.length > 0) ? prod.sizes[0].name : null;
  const colorPart = defaultColor ? defaultColor.name : 'default';
  const sizePart = defaultSize || 'standard';
  const itemCartId = `${prod._id}-${colorPart}-${sizePart}-none`;

  const existing = cart.find(item => item.cartItemId === itemCartId);

  if (existing) {
    if (existing.qty < prod.stock) {
      existing.qty += 1;
    } else {
      alert('Available stock limit reached!');
      return;
    }
  } else {
    cart.push({
      cartItemId: itemCartId,
      id: prod._id,
      name: prod.name,
      price: prod.discountPrice,
      image: prod.images?.[0] || 'delibuy-logo.jpeg',
      qty: 1,
      color: defaultColor,
      size: defaultSize,
      customization: ''
    });
  }

  saveCart();
  triggerFlyToCartAnimation(buttonElement, prod.images?.[0] || 'delibuy-logo.jpeg');
}

// ================= CART DRAWER & UI =================

function updateCartQty(cartItemId, delta) {
  const item = cart.find(i => i.cartItemId === cartItemId);
  const prod = item ? products.find(p => p._id === item.id) : null;
  if (!item) return;

  item.qty += delta;
  if (prod && item.qty > prod.stock) {
    item.qty = prod.stock;
    alert('Maximum stock reached');
  }

  if (item.qty <= 0) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
  }

  saveCart();
}

function removeFromCart(cartItemId) {
  cart = cart.filter(i => i.cartItemId !== cartItemId);
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
      container.innerHTML = '<div class="py-20 text-center text-slate-400 font-bold text-xs">Your shopping cart is empty</div>';
    } else {
      container.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-rose-100 shadow-xs">
          <img src="${item.image}" class="w-14 h-14 object-contain rounded-xl border bg-white p-1">
          <div class="flex-1 min-w-0">
            <h4 class="font-extrabold text-xs text-slate-800 truncate">${item.name}</h4>
            <div class="flex flex-wrap items-center gap-1.5 my-1">
              ${item.color ? `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${item.color.code || item.color.hex || '#E10000'}"></span>
                  ${item.color.name}
                </span>
              ` : ''}
              ${item.size ? `
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <i class="fa-solid fa-ruler-combined text-[8px]"></i> Size: ${item.size}
                </span>
              ` : ''}
              ${item.customization ? `
                <span class="text-[10px] text-[#A0EE73] font-bold bg-emerald-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  ✍️ ${item.customization}
                </span>
              ` : ''}
            </div>
            <span class="text-[#E10000] font-black text-xs">৳ ${item.price.toLocaleString()}</span>
          </div>

          <div class="flex items-center gap-1 bg-white border rounded-xl p-1">
            <button onclick="updateCartQty('${item.cartItemId}', -1)" class="w-5 h-5 bg-slate-100 hover:bg-rose-100 rounded text-xs font-black cursor-pointer">-</button>
            <span class="text-xs font-bold px-1">${item.qty}</span>
            <button onclick="updateCartQty('${item.cartItemId}', 1)" class="w-5 h-5 bg-slate-100 hover:bg-rose-100 rounded text-xs font-black cursor-pointer">+</button>
          </div>

          <button onclick="removeFromCart('${item.cartItemId}')" class="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer">
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
  const originalBtn = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Order...';
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

      if (typeof confetti === 'function') {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#E10000', '#A0EE73', '#FFAA7C', '#B8F296', '#F59E0B']
        });
      }
    } else {
      alert(data.error || 'Failed to place order.');
    }
  } catch (err) {
    alert('Server unreachable. Please check your internet or retry shortly.');
  } finally {
    isSubmittingOrder = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtn;
    }
  }
}

function closeSuccessModal() {
  document.getElementById('successModal')?.classList.add('hidden');
}

function copySuccessOrderId() {
  const orderId = document.getElementById('successOrderId')?.innerText;
  if (orderId) {
    navigator.clipboard.writeText(orderId).then(() => alert('Order ID copied: ' + orderId));
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

// ================= TRACK ORDER =================

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
    resBox.innerHTML = '<p class="text-xs text-rose-500 font-bold">Please enter an Order ID or Phone Number.</p>';
    return;
  }

  resBox.classList.remove('hidden');
  resBox.innerHTML = '<p class="text-xs text-slate-400 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Searching live database...</p>';

  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(query)}`);
    if (res.ok) {
      const ord = await res.json();
      resBox.innerHTML = `
        <div class="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2 text-xs text-left">
          <div class="flex justify-between items-center border-b border-rose-100 pb-2">
            <span class="font-mono font-black text-[#E10000] text-sm">${ord.orderId}</span>
            <span class="px-2.5 py-1 rounded-full font-black text-[10px] ${getStatusClass(ord.status)}">${ord.status}</span>
          </div>
          <p><strong>Customer:</strong> ${ord.customer?.name || 'N/A'}</p>
          <p><strong>Phone:</strong> ${ord.customer?.phone || 'N/A'}</p>
          <p><strong>Address:</strong> ${ord.customer?.address || 'N/A'}</p>
          <p><strong>COD Collectible:</strong> <span class="font-black text-slate-900">৳ ${(ord.payableOnDelivery || 0).toLocaleString()}</span></p>
        </div>
      `;
    } else {
      resBox.innerHTML = '<p class="text-xs text-rose-500 font-bold py-2"><i class="fa-solid fa-circle-exclamation mr-1"></i> Order not found in database.</p>';
    }
  } catch (err) {
    resBox.innerHTML = '<p class="text-xs text-rose-500 font-bold py-2">Server connection error.</p>';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'Order Placed': return 'bg-amber-100 text-amber-800';
    case 'Confirmed Order': return 'bg-blue-100 text-blue-800';
    case 'Shifted': return 'bg-purple-100 text-purple-800';
    case 'Delivered': return 'bg-emerald-100 text-emerald-800';
    case 'Cancelled': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

// ================= EVENT LISTENERS =================

function setupEventListeners() {
  ['searchInput', 'mobileSearchInput'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => executeSearch(e.target.value));
  });

  document.getElementById('productSort')?.addEventListener('change', e => {
    productSort = e.target.value;
    renderProducts();
  });

  const topButton = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    if (topButton) {
      if (window.scrollY > 450) {
        topButton.classList.add('visible');
      } else {
        topButton.classList.remove('visible');
      }
    }
  }, { passive: true });

  topButton?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('searchInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSearch();
  });
  document.getElementById('mobileSearchInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleMobileSearch();
  });
  document.getElementById('trackInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleTrackSearch();
  });
}
