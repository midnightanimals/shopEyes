const CART_KEY = "cart_items";
const SELLER_EMAIL = "midnightanimals2359@gmail.com";

/* =====================
   資料獲取與工具
===================== */
function loadProducts() {
  return fetch("data/products.json")
    .then(res => res.ok ? res.json() : Promise.reject("無法載入產品資料"))
    .catch(err => console.error(err));
}

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getDisplayLabel(productData, key, value) {
  if (!productData || !productData.optionTemplates) return value;
  
  // 處理 key 對應 (例如 addons 找 addon)
  const targetKey = (key === 'addons') ? 'addon' : key;
  const template = Object.values(productData.optionTemplates).find(t => t.key === targetKey);
  
  if (template) {
    const item = template.items.find(i => i.value === value);
    if (item) return item.label;
  }
  return value; 
}

/* =====================
   規格顯示優化
===================== */
function formatSpecs(item, productData) {
  const selected = item.selected || {};
  const specs = [];

  for (const [key, val] of Object.entries(selected)) {
    const targetKey = (key === 'addons') ? 'addon' : key;
    const template = Object.values(productData.optionTemplates).find(t => t.key === targetKey);
    const labelTitle = template ? template.label : (key === 'color' ? '顏色' : key);

    if (Array.isArray(val)) {
      const labels = val.map(v => getDisplayLabel(productData, key, v));
      if (labels.length > 0) specs.push(`${labelTitle}：${labels.join('、')}`);
    } else if (val) {
      specs.push(`${labelTitle}：${getDisplayLabel(productData, key, val)}`);
    }
  }
  return specs.join(" | ");
}

/* =====================
   訂單文字產生
===================== */
function buildOrderText(cart, productData) {
  const now = new Date();
  const orderNo = `ORD-${now.getTime().toString().slice(-6)}`;

  let text = `【客製商品訂單】\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `訂單編號：${orderNo}\n`;
  text += `訂單時間：${now.toLocaleString("zh-TW")}\n\n`;

  cart.forEach((item, idx) => {
    text += `${idx + 1}. ${item.name}\n`;
    text += `   規格：${formatSpecs(item, productData)}\n`;
    text += `   單價：NT$ ${item.unitPrice}\n`;
    text += `   數量：${item.qty}\n`;
    text += `   小計：NT$ ${item.unitPrice * item.qty}\n`;
    text += `----------------------------------\n`;
  });

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  text += `【訂單總計金額】 NT$ ${total}\n`;
  text += `━━━━━━━━━━━━━━━━━━`;
  return text;
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
    $("#buildOrder").prop("disabled", true);
    $("#sendOrder").prop("disabled", true);
    return;
  }

  $("#buildOrder").prop("disabled", false);

  cart.forEach((item, idx) => {
    const product = productData.products.find(p => p.id === item.productId);
    const thumb = (product && product.images && product.images.colors) 
                  ? (product.images.colors[item.selected.color] || product.images.main) 
                  : "images/default-product.jpg";

    $area.append(`
      <div class="card mb-3 shadow-sm">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row gap-3">
            <img src="${thumb}" class="rounded" style="width:100px; height:100px; object-fit:cover;">
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between">
                <h5 class="mb-1">${item.name}</h5>
                <button class="btn-close remove" data-i="${idx}"></button>
              </div>
              <div class="small text-secondary mb-2">${formatSpecs(item, productData)}</div>
              <div class="d-flex justify-content-between align-items-end">
                <div class="d-flex align-items-center gap-2">
                   <button class="btn btn-sm btn-outline-secondary minus" data-i="${idx}">-</button>
                   <input class="form-control form-control-sm qty-input text-center" type="number" 
                          data-i="${idx}" value="${item.qty}" style="width:60px">
                   <button class="btn btn-sm btn-outline-secondary plus" data-i="${idx}">+</button>
                </div>
                <div class="text-primary fw-bold">
                  NT$ ${item.unitPrice * item.qty}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  $area.append(`<div class="text-end mt-4"><h4>總計金額：NT$ ${total}</h4></div>`);
}

/* =====================
   初始化
===================== */
$(async function () {
  const productData = await loadProducts();
  if (!productData) return;
  
  renderCart(productData);

  // [修正] 事件委派與語法
  $("#cartArea")
    .on("click", ".plus, .minus", function() {
      const idx = $(this).data("i"); // 修正引號
      const cart = getCart();
      const isPlus = $(this).hasClass('plus');
      cart[idx].qty = isPlus ? cart[idx].qty + 1 : Math.max(1, cart[idx].qty - 1);
      saveCart(cart);
      renderCart(productData);
    })
    .on("change", ".qty-input", function() {
      const idx = $(this).data("i");
      const cart = getCart();
      const newQty = Math.max(1, parseInt($(this).val()) || 1);
      cart[idx].qty = newQty;
      saveCart(cart);
      renderCart(productData);
    })
    .on("click", ".remove", function() {
      if(!confirm("確定要刪除此商品嗎？")) return;
      const idx = $(this).data("i");
      const cart = getCart();
      cart.splice(idx, 1);
      saveCart(cart);
      renderCart(productData);
    });

  let latestOrderText = "";

  $("#buildOrder").on("click", () => {
    const cart = getCart();
    latestOrderText = buildOrderText(cart, productData);
    $("#orderText").text(latestOrderText);
    $("#orderPreview").removeClass("d-none");
    $("#sendOrder").prop("disabled", false); // 啟用發送按鈕
    
    $('html, body').animate({ scrollTop: $("#orderPreview").offset().top }, 500);
  });

  $("#copyOrder").on("click", async () => {
    try {
      await navigator.clipboard.writeText(latestOrderText);
      alert("訂單已複製！");
    } catch (err) {
      alert("請手動選取文字複製。");
    }
  });

  $("#sendOrder").on("click", () => {
    const cc = $("#ccEmail").val();
    const subject = encodeURIComponent("新訂單通知");
    const body = encodeURIComponent("您好，我的訂單內容如下：\n\n(請在此處貼上剛才複製的訂單內容)\n\n");
    
    let mailtoUrl = `mailto:${SELLER_EMAIL}?subject=${subject}&body=${body}`;
    if (cc) mailtoUrl += `&cc=${cc}`;
    
    window.location.href = mailtoUrl;
  });
});