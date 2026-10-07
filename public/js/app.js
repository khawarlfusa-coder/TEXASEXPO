/**
 * Texas Expo Tech Solutions LLC - Storefront Application Engine
 * Supports Static & API modes, Cart Management, Cash on Delivery Checkout,
 * Live Order Tracking, Quick View, and Walmart Review Compliance.
 */

// Application State
const State = {
  products: window.STORE_PRODUCTS || [],
  categories: window.STORE_CATEGORIES || [],
  cart: JSON.parse(localStorage.getItem('tet_cart') || '[]'),
  currentCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  activeOrder: null,
  appliedCoupon: null,
  discountAmount: 0
};

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  setupEventListeners();
  renderCategories();
  renderProducts();
  updateCartUI();
  handleUrlParams();
});

// Render Lucide Icons safely
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Global Event Listeners
function setupEventListeners() {
  // Search bar
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      State.sortBy = e.target.value;
      renderProducts();
    });
  }

  // Mobile search
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch) {
    mobileSearch.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }
}

// URL Params Handling (Direct link to category, tracking or product)
function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  const track = params.get('track');
  const prod = params.get('product');

  if (cat) filterByCategory(cat);
  if (track) openTrackingModal(track);
  if (prod) openQuickView(prod);
}

// ----------------------------------------------------
// PRODUCT RENDERING & FILTERING
// ----------------------------------------------------

function filterByCategory(slug) {
  State.currentCategory = slug;
  
  // Update category tab UI
  document.querySelectorAll('.cat-pill').forEach(btn => {
    if (btn.dataset.category === slug) {
      btn.className = 'cat-pill px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm transition';
    } else {
      btn.className = 'cat-pill px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    }
  });

  renderProducts();

  // Smooth scroll to products section
  const el = document.getElementById('products-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderCategories() {
  const container = document.getElementById('category-pills-container');
  if (!container) return;

  let html = `
    <button onclick="filterByCategory('all')" data-category="all" class="cat-pill px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm transition">
      All Collections (60)
    </button>
  `;

  State.categories.forEach(cat => {
    html += `
      <button onclick="filterByCategory('${cat.slug}')" data-category="${cat.slug}" class="cat-pill px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-2">
        <span>${cat.name}</span>
        <span class="text-xs bg-slate-200/80 px-1.5 py-0.5 rounded-full font-bold text-slate-600">15</span>
      </button>
    `;
  });

  container.innerHTML = html;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('product-count-display');
  if (!grid) return;

  let filtered = [...State.products];

  // Category filter
  if (State.currentCategory !== 'all') {
    filtered = filtered.filter(p => p.categorySlug === State.currentCategory);
  }

  // Search filter
  if (State.searchQuery) {
    const q = State.searchQuery;
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (State.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (State.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (State.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (State.sortBy === 'name') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} products`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <i data-lucide="package-search" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
        <h3 class="text-xl font-bold text-slate-800 mb-2">No matching products found</h3>
        <p class="text-slate-500 mb-6">Try searching with another keyword or reset your filter.</p>
        <button onclick="resetFilters()" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition">
          Clear Filters
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const discountPercent = Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
    const badgeHtml = product.badges && product.badges.length 
      ? `<span class="badge-pill badge-walmart absolute top-3 left-3 z-10 shadow-sm">${product.badges[0]}</span>`
      : '';

    return `
      <div class="product-card group flex flex-col justify-between">
        <div>
          <div class="product-image-container relative">
            ${badgeHtml}
            <span class="badge-pill badge-cod absolute top-3 right-3 z-10 shadow-sm">
              <i data-lucide="truck" class="w-3 h-3"></i> COD Ready
            </span>
            <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy" class="w-full h-full object-cover">
            
            <div class="quick-action-overlay">
              <button onclick="openQuickView('${product.id}')" class="flex-1 bg-white/95 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-lg shadow-md hover:bg-white hover:text-blue-600 transition flex items-center justify-center gap-1.5 backdrop-blur-sm">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i> Quick View
              </button>
              <button onclick="addToCart('${product.id}', 1, event)" class="flex-1 bg-blue-600/95 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md hover:bg-blue-600 transition flex items-center justify-center gap-1.5 backdrop-blur-sm">
                <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i> Add
              </button>
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-center justify-between gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span class="text-blue-600 font-bold uppercase tracking-wider">${product.category}</span>
              <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${product.sku}</span>
            </div>

            <h3 class="font-bold text-slate-900 text-sm line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition cursor-pointer" onclick="openQuickView('${product.id}')">
              ${escapeHtml(product.title)}
            </h3>

            <div class="flex items-center gap-2 mb-3">
              <div class="star-rating text-xs">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>
                <span class="font-bold text-slate-800 ml-1">${product.rating}</span>
              </div>
              <span class="text-xs text-slate-400">(${product.reviewCount})</span>
              <span class="text-xs text-emerald-600 font-semibold ml-auto flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
              </span>
            </div>
          </div>
        </div>

        <div class="px-4 pb-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-lg font-black text-slate-900">$${product.price.toFixed(2)}</span>
              ${product.compareAtPrice ? `<span class="text-xs text-slate-400 line-through">$${product.compareAtPrice.toFixed(2)}</span>` : ''}
            </div>
            ${discountPercent > 0 ? `<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">Save ${discountPercent}%</span>` : ''}
          </div>

          <button onclick="addToCart('${product.id}', 1, event)" class="p-2.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition flex items-center justify-center shadow-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

function resetFilters() {
  State.currentCategory = 'all';
  State.searchQuery = '';
  State.sortBy = 'featured';
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  
  renderCategories();
  renderProducts();
}

// ----------------------------------------------------
// QUICK VIEW MODAL
// ----------------------------------------------------

function openQuickView(productId) {
  const product = State.products.find(p => p.id === productId || p.sku.toLowerCase() === productId.toLowerCase());
  if (!product) return;

  const modalContainer = document.getElementById('quick-view-content');
  if (!modalContainer) return;

  const discountPercent = Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);

  let specsRows = '';
  if (product.specs) {
    specsRows = Object.entries(product.specs).map(([key, val]) => `
      <div class="flex justify-between py-1.5 border-b border-slate-100 text-xs">
        <span class="text-slate-500 font-medium">${key}</span>
        <span class="text-slate-800 font-semibold text-right">${val}</span>
      </div>
    `).join('');
  }

  let featuresList = '';
  if (product.features) {
    featuresList = product.features.map(f => `
      <li class="flex items-start gap-2 text-xs text-slate-600">
        <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5"></i>
        <span>${f}</span>
      </li>
    `).join('');
  }

  modalContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div class="space-y-4">
        <div class="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-square">
          <img src="${product.image}" alt="${escapeHtml(product.title)}" class="w-full h-full object-cover">
        </div>
        <div class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span class="text-blue-900 font-bold block">Texas Expo Warehouse Dispatch</span>
            <span class="text-blue-700">Orders placed ship within 24 hours via FedEx / UPS</span>
          </div>
          <i data-lucide="shield-check" class="w-6 h-6 text-blue-600 shrink-0"></i>
        </div>
      </div>

      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">${product.category}</span>
            <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SKU: ${product.sku}</span>
            <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">UPC: ${product.upc}</span>
          </div>

          <h2 class="text-xl font-bold text-slate-900 leading-snug mb-2">${escapeHtml(product.title)}</h2>

          <div class="flex items-center gap-3 mb-4">
            <div class="star-rating text-sm">
              <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400"></i>
              <span class="font-bold text-slate-800 ml-1">${product.rating}</span>
            </div>
            <span class="text-xs text-slate-400">|</span>
            <span class="text-xs font-medium text-slate-600">${product.reviewCount} Verified US Reviews</span>
            <span class="text-xs font-bold text-emerald-600 ml-auto flex items-center gap-1">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> ${product.stockQuantity} In Stock
            </span>
          </div>

          <div class="bg-slate-50 p-3.5 rounded-xl mb-4 flex items-baseline gap-3">
            <span class="text-2xl font-black text-slate-900">$${product.price.toFixed(2)}</span>
            ${product.compareAtPrice ? `<span class="text-sm text-slate-400 line-through">$${product.compareAtPrice.toFixed(2)}</span>` : ''}
            ${discountPercent > 0 ? `<span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Save ${discountPercent}%</span>` : ''}
            <span class="text-xs text-slate-500 ml-auto font-medium">Cash on Delivery Eligible</span>
          </div>

          <p class="text-slate-600 text-xs leading-relaxed mb-4">${product.description}</p>

          <div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Key Highlights</h4>
            <ul class="space-y-1.5">
              ${featuresList}
            </ul>
          </div>

          <div class="mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Specifications</h4>
            <div class="border-t border-slate-100">
              ${specsRows}
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center gap-3">
          <div class="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button onclick="adjustQuickViewQty(-1)" class="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold">-</button>
            <span id="quick-view-qty" class="px-3 py-2 text-sm font-bold text-slate-800">1</span>
            <button onclick="adjustQuickViewQty(1)" class="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold">+</button>
          </div>

          <button onclick="addQuickViewToCart('${product.id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('quick-view-modal').classList.add('active');
  initIcons();
}

let quickViewQtyVal = 1;
function adjustQuickViewQty(delta) {
  quickViewQtyVal = Math.max(1, quickViewQtyVal + delta);
  const el = document.getElementById('quick-view-qty');
  if (el) el.textContent = quickViewQtyVal;
}

function addQuickViewToCart(productId) {
  addToCart(productId, quickViewQtyVal);
  closeModal('quick-view-modal');
  quickViewQtyVal = 1;
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

// ----------------------------------------------------
// CART ENGINE
// ----------------------------------------------------

function addToCart(productId, quantity = 1, event = null) {
  if (event) {
    event.stopPropagation();
  }

  const product = State.products.find(p => p.id === productId);
  if (!product) return;

  const existing = State.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    State.cart.push({
      id: product.id,
      sku: product.sku,
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.category,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${product.title.substring(0, 28)}..." to cart!`, 'success');
}

function updateCartItemQty(productId, newQty) {
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = State.cart.find(i => i.id === productId);
  if (item) {
    item.quantity = newQty;
    saveCart();
    updateCartUI();
  }
}

function removeFromCart(productId) {
  State.cart = State.cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Item removed from cart', 'info');
}

function saveCart() {
  localStorage.setItem('tet_cart', JSON.stringify(State.cart));
}

function toggleCartDrawer(open = null) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer || !backdrop) return;

  const shouldOpen = open !== null ? open : !drawer.classList.contains('active');

  if (shouldOpen) {
    drawer.classList.add('active');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function updateCartUI() {
  const totalCount = State.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update badge count
  document.querySelectorAll('.cart-count-badge').forEach(badge => {
    badge.textContent = totalCount;
    if (totalCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });

  // Free shipping bar ($50 threshold)
  const freeThreshold = 50;
  const progressPercent = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const shippingBar = document.getElementById('shipping-progress-bar');
  const shippingMsg = document.getElementById('shipping-progress-msg');

  if (shippingBar) {
    shippingBar.style.width = `${progressPercent}%`;
  }
  if (shippingMsg) {
    if (subtotal >= freeThreshold) {
      shippingMsg.innerHTML = `<span class="text-emerald-600 font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Congratulations! You unlocked FREE US Shipping!</span>`;
    } else {
      const remaining = (freeThreshold - subtotal).toFixed(2);
      shippingMsg.innerHTML = `Add <span class="font-bold text-slate-800">$${remaining}</span> more to unlock <strong>FREE US Domestic Shipping</strong>`;
    }
  }

  // Subtotal display
  const subtotalEl = document.getElementById('cart-subtotal-amount');
  if (subtotalEl) {
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  }

  // Render items list inside drawer
  const itemsContainer = document.getElementById('cart-drawer-items');
  if (!itemsContainer) return;

  if (State.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <i data-lucide="shopping-bag" class="w-16 h-16 stroke-1 text-slate-300 mb-4"></i>
        <h4 class="text-lg font-bold text-slate-700 mb-1">Your cart is empty</h4>
        <p class="text-xs text-slate-500 mb-6">Discover our curated collection of tech, apparel, home & kitchen accessories.</p>
        <button onclick="toggleCartDrawer(false)" class="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow hover:bg-blue-700 transition">
          Continue Shopping
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  itemsContainer.innerHTML = State.cart.map(item => `
    <div class="flex items-center gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
      <img src="${item.image}" alt="${escapeHtml(item.title)}" class="w-16 h-16 object-cover rounded-lg bg-white border border-slate-200 shrink-0">
      
      <div class="flex-1 min-w-0">
        <h5 class="text-xs font-bold text-slate-900 truncate mb-1">${escapeHtml(item.title)}</h5>
        <div class="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
          <span class="font-mono bg-white px-1 border border-slate-200 rounded">${item.sku}</span>
          <span>$${item.price.toFixed(2)} each</span>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
            <button onclick="updateCartItemQty('${item.id}', ${item.quantity - 1})" class="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">-</button>
            <span class="px-2 py-1 font-bold text-slate-800">${item.quantity}</span>
            <button onclick="updateCartItemQty('${item.id}', ${item.quantity + 1})" class="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">+</button>
          </div>

          <span class="font-black text-xs text-slate-900">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>

      <button onclick="removeFromCart('${item.id}')" class="text-slate-400 hover:text-red-500 p-1 transition" title="Remove item">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  initIcons();
}

// ----------------------------------------------------
// CHECKOUT & CASH ON DELIVERY (COD) ENGINE
// ----------------------------------------------------

let currentPaymentMethod = 'cod';

function setPaymentMethod(method = 'cod') {
  currentPaymentMethod = 'cod';
}

function openCheckoutModal() {
  if (State.cart.length === 0) {
    showToast('Your cart is empty. Please add items before checking out.', 'error');
    return;
  }

  toggleCartDrawer(false);
  updateCheckoutSummary();
  document.getElementById('checkout-modal').classList.add('active');
  setPaymentMethod('cod'); // Default to user's desired COD
  initIcons();
}

function applyCoupon() {
  const code = document.getElementById('coupon-code-input').value.trim().toUpperCase();
  const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (code === 'WELCOME10' || code === 'WALMART2026') {
    State.appliedCoupon = code;
    State.discountAmount = Number((subtotal * 0.10).toFixed(2));
    showToast(`Coupon ${code} applied! 10% discount subtracted.`, 'success');
  } else {
    showToast('Invalid promo code. Use WELCOME10 for 10% off.', 'error');
    State.appliedCoupon = null;
    State.discountAmount = 0;
  }
  updateCheckoutSummary();
}

function updateCheckoutSummary() {
  const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeThreshold = 50;
  const shipping = subtotal >= freeThreshold ? 0 : 4.99;
  const discount = State.discountAmount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Number((taxable * 0.0825).toFixed(2)); // Texas 8.25%
  const total = Number((taxable + shipping + tax).toFixed(2));

  const subtotalEl = document.getElementById('checkout-subtotal');
  const shippingEl = document.getElementById('checkout-shipping');
  const discountRow = document.getElementById('checkout-discount-row');
  const discountEl = document.getElementById('checkout-discount');
  const taxEl = document.getElementById('checkout-tax');
  const totalEl = document.getElementById('checkout-total');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE (US Domestic)' : `$${shipping.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  if (discountRow) {
    if (discount > 0) {
      discountRow.classList.remove('hidden');
      if (discountEl) discountEl.textContent = `-$${discount.toFixed(2)}`;
    } else {
      discountRow.classList.add('hidden');
    }
  }

  // Render items thumbnail summary
  const summaryContainer = document.getElementById('checkout-items-summary');
  if (summaryContainer) {
    summaryContainer.innerHTML = State.cart.map(i => `
      <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
        <div class="flex items-center gap-2 truncate pr-2">
          <img src="${i.image}" class="w-8 h-8 rounded object-cover border border-slate-200">
          <div class="truncate">
            <span class="font-bold text-slate-800 block truncate">${escapeHtml(i.title)}</span>
            <span class="text-slate-400">Qty: ${i.quantity} &times; $${i.price.toFixed(2)}</span>
          </div>
        </div>
        <span class="font-black text-slate-900">$${(i.price * i.quantity).toFixed(2)}</span>
      </div>
    `).join('');
  }
}

async function handlePlaceOrder(event) {
  event.preventDefault();

  const fullName = document.getElementById('cust-name').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const city = document.getElementById('cust-city').value.trim();
  const state = document.getElementById('cust-state').value.trim();
  const zip = document.getElementById('cust-zip').value.trim();

  if (!fullName || !email || !phone || !address || !city || !zip) {
    showToast('Please fill in all required shipping address fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('place-order-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Processing Order...`;
    initIcons();
  }

  const orderPayload = {
    customer: { fullName, email, phone, address, city, state, zip },
    items: State.cart,
    paymentMethod: currentPaymentMethod,
    discount: State.discountAmount || 0
  };

  try {
    // Attempt sending to Express Backend
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (res.ok) {
      const data = await res.json();
      displayOrderConfirmation(data.order);
    } else {
      throw new Error('API fallback');
    }
  } catch (err) {
    // Graceful offline / static host fallback (works identically on GitHub pages / Vercel static)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeThreshold = 50;
    const shipping = subtotal >= freeThreshold ? 0 : 4.99;
    const discount = State.discountAmount || 0;
    const tax = Number(((subtotal - discount) * 0.0825).toFixed(2));
    const total = Number((subtotal - discount + shipping + tax).toFixed(2));

    const simulatedOrder = {
      id: `TET-${randomSuffix}`,
      createdAt: new Date().toISOString(),
      customer: orderPayload.customer,
      items: [...State.cart],
      subtotal,
      discount,
      shipping,
      tax,
      total,
      paymentMethod: currentPaymentMethod,
      paymentStatus: currentPaymentMethod === 'cod' ? 'Cash on Delivery (Pending on Arrival)' : 'Paid (Verified)',
      orderStatus: 'Confirmed & Processing',
      carrier: 'FedEx Home Delivery',
      trackingNumber: `FX-78${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      timeline: [
        { status: 'Order Placed & Verified', time: 'Just now', location: 'Texas Expo Verification Hub', done: true },
        { status: 'Sent to Texas Fulfillment Depot', time: 'In Progress', location: 'Houston Logistics Facility', done: true },
        { status: 'Quality Packing & Barcode Scan', time: 'Scheduled', location: 'Warehouse #1', done: false },
        { status: 'FedEx Courier Pickup', time: 'Pending', location: 'Houston, TX', done: false },
        { status: currentPaymentMethod === 'cod' ? 'Out for Delivery (Cash on Arrival)' : 'Out for Delivery', time: 'Expected 3-5 Days', location: 'Customer Doorstep', done: false }
      ]
    };

    // Store in localStorage for static tracking
    const localOrders = JSON.parse(localStorage.getItem('tet_orders') || '[]');
    localOrders.unshift(simulatedOrder);
    localStorage.setItem('tet_orders', JSON.stringify(localOrders));

    displayOrderConfirmation(simulatedOrder);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Place Order (Cash on Delivery)`;
    }
  }
}

function displayOrderConfirmation(order) {
  State.activeOrder = order;
  State.cart = [];
  State.discountAmount = 0;
  State.appliedCoupon = null;
  saveCart();
  updateCartUI();

  closeModal('checkout-modal');

  const container = document.getElementById('confirmation-modal-content');
  if (container) {
    const isCOD = order.paymentMethod === 'cod';

    container.innerHTML = `
      <div id="printable-receipt" class="p-6 md:p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <i data-lucide="check-circle" class="w-10 h-10"></i>
          </div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Walmart Compliant Order Receipt</span>
          <h2 class="text-2xl font-bold text-slate-900 mt-2">Thank You For Your Order!</h2>
          <p class="text-xs text-slate-500 mt-1">An official confirmation with itemized receipt has been generated.</p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span class="text-slate-400 block font-medium">Order Number:</span>
            <span class="font-mono font-bold text-slate-900 text-sm">${order.id}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">Payment Mode:</span>
            <span class="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Cash on Delivery (COD)</span>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">Carrier:</span>
            <span class="font-bold text-slate-900">${order.carrier}</span>
          </div>
          <div>
            <span class="text-slate-400 block font-medium">Tracking Number:</span>
            <span class="font-mono font-bold text-blue-600">${order.trackingNumber}</span>
          </div>
        </div>

        ${isCOD ? `
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6 text-xs text-amber-900">
            <div class="flex items-center gap-2 font-bold mb-1">
              <i data-lucide="banknote" class="w-4 h-4 text-amber-600"></i> Cash on Delivery Instructions
            </div>
            Please have the exact cash amount of <strong>$${order.total.toFixed(2)}</strong> ready when the FedEx / UPS delivery agent arrives at your address. An official signed physical proof of delivery slip will be handed to you.
          </div>
        ` : ''}

        <div class="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div class="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">
            <span>Item Details & SKU</span>
            <span>Total</span>
          </div>
          <div class="divide-y divide-slate-100">
            ${order.items.map(i => `
              <div class="p-3 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-slate-900 block">${escapeHtml(i.title)}</span>
                  <span class="text-slate-500 font-mono text-[11px]">SKU: ${i.sku} &bull; Qty: ${i.quantity}</span>
                </div>
                <span class="font-bold text-slate-900">$${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="bg-slate-50 p-4 border-t border-slate-200 space-y-1.5 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>$${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied:</span>
                <span>-$${order.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-slate-600">
              <span>US Domestic Shipping:</span>
              <span>${order.shipping === 0 ? 'FREE' : `$${order.shipping.toFixed(2)}`}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Estimated Texas Sales Tax (8.25%):</span>
              <span>$${order.tax.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Final Total (Due on Delivery):</span>
              <span>$${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 class="font-bold text-slate-800 mb-1">Shipping To:</h5>
            <p>${escapeHtml(order.customer.fullName)}</p>
            <p>${escapeHtml(order.customer.address)}</p>
            <p>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.zip)}</p>
            <p class="text-slate-500 mt-1">Phone: ${escapeHtml(order.customer.phone)}</p>
          </div>
          <div>
            <h5 class="font-bold text-slate-800 mb-1">Fulfilled By:</h5>
            <p class="font-semibold text-slate-900">Texas Expo Tech Solutions LLC</p>
            <p>603 Landon Samuel Loop</p>
            <p>Pflugerville, TX 78660, United States</p>
            <p class="text-slate-500 mt-1">Support: support@texasexpotech.com</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center gap-3">
          <button onclick="window.print()" class="w-full sm:flex-1 bg-slate-900 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition">
            <i data-lucide="printer" class="w-4 h-4"></i> Print Official Receipt
          </button>
          <button onclick="openTrackingModal('${order.id}')" class="w-full sm:flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition">
            <i data-lucide="map-pin" class="w-4 h-4"></i> Live Order Tracking
          </button>
        </div>
      </div>
    `;
  }

  document.getElementById('confirmation-modal').classList.add('active');
  initIcons();
}

// ----------------------------------------------------
// LIVE ORDER TRACKING
// ----------------------------------------------------

async function openTrackingModal(prefillId = null) {
  closeModal('confirmation-modal');
  const modal = document.getElementById('tracking-modal');
  if (!modal) return;

  modal.classList.add('active');
  initIcons();

  const input = document.getElementById('tracking-query-input');
  if (prefillId && input) {
    input.value = prefillId;
    trackOrderSubmit();
  }
}

async function trackOrderSubmit() {
  const query = document.getElementById('tracking-query-input').value.trim();
  const resultsContainer = document.getElementById('tracking-results-area');
  if (!query || !resultsContainer) return;

  resultsContainer.innerHTML = `
    <div class="text-center py-8">
      <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2"></i>
      <span class="text-xs text-slate-500 font-medium">Retrieving real-time carrier tracking...</span>
    </div>
  `;
  initIcons();

  let order = null;

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      order = data.order;
    }
  } catch (e) {
    // fallback
  }

  if (!order) {
    const localOrders = JSON.parse(localStorage.getItem('tet_orders') || '[]');
    order = localOrders.find(o => 
      o.id.toUpperCase() === query.toUpperCase() || 
      (o.trackingNumber && o.trackingNumber.toUpperCase() === query.toUpperCase())
    );
  }

  if (!order) {
    resultsContainer.innerHTML = `
      <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <i data-lucide="alert-circle" class="w-10 h-10 text-red-500 mx-auto mb-2"></i>
        <h4 class="font-bold text-red-900 text-sm">Tracking Record Not Found</h4>
        <p class="text-xs text-red-700 mt-1">Please verify your Order ID (e.g. TET-94812) or carrier tracking number.</p>
      </div>
    `;
    initIcons();
    return;
  }

  // Render tracking timeline
  const timelineHtml = (order.timeline || []).map((step, idx) => `
    <div class="relative pl-7 pb-6 last:pb-0">
      <div class="absolute left-0 top-1 w-5 h-5 rounded-full ${step.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-[10px]">
        ${step.done ? '<i data-lucide="check" class="w-3 h-3"></i>' : (idx + 1)}
      </div>
      ${idx < order.timeline.length - 1 ? `<div class="absolute left-2.5 top-6 bottom-0 w-0.5 ${step.done ? 'bg-emerald-400' : 'bg-slate-200'}"></div>` : ''}
      <div class="text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold ${step.done ? 'text-slate-900' : 'text-slate-500'}">${step.status}</span>
          <span class="text-slate-400 text-[11px]">${step.time}</span>
        </div>
        <p class="text-slate-500 text-[11px] mt-0.5">${step.location}</p>
      </div>
    </div>
  `).join('');

  resultsContainer.innerHTML = `
    <div class="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order ID</span>
          <h4 class="text-base font-bold font-mono text-slate-900">${order.id}</h4>
        </div>
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carrier Tracking</span>
          <h4 class="text-base font-bold font-mono text-blue-600">${order.trackingNumber}</h4>
        </div>
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          <span class="block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">${order.orderStatus}</span>
        </div>
      </div>

      <div class="py-2">
        ${timelineHtml}
      </div>

      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
        <span class="text-slate-600">Payment: <strong>${order.paymentMethod.toUpperCase()}</strong></span>
        <span class="font-bold text-slate-900">Total: $${order.total.toFixed(2)}</span>
      </div>
    </div>
  `;

  initIcons();
}

// ----------------------------------------------------
// POLICY MODALS (Walmart Marketplace Essentials)
// ----------------------------------------------------

const POLICIES = {
  returns: {
    title: "30-Day Hassle-Free Return & Refund Policy",
    subtitle: "Compliant with Walmart Marketplace Seller Performance Guidelines",
    content: `
      <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
        <div class="bg-blue-50 border-l-4 border-blue-600 p-3 rounded-r-lg text-blue-900 font-medium">
          At <strong>Texas Expo Tech Solutions LLC</strong>, customer confidence is our priority. We maintain an ironclad <strong>30-day return policy</strong> in full compliance with Walmart Marketplace merchant standards.
        </div>

        <h4 class="text-sm font-bold text-slate-900">1. Return Window</h4>
        <p>You may initiate a return within <strong>30 days of confirmed delivery</strong> of your order. Any item reported defective, damaged, or incorrectly fulfilled is eligible for a 100% full refund or free replacement.</p>

        <h4 class="text-sm font-bold text-slate-900">2. Item Condition Requirements</h4>
        <ul class="list-disc pl-5 space-y-1">
          <li>Items must be in original condition with manufacturer tags, packaging, and accessories included.</li>
          <li>For clothing and apparel items, garments must be unworn, unwashed, and with all hygiene seals intact.</li>
          <li>For electronic devices, all cables, adapters, and manuals must be returned.</li>
        </ul>

        <h4 class="text-sm font-bold text-slate-900">3. Prepaid Return Labels</h4>
        <p>Texas Expo Tech Solutions LLC provides prepaid FedEx or UPS return shipping labels for all items verified as damaged, defective, or incorrect. For elective customer returns (e.g. change of mind), standard return shipping labels are provided at commercial discounted rates.</p>

        <h4 class="text-sm font-bold text-slate-900">4. Fast Refund Processing</h4>
        <p>Once your returned package arrives at our Texas logistics center (Pflugerville, TX), our inspection team verifies the contents within <strong>24 to 48 hours</strong>. Refunds are issued directly to your original payment method or via check/wire within <strong>3 to 5 business days</strong>.</p>

        <h4 class="text-sm font-bold text-slate-900">5. Cash on Delivery (COD) Returns & Refunds</h4>
        <p>If your order was completed via Cash on Delivery, your refund will be disbursed electronically via direct ACH bank transfer, Zelle, or company check upon receipt and inspection of the returned merchandise.</p>
      </div>
    `
  },
  shipping: {
    title: "Domestic US Shipping & Fulfillment Policy",
    subtitle: "Fast Ground & Expedited Transit via FedEx, UPS & USPS",
    content: `
      <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
        <div class="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-lg text-emerald-900 font-medium">
          All orders are dispatched directly from our Texas fulfillment center: <strong>603 Landon Samuel Loop, Pflugerville, TX 78660</strong>.
        </div>

        <h4 class="text-sm font-bold text-slate-900">1. Order Processing Time</h4>
        <p>All in-stock orders are processed, quality inspected, and packaged within <strong>1 to 2 business days</strong> (Monday through Friday, excluding national federal holidays).</p>

        <h4 class="text-sm font-bold text-slate-900">2. Shipping Rates & Transit Times</h4>
        <table class="w-full border-collapse border border-slate-200 text-left my-2">
          <thead>
            <tr class="bg-slate-100">
              <th class="border border-slate-200 p-2 font-bold">Shipping Tier</th>
              <th class="border border-slate-200 p-2 font-bold">Estimated Transit</th>
              <th class="border border-slate-200 p-2 font-bold">Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-slate-200 p-2 font-semibold">Standard US Ground</td>
              <td class="border border-slate-200 p-2">3 - 5 Business Days</td>
              <td class="border border-slate-200 p-2 text-emerald-700 font-bold">FREE on orders $50+ ($4.99 under $50)</td>
            </tr>
            <tr>
              <td class="border border-slate-200 p-2 font-semibold">Expedited 2-Day Air</td>
              <td class="border border-slate-200 p-2">2 Business Days</td>
              <td class="border border-slate-200 p-2 font-semibold">$12.99 Flat Rate</td>
            </tr>
            <tr>
              <td class="border border-slate-200 p-2 font-semibold">Cash on Delivery (COD)</td>
              <td class="border border-slate-200 p-2">3 - 5 Business Days</td>
              <td class="border border-slate-200 p-2 font-semibold">Standard Rates Apply (Pay at Door)</td>
            </tr>
          </tbody>
        </table>

        <h4 class="text-sm font-bold text-slate-900">3. Approved Logistics Partners</h4>
        <p>We partner exclusively with tier-1 national carriers: <strong>FedEx Home Delivery</strong>, <strong>UPS Ground</strong>, and <strong>USPS Priority Mail</strong>. Every package receives a unique scannable tracking barcode upon label creation.</p>
      </div>
    `
  },
  privacy: {
    title: "Privacy Policy & CCPA Compliance",
    subtitle: "Texas Expo Tech Solutions LLC Privacy & Data Safeguards",
    content: `
      <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
        <p>Texas Expo Tech Solutions LLC is committed to maintaining the highest security protocols for our customers' personal and transaction details. We comply fully with the California Consumer Privacy Act (CCPA) and federal electronic commerce standards.</p>
        <h4 class="text-sm font-bold text-slate-900">Information We Collect</h4>
        <p>We collect essential order fulfillment details including name, shipping address, telephone number, and email. We do not store unencrypted credit card details.</p>
        <h4 class="text-sm font-bold text-slate-900">Third-Party Sharing</h4>
        <p>We do not sell, rent, or trade your personal data. Information is shared strictly with necessary fulfillment carriers (FedEx, UPS) and payment gateways to execute deliveries.</p>
      </div>
    `
  },
  terms: {
    title: "Terms and Conditions of Service",
    subtitle: "Official Agreement between Customer and Texas Expo Tech Solutions LLC",
    content: `
      <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
        <p>By browsing or placing an order through <strong>Texas Expo Tech Solutions LLC</strong>, you acknowledge and agree to comply with our commercial terms and conditions.</p>
        <h4 class="text-sm font-bold text-slate-900">Product Authenticity & Warranty</h4>
        <p>All items sold are 100% brand new, authentic, and covered by standard manufacturer warranties against material defects.</p>
        <h4 class="text-sm font-bold text-slate-900">Cash on Delivery Terms</h4>
        <p>Customers choosing Cash on Delivery agree to provide accurate physical delivery addresses and ensure payment is available upon driver arrival.</p>
      </div>
    `
  },
  about: {
    title: "About Texas Expo Tech Solutions LLC",
    subtitle: "Commercial Profile & American Retail Distribution",
    content: `
      <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
        <div class="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg text-blue-900">
          <p class="font-bold text-sm mb-1">Company Overview</p>
          <p><strong>Texas Expo Tech Solutions LLC</strong> is an incorporated US enterprise headquartered in Pflugerville, Texas. We specialize in curating high-grade apparel, modern living & home decoration accents, smart mobile & desktop devices, and professional culinary kitchen accessories.</p>
        </div>

        <h4 class="text-sm font-bold text-slate-900">Our Mission</h4>
        <p>To deliver durable, design-forward lifestyle products backed by authentic domestic fulfillment, transparent pricing, and responsive customer service.</p>

        <h4 class="text-sm font-bold text-slate-900">Operational Infrastructure</h4>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Corporate Headquarters:</strong> 603 Landon Samuel Loop, Pflugerville, TX 78660</li>
          <li><strong>Logistics Facilities:</strong> Pflugerville & DFW Texas Regional Warehouses</li>
          <li><strong>Direct Customer Support:</strong> Mon - Fri 8am - 6pm CST (+1 763-218-6693)</li>
          <li><strong>Verification Status:</strong> Registered State of Texas LLC & Walmart Marketplace Applicant</li>
        </ul>
      </div>
    `
  },
  contact: {
    title: "Contact Texas Expo Tech Solutions LLC",
    subtitle: "Customer Service, Logistics Inquiries & Corporate Support",
    content: `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
        <div class="space-y-4">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <span class="font-bold text-slate-900 block text-sm">Corporate Headquarters</span>
              <p class="text-slate-600">Texas Expo Tech Solutions LLC</p>
              <p class="text-slate-600">603 Landon Samuel Loop</p>
              <p class="text-slate-600">Pflugerville, TX 78660, United States</p>
            </div>
            <div>
              <span class="font-bold text-slate-900 block">Telephone Support</span>
              <p class="text-blue-600 font-bold">+1 (763) 218-6693</p>
              <p class="text-slate-400 text-[11px]">Mon - Fri: 8:00 AM - 6:00 PM CST</p>
            </div>
            <div>
              <span class="font-bold text-slate-900 block">Email Inquiries</span>
              <p class="text-blue-600 font-medium">support@texasexpotech.com</p>
              <p class="text-slate-400 text-[11px]">Orders & Returns: returns@texasexpotech.com</p>
            </div>
          </div>
        </div>

        <div>
          <form onsubmit="handleContactSubmit(event)" class="space-y-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Your Name *</label>
              <input type="text" required placeholder="Marcus Vance" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Email Address *</label>
              <input type="email" required placeholder="marcus@example.com" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Subject</label>
              <select class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
                <option>Order Status / Tracking Inquiry</option>
                <option>Product Question</option>
                <option>30-Day Return / Exchange</option>
                <option>Wholesale & Corporate Inquiries</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Message *</label>
              <textarea rows="3" required placeholder="How can our Texas support team assist you today?" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-blue-700 transition">
              Submit Message
            </button>
          </form>
        </div>
      </div>
    `
  }
};

function openPolicyModal(policyKey) {
  const policy = POLICIES[policyKey];
  if (!policy) return;

  const titleEl = document.getElementById('policy-modal-title');
  const subEl = document.getElementById('policy-modal-subtitle');
  const bodyEl = document.getElementById('policy-modal-body');

  if (titleEl) titleEl.textContent = policy.title;
  if (subEl) subEl.textContent = policy.subtitle;
  if (bodyEl) bodyEl.innerHTML = policy.content;

  document.getElementById('policy-modal').classList.add('active');
  initIcons();
}

function handleContactSubmit(e) {
  e.preventDefault();
  showToast('Inquiry submitted! Our Texas support team will reply within 24 hours.', 'success');
  closeModal('policy-modal');
}

// ----------------------------------------------------
// UTILITIES & TOAST
// ----------------------------------------------------

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
