import { bulkPacks, dayOffset, dishes, extraOptions, localTime, locations, mainOptions, mealNames, money, preorderPrice, quote, resolveLine, sharingPackPrice, sideOptions, timeLabel } from './model.js';

const symbols = {
  dish: '<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 8V6M9 4c-1-1 1-2 0-3M15 4c-1-1 1-2 0-3M5 20h14"/>',
  pin: '<path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  sprout: '<path d="M12 21v-9m0 3C12 9 9 6 4 6c0 6 3 9 8 9Zm0-3c0-6 3-9 8-9 0 6-3 9-8 9Z"/>',
  leaf: '<path d="M20 4C9 3 4 8 5 15c1 4 5 5 8 3 5-2 7-7 7-14ZM3 21l11-11"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M4 8h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a4 4 0 0 1 0-8h4"/><path d="M16 12h.01"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5m8-5v5M4 10h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  moon: '<path d="M20 15A8.2 8.2 0 0 1 9 4a8.3 8.3 0 1 0 11 11Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 12 7-12 7Z"/>',
};
const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${symbols[name]}</svg>`;
document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
const byId = id => document.getElementById(id);

function startHighlights() {
  const carousel = byId('highlights');
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const dots = [...carousel.querySelectorAll('.hero-dot')];
  const controls = carousel.querySelector('.hero-controls');
  const toggle = controls.querySelector('[data-slide-control="toggle"]');
  let index = 0;
  let playing = true;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (!playing || document.hidden) return;
    timer = setTimeout(() => {
      // Keep the current slide visible while a customer is using its link.
      if (!onCheckout() && !slides[index].contains(document.activeElement) && !document.querySelector('dialog[open]')) {
        showSlide(index + 1);
      }
      schedule();
    }, 6000);
  }
  function setPlaying(value) {
    playing = value;
    toggle.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    toggle.innerHTML = icon(playing ? 'pause' : 'play');
    schedule();
  }
  function showSlide(next, announce = false) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const current = position === index;
      slide.classList.toggle('current', current);
      slide.inert = !current;
      if (current) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
      dots[position].setAttribute('aria-current', String(current));
    });
    if (announce) {
      byId('highlight-status').textContent = dots[index].getAttribute('aria-label').replace('Show ', '') + `, slide ${index + 1} of ${slides.length}`;
    }
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.slideControl;
    if (action === 'toggle') {
      setPlaying(!playing);
      return;
    }
    const next = action === 'previous' ? index - 1 : action === 'next' ? index + 1 : Number(button.dataset.slideIndex);
    showSlide(next, true);
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  controls.hidden = false;
  schedule();
}

const clean = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
function restore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
const categories = ['All dishes', 'Combos', 'Bowls', 'Sides'];
const dayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const billingAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const savedSite = restore('daily-site', null);
const onCheckout = () => window.location.pathname === '/checkout';
const state = {
  site: locations.find(site => site.id === savedSite?.id),
  detail: savedSite?.detail || '',
  date: localTime().date,
  today: localTime().date,
  meal: 'lunch',
  category: 'All dishes',
  menus: null,
  menuError: '',
  carts: restore('daily-carts', {}),
  version: 0,
};
const active = () => state.menus?.[state.meal];
const scope = () => `${state.site?.hub || locations[0].hub}:${state.date}:${state.meal}`;
const lines = () => state.carts[scope()] || [];
const modal = byId('modal');
const checkoutPage = byId('checkout-page');
const storefront = document.querySelectorAll('[data-storefront]');
let modalType = '';
let toastTimer;
let sendingOrder = false;
let pendingRequest;
let checkoutError = '';

function alertUser(message) {
  const toast = byId('notice');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
}

async function api(path, init) {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
async function loadMenu({ first = false, silent = false } = {}) {
  const version = ++state.version;
  if (!silent) {
    state.menus = null;
    state.menuError = '';
    render();
  }
  try {
    const params = new URLSearchParams({ date: state.date });
    if (state.site) params.set('site', state.site.id);
    const data = await api('/api/menu?' + params);
    if (version !== state.version) return;
    state.menus = data.menus;
    state.menuError = '';
    state.today = data.today;
    if (first && state.menus.lunch.phase === 'closed') state.meal = 'dinner';
    if (first && state.menus.lunch.phase === 'closed' && state.menus.dinner.phase === 'closed') {
      state.meal = 'lunch';
      state.date = dayOffset(data.today, 1);
      return loadMenu();
    }
    render();
  } catch (error) {
    if (version !== state.version) return;
    if (!silent) {
      state.menuError = error.message;
      byId('cards').innerHTML = `<div class="empty-state">${clean(error.message)} <button class="outline" data-action="reload">Try again</button></div>`;
      renderCheckout();
    }
  }
}

function dateName(date) {
  if (date === state.today) return 'Today';
  if (date === dayOffset(state.today, 1)) return 'Tomorrow';
  return dayFormatter.format(new Date(date + 'T12:00:00Z'));
}
function nutrientText(value, label, partial = false) {
  return value == null ? `${label} unavailable` : `${value} g ${label}${partial ? ' (partial)' : ''}`;
}
function nutrient(protein, fiber, info = {}) {
  return `<div class="nutrient"><span>${nutrientText(protein, 'protein', info.proteinPartial)}</span><span>${nutrientText(fiber, 'fiber', info.fiberPartial)}</span></div>`;
}
function dateOptions() {
  const select = byId('delivery-date');
  const previous = select.dataset.today;
  if (previous !== state.today) {
    select.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = dayOffset(state.today, index);
      return `<option value="${date}">${dateName(date)}</option>`;
    }).join('');
    select.dataset.today = state.today;
  }
  select.value = state.date;
}
function render() {
  const menu = active();
  const name = mealNames[state.meal];
  byId('site-label').textContent = state.site?.name || 'Choose location';
  byId('menu-heading').textContent = state.date === state.today ? 'Today’s menu' : state.date === dayOffset(state.today, 1) ? 'Tomorrow’s menu' : `${dateName(state.date)} menu`;
  byId('menu-caption').textContent = state.site ? `Delivery to ${state.site.area}` : 'Choose your location to see what’s available near you.';
  dateOptions();
  byId('meal-tabs').innerHTML = Object.entries(mealNames).map(([id, label]) => {
    const config = state.menus?.[id];
    const sub = !config ? 'Loading hours…' : config.phase === 'closed' ? 'Orders closed'
      : config.phase === 'late' ? `Order until ${timeLabel(config.close)}` : `Preorder by ${timeLabel(config.cutoff)}`;
    return `<button type="button" class="meal-tab" data-action="meal" data-value="${id}" aria-pressed="${id === state.meal}">${icon(id === 'lunch' ? 'sun' : 'moon')}<span><span>${label}</span><small>${sub}</small></span>${id === state.meal ? `<span class="tab-arrow">${icon('check')}</span>` : ''}</button>`;
  }).join('');
  const strip = byId('order-window');
  strip.className = `order-window ${menu?.phase || ''}`;
  if (!menu) {
    strip.innerHTML = `<span>${icon('clock')} Loading ordering hours…</span>`;
  } else if (menu.phase === 'late') {
    strip.innerHTML = `<span>${icon('clock')} <strong>Limited portions left</strong></span><span class="status-detail">Order by ${timeLabel(menu.close)}</span>`;
  } else if (menu.phase === 'closed') {
    strip.innerHTML = `<span>${icon('clock')} <strong>${name} orders are closed</strong></span><span class="status-detail">Choose another meal or day</span>`;
  } else {
    strip.innerHTML = `<span>${icon('clock')} <strong>${menu.discount ? `Save ${menu.discount}% when you preorder` : 'Preorders are open'}</strong></span><span class="status-detail">Order by ${timeLabel(menu.cutoff)} IST</span>`;
  }
  byId('categories').innerHTML = categories.map(category => `<button type="button" class="category" data-action="category" data-value="${category}" aria-pressed="${category === state.category}">${category}</button>`).join('');
  renderCards();
  renderCart();
}
function renderCards() {
  const menu = active();
  const entries = menu?.entries.filter(entry => state.category === 'All dishes' || dishes[entry.id].category === state.category);
  byId('cards').innerHTML = entries ? entries.map(entry => card(entry, menu)).join('') ||
    '<p class="empty-state">There are no dishes in this category for this meal.</p>' : '<p>Loading the menu…</p>';
}
function card(entry, menu) {
  const id = entry.id;
  const item = dishes[id];
  const isCombo = id === 'thali';
  const soldOut = menu.phase === 'late' && !entry.remaining;
  const action = isCombo ? 'combo' : 'add';
  const label = menu.phase === 'closed' ? 'Closed' : soldOut ? 'Sold out' : isCombo ? 'Customize' : 'Add';
  const price = entry.price;
  const discount = menu.phase === 'preorder' ? menu.discount : 0;
  const displayed = preorderPrice(price, discount);
  const badge = item.badge || (item.veg ? 'VEGETARIAN' : '');
  const nutrition = isCombo ? nutrient('28+', '5+') : nutrient(item.protein, item.fiber);
  const packs = entry.bulk && bulkPacks[id];
  const sizes = packs && `${packs[0].name}–${packs.at(-1).name}`;
  return `<article class="card">
    <div class="card-media"><img src="/images/${id}.webp" alt="" width="506" height="506" loading="lazy">${badge ? `<span class="card-badge">${badge}</span>` : ''}</div>
    <div class="card-body">
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      ${nutrition}
      ${menu.phase === 'late' && !soldOut ? `<span class="card-stock">${entry.remaining} portions left</span>` : ''}
      <div class="card-bottom">
        <div class="card-price">${isCombo ? '<small>From</small>' : ''}<strong>${money(displayed)}</strong>${discount ? `<del>${money(price)}</del>` : ''}</div>
        <button type="button" class="add" data-action="${action}" data-value="${id}" aria-label="${label} ${item.name}" ${menu.phase === 'closed' || soldOut ? 'disabled' : ''}>${label}${label === 'Add' ? icon('plus') : ''}</button>
      </div>
      ${packs ? menu.phase === 'preorder'
        ? `<button type="button" class="sharing-pack" data-action="bulk" data-value="${id}" aria-label="Sharing packs for ${item.name}, ${sizes}"><span><strong>Sharing packs</strong><small>${sizes} · Preorder only</small></span>${icon('arrow')}</button>`
        : '<div class="sharing-pack closed"><span><strong>Sharing packs</strong><small>Preorders closed</small></span></div>' : ''}
    </div>
  </article>`;
}
function orderItemName(item) {
  if (!item.packSize) return item.name;
  return `${item.packSize.replace(/ kg$/, ' KG')} ${item.name}`;
}
function cartItem(line, menu) {
  if (!menu) return null;
  try { return resolveLine(line, menu); } catch { return null; }
}
function quantityMarkup(index, name, qty, busy = false, canAdd = true) {
  return `<div class="quantity">
    <button type="button" data-action="minus" data-value="${index}" aria-label="Remove one ${name}" ${busy ? 'disabled' : ''}>−</button>
    <span aria-label="Quantity ${qty}">${qty}</span>
    <button type="button" data-action="plus" data-value="${index}" aria-label="Add one ${name}" ${busy || !canAdd ? 'disabled' : ''}>+</button>
  </div>`;
}
function cartMarkup() {
  const list = lines();
  const menu = active();
  const head = `<div class="cart-head"><h2 class="cart-title">Your cart</h2>${icon('bag')}</div>`;
  if (!list.length) return head + `<div class="cart-empty"><span class="empty-icon">${icon('bag')}</span><strong>Your cart is empty</strong><p>Add a dish to get started.</p></div>${menu?.phase === 'preorder' && menu.discount ? `<div class="cart-promo">${icon('clock')} <span>Preorder by ${timeLabel(menu.cutoff)} and save ${menu.discount}%</span></div>` : ''}`;
  let bill;
  let errorMessage;
  if (menu) {
    try { bill = quote(list, menu); } catch (error) { errorMessage = error.message; }
  }
  const lineMarkup = list.map((line, index) => {
    const item = cartItem(line, menu);
    const name = clean(item ? orderItemName(item) : dishes[line.id]?.name || 'Menu item');
    const description = item ? item.description : 'Currently unavailable';
    return `<div class="cart-line"><div><strong>${name}</strong>${description ? `<p>${clean(description)}</p>` : ''}${item ? `<p>${nutrientText(item.protein == null ? null : item.protein * line.qty, 'protein', item.proteinPartial)} · ${nutrientText(item.fiber == null ? null : item.fiber * line.qty, 'fiber', item.fiberPartial)}</p>` : ''}</div><div><strong>${item ? money(item.price * line.qty) : ''}</strong>${quantityMarkup(index, name, line.qty)}</div></div>`;
  }).join('');
  return head + `<div class="cart-lines">${lineMarkup}</div>` + (bill ? `
    <p class="cart-footnote">Cart nutrition</p>${nutrient(bill.protein, bill.fiber, bill)}
    ${bill.discount ? `<div class="cart-promo">${icon('clock')} You save ${money(bill.discount)} by preordering</div>` : ''}
    ${bill.missed ? `<div class="cart-promo">${icon('clock')} You could have saved ${money(bill.missed)} by ordering before ${timeLabel(menu.cutoff)}</div>` : ''}
    <div class="cart-pay"><span>Estimated total</span><span>${money(bill.total)}</span></div>
    <button type="button" class="primary full" data-action="checkout">Review order ${icon('arrow')}</button>`
    : `<p class="cart-footnote ${errorMessage ? 'form-error' : ''}">${clean(errorMessage || 'Updating your cart…')}</p>`);
}
function renderCart() {
  const count = lines().reduce((sum, line) => sum + line.qty, 0);
  const markup = cartMarkup();
  byId('cart-count').textContent = count;
  byId('cart-panel').innerHTML = markup;
  const mobile = byId('mobile-cart');
  mobile.hidden = !count || onCheckout();
  mobile.innerHTML = `<span>${icon('bag')} &nbsp; View cart</span><span>${count} ${count === 1 ? 'item' : 'items'}</span>`;
  if (modal.open && modalType === 'cart') {
    byId('modal-cart').innerHTML = markup;
  }
  renderCheckout();
}
function replaceLines(next, key = scope()) {
  state.carts[key] = next;
  checkoutError = '';
  store('daily-carts', state.carts);
  renderCart();
}
function put(line) {
  if (sendingOrder) return;
  const menu = active();
  if (!menu) return;
  const next = structuredClone(lines());
  const key = value => [value.kind, value.id, value.pack, value.main, value.side, (value.extras || []).join('.')].join(':');
  const existing = next.find(item => key(item) === key(line));
  if (existing) existing.qty += 1;
  else next.push({ ...line, qty: 1 });
  try {
    quote(next, menu);
  } catch (error) {
    alertUser(error.message);
    return;
  }
  replaceLines(next);
  return true;
}
function adjust(index, delta, button) {
  if (sendingOrder) return;
  const next = structuredClone(lines());
  if (!next[index]) return;
  next[index].qty += delta;
  if (!next[index].qty) next.splice(index, 1);
  if (delta > 0) {
    try { quote(next, active()); } catch (error) { return alertUser(error.message); }
  }
  const parent = button.closest('dialog, #checkout-page') || byId('cart-panel');
  replaceLines(next);
  const updatedButton = parent.querySelector(`[data-action="${delta > 0 ? 'plus' : 'minus'}"][data-value="${index}"]:enabled`);
  (updatedButton || parent.querySelector('.quantity button:enabled, [data-action="back-to-menu"]'))?.focus({ preventScroll: true });
}
function showModal(type, title, body) {
  modalType = type;
  modal.innerHTML = `<div class="dialog-head"><h2 class="modal-title" id="modal-title">${title}</h2><button type="button" class="icon-button" aria-label="Close dialog" data-action="close">${icon('close')}</button></div>${body}`;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
}
function chooseSite(after) {
  if (sendingOrder) return;
  showModal('location', 'Where should we deliver?', `<div class="dialog-body"><p>Choose a DailyDish apartment, school, or office.</p>
    <label class="field">Search delivery locations<input type="search" id="site-search" class="site-search" placeholder="Enter a site name or neighbourhood" autocomplete="off"></label>
    <div id="site-results" class="site-results"></div></div>`);
  modal.dataset.after = after || '';
  const input = byId('site-search');
  const search = () => {
    const query = input.value.trim().toLowerCase();
    const found = locations.filter(site => [site.name, site.area, site.type].join(' ').toLowerCase().includes(query));
    byId('site-results').innerHTML = found.map(site => `<button type="button" class="site-choice" data-action="site" data-value="${site.id}"><span><strong>${site.name}</strong><small>${site.type} · ${site.area}</small></span>${icon('arrow')}</button>`).join('') ||
      '<p class="empty-state" role="status">DailyDish doesn’t serve this location yet. Try another name or neighbourhood.</p>';
  };
  search();
  input.addEventListener('input', search);
  input.focus();
}
function siteDetails(site) {
  const after = modal.dataset.after;
  showModal('details', site.name, `<form id="site-form" class="dialog-body"><p>${site.type} · ${site.area}</p><label class="field">${site.detail}<input name="detail" required maxlength="140" value="${clean(site.id === state.site?.id ? state.detail : '')}" autocomplete="off"></label>
    <button type="button" class="outline" data-action="change-site">Choose another site</button><button class="primary full" type="submit">Save location ${icon('arrow')}</button></form>`);
  const form = byId('site-form');
  form.elements.detail.focus();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const detail = form.elements.detail.value.trim();
    if (!detail) return form.elements.detail.focus();
    const previousKey = scope();
    const previousCart = lines();
    const changingCheckoutSite = onCheckout() && Boolean(state.site);
    if (!state.site) {
      state.site = site;
      if (scope() !== previousKey && previousCart.length && !lines().length) {
        state.carts[scope()] = previousCart;
        delete state.carts[previousKey];
        store('daily-carts', state.carts);
      }
    }
    state.site = site;
    state.detail = detail;
    checkoutError = '';
    store('daily-site', { id: site.id, detail });
    modal.close();
    await loadMenu();
    if (changingCheckoutSite && scope() !== previousKey && previousCart.length && !lines().length) {
      try {
        if (!active()) throw new Error('Menu unavailable');
        quote(previousCart, active());
        delete state.carts[previousKey];
        replaceLines(previousCart);
      } catch {
        checkoutError = 'Your previous cart is saved at its delivery location. Browse the menu for this location to start a new cart.';
      }
    }
    if (after === 'checkout') {
      const returning = onCheckout();
      checkout();
      if (returning) checkoutPage.querySelector('[data-action="checkout-location"]')?.focus({ preventScroll: true });
    } else alertUser(`Delivery location set to ${site.name}.`);
  });
}
function optionMarkup(options, group, type, entry) {
  return options.map(option => {
    const soldOut = active().phase === 'late' && !entry.remainingOptions[option.id];
    const checked = type === 'radio' && option === options.find(item => active().phase !== 'late' || entry.remainingOptions[item.id]);
    return `<label class="option"><input name="${group}" type="${type}" value="${option.id}" ${checked ? 'checked' : ''} ${soldOut ? 'disabled' : ''}><span><strong>${option.name}</strong><small>${option.portion} · ${nutrientText(option.protein, 'protein')} · ${nutrientText(option.fiber, 'fiber')}</small></span><b>${soldOut ? 'Sold out' : option.price ? '+' + money(option.price) : 'Included'}</b></label>`;
  }).join('');
}
function customize(id) {
  const menu = active();
  const entry = menu.entries.find(item => item.id === id);
  showModal('combo', 'Build your thali', `<form id="combo-form"><div class="dialog-body">
    <p>Chicken curry comes with your choice of main and one curry, starter or side.</p>
    <fieldset><legend>Main <small>· Choose one</small></legend>${optionMarkup(mainOptions, 'main', 'radio', entry)}</fieldset>
    <fieldset><legend>Curry, starter or side <small>· Choose one</small></legend>${optionMarkup(sideOptions, 'side', 'radio', entry)}</fieldset>
    <fieldset><legend>Add-ons <small>· Optional, choose any</small></legend>${optionMarkup(extraOptions, 'extras', 'checkbox', entry)}</fieldset>
    </div><div class="dialog-foot"><div id="combo-summary" class="dialog-total" aria-live="polite"></div><button class="primary full" type="submit">Add combo to cart</button></div></form>`);
  const form = byId('combo-form');
  const selection = () => {
    const data = new FormData(form);
    return { id, kind: 'combo', main: data.get('main'), side: data.get('side'), extras: data.getAll('extras'), qty: 1 };
  };
  const summary = () => {
    const chosen = selection();
    form.querySelector('button[type=submit]').disabled = !chosen.main || !chosen.side;
    if (!chosen.main || !chosen.side) { byId('combo-summary').textContent = 'This combo is sold out.'; return; }
    const item = resolveLine(chosen, menu);
    const price = preorderPrice(item.price, menu.phase === 'preorder' ? menu.discount : 0);
    byId('combo-summary').innerHTML = `${nutrient(item.protein, item.fiber, item)}<strong>${money(price)}</strong>`;
  };
  summary();
  form.addEventListener('change', summary);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (put(selection())) { modal.close(); alertUser('Combo added to your cart.'); }
  });
}
function bulkOrder(id) {
  const menu = active();
  const entry = menu.entries.find(item => item.id === id);
  if (menu.phase !== 'preorder' || !entry?.bulk) return;
  const packs = bulkPacks[id];
  let packIndex = 0;
  showModal('bulk', dishes[id].name, `<form id="bulk-form" class="dialog-body">
    <p>Preorder sharing packs by ${timeLabel(menu.cutoff)} IST.</p>
    <div class="pack-size" role="group" aria-labelledby="pack-size-label">
      <strong id="pack-size-label">Pack size</strong>
      <div class="pack-stepper">
        <button type="button" id="pack-minus" aria-label="Decrease pack size by 500 g">−</button>
        <span id="pack-weight"></span>
        <button type="button" id="pack-plus" aria-label="Increase pack size by 500 g">+</button>
      </div>
    </div>
    <div id="pack-summary" class="dialog-total"></div>
    <span id="pack-announcement" class="sr-only" role="status"></span>
    <button class="primary full" type="submit">Add sharing pack to cart</button></form>`);
  const decrease = byId('pack-minus');
  const increase = byId('pack-plus');
  function showPack() {
    const pack = packs[packIndex];
    const amount = money(sharingPackPrice(entry, pack));
    decrease.setAttribute('aria-disabled', packIndex === 0);
    increase.setAttribute('aria-disabled', packIndex === packs.length - 1);
    byId('pack-weight').textContent = pack.name;
    byId('pack-summary').innerHTML = `${nutrient(pack.protein, pack.fiber)}<strong>${amount}</strong>`;
    byId('pack-announcement').textContent = `${pack.name}, ${amount}`;
  }
  showPack();
  decrease.addEventListener('click', () => {
    if (packIndex === 0) return;
    packIndex -= 1;
    showPack();
  });
  increase.addEventListener('click', () => {
    if (packIndex === packs.length - 1) return;
    packIndex += 1;
    showPack();
  });
  byId('bulk-form').addEventListener('submit', event => {
    event.preventDefault();
    if (put({ kind: 'bulk', id, pack: packs[packIndex].id })) {
      modal.close();
      alertUser('Sharing pack added to your cart.');
    }
  });
}
function readCheckoutContext() {
  if (!onCheckout()) return;
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');
  const meal = params.get('meal');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + 'T12:00:00Z'))) state.date = date;
  if (Object.hasOwn(mealNames, meal)) state.meal = meal;
}
function showRoute() {
  const checkout = onCheckout();
  storefront.forEach(element => { element.hidden = checkout; });
  byId('checkout-top').hidden = !checkout;
  checkoutPage.hidden = !checkout;
  document.title = checkout ? 'Checkout — DailyDish' : 'DailyDish — A little more like home';
}
function checkout() {
  if (!state.site) return chooseSite('checkout');
  if (onCheckout()) return renderCheckout();
  if (!lines().length) return alertUser('Add a dish to your cart first.');
  if (modal.open) modal.close();
  const params = new URLSearchParams({ date: state.date, meal: state.meal });
  history.pushState({ fromMenu: true }, '', '/checkout?' + params);
  checkoutError = '';
  clearTimeout(toastTimer);
  byId('notice').hidden = true;
  showRoute();
  renderCart();
  window.scrollTo({ top: 0, behavior: 'instant' });
  byId('checkout-title').focus({ preventScroll: true });
}
function backToMenu() {
  if (sendingOrder) return;
  if (history.state?.fromMenu) {
    history.back();
    return;
  }
  history.replaceState(null, '', '/#menu');
  showRoute();
  renderCart();
  byId('menu').scrollIntoView();
}
function arrivalWindow(menu) {
  const withMinutes = value => timeLabel(value).replace(/^(\d+) ([AP]M)$/, '$1:00 $2');
  const start = withMinutes(menu.arrivalStart);
  const end = withMinutes(menu.arrivalEnd);
  return `${start.slice(-2) === end.slice(-2) ? start.slice(0, -3) : start}–${end}`;
}
function checkoutSides(menu) {
  if (!menu || menu.phase === 'closed') return [];
  return menu.entries.filter(entry => dishes[entry.id].category === 'Sides' && (menu.phase !== 'late' ||
    entry.remaining > lines().filter(line => line.id === entry.id && line.kind === 'standard').reduce((sum, line) => sum + line.qty, 0)));
}
function checkoutItems(list, menu) {
  return list.map((line, index) => {
    const item = cartItem(line, menu);
    const name = clean(item ? orderItemName(item) : dishes[line.id]?.name || 'Menu item');
    const canAdd = Boolean(item && menu.phase !== 'closed' && line.qty < 20 && (line.kind !== 'bulk' || menu.phase === 'preorder'));
    return `<li class="checkout-item">
      <div class="checkout-item-info">
        <strong>${name}</strong>
        ${item?.description ? `<p>${clean(item.description)}</p>` : ''}
        ${item ? nutrient(item.protein, item.fiber, item) : '<p>Currently unavailable</p>'}
      </div>
      ${quantityMarkup(index, name, line.qty, sendingOrder, canAdd)}
      <strong class="checkout-item-price">${item ? billingAmount.format(item.price * line.qty) : '—'}</strong>
    </li>`;
  }).join('');
}
function checkoutBilling(bill, menu) {
  const row = (label, value, hint = '', kind = '') => `<div class="billing-row ${kind}">
    <dt>${label}${hint ? `<small>${hint}</small>` : ''}</dt><dd>${value}</dd>
  </div>`;
  return `<dl class="checkout-bill checkout-card">
    ${row('Item total', billingAmount.format(bill.subtotal))}
    ${bill.discount ? row('Early-bird discount', '−' + billingAmount.format(bill.discount), `${menu.discount}% off eligible items`, 'billing-discount') : ''}
    ${row('Delivery', billingAmount.format(bill.delivery), 'One fee per delivery')}
    ${row('Platform fee', billingAmount.format(bill.platformFee))}
    ${row('Packing fee', billingAmount.format(bill.packingFee))}
    ${row(`Estimated tax (${bill.taxRate}%)`, billingAmount.format(bill.tax), `On ${billingAmount.format(bill.taxable)}`)}
    ${row('To pay', billingAmount.format(bill.total), '', 'billing-total')}
  </dl>`;
}
function renderCheckout() {
  if (!onCheckout()) return;
  const container = byId('checkout-content');
  const list = lines();
  const menu = active();
  const site = state.site;
  if (!list.length) {
    container.innerHTML = `<section class="checkout-card checkout-empty">
      <span class="empty-icon">${icon('bag')}</span><h2>Your cart is empty</h2><p>${clean(checkoutError || 'Add a dish from the menu to check out.')}</p>
      <a class="primary" href="/#menu" data-action="back-to-menu">Browse the menu ${icon('arrow')}</a>
    </section>`;
    return;
  }
  let bill;
  let issue = state.menuError;
  if (menu) {
    try { bill = quote(list, menu); } catch (error) { issue = error.message; }
  }
  const firstDish = Object.hasOwn(dishes, list[0].id) ? list[0].id : 'thali';
  const day = dateName(state.date);
  const arrivalDay = day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day;
  const error = checkoutError || issue;
  const busy = sendingOrder ? 'disabled' : '';
  container.innerHTML = `<div class="checkout-layout">
    <div class="checkout-contents">
      <section class="checkout-card meal-summary" aria-labelledby="checkout-meal">
        <div class="meal-summary-head">
          <img src="/images/${firstDish}.webp" alt="" width="52" height="52">
          <div><h2 id="checkout-meal">${mealNames[state.meal]}</h2><p>${day} · ${dayFormatter.format(new Date(state.date + 'T12:00:00Z'))}</p></div>
        </div>
        <ul class="checkout-items">${checkoutItems(list, menu)}</ul>
        ${checkoutSides(menu).length ? `<button type="button" class="checkout-addons" id="checkout-addons" data-action="checkout-addons" ${busy}>
          ${icon('plus')} <span><strong>Add-ons</strong><small>Browse sides for this meal</small></span>${icon('right')}
        </button>` : ''}
        ${bill?.discount ? `<div class="meal-summary-discount"><span>${icon('clock')} Early-bird discount (${menu.discount}%)</span><strong>−${billingAmount.format(bill.discount)}</strong></div>` : ''}
        <div class="meal-summary-subtotal">
          <a class="text-button" href="/#menu" data-action="back-to-menu">${icon('plus')} Add more</a>
          ${bill ? `<div><small>Meal subtotal</small><strong>${billingAmount.format(bill.subtotal - bill.discount)}</strong></div>` : ''}
        </div>
        ${menu && menu.phase !== 'closed' ? `<div class="checkout-arrival">${icon('clock')}<span>Arrives ${arrivalDay}</span><strong>${arrivalWindow(menu)} <small>IST</small></strong></div>` : ''}
      </section>
      <section class="checkout-section" aria-labelledby="checkout-delivery">
        <h2 id="checkout-delivery">Delivery details</h2>
        <div class="checkout-card delivery-card">
          <span class="checkout-location-icon">${icon('pin')}</span>
          <div>
            <strong>${site ? clean(site.name) : 'Choose a delivery location'}</strong>${site ? ` <span class="delivery-type">${site.type}</span>` : ''}
            <p>${site ? `${clean(state.detail)}<br>${clean(site.area)}` : 'Select a DailyDish apartment, school, or office.'}</p>
          </div>
          <button type="button" class="outline" data-action="checkout-location" ${busy}>${site ? 'Change' : 'Choose location'}</button>
        </div>
      </section>
      <section class="checkout-section" aria-labelledby="checkout-savings">
        <h2 id="checkout-savings">Apply &amp; save</h2>
        <div class="checkout-card wallet-card">
          ${icon('wallet')} <span><strong>Wallet credit</strong><small>Unavailable in this demo</small></span>
        </div>
        ${bill?.missed ? `<p class="cart-promo checkout-missed">${icon('clock')} You could have saved ${money(bill.missed)} by ordering before ${timeLabel(menu.cutoff)}.</p>` : ''}
      </section>
    </div>
    <section class="checkout-section checkout-summary" aria-labelledby="checkout-billing">
      <h2 id="checkout-billing">Billing details</h2>
      ${bill ? `${checkoutBilling(bill, menu)}<div class="checkout-card checkout-nutrition"><strong>Cart nutrition</strong>${nutrient(bill.protein, bill.fiber, bill)}</div>`
        : `<div class="checkout-card checkout-bill-placeholder"><p>${issue ? 'Update your cart to continue.' : 'Updating your bill…'}</p>${state.menuError ? '<button type="button" class="outline" data-action="reload">Try again</button>' : ''}</div>`}
      ${error ? `<p class="checkout-error form-error" id="checkout-error" role="alert" tabindex="-1">${clean(error)}</p>` : ''}
    </section>
  </div>
  <div class="checkout-payment">
    <div class="checkout-wrap checkout-payment-inner">
      <div class="checkout-payment-total"><span>To pay</span><strong>${bill ? billingAmount.format(bill.total) : '—'}</strong></div>
      <div class="checkout-payment-action">
        <button id="place-order" type="button" class="primary" data-action="place-order" ${!bill || sendingOrder ? 'disabled' : ''}>${sendingOrder ? 'Placing order…' : site ? 'Place demo order' : 'Choose delivery location'}</button>
        <small>No payment will be taken.</small>
      </div>
    </div>
  </div>`;
}
function showCheckoutAddons() {
  const menu = active();
  const sides = checkoutSides(menu);
  if (!sides.length || sendingOrder) return;
  showModal('checkout-addons', 'Add-ons', `<div class="dialog-body addon-list">${sides.map(entry => {
    const item = dishes[entry.id];
    const price = preorderPrice(entry.price, menu.phase === 'preorder' ? menu.discount : 0);
    return `<div class="addon-item"><div><strong>${item.name}</strong>${nutrient(item.protein, item.fiber)}</div>
      <button type="button" class="add" data-action="add-checkout-side" data-value="${entry.id}" aria-label="Add ${item.name}">${money(price)} ${icon('plus')}</button></div>`;
  }).join('')}</div>`);
}
async function placeOrder() {
  if (sendingOrder || !onCheckout() || !active()) return;
  if (!state.site) return chooseSite('checkout');
  const menu = active();
  let bill;
  try { bill = quote(lines(), menu); } catch (error) {
    checkoutError = error.message;
    renderCheckout();
    return;
  }
  const key = scope();
  const expected = { site: state.site.id, detail: state.detail, date: state.date, meal: state.meal, lines: lines(), expectedTotal: bill.total, expectedPhase: menu.phase };
  const fingerprint = JSON.stringify(expected);
  if (pendingRequest?.fingerprint !== fingerprint) pendingRequest = { fingerprint, id: globalThis.crypto.randomUUID() };
  sendingOrder = true;
  checkoutError = '';
  renderCheckout();
  try {
    const order = await api('/api/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expected, requestId: pendingRequest.id }),
    });
    pendingRequest = null;
    replaceLines([], key);
    if (onCheckout()) history.replaceState(null, '', '/#menu');
    showRoute();
    renderCart();
    showModal('success', 'Demo order placed', `<div class="dialog-body"><p><strong>Order ${clean(order.reference)}</strong><br>${mealNames[order.meal]} · ${dateName(order.date)} · ${money(order.total)}</p><p>No payment was taken.</p><button type="button" class="primary full" data-action="browse">Back to the menu</button></div>`);
    void loadMenu({ silent: true });
  } catch (error) {
    checkoutError = error.message;
    await loadMenu({ silent: true });
  } finally {
    sendingOrder = false;
    renderCheckout();
    byId('checkout-error')?.focus();
  }
}
function info() {
  showModal('how', 'How preordering works', `<div class="dialog-body">
    <p><strong>Choose an onboarded delivery location.</strong><br>Find your apartment, school, or office to see its menu and delivery options.</p>
    <p><strong>Order before the meal cutoff to save.</strong><br>Knowing how many meals to cook helps us buy the right quantities, cook in one batch, and keep prices affordable.</p>
    <p><strong>Missed the cutoff?</strong><br>You can still order the remaining portions at the regular price until they sell out or ordering closes.</p>
    <button type="button" class="primary full" data-action="browse">Browse the menu ${icon('arrow')}</button>
  </div>`);
}
const actions = {
  how: info,
  location: () => chooseSite(),
  site: value => siteDetails(locations.find(site => site.id === value)),
  'change-site': () => chooseSite(modal.dataset.after),
  close: () => { if (!sendingOrder) modal.close(); },
  browse: () => { modal.close(); byId('menu').scrollIntoView(); },
  cart: () => showModal('cart', 'Your cart', `<div class="dialog-body"><div class="cart-panel" id="modal-cart">${cartMarkup()}</div></div>`),
  meal: value => {
    state.meal = value;
    state.category = 'All dishes';
    render();
    byId('meal-tabs').querySelector(`[data-value="${value}"]`)?.focus({ preventScroll: true });
  },
  category: value => {
    state.category = value;
    render();
    [...byId('categories').children].find(item => item.dataset.value === value)?.focus({ preventScroll: true });
  },
  add: value => { if (put({ id: value, kind: 'standard' })) alertUser(`${dishes[value].name} added to your cart.`); },
  combo: customize,
  bulk: bulkOrder,
  plus: (value, button) => adjust(Number(value), 1, button),
  minus: (value, button) => adjust(Number(value), -1, button),
  checkout,
  'back-to-menu': backToMenu,
  'checkout-location': () => chooseSite('checkout'),
  'checkout-addons': showCheckoutAddons,
  'add-checkout-side': value => {
    if (put({ id: value, kind: 'standard' })) {
      modal.close();
      alertUser(`${dishes[value].name} added to your cart.`);
      byId('checkout-addons')?.focus({ preventScroll: true });
    }
  },
  'place-order': placeOrder,
  reload: () => loadMenu(),
};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const action = actions[button?.dataset.action];
  if (action && !button.disabled) {
    event.preventDefault();
    action(button.dataset.value, button);
  }
});
modal.addEventListener('cancel', event => { if (sendingOrder) event.preventDefault(); });
byId('delivery-date').addEventListener('change', event => {
  state.date = event.target.value;
  state.category = 'All dishes';
  void loadMenu();
});
window.addEventListener('popstate', () => {
  const isCheckout = onCheckout();
  if (!isCheckout && checkoutPage.hidden) return;
  if (modal.open) modal.close();
  const previousDate = state.date;
  readCheckoutContext();
  if (!isCheckout && state.date < localTime().date) state.date = localTime().date;
  checkoutError = '';
  showRoute();
  if (!state.menus || state.date !== previousDate) void loadMenu({ first: !isCheckout });
  else render();
  (isCheckout ? byId('checkout-title') : byId('delivery-date')).focus({ preventScroll: true });
});
startHighlights();
readCheckoutContext();
showRoute();
void loadMenu({ first: !onCheckout() });
setInterval(() => {
  const today = localTime().date;
  if (modal.open || sendingOrder) return;
  if (onCheckout() && today > state.date) {
    if (state.today !== today) {
      state.today = today;
      void loadMenu();
    }
  } else if (today > state.date) {
    state.date = today;
    void loadMenu({ first: true });
  } else {
    void loadMenu({ silent: true });
  }
}, 45000);
