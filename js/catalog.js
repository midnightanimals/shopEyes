 $(async () => {
      const res = await fetch("data/products.json");
      const data = await res.json();

      const products = data.products;

      const $grid = $("#catalogGrid");
      products.forEach(p => {
        const html = `
          <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <a href="product.html?id=${p.id}">
              <div class="product-card">
                <img src="${p.images.main}" class="card-img-top" alt="${p.name}">
                <div class="card-body">
                  <div class="card-title">${p.name}</div>
                  <p class="card-text">${p.description.substring(0, 100)}...</p>
                  <div class="card-price">$${p.basePrice}</div>
                  <button class="btn btn_main">查看詳情</button>
                </div>
              </div>
            </a>
          </div>
        `;
        $grid.append(html);
      });
    });