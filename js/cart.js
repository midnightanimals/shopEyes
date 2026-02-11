/* =====================
   基本設定
===================== */
const CART_KEY = "cart_items";

const SHIPPING_OPTIONS = [
  { id: "cod_711", label: "7-11 賣貨便（取貨付款）", fee: 0 },
  { id: "pickup_711", label: "7-11 純取貨", fee: 60 },
  { id: "cod_family", label: "全家好賣家（取貨付款）", fee: 0 },
  { id: "pickup_family", label: "全家純取貨（小物袋）", fee: 42 },
  { id: "home", label: "宅配", fee: 120 }
];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxOpqHf4AB8UdCKM2ik2mQRLfx-3KhNEjL5iEwWcgxSTM2bEBRvgduY5yCRVIlRFHfB/exec?action=list";


/* =====================
   工具函式
===================== */
function loadProducts() {
  return fetch("data/products.json")
    .then(r => r.json())
    .catch(() => null);
}

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function calcTotal(cart) {
  return cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}


/* =====================
   寄送方式
===================== */
function initShippingOptions() {
  const $sel = $("#shippingMethod");
  SHIPPING_OPTIONS.forEach(o => {
    $sel.append(
      `<option value="${o.id}">
        ${o.label}（NT$${o.fee}）
      </option>`
    );
  });
}


/* =====================
   規格顯示
===================== */
function formatSpecs(item, productData) {
  if (!item.selected) return "";

  const specs = [];
  const templates = productData.optionTemplates || {};

  for (const [key, val] of Object.entries(item.selected)) {
    const tKey = key === "addons" ? "addon" : key;
    const tpl = Object.values(templates).find(t => t.key === tKey);
    const title = tpl ? tpl.label : key;

    if (Array.isArray(val)) {
      specs.push(`${title}：${val.join("、")}`);
    } else if (val) {
      specs.push(`${title}：${val}`);
    }
  }
  return specs.join(" | ");
}

/* =====================
   Loading 控制
===================== */
function toggleLoading(show) {
  if (show) {
    $('body').append(`
      <div id="loadingOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999;color:white;flex-direction:column;">
        <div class="spinner-border text-light" role="status"></div>
        <div class="mt-2">訂單傳送中，請稍候...</div>
      </div>
    `);
  } else {
    $('#loadingOverlay').remove();
  }
}

/* =====================
   訂單文字產生
===================== */
function buildOrderText(cart, productData, shipping) {
  const now = new Date();
  const orderNo = `ORD-${now.getTime().toString().slice(-6)}`;

  let text = `【客製商品訂單】\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `訂單編號：${orderNo}\n`;
  text += `訂單時間：${now.toLocaleString("zh-TW")}\n`;
  text += `寄送方式：${shipping.label}（NT$${shipping.fee}）\n\n`;

  cart.forEach((item, i) => {
    text += `${i + 1}. ${item.name}\n`;
    text += `   規格：${formatSpecs(item, productData)}\n`;
    text += `   單價：NT$ ${item.unitPrice}\n`;
    text += `   數量：${item.qty}\n`;
    text += `   小計：NT$ ${item.unitPrice * item.qty}\n`;
    text += `----------------------------------\n`;
  });

  const total = calcTotal(cart) + shipping.fee;
  text += `商品小計：NT$ ${calcTotal(cart)}\n`;
  text += `運費：NT$ ${shipping.fee}\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `訂單總金額：NT$ ${total}\n`;

  return { orderNo, text, total };
}


/* =====================
   畫面渲染
===================== */
function renderCart(productData) {
  const cart = getCart();
  const $area = $("#cartArea");
  $area.empty();

  if (!cart.length) {
    $area.html(`<div class="py-5 text-center text-muted">購物車目前沒有商品。</div>`);
    $("#sendOrder").prop("disabled", true); // 沒東西就停用
    return;
  }

  $("#sendOrder").prop("disabled", false); // 有東西就啟用
  $("#buildOrder").prop("disabled", false);

  cart.forEach((item, idx) => {
    const product = productData.products.find(p => p.id === item.productId);

    $area.append(`
      <div class="card mb-3 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between">
            <div>
              <h5>${item.name}</h5>
              <div class="small text-muted">${formatSpecs(item, productData)}</div>
            </div>
            <button class="btn-close remove" data-i="${idx}"></button>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3">
            <div>
              <button class="btn btn-sm btn-outline-secondary minus" data-i="${idx}">-</button>
              <input class="qty-input mx-1 text-center" data-i="${idx}" type="number" value="${item.qty}" style="width:60px">
              <button class="btn btn-sm btn-outline-secondary plus" data-i="${idx}">+</button>
            </div>
            <div class="fw-bold text-primary">
              NT$ ${item.unitPrice * item.qty}
            </div>
          </div>
        </div>
      </div>
    `);
  });

  $area.append(`<div class="text-end mt-4"><h4>總計：NT$ ${calcTotal(cart)}</h4></div>`);
}


/* =====================
   初始化與事件
===================== */
$(async function () {
  const productData = await loadProducts();
  if (!productData) return alert("商品資料載入失敗");

  initShippingOptions();
  renderCart(productData);

  let latestOrder = null;

  $("#cartArea")
    .on("click", ".plus, .minus", function () {
      const idx = $(this).data("i");
      const cart = getCart();
      cart[idx].qty += $(this).hasClass("plus") ? 1 : -1;
      if (cart[idx].qty < 1) cart[idx].qty = 1;
      saveCart(cart);
      renderCart(productData);
    })
    .on("change", ".qty-input", function () {
      const idx = $(this).data("i");
      const cart = getCart();
      cart[idx].qty = Math.max(1, parseInt(this.value) || 1);
      saveCart(cart);
      renderCart(productData);
    })
    .on("click", ".remove", function () {
      if (!confirm("確定刪除商品？")) return;
      const cart = getCart();
      cart.splice($(this).data("i"), 1);
      saveCart(cart);
      renderCart(productData);
    });

  $("#buildOrder").on("click", () => {
    const cart = getCart();
    const shipId = $("#shippingMethod").val();
    if (!shipId) return alert("請先選擇寄送方式");

    const shipping = SHIPPING_OPTIONS.find(s => s.id === shipId);
    latestOrder = buildOrderText(cart, productData, shipping);

    $("#orderText").text(latestOrder.text);
    $("#orderPreview").removeClass("d-none");
    $("#sendOrder").prop("disabled", false);
  });

  $("#copyOrder").on("click", async () => {
    await navigator.clipboard.writeText(latestOrder.text);
    alert("訂單內容已複製");
  });

  /* =====================
     修改後的發送事件 (確保在 $(async function()...) 內)
  ===================== */
  $("#sendOrder").on("click", async function () {
    const cart = getCart();
    const shipId = $("#shippingMethod").val();
    const email = $("#ccEmail").val().trim();

    // 1. 基本檢查
    if (cart.length === 0) return alert("購物車是空的");
    if (!shipId) return alert("請選擇寄送方式");
    if (!email) return alert("請填寫 Email 以便接收確認信");

    // 2. 顯示 Loading
    toggleLoading(true);

    try {
      // 3. 取得寄送設定
      const shipping = SHIPPING_OPTIONS.find(s => s.id === shipId);

      // 4. 重要：在這裡直接產生訂單內容 (這裡定義了 orderData)
      // 注意：productData 必須是在 $(async function() {...}) 頂部定義過的
      const orderData = buildOrderText(cart, productData, shipping);

      // 5. 封裝要傳給 Google Sheet 的資料
      const payload = {
        orderNo: orderData.orderNo,
        createdAt: new Date().toLocaleString("zh-TW"),
        customerEmail: email,
        shipping: `${shipping.label}（NT$${shipping.fee}）`,
        total: orderData.total,
        itemsText: orderData.text,

        // ★ 新增這行：把原始購物車陣列轉成字串傳送出去
        itemsJson: JSON.stringify(cart)
      };

      // 6. 發送至 GAS
      // 使用 fetch 搭配 'no-cors' 是因為 GAS 重新導向的特性
      await fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      // 7. 成功處理
      alert("訂單已送出，感謝您的購買！");
      localStorage.removeItem(CART_KEY);
      location.reload();

    } catch (err) {
      console.error("發送錯誤：", err);
      alert("訂單送出時發生錯誤：" + err.message);
    } finally {
      toggleLoading(false);
    }
  });
});
