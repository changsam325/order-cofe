import { initPage, productCard, state } from "./app.js";

let selectedCategory = "全部";
let search = "";

function getProducts() {
  return state.products.filter((product) => {
    const categoryMatches = selectedCategory === "全部" || product.category === selectedCategory;
    const searchMatches = `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.toLowerCase());
    return product.available && categoryMatches && searchMatches;
  });
}

function renderProducts() {
  const filtered = getProducts();
  const results = document.querySelector("#menu-products");
  const resultCount = document.querySelector("#menu-result-count");
  resultCount.textContent = `找到 ${filtered.length} 款商品`;
  results.innerHTML = filtered.length
    ? filtered.map(productCard).join("")
    : `<div class="empty-state" style="grid-column:1/-1"><h2>找不到符合的商品</h2><p>換個分類或關鍵字再試試看。</p></div>`;
  document.querySelectorAll("[data-category]").forEach((button) => {
    const active = button.dataset.category === selectedCategory;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderMenu() {
  const filtered = getProducts();
  document.querySelector("#menu-result-count").textContent = `找到 ${filtered.length} 款商品`;
  document.querySelector("#menu-products").innerHTML = filtered.length
    ? filtered.map(productCard).join("")
    : `<div class="empty-state" style="grid-column:1/-1"><h2>找不到符合的商品</h2><p>換個分類或關鍵字再試試看。</p></div>`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  document.querySelectorAll("[data-category]").forEach((categoryButton) => {
    const active = categoryButton === button;
    categoryButton.classList.toggle("is-active", active);
    categoryButton.setAttribute("aria-pressed", String(active));
  });
  renderProducts();
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "menu-search") return;
  search = event.target.value;
  if (!event.isComposing) renderProducts();
});

document.addEventListener("compositionend", (event) => {
  if (event.target.id !== "menu-search") return;
  search = event.target.value;
  renderProducts();
});

initPage(renderMenu, { loadProductData: true });
