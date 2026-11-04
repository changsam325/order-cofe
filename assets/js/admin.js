import {
  categories, escapeHtml, fulfillmentLabel, initPage, money, orderStages, persistProducts,
  refresh, showToast, state
} from "./app.js";

function renderOrders() {
  const columns = orderStages.map((stage) => {
    const orders = state.orders.filter((order) => order.status === stage.id);
    return `<section class="board-column"><h2>${stage.label}<span>${orders.length}</span></h2>${orders.length ? orders.map((order) => `
      <article class="order-ticket">
        <h3>${escapeHtml(order.id)}</h3><p>${escapeHtml(order.customerName)} · ${escapeHtml(fulfillmentLabel(order.fulfillment))}</p><p>${escapeHtml(order.phone)}</p>
        <div class="ticket-items">${order.items.map((item) => `<p>${escapeHtml(item.name)} × ${item.quantity} · ${escapeHtml(item.details)}</p>`).join("")}</div>
        <p><strong>${money(order.total)}</strong> · ${new Date(order.createdAt).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}</p>
        ${stage.next ? `<div class="ticket-actions"><button class="button button-small" type="button" data-order-status="${escapeHtml(order.id)}" data-next="${stage.next}">更新為「${orderStages.find((entry) => entry.id === stage.next).label}」</button></div>` : `<span class="status-pill">訂單完成</span>`}
      </article>`).join("") : `<p class="muted">目前沒有訂單</p>`}</section>`;
  }).join("");
  document.querySelector("#order-board").innerHTML = columns;
}

function renderMenu() {
  const products = state.products.map((product) => `
    <article class="admin-menu-item">
      <div><h3>${escapeHtml(product.name)} <span class="status-pill ${product.available ? "" : "off"}">${product.available ? "供應中" : "暫停供應"}</span></h3><p>${escapeHtml(product.category)} · ${money(product.price)} · ${escapeHtml(product.description)}</p></div>
      <div class="admin-menu-actions"><button class="button-secondary button-small" type="button" data-edit-product="${escapeHtml(product.id)}">編輯</button><button class="button-secondary button-small" type="button" data-toggle-product="${escapeHtml(product.id)}">${product.available ? "暫停供應" : "恢復供應"}</button></div>
    </article>`).join("");
  document.querySelector("#admin-product-list").innerHTML = products || `<div class="empty-state">尚無商品，請新增第一項商品。</div>`;
}

function renderAdmin() {
  const active = new URLSearchParams(window.location.search).get("view") === "menu" ? "menu" : "orders";
  document.querySelector("#admin-orders").hidden = active !== "orders";
  document.querySelector("#admin-menu").hidden = active !== "menu";
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    if (tab.dataset.adminTab === active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (active === "menu") renderMenu();
  else renderOrders();
}

function openProductEditor(productId = "") {
  const product = state.products.find((entry) => entry.id === productId);
  const dialog = document.querySelector(".modal");
  const form = dialog.querySelector("#product-form");
  form.reset();
  form.dataset.product = productId;
  dialog.querySelector("#modal-title").textContent = product ? "編輯商品" : "新增商品";
  form.elements.name.value = product?.name || "";
  form.elements.price.value = product?.price ?? "";
  form.elements.category.value = product?.category || categories[1];
  form.elements.badge.value = product?.badge || "";
  form.elements.description.value = product?.description || "";
  form.elements.image.value = product?.image || "";
  dialog.showModal();
}

function saveProduct(form) {
  const data = new FormData(form);
  const productId = form.dataset.product;
  const existing = state.products.find((entry) => entry.id === productId);
  const product = {
    id: existing?.id || `item-${Date.now()}`,
    name: String(data.get("name")).trim(),
    category: data.get("category"),
    description: String(data.get("description")).trim(),
    price: Number(data.get("price")),
    badge: String(data.get("badge") || "").trim() || "店家推薦",
    image: String(data.get("image")).trim(),
    available: existing?.available ?? true,
    options: existing?.options || []
  };
  const nextProducts = existing
    ? state.products.map((entry) => entry.id === productId ? product : entry)
    : [...state.products, product];
  if (!persistProducts(nextProducts)) return;
  state.products = nextProducts;
  document.querySelector(".modal").close();
  refresh();
  showToast(existing ? "商品資訊已更新。" : "商品已新增。");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.toggleProduct) {
    const product = state.products.find((entry) => entry.id === target.dataset.toggleProduct);
    if (!product) return;
    const previous = product.available;
    product.available = !product.available;
    if (!persistProducts()) {
      product.available = previous;
      return;
    }
    refresh();
    showToast(product.available ? "商品已恢復供應。" : "商品已暫停供應。");
  } else if (target.dataset.editProduct) {
    openProductEditor(target.dataset.editProduct);
  } else if (target.hasAttribute("data-add-product")) {
    openProductEditor();
  } else if (target.hasAttribute("data-close-modal")) {
    document.querySelector(".modal").close();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "product-form") return;
  event.preventDefault();
  if (event.target.reportValidity()) saveProduct(event.target);
});

initPage(renderAdmin, { loadProductData: true });
