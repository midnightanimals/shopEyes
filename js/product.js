const CART_KEY = "cart_items";

// === 工具函式 ===
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function loadProducts() {
  // return fetch("data/products.json")
  return fetch("https://script.google.com/macros/s/AKfycbxOpqHf4AB8UdCKM2ik2mQRLfx-3KhNEjL5iEwWcgxSTM2bEBRvgduY5yCRVIlRFHfB/exec?action=getProducts")
    .then(res => res.json())
    .catch(err => console.error("無法讀取產品資料", err));
}

function showToast(message) {
  $(".selection-toast").remove(); // 避免多個吐司堆疊
  const $toast = $(`<div class="selection-toast">${message}</div>`);
  $("body").append($toast);
  setTimeout(() => $toast.addClass("show"), 100);
  setTimeout(() => {
    $toast.removeClass("show");
    setTimeout(() => $toast.remove(), 500);
  }, 2500);
}

// 核心檢查函式：判斷該項目在當前已選狀態下是否可用
function isOptionAvailable(item, selected) {
  if (item.status === 'coming_soon') return false;
  if (!item || !item.availableWhen) return true;
  
  return Object.entries(item.availableWhen).every(([key, values]) => {
    const currentVal = selected[key];
    // 瀑布流邏輯：如果依賴的上層項還沒選，下層視為不可用
    if (!currentVal || (Array.isArray(currentVal) && currentVal.length === 0)) {
      return false;
    }
    return values.includes(String(currentVal));
  });
}

function calcPrice(basePrice, selectedOptions, templates) {
  let price = basePrice;
  templates.forEach(t => {
    const val = selectedOptions[t.key];
    if (val && !Array.isArray(val)) {
      const item = t.items.find(i => i.value === String(val));
      if (item?.price) price += item.price;
    }
    if (Array.isArray(val)) {
      val.forEach(v => {
        const item = t.items.find(i => i.value === String(v));
        if (item?.price) price += item.price;
      });
    }
  });
  return price;
}

// === 主渲染函式 ===
function renderProduct(product, templates) {
  const $area = $("#productArea");
  let selected = {};
  const colorKeys = Object.keys(product.images.colors || {});

  // 初始化選擇狀態
  templates.forEach(t => {
    selected[t.key] = (t.type === "multi") ? [] : null;
  });
  selected.color = null;

  // 更新圖片輪播與側邊縮圖
  function updateGallery(triggerSource = null) {
    let activeImages = [product.images.main];
    if (product.images.gallery) activeImages.push(...product.images.gallery);
    if (selected.color && product.images.colors?.[selected.color]) {
      activeImages.push(product.images.colors[selected.color]);
    }

    let newlyAddedImg = null;
    templates.forEach(t => {
      const val = selected[t.key];
      if (!val) return;
      const getImg = (v) => t.items.find(i => i.value === String(v))?.image;

      if (Array.isArray(val)) {
        val.forEach(v => { 
          const img = getImg(v); 
          if (img) { activeImages.push(img); if (triggerSource === v) newlyAddedImg = img; } 
        });
      } else {
        const img = getImg(val); 
        if (img) { activeImages.push(img); if (triggerSource === String(val)) newlyAddedImg = img; }
      }
    });

    const $container = $("#galleryThumbnails");
    $container.empty();
    activeImages.forEach(src => {
      const $thumb = $(`<img src="${src}" class="gallery-thumb ${$("#mainImg").attr("src") === src ? 'active' : ''}">`);
      $thumb.on("click", function () {
        $("#mainImg").attr("src", src);
        $container.find("img").removeClass("active");
        $(this).addClass("active")[0].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      $container.append($thumb);
    });

    // 若是因為點選選項而產生的新圖，自動切換主圖並捲動縮圖
    if (newlyAddedImg) {
      $("#mainImg").attr("src", newlyAddedImg);
      setTimeout(() => {
        const $target = $container.find(`img[src="${newlyAddedImg}"]`);
        $container.find("img").removeClass("active");
        if ($target.length) $target.addClass("active")[0].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 50);
    } else if (triggerSource === 'color' && selected.color) {
      const cImg = product.images.colors[selected.color];
      if (cImg) $("#mainImg").attr("src", cImg);
    }
  }

  // 瀑布流 UI 更新邏輯
  function updateUI(triggerSource = null) {
    let isPreviousStepCompleted = true; 
    let conflictMessages = [];

    templates.forEach((t, index) => {
      const $section = $(`#section-${t.key}`);
      const currentVal = selected[t.key];

      // 1. 處理步驟鎖定 (Step Locking)
      if (!isPreviousStepCompleted) {
        $section.addClass('step-disabled');
        selected[t.key] = (t.type === 'multi') ? [] : null;
      } else {
        $section.removeClass('step-disabled');
      }

      // 2. 檢查區塊內每個選項的可用性
      let hasValidSelection = false;
      t.items.forEach(item => {
        const available = isOptionAvailable(item, selected);
        const $el = (t.type === 'multi') 
          ? $section.find(`input[value="${item.value}"]`)
          : $section.find(`.optionBtn[data-value="${item.value}"]`);

        if (!available) {
          $el.prop("disabled", true).addClass("disabled-item disabled");
          if (t.type === 'multi') {
            if (selected[t.key].includes(item.value)) {
              selected[t.key] = selected[t.key].filter(v => v !== item.value);
              conflictMessages.push(`加購項「${item.label}」已不適用`);
            }
            $el.prop("checked", false).closest('.form-check').addClass('opacity-50');
          } else {
            if (selected[t.key] === item.value) {
              selected[t.key] = null;
              conflictMessages.push(`「${item.label}」與現有規格衝突，請重新選擇`);
            }
            $el.removeClass("active btn-primary").addClass("btn-outline-primary");
          }
        } else {
          $el.prop("disabled", false).removeClass("disabled-item disabled");
          if (t.type === 'multi') {
            $el.closest('.form-check').removeClass('opacity-50');
            $el.prop("checked", selected[t.key].includes(item.value));
            if (selected[t.key].length > 0) hasValidSelection = true;
          } else {
            const isActive = selected[t.key] === item.value;
            $el.toggleClass("active btn-primary", isActive).toggleClass("btn-outline-primary", !isActive);
            if (isActive) hasValidSelection = true;
          }
        }
      });

      // 3. 判斷是否開啟下一步
      if (t.required && !hasValidSelection) {
        isPreviousStepCompleted = false;
      }
    });

    // 處理顏色按鈕樣式 (顏色通常獨立於瀑布流)
    $(`.optionBtn[data-key="color"]`).each(function() {
      const isAct = selected.color === $(this).data("value");
      $(this).toggleClass("active btn-primary", isAct).toggleClass("btn-outline-secondary", !isAct);
    });

    // 顯示衝突警告
    if (conflictMessages.length > 0) {
      showToast(conflictMessages[0]);
    }

    $("#priceValue").text(calcPrice(product.basePrice || 0, selected, templates));
    updateGallery(triggerSource);
  }

  // 生成 HTML 結構
  const html = `
    <div class="col-md-6">
      <div class="sticky-top" style="top: 20px; z-index: 1;">
          <img id="mainImg" class="img-fluid rounded mb-3 w-100" style="object-fit: contain; max-height: 500px; background: #f8f9fa; border: 1px solid #eee;" src="${product.images.main}">
          <div id="galleryThumbnails" class="gallery-scroll-container d-flex overflow-auto pb-2"></div>
      </div>
    </div>
    <div class="col-md-6">
      <h2 class="mt-4 mt-md-0 fw-bold">${product.name}</h2>
      <p class="text-muted">${product.description || ""}</p>
      <div class="h4 mb-4 text-primary fw-bold">NT$ <span id="priceValue">${product.basePrice}</span></div>
      <div id="optionsArea"></div>
      <hr class="my-4">
      <div class="d-flex align-items-center gap-3 mb-4">
        <label class="fw-bold">數量</label>
        <div class="input-group" style="width: 140px;">
            <button id="minusQty" class="btn btn-outline-secondary">-</button>
            <input id="qty" type="number" class="form-control text-center" value="1" min="1">
            <button id="plusQty" class="btn btn-outline-secondary">+</button>
        </div>
      </div>
      <button id="addToCart" class="btn btn-primary btn-lg w-100 py-3 fw-bold">加入購物車</button>
    </div>
  `;
  $area.html(html);

  const $optArea = $("#optionsArea");
  
  // 渲染顏色 (如有)
  if (colorKeys.length) {
    $optArea.append(`
      <div class="option-section mb-4" id="section-color">
        <div class="mb-2 fw-bold">選擇顏色 <span class="text-danger">*</span></div>
        <div class="d-flex flex-wrap gap-2">
          ${colorKeys.map(c => `<button class="btn btn-outline-secondary optionBtn" data-key="color" data-value="${c}">${c}</button>`).join("")}
        </div>
      </div>
    `);
  }

  // 渲染瀑布流選項
  templates.forEach((t, index) => {
    const req = t.required ? "<span class='text-danger'>*</span>" : "";
    let input = (t.type === 'multi')
      ? t.items.map(item => `
          <div class="form-check mb-2">
            <input class="form-check-input addonCheckbox" type="checkbox" value="${item.value}" data-key="${t.key}" id="o_${t.key}_${item.value}">
            <label class="form-check-label" for="o_${t.key}_${item.value}">${item.label} ${item.price ? `(+NT$${item.price})` : ''}</label>
          </div>`).join("")
      : `<div class="d-flex flex-wrap gap-2">${t.items.map(item => `<button class="btn btn-outline-primary optionBtn" data-key="${t.key}" data-value="${item.value}">${item.label}</button>`).join("")}</div>`;
    
    $optArea.append(`
      <div class="option-section mb-4" id="section-${t.key}" data-step="${index}">
        <div class="fw-bold mb-2">${t.label} ${req}</div>
        <div>${input}</div>
      </div>
    `);
  });

  // === 事件綁定 ===
  
  // 選項按鈕點擊 (包含顏色與單選規格)
  $optArea.on("click", ".optionBtn", function () {
    const $btn = $(this);
    if ($btn.hasClass('disabled') || $btn.closest('.option-section').hasClass('step-disabled')) return;
    
    const key = $btn.data("key");
    const val = String($btn.data("value")); // 強制轉字串避免比對錯誤
    
    if (key === 'color') {
      selected.color = (selected.color === val) ? null : val;
      updateUI('color');
    } else {
      selected[key] = (selected[key] === val) ? null : val;
      updateUI(val);
    }
  });

  // 多選複選框變更
  $optArea.on("change", ".addonCheckbox", function () {
    const $cb = $(this);
    const key = $cb.data("key");
    const val = String($cb.val());

    if (!Array.isArray(selected[key])) selected[key] = [];
    if ($cb.is(":checked")) {
      selected[key].push(val);
      updateUI(val);
    } else {
      selected[key] = selected[key].filter(v => v !== val);
      updateUI(null);
    }
  });

  // 數量控制
  $("#minusQty").on("click", () => { const $q = $("#qty"); $q.val(Math.max(1, (parseInt($q.val()) || 1) - 1)); });
  $("#plusQty").on("click", () => { const $q = $("#qty"); $q.val((parseInt($q.val()) || 1) + 1); });

  // 加入購物車
  $("#addToCart").on("click", () => {
    if (colorKeys.length > 0 && !selected.color) {
      showToast("請選擇顏色");
      $("#section-color")[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    for (let t of templates) {
      if (t.required) {
        const v = selected[t.key];
        if (!v || (Array.isArray(v) && v.length === 0)) {
          showToast(`請選擇 ${t.label}`);
          $(`#section-${t.key}`)[0].scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }

    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart.push({
      productId: product.id, 
      name: product.name,
      selected: JSON.parse(JSON.stringify(selected)),
      unitPrice: calcPrice(product.basePrice, selected, templates),
      qty: parseInt($("#qty").val()) || 1
    });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    alert("已加入購物車！");
  });

  updateUI();
}

// 頁面初始化
$(async () => {
  const productId = getQueryParam("id");
  const data = await loadProducts();
  if (!productId || !data) return;
  const product = data.products.find(p => p.id === productId);
  if (!product) return $("#productArea").html("<div class='container text-center py-5'><h3>找不到商品</h3></div>");
  
  // 依照產品定義的 Template 順序載入
  const templateObjects = product.optionTemplateRefs.map(ref => data.optionTemplates[ref]);
  renderProduct(product, templateObjects);
});