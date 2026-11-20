import { bulkPacks, dayOffset, dishes, localTime, locations, sharingPackUnitPrice } from './model.js';

const form = document.getElementById('menu-form');
const entriesRoot = document.getElementById('admin-entries');
const fields = form.elements;
const status = document.getElementById('admin-status');
const submit = form.querySelector('[type="submit"]');
const today = localTime().date;
let version = 0;
fields.date.min = today;
fields.date.max = dayOffset(today, 30);
fields.date.value = today;
fields.site.innerHTML = [
  ['East Bengaluru', locations.find(site => site.hub === 'east').id],
  ['South Bengaluru', locations.find(site => site.hub === 'south').id],
].map(([name, id]) => `<option value="${id}">${name}</option>`).join('');

function entryMarkup(id, entry) {
  const dish = dishes[id];
  const included = Boolean(entry);
  const bulk = Boolean(entry?.bulk);
  return `<div class="admin-entry" data-dish="${id}">
    <label><input type="checkbox" name="include-${id}" ${included ? 'checked' : ''}> ${dish.name}</label>
    <input aria-label="${dish.name} price" type="number" name="price-${id}" min="1" max="100000" required value="${entry?.price ?? dish.price}">
    <input aria-label="${dish.name} late stock" type="number" name="stock-${id}" min="0" max="10000" required value="${entry?.stock ?? dish.stock}">
    ${bulkPacks[id] ? `<input aria-label="Allow sharing packs for ${dish.name}" type="checkbox" name="bulk-${id}" ${bulk ? 'checked' : ''}>
      <div class="admin-packs" ${bulk ? '' : 'hidden'}>
        <label for="pack-${id}">Sharing pack price per 500 g (₹)</label>
        <input id="pack-${id}" aria-label="${dish.name} price per 500 g" type="number" name="pack-${id}" min="1" max="100000" required ${bulk ? '' : 'disabled'} value="${sharingPackUnitPrice(entry ?? { id })}">
      </div>` : ''}
  </div>`;
}
async function request(path, init) {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
async function load() {
  if (!fields.date.value || !fields.date.checkValidity()) return;
  const requestVersion = ++version;
  submit.disabled = true;
  status.textContent = 'Loading menu…';
  try {
    const params = new URLSearchParams({ site: fields.site.value, date: fields.date.value });
    const { menus } = await request('/api/menu?' + params);
    if (requestVersion !== version) return;
    const menu = menus[fields.meal.value];
    for (const key of ['cutoff', 'close', 'discount', 'arrivalStart', 'arrivalEnd']) fields[key].value = menu[key];
    fields.repeat.checked = false;
    entriesRoot.innerHTML = Object.keys(dishes).map(id => entryMarkup(id, menu.entries.find(entry => entry.id === id))).join('');
    status.textContent = '';
    submit.disabled = false;
  } catch (error) {
    if (requestVersion === version) status.textContent = error.message;
  }
}
for (const key of ['site', 'date', 'meal']) fields[key].addEventListener('change', load);
entriesRoot.addEventListener('change', event => {
  if (event.target.name.startsWith('bulk-')) {
    const pricing = event.target.closest('[data-dish]').querySelector('.admin-packs');
    pricing.hidden = !event.target.checked;
    pricing.querySelector('input').disabled = pricing.hidden;
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  status.textContent = 'Publishing menu…';
  try {
    const entries = Object.keys(dishes).filter(id => fields['include-' + id].checked).map(id => ({
      id,
      price: fields['price-' + id].valueAsNumber,
      stock: fields['stock-' + id].valueAsNumber,
      bulk: fields['bulk-' + id]?.checked,
      packPrice: fields['pack-' + id]?.valueAsNumber,
    }));
    const { message } = await request('/api/admin/menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': fields.key.value },
      body: JSON.stringify({
        site: fields.site.value, date: fields.date.value, meal: fields.meal.value,
        cutoff: fields.cutoff.value, close: fields.close.value, discount: fields.discount.valueAsNumber,
        arrivalStart: fields.arrivalStart.value, arrivalEnd: fields.arrivalEnd.value,
        repeat: fields.repeat.checked, entries,
      }),
    });
    status.textContent = message;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
void load();
