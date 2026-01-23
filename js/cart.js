const CART_KEY = "cart_items";
const SELLER_EMAIL = "midnightanimals2359@gmail.com";

/* =====================
   基本工具
===================== */
function loadProducts() {
  return fetch("data/products.json").then(res => res.json());
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
   規格顯示
===================== */
const labelMap = {
  size: "尺寸",
  type: "類型",
  material: "材質",
  addons: "加購",
  color: "顏色"
};

const valueMap = {
  size: { S: "小", M: "中", L: "大" },
  type: { basic: "基本款", premium: "進階款" },
  material: { canvas: "帆布", leather: "皮革" },
  addons: {
    inner_pocket: "內袋",
    engraving: "刻字服務"
  }
};

function formatSpecs(selected = {}) {
  return Object.entries(selected)
    .map(([k, v]) => {
      const label = labelMap[k] || k;
      if (Array.isArray(v)) {
        return `${label}：${v.map(x => valueMap[k]?.[x] || x).join("、")}`;
      }
      return `${label}：${valueMap[k]?.[v] || v}`;
    })
    .join(" | ");
}

/* =====================
   訂單文字產生（重點）
===================== */
function buildOrderText(cart) {
  const now = new Date();
  const timeStr = now.toLocaleString("zh-TW");
  const orderNo =
    "ORD-" +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    Math.floor(Math.random() * 900 + 100);

  let text = "";
  text += "【客製商品訂單】\n";
  text += "━━━━━━━━━━━━━━━━━━\n";
  text += `訂單編號：${orderNo}\n`;
  text += `訂單時間：${timeStr}\n\n`;

  cart.forEach(item => {
    text += "商品：" + item.name + "\n";

    Object.entries(item.selected || {}).forEach(([k, v]) => {
      const label = labelMap[k] || k;
      if (Array.isArray(v)) {
        text += `${label}：${v.map(x => valueMap[k]?.[x] || x).join("、")}\n`;
      } else {
        text += `${label}：${valueMap[k]?.[v] || v}\n`;
      }
    });

    text += `單價：NT$ ${item.unitPrice}\n`;
    text += `數量：${item.qty}\n`;
    text += `小計：NT$ ${item.unitPrice * item.qty}\n`;
    text += "━━━━━━━━━━━━━━━━━━\n\n";
  });

  text += `【訂單總計】 NT$ ${calcTotal(cart)}\n`;

  return text;
}

/* =====================
   畫面渲染
===================== */
function renderCart(productsData) {
  const cart = getCart();
  const $area = $("#cartArea");
  $area.empty();

  if (!cart.length) {
    $area.html(`<div class="text-muted">購物車目前沒有商品。</div>`);
    $("#sendOrder").prop("disabled", true);
    return;
  }

  cart.forEach((item, idx) => {
    const product = productsData.products.find(p => p.id === item.productId);
    if (!product) return;

    const thumb =
      product.images?.colors?.[item.selected?.color] ||
      product.images?.main ||
      "";

    $area.append(`
      <div class="card mb-3">
        <div class="card-body d-flex gap-3">
          <img src="${thumb}" style="width:120px;height:120px;object-fit:cover;">
          <div class="flex-grow-1">
            <h5>${item.name}</h5>
            <div class="text-muted">${formatSpecs(item.selected)}</div>

            <div class="mt-2">
              單價 NT$${item.unitPrice}　
              小計 NT$${item.unitPrice * item.qty}
            </div>

            <div class="d-flex gap-2 mt-3 align-items-center">
              <button class="btn btn-outline-secondary btn-sm minus" data-i="${idx}">-</button>
              <input class="form-control qty" type="number" min="1"
                     data-i="${idx}" value="${item.qty}" style="width:80px">
              <button class="btn btn-outline-secondary btn-sm plus" data-i="${idx}">+</button>
              <button class="btn btn-danger btn-sm remove" data-i="${idx}">刪除</button>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  $area.append(`
    <div class="text-end">
      <h4>總計：NT$ ${calcTotal(cart)}</h4>
    </div>
  `);
}

/* =====================
   初始化與事件
===================== */
let latestOrderText = "";

$(async function () {
  const productsData = await loadProducts();
  renderCart(productsData);

  $("#cartArea")
    .on("click", ".minus", e => {
      const i = $(e.currentTarget).data("i");
      const cart = getCart();
      cart[i].qty = Math.max(1, cart[i].qty - 1);
      saveCart(cart);
      renderCart(productsData);
    })
    .on("click", ".plus", e => {
      const i = $(e.currentTarget).data("i");
      const cart = getCart();
      cart[i].qty++;
      saveCart(cart);
      renderCart(productsData);
    })
    .on("click", ".remove", e => {
      const i = $(e.currentTarget).data("i");
      const cart = getCart();
      cart.splice(i, 1);
      saveCart(cart);
      renderCart(productsData);
    })
    .on("input", ".qty", e => {
      const i = $(e.currentTarget).data("i");
      const cart = getCart();
      cart[i].qty = Math.max(1, parseInt(e.target.value) || 1);
      saveCart(cart);
      renderCart(productsData);
    });

  // 產生訂單內容
  $("#buildOrder").on("click", () => {
    const cart = getCart();
    if (!cart.length) return alert("購物車是空的");

    latestOrderText = buildOrderText(cart);
    $("#orderText").text(latestOrderText);
    $("#orderPreview").removeClass("d-none");
    $("#sendOrder").prop("disabled", false);
  });

  // 複製訂單
  $("#copyOrder").on("click", async () => {
    await navigator.clipboard.writeText(latestOrderText);
    alert("訂單內容已複製，可以直接貼到信件中");
  });

  // 送出訂單（只開信箱）
  $("#sendOrder").on("click", () => {
    const subject = "新訂單";
    const body = "您好，我已完成訂單，內容如下（請貼上訂單內容）：\n\n";
    location.href =
      `mailto:${SELLER_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
  });
});
