import { cartQuantity, escapeHtml, initPage, money, state, subtotal } from "./app.js";

function renderCart() {
  const empty = state.cart.length === 0;
  document.querySelector("#cart-empty").hidden = !empty;
  document.querySelector("#cart-content").hidden = empty;
  document.querySelector("#cart-item-count").textContent = cartQuantity();
  document.querySelector("#cart-items").innerHTML = state.cart.map((item) => `
    <article class="cart-item">
      <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.details)}</p>
        <div class="quantity-control" aria-label="${escapeHtml(item.name)}數量">
          <button type="button" data-quantity="${escapeHtml(item.key)}" data-change="-1" aria-label="減少數量">−</button><span>${item.quantity}</span><button type="button" data-quantity="${escapeHtml(item.key)}" data-change="1" aria-label="增加數量">+</button>
        </div>
      </div>
      <div class="cart-item-total"><strong>${money(item.price * item.quantity)}</strong><br><button class="remove-link" type="button" data-remove="${escapeHtml(item.key)}">移除</button></div>
    </article>`).join("");
  document.querySelector("#cart-summary").innerHTML = `
    <div class="summary-row"><span>商品小計</span><span>${money(subtotal())}</span></div>
    <div class="summary-row"><span>外送費</span><span>NT$ 0</span></div>
    <div class="summary-row total"><span>合計</span><span>${money(subtotal())}</span></div>`;
}

initPage(renderCart);
