/* ---------- Data ----------
   To use a real photo, add  img: 'https://...'  to a product.
   The drawn tea tin is shown automatically if there is no image or it fails to load. */
const products = [
  { id: 1, name: 'First Flush',   brand: 'Darjeeling',     origin: 'Indian',   family: 'Black',  size: '100 g', price: 950,  liquid: '#d9a441', note: 'A bright, muscatel-sweet spring harvest. Light, floral and crisp.' },
  { id: 2, name: 'Strong CTC',    brand: 'Assam',          origin: 'Indian',   family: 'Black',  size: '250 g', price: 380,  liquid: '#8a3b1e', note: 'Malty and full-bodied. Made for a strong cup with milk.' },
  { id: 3, name: 'Kashmiri Kahwa', brand: 'Kashmir',       origin: 'Indian',   family: 'Herbal', size: '50 g',  price: 650,  liquid: '#c9882f', note: 'Green tea with saffron, almond and cardamom. Warm and fragrant.' },
  { id: 4, name: 'Dragon Well',   brand: 'Hangzhou',       origin: 'Chinese',  family: 'Green',  size: '100 g', price: 1200, liquid: '#7d9a4a', note: 'Smooth and nutty with a soft chestnut finish.' },
  { id: 5, name: 'Sencha',        brand: 'Shizuoka',       origin: 'Japanese', family: 'Green',  size: '100 g', price: 1450, liquid: '#4f7a3a', note: 'Grassy, fresh and lightly sweet. A clean everyday green.' },
  { id: 6, name: 'Silver Needle', brand: 'Fujian',         origin: 'Chinese',  family: 'White',  size: '50 g',  price: 1800, liquid: '#d8d3a8', note: 'Delicate buds with a honeyed, melon-like sweetness.' }
];
const origins = ['All', 'Indian', 'Chinese', 'Japanese'];
const priceRanges = { all: [0, Infinity], u5: [0, 500], m: [500, 1000], o: [1000, Infinity] };
const COUPONS = {
  TEA10:    { type: 'percent', value: 10, label: '10% off' },
  FLAT100:  { type: 'flat', value: 100, min: 1000, label: '₹100 off' },
  FREESHIP: { type: 'ship', label: 'complimentary delivery' }
};
const SHIPPING_FEE = 59, FREE_SHIPPING_ABOVE = 999;
const DEFAULT_MSG = 'Available codes: TEA10, FLAT100, FREESHIP';

/* ---------- State ---------- */
const state = { origin: 'All', family: 'all', price: 'all', sort: 'featured', coupon: null };
let cart = [];
try { cart = JSON.parse(localStorage.getItem('tea_cart')) || []; } catch (e) { cart = []; }

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const byId = id => products.find(p => p.id === id);
const fmt = n => '₹' + n.toLocaleString('en-IN');
const saveCart = () => { try { localStorage.setItem('tea_cart', JSON.stringify(cart)); } catch (e) {} };
const row = (label, value, cls = '') => `<div class="${cls}"><dt>${label}</dt><dd>${value}</dd></div>`;
const bottle = c => `<svg viewBox="0 0 120 160" aria-hidden="true"><rect x="26" y="22" width="68" height="16" rx="4" fill="#3a352e"/><rect x="30" y="38" width="60" height="112" rx="6" fill="#f8f5ef" stroke="#bdb5a7" stroke-width="1.5"/><rect x="38" y="62" width="44" height="52" rx="3" fill="${c}"/><path d="M60 74c10 4 12 16 0 28-12-12-10-24 0-28z" fill="#f8f5ef" opacity=".55"/></svg>`;

/* ---------- Filtering and sorting ---------- */
function visibleProducts() {
  const [lo, hi] = priceRanges[state.price];
  const list = products.filter(p =>
    (state.origin === 'All' || p.origin === state.origin) &&
    (state.family === 'all' || p.family === state.family) &&
    p.price >= lo && p.price < hi
  );
  const sorters = {
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name)
  };
  if (sorters[state.sort]) list.sort(sorters[state.sort]);
  return list;
}

function renderPills() {
  $('#originPills').innerHTML = origins.map(o =>
    `<button data-origin="${o}" class="${o === state.origin ? 'active' : ''}">${o}</button>`).join('');
}

function renderProducts() {
  const list = visibleProducts();
  $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'tea' : 'teas'}`;
  $('#productGrid').innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="thumb">${bottle(p.liquid)}
        ${p.img ? `<img src="${p.img}" referrerpolicy="no-referrer" alt="${p.brand} ${p.name}" onload="this.parentNode.classList.add('has-img')" onerror="this.remove()">` : ''}
        <span class="origin">${p.origin}</span>
      </div>
      <div class="card-body">
        <p class="brand-name">${p.brand}</p>
        <h3>${p.name}</h3>
        <p class="note">${p.note}</p>
        <div class="price-row"><span>Loose leaf, ${p.size}</span><span>${fmt(p.price)}</span></div>
      </div>
      <button class="btn" data-add="${p.id}">Add to Cart</button>
    </article>`).join('')
    : '<p class="empty">No teas match these filters. Please adjust your selection.</p>';
}

/* ---------- Cart logic ---------- */
function addToCart(id) {
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  renderCart();
}
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  renderCart();
}
function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

/* ---------- Price calculation ---------- */
function totals() {
  const subtotal = cart.reduce((sum, i) => sum + byId(i.id).price * i.qty, 0);
  const c = COUPONS[state.coupon];
  let discount = 0, freeShip = false;
  if (c) {
    if (c.type === 'percent') discount = Math.round(subtotal * c.value / 100);
    if (c.type === 'flat') discount = c.value;
    if (c.type === 'ship') freeShip = true;
  }
  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 || freeShip || afterDiscount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: afterDiscount + shipping };
}

function summaryHTML() {
  const t = totals();
  return row('Subtotal', fmt(t.subtotal))
    + (t.discount ? row(`Discount (${state.coupon})`, '- ' + fmt(t.discount), 'discount') : '')
    + row('Delivery', t.shipping ? fmt(t.shipping) : 'Complimentary')
    + row('Total', fmt(t.total), 'total');
}

/* ---------- Coupons ---------- */
function setMsg(text, type = '') {
  const el = $('#couponMsg');
  el.textContent = text;
  el.className = 'coupon-msg ' + type;
}
function applyCoupon(code) {
  const c = COUPONS[code];
  if (!c) return setMsg('This code is not valid.', 'err');
  if (c.min && totals().subtotal < c.min) return setMsg(`${code} requires a minimum order of ${fmt(c.min)}.`, 'err');
  state.coupon = code;
  setMsg(`${code} applied: ${c.label}.`, 'ok');
  renderCart();
}
function revalidateCoupon() {
  const c = COUPONS[state.coupon];
  if (c && c.min && totals().subtotal < c.min) {
    setMsg(`${state.coupon} was removed. Minimum order is ${fmt(c.min)}.`, 'err');
    state.coupon = null;
  }
}

/* ---------- Cart rendering ---------- */
function renderCart() {
  revalidateCoupon();
  $('#cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  $('#cartItems').innerHTML = cart.length ? cart.map(i => {
    const p = byId(i.id);
    return `
      <div class="line">
        <div class="mini">${bottle(p.liquid)}</div>
        <div class="line-info">
          <h4>${p.name}</h4>
          <p>${p.brand}, ${p.size}</p>
          <div class="qty">
            <button data-dec="${p.id}" aria-label="Decrease quantity">-</button>
            <span>${i.qty}</span>
            <button data-inc="${p.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="line-end">
          <strong>${fmt(p.price * i.qty)}</strong>
          <button class="remove" data-remove="${p.id}">Remove</button>
        </div>
      </div>`;
  }).join('') : '<p class="empty">Your cart is empty.</p>';
  $('#cartFoot').hidden = !cart.length;
  $('#summary').innerHTML = summaryHTML();
  saveCart();
}

/* ---------- Drawer and checkout ---------- */
const openCart = () => document.body.classList.add('cart-open');
const closeCart = () => document.body.classList.remove('cart-open');

function openCheckout() {
  closeCart();
  $('#checkoutItems').innerHTML = cart.map(i => {
    const p = byId(i.id);
    return `<div class="co-line"><span>${p.brand} ${p.name} x ${i.qty}</span><span>${fmt(p.price * i.qty)}</span></div>`;
  }).join('');
  $('#checkoutTotals').innerHTML = summaryHTML();
  $('#checkoutForm').hidden = false;
  document.querySelector('.checkout-summary').hidden = false;
  $('#success').hidden = true;
  document.body.classList.add('modal-open');
}
function closeCheckout() { document.body.classList.remove('modal-open'); }

function placeOrder(e) {
  e.preventDefault();
  const total = fmt(totals().total);
  const email = new FormData(e.target).get('email');
  const orderNo = 'TL' + Math.floor(100000 + Math.random() * 900000);
  $('#successText').textContent = `Order ${orderNo} for ${total} is confirmed. A receipt will be sent to ${email}.`;
  $('#checkoutForm').hidden = true;
  document.querySelector('.checkout-summary').hidden = true;
  $('#success').hidden = false;
  cart = [];
  state.coupon = null;
  e.target.reset();
  setMsg(DEFAULT_MSG);
  renderCart();
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.origin) { state.origin = t.dataset.origin; renderPills(); renderProducts(); }
  if (t.dataset.add) {
    addToCart(+t.dataset.add);
    t.textContent = 'Added';
    setTimeout(() => { t.textContent = 'Add to Cart'; }, 900);
  }
  if (t.dataset.inc) changeQty(+t.dataset.inc, 1);
  if (t.dataset.dec) changeQty(+t.dataset.dec, -1);
  if (t.dataset.remove) removeItem(+t.dataset.remove);
});

$('#scentFilter').addEventListener('change', e => { state.family = e.target.value; renderProducts(); });
$('#priceFilter').addEventListener('change', e => { state.price = e.target.value; renderProducts(); });
$('#sort').addEventListener('change', e => { state.sort = e.target.value; renderProducts(); });

$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', () => { closeCart(); closeCheckout(); });
$('#checkoutBtn').addEventListener('click', openCheckout);
$('#closeModal').addEventListener('click', () => { closeCheckout(); openCart(); });
$('#doneBtn').addEventListener('click', closeCheckout);
$('#checkoutForm').addEventListener('submit', placeOrder);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeCheckout(); } });

$('#couponForm').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#couponInput').value.trim().toUpperCase();
  if (code) applyCoupon(code);
});

/* ---------- Init ---------- */
renderPills();
renderProducts();
renderCart();