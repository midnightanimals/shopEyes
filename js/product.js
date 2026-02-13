const CART_KEY = "cart_items";

// === 工具函式 ===
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function loadProducts() {
  // return fetch("data/products.json")
  return fetch(`${GAS_ENDPOINT}?action=getProducts`)
    .then(res => res.json())
    .catch(err => {
      console.error("無法讀取產品資料", err);
      throw err;
    });
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

// 核心檢查函式
function isOptionAvailable(item, selected) {
  if (item.status === 'coming_soon') return false;
  if (!item || !item.availableWhen) return true;

  // 使用逻辑 Key (例如 size) 进行比对
  return Object.entries(item.availableWhen).every(([logicKey, allowedValues]) => {
    const currentVal = selected[logicKey];

    // 瀑布流邏輯：如果依賴的欄位（如 size）還沒選，則下層選項（如 type）視為不可用
    if (currentVal === null || currentVal === undefined ||
      (Array.isArray(currentVal) && currentVal.length === 0)) {
      return false;
    }

    // 比對值 (轉字串避免型別錯誤)
    return allowedValues.map(String).includes(String(currentVal));
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

  // 1. 初始化選擇狀態 (使用 logical_key)
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
    let isPreviousStepCompleted = true; // 第一步預設開啟
    let conflictMessages = [];

    templates.forEach((t, index) => {
      // 確保選取到正確的 DOM 元素
      const $section = $(`#section-${index}`);

      // === 功能 A：步驟鎖定 (Step Locking) ===
      if (!isPreviousStepCompleted) {
        $section.addClass('step-disabled').css('opacity', '0.3');
        // 鎖定所有輸入框與按鈕
        $section.find('button, input').prop('disabled', true);
      } else {
        $section.removeClass('step-disabled').css('opacity', '1');
        // 解鎖 (稍後會根據 isOptionAvailable 再次個別鎖定無效選項)
        $section.find('button, input').prop('disabled', false);
      }

      // === 功能 B：檢查選項可用性與更新狀態 ===
      let hasValidSelection = false;

      t.items.forEach(item => {
        const available = isOptionAvailable(item, selected);
        const $el = (t.type === 'multi')
          ? $section.find(`input[value="${item.value}"]`)
          : $section.find(`.optionBtn[data-value="${item.value}"]`);

        if (!available) {
          // 如果不可用：禁用按鈕
          $el.prop("disabled", true).addClass("disabled-item opacity-30");

          // 只有當「目前已選的值」變成了「不可用」時，才清除選擇
          if (t.type === 'single' && String(selected[t.key]) === String(item.value)) {
            selected[t.key] = null;
            conflictMessages.push(`「${item.label}」與規格衝突，已取消選取`);
          }
          if (t.type === 'multi' && selected[t.key].includes(String(item.value))) {
            selected[t.key] = selected[t.key].filter(v => v !== String(item.value));
            conflictMessages.push(`加購項「${item.label}」不適用，已移除`);
          }
        } else {
          // 如果可用：且該步驟未被鎖定，確保啟用
          if (isPreviousStepCompleted) {
            $el.prop("disabled", false).removeClass("disabled-item opacity-30");
          }
        }

        // 更新 Active 視覺狀態
        if (t.type === 'multi') {
          const isChecked = selected[t.key].includes(String(item.value));
          $el.prop("checked", isChecked);
          if (isChecked) hasValidSelection = true;
        } else {
          const isActive = String(selected[t.key]) === String(item.value);
          $el.toggleClass("active ", isActive)
          //  .toggleClass("btn_sub", !isActive);
          if (isActive) hasValidSelection = true;
        }
      });

      // 3. 判斷必填項是否完成，決定下一步是否解鎖
      // 如果必填但沒有有效選擇，下一個步驟將被鎖定
      if (t.required && !hasValidSelection) {
        isPreviousStepCompleted = false;
      }
    });

    // 顏色按鈕處理 (獨立於瀑布流)
    $(`.optionBtn[data-key="color"]`).each(function () {
      const isAct = selected.color === $(this).data("value");
      $(this).toggleClass("active ", isAct).toggleClass("btn_sub", !isAct);
    });

    if (conflictMessages.length > 0) showToast(conflictMessages[0]);
    $("#priceValue").text(calcPrice(product.basePrice || 0, selected, templates));
    updateGallery(triggerSource);
  }

  // === 生成 HTML 結構 ===
  // 1. 先建立主結構並寫入 DOM (這樣後續的 selector 才能抓到東西)
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
      <div class="h4 mb-4 text_color fw-bold">NT$ <span id="priceValue">${product.basePrice}</span></div>
      
      <div id="optionsArea"></div>

      <hr class="my-4">
      <div class="d-flex align-items-center gap-3 mb-4">
        <label class="fw-bold">數量</label>
        <div class="input-group" style="width: 140px;">
            <button id="minusQty" class="btn btn_sub">-</button>
            <input id="qty" type="number" class="form-control text-center" value="1" min="1">
            <button id="plusQty" class="btn btn_sub">+</button>
        </div>
      </div>
      <button id="addToCart" class="btn btn_main btn-lg w-100 py-3 fw-bold">加入購物車</button>
    </div>
  `;
  $area.html(html);

  // 2. 抓取剛剛放入 DOM 的 optionsArea，準備填充選項
  const $optArea = $("#optionsArea");

  // 渲染顏色 (如有)
  if (colorKeys.length) {
    $optArea.append(`
      <div class="option-section mb-4" id="section-color">
        <div class="mb-2 fw-bold">選擇顏色 <span class="text-danger">*</span></div>
        <div class="d-flex flex-wrap gap-2">
          ${colorKeys.map(c => `<button class="btn btn_sub optionBtn" data-key="color" data-value="${c}">${c}</button>`).join("")}
        </div>
      </div>
    `);
  }

  // 渲染瀑布流選項
  templates.forEach((t, index) => {
    const req = t.required ? "<span class='text-danger'>*</span>" : "";
    let inputHtml = "";

    if (t.type === 'multi') {
      inputHtml = t.items.map(item => `
        <div class="form-check mb-2">
          <input class="form-check-input addonCheckbox" type="checkbox" value="${item.value}" data-key="${t.key}">
          <label class="form-check-label">${item.label}</label>
        </div>`).join("");
    } else {
      inputHtml = `<div class="d-flex flex-wrap gap-2">
        ${t.items.map(item => `<button class="btn btn_sub optionBtn" data-key="${t.key}" data-value="${item.value}">${item.label}</button>`).join("")}
      </div>`;
    }

    // 注意：ID 使用 section-${index} 確保與 updateUI 對應
    $optArea.append(`
      <div class="option-section mb-4" id="section-${index}" data-step="${index}">
        <div class="fw-bold mb-2">${t.label} ${req}</div>
        <div>${inputHtml}</div>
      </div>
    `);
  });

  // === 事件綁定 (使用 delegate) ===

  // 選項按鈕點擊
  $optArea.on("click", ".optionBtn", function () {
    const $sec = $(this).closest('.option-section');
    // 如果該步驟被鎖定 (opacity 0.5)，則禁止點擊
    if ($sec.hasClass('step-disabled')) return;

    const key = $(this).data("key");
    const val = String($(this).data("value"));

    if (key === 'color') {
      selected.color = (selected.color === val) ? null : val;
    } else {
      selected[key] = (selected[key] === val) ? null : val;
    }
    updateUI(val);
  });

  // 多選複選框變更
  $optArea.on("change", ".addonCheckbox", function () {
    const $sec = $(this).closest('.option-section');
    if ($sec.hasClass('step-disabled')) return;

    const key = $(this).data("key");
    const val = String($(this).val());

    if (!Array.isArray(selected[key])) selected[key] = [];
    if ($(this).is(":checked")) {
      selected[key].push(val);
    } else {
      selected[key] = selected[key].filter(v => v !== val);
    }
    updateUI(val);
  });

  // 數量控制
  $("#minusQty").on("click", () => { const $q = $("#qty"); $q.val(Math.max(1, (parseInt($q.val()) || 1) - 1)); });
  $("#plusQty").on("click", () => { const $q = $("#qty"); $q.val((parseInt($q.val()) || 1) + 1); });

  // 加入購物車
  $("#addToCart").on("click", () => {
    // 檢查顏色
    if (colorKeys.length > 0 && !selected.color) {
      showToast("請選擇顏色");
      $("#section-color")[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // 檢查規格必填
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      if (t.required) {
        const v = selected[t.key];
        if (!v || (Array.isArray(v) && v.length === 0)) {
          showToast(`請選擇 ${t.label}`);
          // 捲動到對應的 index section
          $(`#section-${i}`)[0].scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }

    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart.push({
      productId: product.id,
      name: product.name,
      selected: JSON.parse(JSON.stringify(selected)), // Deep copy
      unitPrice: calcPrice(product.basePrice, selected, templates),
      qty: parseInt($("#qty").val()) || 1
    });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    fairyModal({
    type: "info",
    message: "商品已在推車裡囉，接下來想去哪裡呢？",
    buttons: [
        { text: "逛其他的", class: "btn_main", onClick: () => location.href = 'catalog.html' },
        { text: "看購物車", class: "btn_main", onClick: () => location.href = 'cart.html' },
        { text: "繼續留在這裡", class: "btn_sub", fullWidth: true } // fullWidth 會佔滿整行
    ]
});
  });

  // 4. 最後呼叫一次 updateUI 初始化狀態 (禁用未開啟的步驟)
  updateUI();
}

// 頁面初始化
$(async () => {
  // 1. 取得網址 ID 並處理 (去空白、轉大寫確保匹配 P001)
  const rawId = getQueryParam("id");
  const productId = rawId ? String(rawId).trim().toUpperCase() : null;

  toggleLoading(true, "saving");

  try {
    const data = await loadProducts();
    console.log("從 GAS 抓取的原始資料:", data);

    // 檢查資料結構是否完整
    if (!data || !data.products || !Array.isArray(data.products)) {
      console.error("GAS 回傳結構錯誤:", data);
      $("#productArea").html("<div class='text-center pt-5'><h3>資料錯誤</h3></div><p class='text-center'>請聯繫管理員<br/>。・゜・(ノД`)・゜・。</p>");
      return;
    }

    if (!productId) {
      console.error("網址缺少 id 參數");
      $("#productArea").html("<div class='text-center pt-5'><h3>請先選擇商品</h3></div><a class='btn btn_main' href='catalog.html'>回目錄</a>");
      return;
    }

    // 2. 尋找商品 (強制兩邊都轉大寫字串比對)
    const product = data.products.find(p => String(p.id).toUpperCase() === productId);

    if (!product) {
      console.error(`在產品清單中找不到 ID: ${productId}`);
      $("#productArea").html(`<div class='text-center pt-5'><h3>找不到商品 (${productId})</h3></div><p class='text-center'>請重新選擇商品</p><a class='btn btn_main' href='catalog.html'>回目錄</a>`);
      return;
    }

    // 3. 檢查 Template 參照
    console.log("當前商品的參照清單 (Refs):", product.optionTemplateRefs);
    console.log("資料庫中所有的規格 Key (Templates):", Object.keys(data.optionTemplates));

    const templateObjects = product.optionTemplateRefs
      .map(ref => {
        const t = data.optionTemplates[ref];
        if (!t) {
          console.error(`❌ 找不到規格定義: 試算表要求 [${ref}]，但 Templates 表中只有:`, Object.keys(data.optionTemplates));
        }
        return t;
      })
      .filter(Boolean);

    console.log("最終準備渲染的規格物件:", templateObjects);

    if (templateObjects.length === 0) {
      console.warn("警告：此商品沒有任何有效的規格選項可供渲染。");
    }

    // 4. 執行渲染
    renderProduct(product, templateObjects);

  } catch (error) {
    console.error("載入流程發生嚴重錯誤:", error);
    $("#productArea").html("<div class='text-center py-5'><h3>連線發生錯誤，請重新整理</h3></div>");
  } finally {
    setTimeout(() => toggleLoading(false), 300);
  }
});