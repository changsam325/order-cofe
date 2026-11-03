const STORAGE_KEYS = {
  cart: "chenbei-cart",
  orders: "chenbei-orders",
  products: "chenbei-products"
};

const categories = ["全部", "義式咖啡", "手沖精品", "特調飲品", "輕食甜點"];
const orderStages = [
  { id: "received", label: "已收單", next: "preparing" },
  { id: "preparing", label: "製作中", next: "ready" },
  { id: "ready", label: "請取餐", next: "completed" },
  { id: "completed", label: "已完成", next: null }
];
const defaultProducts = [
  { id: "oat-latte", name: "晨光燕麥拿鐵", category: "義式咖啡", description: "濃縮咖啡・燕麥奶・野花蜂蜜", price: 150, badge: "店長推薦", image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80", available: true, options: ["hot", "iced", "size", "sugar", "oat"] },
  { id: "ethiopia", name: "衣索比亞・日曬", category: "手沖精品", description: "莓果香氣・柑橘尾韻・中淺焙", price: 180, badge: "單品手沖", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80", available: true, options: ["hot", "iced", "size"] },
  { id: "black-sugar-coldbrew", name: "黑糖海鹽冷萃", category: "特調飲品", description: "低溫萃取・黑糖香氣・綿密奶蓋", price: 160, badge: "季節限定", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80", available: true, options: ["iced", "size", "sugar"] },
  { id: "flat-white", name: "經典馥列白", category: "義式咖啡", description: "雙份濃縮・絲絨奶泡・平衡醇厚", price: 140, badge: "經典款", image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80", available: true, options: ["hot", "iced", "size", "sugar", "oat"] },
  { id: "geisha", name: "巴拿馬・藝伎", category: "手沖精品", description: "白花香氣・蜜桃甜感・淺焙", price: 240, badge: "限量批次", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80", available: true, options: ["hot", "iced", "size"] },
  { id: "citrus-espresso", name: "橙花氣泡美式", category: "特調飲品", description: "柑橘果香・清爽氣泡・雙份濃縮", price: 155, badge: "清爽推薦", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80", available: true, options: ["iced", "size", "sugar"] },
  { id: "canelé", name: "香草可麗露", category: "輕食甜點", description: "外層焦脆・內裡柔軟・每日新鮮出爐", price: 75, badge: "每日現烤", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80", available: true, options: [] },
  { id: "lemon-cake", name: "檸檬奶油磅蛋糕", category: "輕食甜點", description: "新鮮檸檬・發酵奶油・微酸清甜", price: 95, badge: "人氣甜點", image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=800&q=80", available: true, options: [] }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`讀取 ${key} 失敗`, error);
    return fallback;
  }
}

const state = {
  cart: readStorage(STORAGE_KEYS.cart, []),
  orders: readStorage(STORAGE_KEYS.orders, []),
  products: readStorage(STORAGE_KEYS.products, defaultProducts),
  category: "全部",
  search: "",
  toastTimer: null
};

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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function money(amount) {
  return `NT$ ${Number(amount).toLocaleString("zh-TW")}`;
}

function routePath() {
  return decodeURIComponent(window.location.hash.slice(1) || "/");
}

function cartQuantity() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function subtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function shippingFee() {
  const isDelivery = document.querySelector('[name="fulfillment"]:checked')?.value === "delivery";
  return isDelivery && subtotal() < 500 ? 60 : 0;
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function header() {
  return `
    <header class="site-header">
      <nav class="nav wrap" aria-label="主要導覽">
        <a class="brand" href="#/" aria-label="晨焙首頁">
          <span class="brand-mark" aria-hidden="true">晨</span>
          <span>晨焙 <small lang="en">COFFEE ATELIER</small></span>
        </a>
        <div class="nav-links">
          <a href="#/">品牌首頁</a><a href="#/menu">咖啡菜單</a>
          <a href="#/admin/orders">店家管理</a>
        </div>
        <div class="nav-actions">
          <a href="#/cart" aria-label="購物袋，${cartQuantity()} 件">購物袋 <span class="cart-count" aria-live="polite">${cartQuantity()}</span></a>
          <a class="nav-cta" href="#/menu">開始點餐 ↗</a>
          <button class="nav-toggle" type="button" aria-expanded="false" aria-label="開啟導覽選單">選單</button>
        </div>
      </nav>
      <div class="mobile-nav wrap">
        <a href="#/">品牌首頁</a><a href="#/menu">咖啡菜單</a><a href="#/cart">購物袋（${cartQuantity()}）</a><a href="#/admin/orders">店家管理</a>
      </div>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-inner wrap">
        <a class="brand" href="#/" aria-label="晨焙首頁"><span class="brand-mark" aria-hidden="true">晨</span><span>晨焙 <small lang="en">COFFEE ATELIER</small></span></a>
        <div>© 晨焙 <span lang="en">Coffee Atelier</span>　｜　前端展示版</div>
        <div class="footer-links"><a href="#/menu">咖啡菜單</a><a href="#/admin/orders">店家管理</a></div>
      </div>
    </footer>
    <dialog class="modal" aria-labelledby="modal-title"></dialog>
    <div class="toast" role="status" aria-live="polite" hidden></div>`;
}

function productCard(product) {
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

function homePage() {
  const featured = state.products.filter((product) => product.available).slice(0, 3);
  return `
    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="wrap"><div class="hero-content">
          <div class="eyebrow">A slower morning, a better coffee</div>
          <h1 id="hero-title">把日常，<br><span>沖得更好。</span></h1>
          <p class="hero-copy">從產地到杯中，細心挑選每一顆咖啡豆。留一點時間給自己，讓今天從一杯好咖啡開始。</p>
          <div class="hero-buttons"><a class="button" href="#/menu">探索咖啡菜單 ↗</a><a class="button-secondary" href="#story">認識晨焙</a></div>
          <div class="hero-stats"><div><strong>01</strong>嚴選單一產區</div><div><strong>02</strong>每日新鮮烘焙</div><div><strong>03</strong>手工細緻沖煮</div></div>
        </div></div>
        <div class="hero-note">GOOD COFFEE, GOOD DAY</div>
      </section>
      <div class="ticker">每日新鮮烘焙 <span>✳</span> 為你的日常，留一杯咖啡的時間 <span>✳</span> 單筆滿 NT$ 500 享免運</div>
      <section class="section wrap" aria-labelledby="signature-title">
        <div class="section-heading"><div><div class="eyebrow">Our signature</div><h2 id="signature-title">本週人氣推薦</h2></div><p>經典風味，為每一種日常時刻準備。<br>選一杯喜歡的，現在就開始。</p></div>
        <div class="coffee-grid">${featured.map(productCard).join("")}</div>
        <div class="hero-buttons"><a class="button-secondary" href="#/menu">瀏覽完整菜單 →</a></div>
      </section>
      <section class="story" id="story"><div class="story-layout">
        <div class="story-photo" role="img" aria-label="咖啡師專注準備手沖咖啡"></div>
        <div class="story-copy"><div class="eyebrow">From farm to cup</div><h2>好咖啡，<br>從用心開始。</h2><p>我們相信，咖啡不只是提神，更是日常裡的一段留白。與世界各地的小農合作，尊重每一片土地的風味，再以恰好的烘焙，呈現咖啡豆最真實的樣子。</p><a href="#/menu">選一杯喜歡的咖啡 →</a></div>
      </div></section>
      <section class="visit"><div class="visit-inner wrap"><div><div class="eyebrow">Your neighborhood coffee</div><h2>今天，想在哪裡喝杯咖啡？</h2><p>台北市大安區溫州街 18 號　｜　每日 08:00 – 18:00</p></div><a class="button" href="#/menu">選擇咖啡並點餐 ↗</a></div></section>
    </main>`;
}

function menuPage() {
  const filtered = state.products.filter((product) => {
    const categoryMatches = state.category === "全部" || product.category === state.category;
    const searchMatches = `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(state.search.toLowerCase());
    return product.available && categoryMatches && searchMatches;
  });
  return `
    <main class="page-main">
      <section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">A cup for every moment</div><h1>咖啡菜單</h1></div><p>嚴選產地、每日新鮮製作。挑選喜歡的風味，客製專屬於你的日常一杯。</p></div></section>
      <section class="page-body wrap">
        <div class="filter-row">
          <div class="category-list" aria-label="商品分類">${categories.map((category) => `<button class="chip ${state.category === category ? "is-active" : ""}" type="button" data-category="${category}" aria-pressed="${state.category === category}">${category}</button>`).join("")}</div>
          <label class="sr-only" for="menu-search">搜尋菜單</label><input id="menu-search" class="search-input" type="search" placeholder="搜尋咖啡、風味…" value="${escapeHtml(state.search)}">
        </div>
        <p class="muted" aria-live="polite">找到 ${filtered.length} 款商品</p>
        <div class="coffee-grid">${filtered.length ? filtered.map(productCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><h2>找不到符合的商品</h2><p>換個分類或關鍵字再試試看。</p></div>`}</div>
      </section>
    </main>`;
}

function summaryDetails({ showCheckout = false, delivery = false } = {}) {
  const shipping = delivery && subtotal() < 500 ? 60 : 0;
  return `
      <div class="summary-row"><span>商品小計</span><span>${money(subtotal())}</span></div>
      <div class="summary-row"><span>外送費</span><span>${shipping ? money(shipping) : "NT$ 0"}</span></div>
      ${delivery && subtotal() < 500 ? `<p class="field-hint">外送滿 NT$ 500 免運，距離免運還差 ${money(500 - subtotal())}。</p>` : ""}
      <div class="summary-row total"><span>合計</span><span>${money(subtotal() + shipping)}</span></div>
      ${showCheckout ? `<a class="button full-width" href="#/checkout">前往結帳 →</a>` : ""}`;
}

function totalPanel({ showCheckout = false, delivery = false } = {}) {
  return `
    <section class="panel" aria-labelledby="summary-title">
      <h2 id="summary-title">訂單摘要</h2>
      ${summaryDetails({ showCheckout, delivery })}
    </section>`;
}

function cartPage() {
  if (!state.cart.length) {
    return `<main class="page-main"><section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">Your coffee selection</div><h1>購物袋</h1></div></div></section><section class="page-body wrap"><div class="empty-state"><h2>購物袋還是空的</h2><p>挑一杯喜歡的咖啡，開始你的美好日常。</p><a class="button" href="#/menu">前往咖啡菜單 →</a></div></section></main>`;
  }
  return `
    <main class="page-main">
      <section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">Your coffee selection</div><h1>購物袋</h1></div><p>確認品項與客製內容，接著填寫取餐資料。</p></div></section>
      <section class="page-body wrap two-column">
        <section class="panel"><h2>已選品項（${cartQuantity()}）</h2><div class="cart-list">${state.cart.map((item) => `
          <article class="cart-item">
            <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.details)}</p>
              <div class="quantity-control" aria-label="${escapeHtml(item.name)}數量">
                <button type="button" data-quantity="${escapeHtml(item.key)}" data-change="-1" aria-label="減少數量">−</button><span>${item.quantity}</span><button type="button" data-quantity="${escapeHtml(item.key)}" data-change="1" aria-label="增加數量">+</button>
              </div>
            </div>
            <div class="cart-item-total"><strong>${money(item.price * item.quantity)}</strong><br><button class="remove-link" type="button" data-remove="${escapeHtml(item.key)}">移除</button></div>
          </article>`).join("")}</div>
          <a class="button-secondary button-small" href="#/menu">繼續選購</a>
        </section>
        <div>${totalPanel({ showCheckout: true })}</div>
      </section>
    </main>`;
}

function checkoutPage() {
  if (!state.cart.length) return `<main class="page-main"><section class="page-hero"><div class="wrap page-heading"><h1>結帳</h1></div></section><section class="page-body wrap"><div class="empty-state"><h2>目前沒有待結帳的商品</h2><a class="button" href="#/menu">前往咖啡菜單 →</a></div></section></main>`;
  return `
    <main class="page-main">
      <section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">Almost there</div><h1>訂單結帳</h1></div><p>填寫聯絡與取餐資料，確認後即可送出訂單。</p></div></section>
      <section class="page-body wrap two-column">
        <form class="panel" id="checkout-form">
          <h2>取餐與聯絡資料</h2>
          <div class="form-grid">
            <div class="field field-wide"><span class="field-label">取餐方式</span><div class="choice-list">
              <label class="choice"><input type="radio" name="fulfillment" value="pickup" checked><span><strong>門市自取</strong><small>台北市大安區溫州街 18 號</small></span></label>
              <label class="choice"><input type="radio" name="fulfillment" value="dinein"><span><strong>內用</strong><small>請提供門市桌號</small></span></label>
              <label class="choice"><input type="radio" name="fulfillment" value="delivery"><span><strong>外送</strong><small>訂單滿 NT$ 500 免運，服務範圍依門市為準</small></span></label>
            </div></div>
            <div class="field"><label for="customer-name">姓名</label><input id="customer-name" name="customerName" autocomplete="name" required maxlength="60"></div>
            <div class="field"><label for="customer-phone">聯絡電話</label><input id="customer-phone" name="phone" type="tel" autocomplete="tel" pattern="[0-9]{8,15}" title="請輸入 8 至 15 位數字電話" required></div>
            <div class="field field-wide conditional-field" data-for="dinein" hidden><label for="table-number">桌號</label><input id="table-number" name="tableNumber" maxlength="10"></div>
            <div class="field field-wide conditional-field" data-for="delivery" hidden><label for="delivery-address">外送地址</label><input id="delivery-address" name="address" autocomplete="street-address" maxlength="180"></div>
            <div class="field field-wide"><label for="order-note">備註（選填）</label><textarea id="order-note" name="note" maxlength="240" placeholder="例如：少餐具、到店前電話聯絡"></textarea></div>
          </div>
          <h2 style="margin-top:24px">付款方式</h2>
          <div class="choice-list">
            <label class="choice"><input type="radio" name="payment" value="cash" checked><span><strong>現場付款</strong><small>取餐時於門市付款；此為前端展示流程</small></span></label>
            <label class="choice"><input type="radio" name="payment" value="card" disabled><span><strong>信用卡</strong><small>尚未串接付款服務</small></span></label>
            <label class="choice"><input type="radio" name="payment" value="linepay" disabled><span><strong>LINE Pay</strong><small>尚未串接付款服務</small></span></label>
          </div>
          <div class="notice">展示版本：訂單僅儲存在此瀏覽器，不會傳送到門市，也不會進行線上付款。</div>
          <button class="button full-width" type="submit">確認並送出訂單 →</button>
        </form>
        <div><section class="panel"><h2>本次訂購</h2>${state.cart.map((item) => `<div class="summary-row"><span>${escapeHtml(item.name)} × ${item.quantity}</span><span>${money(item.price * item.quantity)}</span></div>`).join("")}<div class="checkout-summary">${summaryDetails()}</div></section></div>
      </section>
    </main>`;
}

function fulfillmentLabel(value) {
  return ({ pickup: "門市自取", dinein: "內用", delivery: "外送" })[value] || value;
}

function orderPage(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return `<main class="page-main"><section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">Order lookup</div><h1>找不到這筆訂單</h1></div></div></section><section class="page-body wrap"><div class="empty-state"><p>訂單可能不在此瀏覽器中，或編號有誤。</p><a class="button" href="#/menu">返回菜單</a></div></section></main>`;
  const currentIndex = orderStages.findIndex((stage) => stage.id === order.status);
  const items = order.items.map((item) => `<div class="summary-row"><span>${escapeHtml(item.name)} × ${item.quantity}<br><span class="muted">${escapeHtml(item.details)}</span></span><span>${money(item.price * item.quantity)}</span></div>`).join("");
  return `
    <main class="page-main">
      <section class="page-hero"><div class="wrap page-heading"><div><div class="eyebrow">Thank you for your order</div><h1>訂單追蹤</h1></div><p>訂單狀態將於此瀏覽器更新。</p></div></section>
      <section class="page-body wrap">
        <article class="order-card">
          <div class="muted">訂單編號</div><div class="order-id">${escapeHtml(order.id)}</div>
          <div class="notice success" role="status">目前狀態：${escapeHtml(orderStages[currentIndex]?.label || "已收單")}。${order.status === "ready" ? "請至門市取餐。" : ""}</div>
          <div class="progress-track" aria-label="訂單製作進度">${orderStages.map((stage, index) => `<div class="progress-step ${index <= currentIndex ? "is-done" : ""}" ${index === currentIndex ? 'aria-current="step"' : ""}><span>${stage.label}</span></div>`).join("")}</div>
          <div class="two-column">
            <section><h2>訂單明細</h2>${items}<div class="summary-row"><span>取餐方式</span><span>${escapeHtml(fulfillmentLabel(order.fulfillment))}</span></div>${order.address ? `<div class="summary-row"><span>外送地址</span><span>${escapeHtml(order.address)}</span></div>` : ""}<div class="summary-row total"><span>訂單合計</span><span>${money(order.total)}</span></div></section>
            <section><h2>聯絡資料</h2><p>${escapeHtml(order.customerName)}</p><p>${escapeHtml(order.phone)}</p><p class="muted">付款方式：現場付款</p>${order.note ? `<p>備註：${escapeHtml(order.note)}</p>` : ""}</section>
          </div>
          <div class="hero-buttons"><a class="button-secondary" href="#/menu">繼續點餐</a><a href="#/admin/orders">管理端查看訂單 →</a></div>
        </article>
      </section>
    </main>`;
}

function adminShell(content, active) {
  return `
    <main class="page-main">
      <section class="admin-shell"><div class="wrap">
        <div class="page-heading"><div><div class="eyebrow">Atelier dashboard</div><h1>店家管理</h1></div><div class="admin-tabs"><a href="#/admin/orders" ${active === "orders" ? 'aria-current="page"' : ""}>訂單看板</a><a href="#/admin/menu" ${active === "menu" ? 'aria-current="page"' : ""}>菜單管理</a></div></div>
        <div class="notice admin-note">前端展示模式：此管理畫面沒有登入與權限控管，不可直接用於正式營運。</div>
      </div></section>
      <section class="page-body wrap">${content}</section>
    </main>`;
}

function adminOrdersPage() {
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
  return adminShell(`<div class="page-heading"><div><h2>訂單看板</h2><p>依製作進度更新訂單狀態，顧客追蹤頁會同步顯示。</p></div></div><div class="board">${columns}</div>`, "orders");
}

function adminMenuPage() {
  const products = state.products.map((product) => `
    <article class="admin-menu-item">
      <div><h3>${escapeHtml(product.name)} <span class="status-pill ${product.available ? "" : "off"}">${product.available ? "供應中" : "暫停供應"}</span></h3><p>${escapeHtml(product.category)} · ${money(product.price)} · ${escapeHtml(product.description)}</p></div>
      <div class="admin-menu-actions"><button class="button-secondary button-small" type="button" data-edit-product="${escapeHtml(product.id)}">編輯</button><button class="button-secondary button-small" type="button" data-toggle-product="${escapeHtml(product.id)}">${product.available ? "暫停供應" : "恢復供應"}</button></div>
    </article>`).join("");
  return adminShell(`
    <div class="panel">
      <div class="section-heading"><div><h2>菜單商品</h2><p>上架、編輯商品資訊並設定供應狀態。</p></div><button class="button" type="button" data-add-product>新增商品 +</button></div>
      <div class="admin-menu-list">${products || `<div class="empty-state">尚無商品，請新增第一項商品。</div>`}</div>
    </div>`, "menu");
}

function pageContent(path) {
  if (path === "/menu") return menuPage();
  if (path === "/cart") return cartPage();
  if (path === "/checkout") return checkoutPage();
  if (path === "/admin/orders") return adminOrdersPage();
  if (path === "/admin/menu") return adminMenuPage();
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) return orderPage(orderMatch[1]);
  return homePage();
}

function render() {
  document.querySelector("#app").innerHTML = `${header()}${pageContent(routePath())}${footer()}`;
}

function optionFields(product) {
  const options = new Set(product.options || []);
  return `
    ${options.has("size") ? `<div class="field"><label for="drink-size">容量</label><select id="drink-size" name="size"><option value="中杯">中杯（預設）</option><option value="大杯">大杯（+ NT$ 20）</option></select></div>` : ""}
    ${options.has("hot") && options.has("iced") ? `<div class="field"><label for="drink-temp">冷熱</label><select id="drink-temp" name="temperature"><option value="熱飲">熱飲</option><option value="少冰">少冰</option><option value="正常冰">正常冰</option></select></div>` : ""}
    ${options.has("hot") && !options.has("iced") ? `<div class="field"><label for="drink-temp">冷熱</label><select id="drink-temp" name="temperature"><option value="熱飲">熱飲</option></select></div>` : ""}
    ${options.has("sugar") ? `<div class="field"><label for="drink-sugar">甜度</label><select id="drink-sugar" name="sugar"><option>無糖</option><option selected>半糖</option><option>正常糖</option></select></div>` : ""}
    ${options.has("oat") ? `<div class="field field-wide"><label><input type="checkbox" name="extraOat"> 更換燕麥奶（+ NT$ 15）</label></div>` : ""}`;
}

function openCustomize(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product || !product.available) {
    showToast("這項商品目前無法選購。");
    return;
  }
  const dialog = document.querySelector(".modal");
  dialog.innerHTML = `
    <form method="dialog" class="modal-content" id="customize-form" data-product="${escapeHtml(product.id)}">
      <div class="modal-header"><div><div class="eyebrow">${escapeHtml(product.category)}</div><h2 id="modal-title">${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p></div><button class="modal-close" type="button" data-close-modal aria-label="關閉">×</button></div>
      <div class="form-grid">${optionFields(product)}</div>
      <div class="field" style="margin-top:16px"><label for="quantity">數量</label><input id="quantity" name="quantity" type="number" min="1" max="20" value="1" required></div>
      <div class="modal-actions"><button class="button-secondary" type="button" data-close-modal>取消</button><button class="button" type="submit">加入購物袋</button></div>
    </form>`;
  dialog.showModal();
}

function addToCart(form) {
  const product = state.products.find((entry) => entry.id === form.dataset.product);
  if (!product) return;
  const data = new FormData(form);
  const size = data.get("size") || "";
  const temperature = data.get("temperature") || "";
  const sugar = data.get("sugar") || "";
  const extraOat = data.has("extraOat");
  const quantity = Math.min(20, Math.max(1, Number(data.get("quantity")) || 1));
  const details = [size, temperature, sugar, extraOat ? "燕麥奶" : ""].filter(Boolean).join("・") || "原味";
  const key = [product.id, size, temperature, sugar, extraOat ? "oat" : ""].join("|");
  const price = product.price + (size === "大杯" ? 20 : 0) + (extraOat ? 15 : 0);
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else state.cart.push({ key, productId: product.id, name: product.name, details, price, quantity });
  persist(STORAGE_KEYS.cart, state.cart);
  render();
  showToast(`${product.name}已加入購物袋。`);
}

function updateCheckoutFields() {
  const selected = document.querySelector('[name="fulfillment"]:checked')?.value || "pickup";
  document.querySelectorAll(".conditional-field").forEach((field) => {
    const active = field.dataset.for === selected;
    field.hidden = !active;
    const input = field.querySelector("input");
    if (input) input.required = active;
  });
  const summary = document.querySelector(".checkout-summary");
  if (summary) summary.innerHTML = totalPanel({ delivery: selected === "delivery" });
}

function submitCheckout(form) {
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
  state.orders.unshift(order);
  state.cart = [];
  const ordersSaved = persist(STORAGE_KEYS.orders, state.orders);
  const cartSaved = ordersSaved && persist(STORAGE_KEYS.cart, state.cart);
  if (!ordersSaved || !cartSaved) {
    state.orders = previousOrders;
    state.cart = previousCart;
    if (ordersSaved) persist(STORAGE_KEYS.orders, previousOrders);
    render();
    showToast("訂單未能完整儲存，請確認瀏覽器儲存設定後再重試。");
    return;
  }
  render();
  window.location.hash = `/orders/${encodeURIComponent(id)}`;
}

function saveProducts() {
  persist(STORAGE_KEYS.products, state.products);
  render();
}

function openProductEditor(productId = "") {
  const product = state.products.find((entry) => entry.id === productId);
  const dialog = document.querySelector(".modal");
  const selectedCategory = product?.category || "義式咖啡";
  dialog.innerHTML = `
    <form class="modal-content" id="product-form" data-product="${escapeHtml(productId)}">
      <div class="modal-header"><div><div class="eyebrow">Menu management</div><h2 id="modal-title">${product ? "編輯商品" : "新增商品"}</h2></div><button class="modal-close" type="button" data-close-modal aria-label="關閉">×</button></div>
      <div class="form-grid">
        <div class="field"><label for="product-name">商品名稱</label><input id="product-name" name="name" required maxlength="60" value="${escapeHtml(product?.name || "")}"></div>
        <div class="field"><label for="product-price">售價（NT$）</label><input id="product-price" name="price" type="number" min="1" max="10000" required value="${escapeHtml(product?.price ?? "")}"></div>
        <div class="field"><label for="product-category">分類</label><select id="product-category" name="category">${categories.slice(1).map((category) => `<option ${category === selectedCategory ? "selected" : ""}>${category}</option>`).join("")}</select></div>
        <div class="field"><label for="product-badge">商品標籤</label><input id="product-badge" name="badge" maxlength="24" value="${escapeHtml(product?.badge || "")}"></div>
        <div class="field field-wide"><label for="product-description">商品描述</label><input id="product-description" name="description" maxlength="120" required value="${escapeHtml(product?.description || "")}"></div>
        <div class="field field-wide"><label for="product-image">圖片網址</label><input id="product-image" name="image" type="url" required value="${escapeHtml(product?.image || "")}"></div>
      </div>
      <div class="modal-actions"><button class="button-secondary" type="button" data-close-modal>取消</button><button class="button" type="submit">儲存商品</button></div>
    </form>`;
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
  if (existing) state.products = state.products.map((entry) => entry.id === productId ? product : entry);
  else state.products.push(product);
  document.querySelector(".modal").close();
  saveProducts();
  showToast(existing ? "商品資訊已更新。" : "商品已新增。");
}

function handleClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches(".nav-toggle")) {
    const mobileNav = document.querySelector(".mobile-nav");
    const isOpen = mobileNav.classList.toggle("is-open");
    target.setAttribute("aria-expanded", String(isOpen));
    return;
  }
  if (target.dataset.customize) return openCustomize(target.dataset.customize);
  if (target.dataset.category) {
    state.category = target.dataset.category;
    const search = document.querySelector("#menu-search")?.value || "";
    state.search = search;
    render();
    return;
  }
  if (target.dataset.closeModal !== undefined) return document.querySelector(".modal").close();
  if (target.dataset.quantity) {
    const item = state.cart.find((entry) => entry.key === target.dataset.quantity);
    if (!item) return;
    item.quantity += Number(target.dataset.change);
    if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.key !== item.key);
    persist(STORAGE_KEYS.cart, state.cart);
    render();
    return;
  }
  if (target.dataset.remove) {
    state.cart = state.cart.filter((item) => item.key !== target.dataset.remove);
    persist(STORAGE_KEYS.cart, state.cart);
    render();
    showToast("商品已從購物袋移除。");
    return;
  }
  if (target.dataset.orderStatus) {
    const order = state.orders.find((entry) => entry.id === target.dataset.orderStatus);
    if (!order || !orderStages.some((stage) => stage.id === target.dataset.next)) return;
    order.status = target.dataset.next;
    persist(STORAGE_KEYS.orders, state.orders);
    render();
    showToast("訂單狀態已更新。");
    return;
  }
  if (target.dataset.toggleProduct) {
    const product = state.products.find((entry) => entry.id === target.dataset.toggleProduct);
    if (!product) return;
    product.available = !product.available;
    saveProducts();
    showToast(product.available ? "商品已恢復供應。" : "商品已暫停供應。");
    return;
  }
  if (target.dataset.editProduct) return openProductEditor(target.dataset.editProduct);
  if (target.hasAttribute("data-add-product")) return openProductEditor();
}

document.addEventListener("click", handleClick);
document.addEventListener("input", (event) => {
  if (event.target.id !== "menu-search") return;
  state.search = event.target.value;
  const selectionStart = event.target.selectionStart;
  render();
  const search = document.querySelector("#menu-search");
  search.focus();
  search.setSelectionRange(selectionStart, selectionStart);
});
document.addEventListener("change", (event) => {
  if (event.target.name === "fulfillment") updateCheckoutFields();
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "customize-form") {
    event.preventDefault();
    addToCart(event.target);
  } else if (event.target.id === "checkout-form") {
    event.preventDefault();
    if (event.target.reportValidity()) submitCheckout(event.target);
  } else if (event.target.id === "product-form") {
    event.preventDefault();
    if (event.target.reportValidity()) saveProduct(event.target);
  }
});
window.addEventListener("hashchange", render);

render();
