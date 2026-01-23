const STORAGE_KEY = 'admin_products';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  products: []
};

function render() {
  const $list = $('#productList').empty();

  data.products.forEach((p, index) => {
    $list.append(`
      <div class="admin-product-item">
          <div class="item-field">
            <label>ID</label>
            <input class="form-control" value="${p.id}" data-i="${index}" data-f="id">
          </div>
          <div class="item-field">
            <label>名稱</label>
            <input class="form-control" value="${p.name}" data-i="${index}" data-f="name">
          </div>
          <div class="item-field">
            <label>基礎價格</label>
            <input type="number" class="form-control" value="${p.basePrice}" data-i="${index}" data-f="basePrice">
          </div>
          <div class="item-field">
            <label>使用的 optionTemplate（逗號分隔）</label>
            <input class="form-control" value="${p.optionTemplateRefs.join(',')}" data-i="${index}" data-f="optionTemplateRefs">
          </div>
          <button class="btn btn-danger btn-sm btn-remove" data-i="${index}">刪除</button>
      </div>
    `);
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

$('#addProduct').on('click', () => {
  data.products.push({
    id: 'P' + Date.now(),
    name: '',
    description: '',
    images: { main: '', gallery: [], colors: {} },
    basePrice: 0,
    optionTemplateRefs: []
  });
  render();
});

$('#productList').on('input', 'input', function () {
  const i = $(this).data('i');
  const f = $(this).data('f');
  let v = $(this).val();

  if (f === 'optionTemplateRefs') {
    v = v.split(',').map(s => s.trim());
  }

  data.products[i][f] = v;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
});

$('#productList').on('click', '.remove', function () {
  data.products.splice($(this).data('i'), 1);
  render();
});

$('#exportJson').on('click', () => {
  const output = {
    optionTemplates: JSON.parse(
      prompt('請貼上 optionTemplates JSON（從主 products.json 複製）')
    ),
    products: data.products
  };

  $('#jsonOutput').val(JSON.stringify(output, null, 2));
});

render();
