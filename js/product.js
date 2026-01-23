const CART_KEY = "cart_items";

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function loadProducts() {
  return fetch("data/products.json")
    .then(res => res.json())
    .then(data => data);
}

// 修正：增加判斷 value 是否存在，避免 crash
function isOptionAvailable(item, selected) {
  if (!item.availableWhen) return true;
  return Object.entries(item.availableWhen).every(([key, values]) => {
    // 如果依賴的選項還沒選 (null)，通常視為不符合，或視需求決定邏輯
    const currentVal = selected[key];
    if (!currentVal) return false; 
    return values.includes(currentVal);
  });
}

function calcPrice(basePrice, selectedOptions, templates) {
  let price = basePrice;

  templates.forEach(t => {
    // 處理單選邏輯 (Size, Material etc.)
    t.items.forEach(item => {
      if (selectedOptions[t.key] === item.value) {
        if (item.price) price += item.price;
      }
    });

    // 處理 Addon (多選) 邏輯
    // 修正：不寫死 key="addon"，而是檢查 selectedOptions[t.key] 是否為陣列
    const selectedVal = selectedOptions[t.key];
    if (Array.isArray(selectedVal)) {
        selectedVal.forEach(val => {
            const foundItem = t.items.find(it => it.value === val);
            if (foundItem && foundItem.price) price += foundItem.price;
        });
    }
  });

  return price;
}

function renderProduct(product, templates) {
  const $area = $("#productArea");

  // 1. 動態初始化 selected 物件
  let selected = {};
  
  // 處理顏色 (如果有)
  const colorKeys = Object.keys(product.images.colors || {});
  if (colorKeys.length > 0) {
      //selected.color = colorKeys[0]; // 預設選第一個顏色
  }

  // 處理 Templates 的預設值
  templates.forEach(t => {
      // 假設 key 是 "addon" 或其他多選類型，初始化為陣列
      if (t.key === "addon") { 
          selected[t.key] = []; 
      } else {
          selected[t.key] = null; // 單選預設為 null
      }
  });

  const getTemplateByKey = (key) => templates.find(t => t.key === key);

  function updateUI() {
    const $price = $("#priceValue");
    const base = product.basePrice || 0;
    const price = calcPrice(base, selected, templates);
    $price.text(price);

    // 更新選項按鈕狀態 (Disabled & Active)
    templates.forEach(t => {
      t.items.forEach(item => {
        // 選取對應按鈕
        const $el = $(`.optionBtn[data-key="${t.key}"][data-value="${item.value}"]`);
        if (!$el.length) return;

        // 檢查可用性
        const available = isOptionAvailable(item, selected);
        $el.toggleClass("disabled", !available);
        $el.prop("disabled", !available);

        // [修正 UI] 檢查是否被選中 (Active 狀態)
        const currentVal = selected[t.key];
        let isActive = false;
        if (Array.isArray(currentVal)) {
            isActive = currentVal.includes(item.value);
        } else {
            isActive = currentVal === item.value;
        }
        
        if (isActive) $el.addClass("active");
        else $el.removeClass("active");
      });
    });

    // 處理顏色按鈕 Active 狀態
    if (selected.color) {
        $(`.optionBtn[data-key="color"]`).removeClass("active");
        $(`.optionBtn[data-key="color"][data-value="${selected.color}"]`).addClass("active");
        
        // 切換主圖
        const imgSrc = product.images.colors[selected.color];
        if (imgSrc) $("#mainImg").attr("src", imgSrc);
    }
  }

  // 建構基本 HTML
  const html = `
    <div class="col-md-6">
      <img id="mainImg" class="img-fluid rounded" src="${product.images.main}" alt="主圖">
      <div class="mt-3 d-flex gap-2">
        ${(product.images.gallery || []).map(g => `<img class="img-thumbnail" style="width:80px;cursor:pointer" src="${g}" />`).join("")}
      </div>
    </div>

    <div class="col-md-6">
      <h2>${product.name}</h2>
      <p>${product.description || ""}</p>

      <div class="mb-3">
        <strong>價格：</strong>NT$ <span id="priceValue">${product.basePrice}</span>
      </div>

      <div id="optionsArea"></div>

      <div class="d-flex align-items-center gap-2 my-3">
        <button id="minusQty" class="btn btn-outline-secondary">-</button>
        <input id="qty" type="number" class="form-control" value="1" style="width:80px;">
        <button id="plusQty" class="btn btn-outline-secondary">+</button>
      </div>

      <button id="addToCart" class="btn btn-primary">加入購物車</button>
    </div>
  `;

  $area.html(html);

  // Gallery 點擊
  $("#productArea img.img-thumbnail").on("click", function () {
    $("#mainImg").attr("src", $(this).attr("src"));
  });

  // Render Templates Options
  const $optArea = $("#optionsArea");
  
  // 先把顏色 Render 進去 (如果在上方定義了 colorArea 變數)
  if (colorKeys.length) {
    const colorArea = `
      <div class="mb-3">
        <strong>顏色</strong>
        <div>
          ${colorKeys.map(c => `
            <button class="btn btn-outline-secondary m-1 optionBtn"
                    data-key="color" data-value="${c}">
              ${c}
            </button>
          `).join("")}
        </div>
      </div>`;
    $optArea.append(colorArea); // 用 append 順序比較直觀，或者依照設計稿 prepend
  }

  templates.forEach(t => {
    const itemsHtml = t.items.map(item => {
      const img = item.image ? `<img src="${item.image}" style="width:30px; height:30px; object-fit:cover; margin-right:8px;">` : "";
      return `
        <button class="btn btn-outline-primary m-1 optionBtn"
                data-key="${t.key}" data-value="${item.value}">
          ${img}${item.label}
        </button>
      `;
    }).join("");

    const requiredMark = t.required ? "（必填）" : "（選填）";

    $optArea.append(`
      <div class="mb-3">
        <div><strong>${t.label}</strong> ${requiredMark}</div>
        <div>${itemsHtml}</div>
      </div>
    `);
  });

  // [修正 1] 選項按鈕點擊 (使用 Event Delegation 解決動態元素綁定問題)
  $optArea.on("click", ".optionBtn", function () {
    const key = $(this).data("key");
    const value = $(this).data("value");

    // 處理多選 (Array) vs 單選
    if (Array.isArray(selected[key])) {
      const idx = selected[key].indexOf(value);
      if (idx === -1) selected[key].push(value);
      else selected[key].splice(idx, 1);
    } else {
      // 處理單選 (包含 Color 和其他)
      // 如果點擊已選中的按鈕，是否允許取消？(通常必填的不允許，選填的允許，這裡先簡化為直接覆蓋)
      selected[key] = value;
    }

    // 呼叫 updateUI 來統一處理 Active Class 和 價格計算
    updateUI();
  });

  // 數量控制
  $("#minusQty").on("click", () => {
    const v = parseInt($("#qty").val()) || 1;
    $("#qty").val(Math.max(1, v - 1));
  });
  $("#plusQty").on("click", () => {
    const v = parseInt($("#qty").val()) || 1;
    $("#qty").val(v + 1);
  });

  // 加入購物車
  $("#addToCart").on("click", () => {
    const qty = parseInt($("#qty").val()) || 1;

    // [修正 3] 檢查必填邏輯更嚴謹
    for (let t of templates) {
      if (t.required) {
          const val = selected[t.key];
          // 如果是陣列 (addon)，檢查長度是否為 0
          if (Array.isArray(val)) {
              if (val.length === 0) {
                  alert(`請選擇 ${t.label}`);
                  return;
              }
          } 
          // 如果是單選 (null/undefined/empty string)
          else if (!val) {
              alert(`請選擇 ${t.label}`);
              return;
          }
      }
    }

    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart.push({
      productId: product.id,
      name: product.name,
      selected: JSON.parse(JSON.stringify(selected)), // Deep copy 避免參考問題
      unitPrice: calcPrice(product.basePrice, selected, templates),
      qty
    });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    alert("已加入購物車！");
  });

  // 初始 UI 更新 (讓預設值有樣式)
  updateUI();
}

$(async () => {
  const productId = getQueryParam("id");
  if(!productId) return; // 簡單防呆

  const data = await loadProducts();
  const product = data.products.find(p => p.id === productId);
  
  if (!product) {
    $("#productArea").html("<div class='text-danger'>找不到商品</div>");
    return;
  }

  const templates = product.optionTemplateRefs.map(ref => data.optionTemplates[ref]);
  renderProduct(product, templates);
});