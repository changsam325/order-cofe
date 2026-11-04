import { escapeHtml, fulfillmentLabel, initPage, money, orderStages, state } from "./app.js";

function renderOrder(orderId) {
  const lookup = document.querySelector("#order-lookup");
  const result = document.querySelector("#order-result");
  const card = document.querySelector("#order-card");
  const notFound = document.querySelector("#order-not-found");
  const order = state.orders.find((entry) => entry.id === orderId);

  lookup.hidden = Boolean(orderId);
  result.hidden = !orderId;
  card.hidden = !order;
  notFound.hidden = Boolean(order);
  if (!order) return;

  const currentIndex = orderStages.findIndex((stage) => stage.id === order.status);
  document.querySelector("#order-id").textContent = order.id;
  document.querySelector("#order-status").textContent = `目前狀態：${orderStages[currentIndex]?.label || "已收單"}。${order.status === "ready" ? "請至門市取餐。" : ""}`;
  document.querySelectorAll("[data-order-stage]").forEach((step, index) => {
    step.classList.toggle("is-done", index <= currentIndex);
    if (index === currentIndex) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  document.querySelector("#order-items").innerHTML = order.items.map((item) => `
    <div class="summary-row"><span>${escapeHtml(item.name)} × ${item.quantity}<br><span class="muted">${escapeHtml(item.details)}</span></span><span>${money(item.price * item.quantity)}</span></div>`).join("");
  document.querySelector("#order-fulfillment").textContent = fulfillmentLabel(order.fulfillment);
  const addressRow = document.querySelector("#order-address-row");
  addressRow.hidden = !order.address;
  document.querySelector("#order-address").textContent = order.address || "";
  document.querySelector("#order-total").textContent = money(order.total);
  document.querySelector("#order-customer").textContent = order.customerName;
  document.querySelector("#order-phone").textContent = order.phone;
  const note = document.querySelector("#order-note");
  note.hidden = !order.note;
  note.textContent = order.note ? `備註：${order.note}` : "";
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "order-lookup-form") return;
  event.preventDefault();
  const id = new FormData(event.target).get("id").trim();
  if (id) window.location.href = `./order.html?id=${encodeURIComponent(id)}`;
});

initPage(() => renderOrder(new URLSearchParams(window.location.search).get("id")));
