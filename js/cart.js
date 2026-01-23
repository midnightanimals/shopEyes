const cart = JSON.parse(localStorage.getItem('cart') || '[]');

let text = '';
let total = 0;

cart.forEach((item, i) => {
  text += `商品 ${i + 1}：${item.name}\n`;
  Object.entries(item.options).forEach(([k, v]) => {
    text += `- ${k}: ${v}\n`;
  });
  text += `價格：$${item.price}\n\n`;
  total += item.price;
});

text += `總計：$${total}`;
document.getElementById('output').textContent = text;

function sendMail() {
  const subject = encodeURIComponent('商品訂單');
  const body = encodeURIComponent(text);
  location.href = `mailto:you@example.com?subject=${subject}&body=${body}`;
}
