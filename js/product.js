const params = new URLSearchParams(location.search);
const pid = params.get('id');

let selected = {};
let currentProduct = null;

loadProducts().then(products => {
  currentProduct = products.find(p => p.id === pid);
  render();
});

function render() {
  let html = `<h2>${currentProduct.name}</h2>`;
  html += `<p>基本價格：$${currentProduct.basePrice}</p>`;

  currentProduct.options.forEach(opt => {
    html += `<div class="mb-2"><strong>${opt.label}</strong><br>`;
    opt.items.forEach(item => {
      html += `
        <label class="me-3">
          <input type="radio" name="${opt.key}" value="${item.value}">
          ${item.label}${item.price ? ` (+$${item.price})` : ''}
        </label>
      `;
    });
    html += `</div>`;
  });

  html += `<button class="btn btn-success" onclick="addToCart()">加入購物車</button>`;
  document.getElementById('product').innerHTML = html;

  document.querySelectorAll('input').forEach(i => {
    i.onchange = () => selected[i.name] = i.value;
  });
}

function addToCart() {
  let price = currentProduct.basePrice;

  currentProduct.options.forEach(opt => {
    const val = selected[opt.key];
    const item = opt.items.find(i => i.value === val);
    if (item?.price) price += item.price;
  });

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart.push({
    name: currentProduct.name,
    options: selected,
    price
  });
  localStorage.setItem('cart', JSON.stringify(cart));

  alert('已加入購物車');
}
