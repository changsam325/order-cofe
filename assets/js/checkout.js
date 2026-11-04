import { escapeHtml, initPage, money, state, submitCheckout, updateCheckoutFields } from "./app.js";

function renderCheckout() {
  const empty = state.cart.length === 0;
  document.querySelector("#checkout-empty").hidden = !empty;
  document.querySelector("#checkout-content").hidden = empty;
  document.querySelector("#checkout-items").innerHTML = state.cart.map((item) => `
    <div class="summary-row"><span>${escapeHtml(item.name)} × ${item.quantity}</span><span>${money(item.price * item.quantity)}</span></div>`).join("");
  updateCheckoutFields();
}

document.addEventListener("change", (event) => {
  if (event.target.name === "fulfillment") updateCheckoutFields();
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "checkout-form") return;
  event.preventDefault();
  if (event.target.reportValidity()) submitCheckout(event.target);
});

initPage(renderCheckout);
