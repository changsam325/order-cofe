import { initPage, productCard, state } from "./app.js";

function renderHome() {
  const featured = state.products.filter((product) => product.available).slice(0, 3);
  document.querySelector("#featured-products").innerHTML = featured.map(productCard).join("");
}

initPage(renderHome, { loadProductData: true });
