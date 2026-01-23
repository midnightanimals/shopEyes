async function loadProducts() {
  const res = await fetch('./data/products.json');
  const data = await res.json();
  return data.products;
}

function resolveProductOptions(product, templates) {
  product.options = product.useOptionTemplates.map(
    key => templates[key]
  );
  return product;
}
