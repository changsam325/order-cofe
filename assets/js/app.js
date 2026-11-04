const STORAGE_KEYS = {
  cart: "chenbei-cart",
  orders: "chenbei-orders",
  products: "chenbei-products",
  productVersion: "chenbei-products-version"
};

const PRODUCT_CATALOG_VERSION = "2026-11-product1";

export const categories = ["全部", "義式咖啡", "手沖精品", "嚴選茶飲", "特調氣泡", "無咖啡因", "手作甜點"];
export const orderStages = [
  { id: "received", label: "已收單", next: "preparing" },
  { id: "preparing", label: "製作中", next: "ready" },
  { id: "ready", label: "請取餐", next: "completed" },
  { id: "completed", label: "已完成", next: null }
];

export const state = {
  cart: readStorage(STORAGE_KEYS.cart, []),
  orders: readStorage(STORAGE_KEYS.orders, []),
  products: [],
  toastTimer: null
};

let renderPage;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`讀取 ${key} 失敗`, error);
    return fallback;
  }
}

export async function loadProducts() {
  const savedProducts = localStorage.getItem(STORAGE_KEYS.products);
  const savedVersion = localStorage.getItem(STORAGE_KEYS.productVersion);
  if (savedProducts !== null && savedVersion === PRODUCT_CATALOG_VERSION) {
    try {
      const parsed = JSON.parse(savedProducts);
      if (!Array.isArray(parsed)) throw new TypeError("商品資料格式錯誤");
      state.products = parsed;
      return;
    } catch (error) {
      console.error("讀取已儲存的商品失敗", error);
      throw new Error("無法讀取已儲存的菜單資料，請檢查瀏覽器儲存內容。", { cause: error });
    }
  }

  const response = await fetch(new URL("../../data/products.json", import.meta.url));
  if (!response.ok) throw new Error(`載入菜單失敗（HTTP ${response.status}）。`);
  const products = await response.json();
  if (!Array.isArray(products)) throw new TypeError("data/products.json 必須是商品陣列。");
  state.products = products;
  try {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.productVersion, PRODUCT_CATALOG_VERSION);
  } catch (error) {
    console.error("更新瀏覽器菜單快取失敗", error);
    try {
      localStorage.removeItem(STORAGE_KEYS.productVersion);
    } catch (removeError) {
      console.error("清除菜單版本快取失敗", removeError);
    }
    showToast("新菜單已載入，但瀏覽器無法更新快取。");
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`儲存 ${key} 失敗`, error);
    showToast("瀏覽器無法儲存資料，請檢查儲存空間或隱私設定。");
    return false;
  }
}

export function persistCart() {
  return persist(STORAGE_KEYS.cart, state.cart);
}

export function persistOrders() {
  return persist(STORAGE_KEYS.orders, state.orders);
}

export function persistProducts(products = state.products) {
  return persist(STORAGE_KEYS.products, products);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function money(amount) {
  return `NT$ ${Number(amount).toLocaleString("zh-TW")}`;
}

export function cartQuantity() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function subtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function fulfillmentLabel(value) {
  return ({ pickup: "門市自取", dinein: "內用", delivery: "外送" })[value] || value;
}

export function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function updateCartCount() {
  const quantity = cartQuantity();
  document.querySelectorAll("[data-cart-count]").forEach((counter) => {
    counter.textContent = quantity;
  });
  document.querySelectorAll('.nav-actions a[href="./cart.html"]').forEach((link) => {
    link.setAttribute("aria-label", `購物袋，${quantity} 件`);
  });
}

export function refresh() {
  updateCartCount();
  if (renderPage) renderPage();
}

export async function initPage(renderer, { loadProductData = false } = {}) {
  renderPage = renderer;
  updateCartCount();
  if (!loadProductData) {
    refresh();
    return;
  }
  try {
    await loadProducts();
    refresh();
  } catch (error) {
    console.error(error);
    const errorPanel = document.querySelector("#page-error");
    if (errorPanel) errorPanel.hidden = false;
    document.querySelectorAll("[data-product-list]").forEach((list) => { list.hidden = true; });
  }
}

export function productCard(product) {
  return `
    <article class="coffee-card">
      <div class="coffee-image">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="badge">${escapeHtml(product.badge || product.category)}</span>
      </div>
      <div class="coffee-info">
        <div class="coffee-title-row"><h3>${escapeHtml(product.name)}</h3><span class="price">${money(product.price)}</span></div>
        <p>${escapeHtml(product.description)}</p>
        <div class="coffee-bottom"><span class="muted">${escapeHtml(product.category)}</span>
          <button class="button button-small" type="button" data-customize="${escapeHtml(product.id)}" ${product.available ? "" : "disabled"}>
            ${product.available ? "選擇規格 +" : "暫停供應"}
          </button>
        </div>
      </div>
    </article>`;
}

function openCustomize(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product || !product.available) {
    showToast("這項商品目前無法選購。");
    return;
  }
  const dialog = document.querySelector(".modal");
  if (!dialog) return;
  const form = dialog.querySelector("#customize-form");
  form.dataset.product = product.id;
  dialog.querySelector("[data-product-category]").textContent = product.category;
  dialog.querySelector("#modal-title").textContent = product.name;
  dialog.querySelector("[data-product-description]").textContent = product.description;
  const options = new Set(product.options || []);
  dialog.querySelectorAll("[data-option]").forEach((field) => {
    const option = field.dataset.option;
    const visible = option === "temperature"
      ? options.has("hot") && options.has("iced")
      : options.has(option);
    field.hidden = !visible;
  });
  const temperature = dialog.querySelector('[name="temperature"]');
  temperature.querySelector('option[value="少冰"]').hidden = !options.has("iced");
  temperature.querySelector('option[value="正常冰"]').hidden = !options.has("iced");
  form.reset();
  dialog.showModal();
}

function addToCart(form) {
  const product = state.products.find((entry) => entry.id === form.dataset.product);
  if (!product || !product.available) {
    showToast("這項商品目前無法選購。");
    return;
  }
  const data = new FormData(form);
  const options = new Set(product.options || []);
  const size = options.has("size") ? data.get("size") || "" : "";
  const temperature = options.has("hot") && options.has("iced") ? data.get("temperature") || "" : "";
  const sugar = options.has("sugar") ? data.get("sugar") || "" : "";
  const extraOat = options.has("oat") && data.has("extraOat");
  const quantity = Math.min(20, Math.max(1, Number(data.get("quantity")) || 1));
  const details = [size, temperature, sugar, extraOat ? "燕麥奶" : ""].filter(Boolean).join("・") || "原味";
  const key = [product.id, size, temperature, sugar, extraOat ? "oat" : ""].join("|");
  const price = product.price + (size === "大杯" ? 20 : 0) + (extraOat ? 15 : 0);
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else state.cart.push({ key, productId: product.id, name: product.name, details, price, quantity });
  if (!persistCart()) return;
  document.querySelector(".modal").close();
  refresh();
  showToast(`${product.name}已加入購物袋。`);
}

export function updateCheckoutFields() {
  const selected = document.querySelector('[name="fulfillment"]:checked')?.value || "pickup";
  document.querySelectorAll(".conditional-field").forEach((field) => {
    const active = field.dataset.for === selected;
    field.hidden = !active;
    const input = field.querySelector("input");
    if (input) input.required = active;
  });
  const shipping = selected === "delivery" && subtotal() < 500 ? 60 : 0;
  const subtotalLabel = document.querySelector("#checkout-subtotal");
  const shippingLabel = document.querySelector("#checkout-shipping");
  const totalLabel = document.querySelector("#checkout-total");
  const hint = document.querySelector("#delivery-hint");
  if (subtotalLabel) subtotalLabel.textContent = money(subtotal());
  if (shippingLabel) shippingLabel.textContent = money(shipping);
  if (totalLabel) totalLabel.textContent = money(subtotal() + shipping);
  if (hint) {
    hint.hidden = selected !== "delivery" || subtotal() >= 500;
    hint.textContent = `外送滿 NT$ 500 免運，距離免運還差 ${money(500 - subtotal())}。`;
  }
}

export function submitCheckout(form) {
  if (!state.cart.length) {
    showToast("購物袋沒有商品，請返回菜單選購。");
    return;
  }
  const data = new FormData(form);
  const id = `CB${Date.now().toString().slice(-8)}`;
  const fulfillment = data.get("fulfillment");
  const order = {
    id,
    status: "received",
    customerName: String(data.get("customerName")).trim(),
    phone: String(data.get("phone")).trim(),
    fulfillment,
    address: fulfillment === "delivery" ? String(data.get("address") || "").trim() : "",
    tableNumber: fulfillment === "dinein" ? String(data.get("tableNumber") || "").trim() : "",
    note: String(data.get("note") || "").trim(),
    payment: "現場付款",
    items: state.cart.map((item) => ({ ...item })),
    total: subtotal() + (fulfillment === "delivery" && subtotal() < 500 ? 60 : 0),
    createdAt: new Date().toISOString()
  };
  const previousOrders = state.orders;
  const previousCart = state.cart;
  state.orders = [order, ...state.orders];
  state.cart = [];
  const ordersSaved = persistOrders();
  const cartSaved = ordersSaved && persistCart();
  if (!ordersSaved || !cartSaved) {
    state.orders = previousOrders;
    state.cart = previousCart;
    if (ordersSaved) persistOrders();
    showToast("訂單未能完整儲存，請確認瀏覽器儲存設定後再重試。");
    return;
  }
  window.location.href = `./order.html?id=${encodeURIComponent(id)}`;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches(".nav-toggle")) {
    const mobileNav = document.querySelector(".mobile-nav");
    const isOpen = mobileNav.classList.toggle("is-open");
    target.setAttribute("aria-expanded", String(isOpen));
  } else if (target.dataset.customize) {
    openCustomize(target.dataset.customize);
  } else if (target.hasAttribute("data-reload-page")) {
    window.location.reload();
  } else if (target.hasAttribute("data-close-modal")) {
    document.querySelector(".modal").close();
  } else if (target.dataset.quantity) {
    const item = state.cart.find((entry) => entry.key === target.dataset.quantity);
    if (!item) return;
    item.quantity += Number(target.dataset.change);
    if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.key !== item.key);
    if (persistCart()) refresh();
  } else if (target.dataset.remove) {
    state.cart = state.cart.filter((item) => item.key !== target.dataset.remove);
    if (persistCart()) {
      refresh();
      showToast("商品已從購物袋移除。");
    }
  } else if (target.dataset.orderStatus) {
    const order = state.orders.find((entry) => entry.id === target.dataset.orderStatus);
    if (!order || !orderStages.some((stage) => stage.id === target.dataset.next)) return;
    const previousStatus = order.status;
    order.status = target.dataset.next;
    if (!persistOrders()) {
      order.status = previousStatus;
      return;
    }
    refresh();
    showToast("訂單狀態已更新。");
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "customize-form") return;
  event.preventDefault();
  addToCart(event.target);
});
