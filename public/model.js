export const locations = [
  { id: 'fern', name: 'The Fern Apartments', area: 'Indiranagar', type: 'Apartment', hub: 'east', detail: 'Tower and flat number' },
  { id: 'orchard', name: 'Orchard Public School', area: 'Domlur', type: 'School', hub: 'east', detail: 'Pickup point or classroom' },
  { id: 'atlas', name: 'Atlas Business Park', area: 'Koramangala', type: 'Office', hub: 'south', detail: 'Building and floor' },
  { id: 'lake', name: 'Lakeside Residences', area: 'HSR Layout', type: 'Apartment', hub: 'south', detail: 'Block and flat number' },
];

export const dishes = {
  thali: { name: 'Homestyle Chicken Thali', category: 'Combos', desc: 'Comforting chicken curry with a main and a side of your choice.', price: 169, stock: 8, badge: 'BUILD YOUR MEAL' },
  harvest: { name: 'Chana Harvest Bowl', category: 'Bowls', desc: 'Spiced chickpeas, roasted vegetables and brown rice with a squeeze of lime.', price: 139, protein: 18, fiber: 11, portion: '360 g', stock: 7, veg: true },
  biryani: { name: 'Chicken Dum Biryani', category: 'Bowls', desc: 'Slow-cooked basmati and spiced chicken, served with cooling raita.', price: 179, protein: 29, fiber: 4, portion: '400 g', grams: 400, stock: 5 },
  paneer: { name: 'Paneer Masala', category: 'Sides', desc: 'Soft paneer in a slow-cooked tomato and onion gravy.', price: 129, protein: 16, fiber: 4, portion: '250 g', stock: 6, veg: true },
  kebab: { name: 'Chicken Seekh Kebab', category: 'Sides', desc: 'Chargrilled chicken skewers with mint chutney and onions.', price: 149, protein: 24, fiber: 2, portion: '180 g', grams: 180, stock: 5 },
  dal: { name: 'Tadka Dal', category: 'Sides', desc: 'Yellow lentils with a fragrant cumin and chilli tempering.', price: 89, protein: 12, fiber: 8, portion: '250 g', stock: 9, veg: true },
};

export const mainOptions = [
  { id: 'roti', name: 'Whole wheat rotis', portion: '2 pcs', protein: 6, fiber: 5, price: 0 },
  { id: 'rice', name: 'Steamed basmati rice', portion: '180 g', protein: 4, fiber: 1, price: 0 },
  { id: 'brown', name: 'Brown rice', portion: '180 g', protein: 5, fiber: 3, price: 15 },
];
export const sideOptions = [
  { id: 'lentils', name: 'Tadka dal', portion: '120 g', protein: 6, fiber: 4, price: 0 },
  { id: 'veg', name: 'Roasted seasonal vegetables', portion: '120 g', protein: 3, fiber: 5, price: 0 },
  { id: 'paneer', name: 'Paneer masala', portion: '120 g', protein: 8, fiber: 2, price: 25 },
];
export const extraOptions = [
  { id: 'raita', name: 'Cucumber raita', portion: '85 g', protein: 3, fiber: 1, price: 15 },
  { id: 'salad', name: 'Crunchy kachumber salad', portion: '100 g', protein: 2, fiber: 3, price: 20 },
];
function sharingPacks(halfKiloProtein, halfKiloFiber) {
  return Array.from({ length: 10 }, (_, index) => {
    const units = index + 1;
    return {
      id: String(units * 500),
      name: units === 1 ? '500 g' : `${units / 2} kg`,
      protein: units * halfKiloProtein,
      fiber: units * halfKiloFiber,
    };
  });
}
export const bulkPacks = {
  biryani: sharingPacks(36, 5),
  kebab: sharingPacks(65, 5),
};
const defaultSharingPackPrices = { biryani: 180, kebab: 330 };
export function sharingPackUnitPrice(entry) {
  return entry.packPrice ?? entry.packs?.['500'] ?? defaultSharingPackPrices[entry.id];
}
export function sharingPackPrice(entry, pack) {
  return sharingPackUnitPrice(entry) * (Number(pack.id) / 500);
}
export function sharingPackSavings(entry, discount) {
  const portionPaise = Math.round(preorderPrice(entry.price, discount) * 100);
  const portionPer100g = portionPaise * 100 / dishes[entry.id].grams;
  const packPer100g = sharingPackUnitPrice(entry) * 100 / 5;
  return Math.max(0, Math.round(portionPer100g - packPer100g)) / 100;
}

export const mealNames = { lunch: 'Lunch', dinner: 'Dinner' };
export const timeLabel = value => {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`;
};
export function localTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}
export function dayOffset(date, amount) {
  return new Date(Date.parse(date + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
}
export const menuKey = (hub, date, meal) => `${hub}:${date}:${meal}`;
export function defaultMenu(date, meal, hub) {
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const ids = meal === 'lunch'
    ? (weekend ? ['harvest', 'biryani', 'paneer', 'thali', 'dal'] : ['thali', 'harvest', 'biryani', 'paneer', 'kebab', 'dal'])
    : (weekend ? ['biryani', 'thali', 'kebab', 'dal', 'harvest'] : ['thali', 'harvest', 'biryani', 'kebab', 'paneer', 'dal']);
  if (hub === 'south') ids.push(ids.shift());
  return {
    cutoff: meal === 'lunch' ? (weekend ? '10:30' : '10:00') : (weekend ? '17:30' : '17:00'),
    close: meal === 'lunch' ? (weekend ? '12:30' : '12:00') : (weekend ? '19:30' : '19:00'),
    discount: 10,
    arrivalStart: meal === 'lunch' ? '13:00' : '20:00',
    arrivalEnd: meal === 'lunch' ? '13:30' : '20:30',
    entries: ids.map(id => ({ id, price: dishes[id].price, stock: dishes[id].stock, bulk: Boolean(bulkPacks[id]) })),
  };
}
export function resolveMenus(date, hub, db, now = new Date()) {
  const current = localTime(now);
  return Object.fromEntries(Object.keys(mealNames).map(meal => {
    const key = menuKey(hub, date, meal);
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
    const recurring = db.schedules?.[`${hub}:${weekday}:${meal}`];
    const menu = { ...defaultMenu(date, meal, hub), ...recurring, ...db.menus[key] };
    const phase = date < current.date || (date === current.date && current.time >= menu.close)
      ? 'closed' : date === current.date && current.time >= menu.cutoff ? 'late' : 'preorder';
    const entries = menu.entries.map(entry => ({
      ...entry,
      remaining: Math.max(0, entry.stock - (db.stock[key]?.[entry.id] || 0)),
      remainingOptions: Object.fromEntries([...mainOptions, ...sideOptions, ...extraOptions].map(option =>
        [option.id, Math.max(0, entry.stock - (db.stock[key]?.[`${entry.id}:${option.id}`] || 0))])),
    }));
    return [meal, { ...menu, entries, phase }];
  }));
}
export const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
}).format(value);
const round = value => Math.round(value * 100) / 100;
export const preorderPrice = (price, discount) => round(price - round(price * discount / 100));
function sumNutrients(items) {
  const values = {};
  for (const key of ['protein', 'fiber']) {
    const known = items.filter(item => Number.isFinite(item[key]));
    values[key] = known.length ? round(known.reduce((sum, item) => sum + item[key] * (item.qty ?? 1), 0)) : null;
    values[key + 'Partial'] = known.length < items.length || known.some(item => item[key + 'Partial']);
  }
  return values;
}
export function resolveLine(line, menu) {
  const entry = menu.entries.find(item => item.id === line.id);
  const dish = dishes[line.id];
  if (!entry || !dish) throw new Error('An item is no longer on this menu.');
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20) throw new Error('Choose a quantity from 1 to 20.');
  if (line.kind === 'bulk') {
    const pack = entry.bulk && bulkPacks[line.id]?.find(option => option.id === line.pack);
    if (!pack) throw new Error('This sharing pack is unavailable.');
    return { ...pack, price: sharingPackPrice(entry, pack), name: dish.name, packSize: pack.name, stockKeys: [], qty: line.qty };
  }
  if (line.kind !== (line.id === 'thali' ? 'combo' : 'standard')) throw new Error('Choose a valid item option.');
  if (line.kind === 'combo') {
    const main = mainOptions.find(option => option.id === line.main);
    const side = sideOptions.find(option => option.id === line.side);
    const extras = Array.isArray(line.extras) ? [...new Set(line.extras)].map(id => extraOptions.find(option => option.id === id)) : [undefined];
    if (!main || !side || extras.includes(undefined)) throw new Error('Choose one main, one side, and valid add-ons.');
    const chosen = [main, side, ...extras];
    return {
      name: dish.name, description: chosen.map(option => option.name).join(' · '), qty: line.qty,
      price: chosen.reduce((sum, option) => sum + option.price, entry.price),
      ...sumNutrients([{ protein: 21, fiber: 2 }, ...chosen]),
      stockKeys: [line.id, ...chosen.map(option => `${line.id}:${option.id}`)],
    };
  }
  return { ...dish, price: entry.price, description: dish.portion, stockKeys: [line.id], qty: line.qty };
}
export function quote(lines, menu) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 40) throw new Error('Add something to your cart first.');
  if (menu.phase === 'closed') throw new Error('Ordering has closed for this meal.');
  const stock = {};
  const items = lines.map(line => {
    if (line.kind === 'bulk' && menu.phase !== 'preorder') throw new Error('Sharing pack preorders have closed for this meal.');
    const item = resolveLine(line, menu);
    for (const key of item.stockKeys) stock[key] = (stock[key] || 0) + item.qty;
    return item;
  });
  if (menu.phase === 'late') {
    for (const [key, qty] of Object.entries(stock)) {
      const [id, option] = key.split(':');
      const entry = menu.entries.find(item => item.id === id);
      if (qty > (option ? entry.remainingOptions[option] : entry.remaining)) throw new Error(`There are fewer portions of ${dishes[id].name} available. Update your cart to continue.`);
    }
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const eligible = items.reduce((sum, item, i) => sum + (lines[i].kind === 'bulk' ? 0 : item.price * item.qty), 0);
  const savings = round(eligible * menu.discount / 100);
  const discount = menu.phase === 'preorder' ? savings : 0;
  const delivery = 9;
  const platformFee = 0;
  const packingFee = 0;
  const taxable = round(subtotal - discount + delivery + platformFee + packingFee);
  const taxRate = 5;
  const tax = round(taxable * taxRate / 100);
  return {
    items, subtotal, discount, delivery, platformFee, packingFee, taxable, taxRate, tax,
    total: round(taxable + tax),
    missed: menu.phase === 'late' ? savings : 0,
    ...sumNutrients(items),
    stock,
  };
}
