loadProducts().then(products => {
  const $list = document.getElementById('list');

  products.forEach(p => {
    $list.innerHTML += `
      <div class="col-md-4">
        <div class="card">
          <img src="${p.images.byColor.black[0]}" class="card-img-top">
          <div class="card-body">
            <h5>${p.name}</h5>
            <a href="product.html?id=${p.id}" class="btn btn-outline-primary">
              查看商品
            </a>
          </div>
        </div>
      </div>
    `;
  });
});
