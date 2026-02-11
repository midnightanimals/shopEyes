$(async () => {
  let allProducts = []; // 用來儲存原始完整資料

  // 1. 取得資料
  try {
    const res = await fetch("data/products.json");
    const data = await res.json();
    allProducts = data.products;

    // 2. 初始化畫面
    initTabs(allProducts);      // 產生分類按鈕
    renderProducts(allProducts); // 預設渲染全部商品

  } catch (error) {
    console.error("載入產品資料失敗:", error);
    $("#catalogGrid").html('<div class="col-12 text-center">載入失敗，請稍後再試。</div>');
  }

  // === 核心功能函式 ===

  /**
   * 自動產生分類 Tab
   */
  function initTabs(products) {
    const $tabContainer = $("#categoryTabs");
    
    // 找出所有不重複的 category
    // .filter(Boolean) 是為了過濾掉沒有填寫 category 的商品，避免出現 null 或 undefined
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    // 先加入「全部」按鈕 (預設 active)
    let tabsHtml = `
      <li class="nav-item">
        <button class="nav-link active" data-category="all">全部</button>
      </li>
    `;

    // 產生其他分類按鈕
    // 這裡我們簡單做個字典翻譯，讓顯示的文字比較好看 (可選)
    const categoryNameMap = {
      "eyes": "眼珠",
      "ears": "獸耳",
      "accessory": "配件"
      // 如果遇到沒定義的 key，程式會直接顯示英文原文
    };

    categories.forEach(cat => {
      const displayName = categoryNameMap[cat] || cat; // 有翻譯就用翻譯，沒有就用原文
      tabsHtml += `
        <li class="nav-item">
          <button class="nav-link" data-category="${cat}">${displayName}</button>
        </li>
      `;
    });

    $tabContainer.html(tabsHtml);

    // 綁定 Tab 點擊事件
    $tabContainer.on("click", ".nav-link", function() {
      // 1. 處理按鈕樣式切換
      $(".nav-link").removeClass("active");
      $(this).addClass("active");

      // 2. 篩選資料
      const targetCat = $(this).data("category");
      let filteredProducts = [];

      if (targetCat === "all") {
        filteredProducts = allProducts;
      } else {
        filteredProducts = allProducts.filter(p => p.category === targetCat);
      }

      // 3. 重新渲染
      renderProducts(filteredProducts);
    });
  }

  /**
   * 渲染商品卡片 (包含重置動畫)
   */
  function renderProducts(products) {
    const $grid = $("#catalogGrid");
    $grid.empty(); // 清空目前的內容

    if (products.length === 0) {
      $grid.html('<div class="col-12 text-center text-muted py-5">此分類暫無商品</div>');
      return;
    }

    products.forEach(p => {
      // 為了配合動畫，product-card 預設在 CSS 應該要是 opacity: 0; transform: translateY(20px);
      // JS 加入 .show 後才會浮現
      const html = `
        <div class="col-12 col-sm-6 col-md-4 col-lg-3">
          <a href="product.html?id=${p.id}" class="text-decoration-none">
            <div class="product-card">
              <img src="${p.images.main}" class="card-img-top" alt="${p.name}">
              <div class="card-body">
                <div class="card-title">${p.name}</div>
                <p class="card-text">${p.description ? p.description.substring(0, 100) : ''}...</p>
                <div class="card-price">$${p.basePrice}</div>
                <button class="btn btn_main">查看詳情</button>
              </div>
            </div>
          </a>
        </div>
      `;
      $grid.append(html);
    });

    // 重新啟動動畫觀察器 (因為 DOM 元素是新產生的)
    initScrollAnimation();
  }

  /**
   * 絲滑漸入動畫核心邏輯
   */
  function initScrollAnimation() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => observer.observe(card));
  }
});