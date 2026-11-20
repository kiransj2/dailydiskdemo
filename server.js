import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bulkPacks, dayOffset, dishes, localTime, locations, mealNames, menuKey, quote, resolveMenus, sharingPackUnitPrice } from './public/model.js';

const publicRoot = fileURLToPath(new URL('./public', import.meta.url)).replace(/\/$/, '');
const dataRoot = resolve(process.env.DAILYDISH_DATA_DIR || '.data');
const dataFile = resolve(dataRoot, 'store.json');
const adminKey = process.env.DAILYDISH_ADMIN_KEY;
const state = await readFile(dataFile, 'utf8').then(JSON.parse).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return { menus: {}, schedules: {}, stock: {}, orders: {} };
});
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
let writes = Promise.resolve();

function mutate(action) {
  const result = writes.then(async () => {
    const next = structuredClone(state);
    const response = action(next);
    await mkdir(dataRoot, { recursive: true });
    const temporary = dataFile + '.tmp';
    await writeFile(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(temporary, dataFile);
    Object.assign(state, next);
    return response;
  });
  writes = result.catch(() => {});
  return result;
}

const send = (response, code, body) => {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};
const bad = message => Object.assign(new Error(message), { status: 400 });
async function bodyOf(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 50000) throw bad('Request is too large.');
  }
  let value;
  try { value = JSON.parse(body); } catch { throw bad('Send valid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw bad('Send a JSON object.');
  return value;
}
function deliveryDate(date, today) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > dayOffset(today, 30) || !Number.isFinite(Date.parse(date + 'T12:00:00Z')) || dayOffset(date, 0) !== date) {
    throw bad('Choose a delivery date within the next 30 days.');
  }
  return date;
}
function getMeal(meal) {
  if (!Object.hasOwn(mealNames, meal)) throw bad('Choose lunch or dinner.');
  return meal;
}
function getSite(id) {
  const site = locations.find(item => item.id === id);
  if (!site) throw bad('Choose a DailyDish delivery location.');
  return site;
}
function cleanSchedule(input) {
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const { cutoff, close, discount, arrivalStart, arrivalEnd } = input;
  if (typeof cutoff !== 'string' || typeof close !== 'string' || !time.test(cutoff) || !time.test(close) || cutoff >= close) {
    throw bad('Set a preorder cutoff earlier than the final ordering time.');
  }
  if (typeof discount !== 'number' || discount < 0 || discount > 100) throw bad('Set a discount from 0 to 100.');
  if (typeof arrivalStart !== 'string' || typeof arrivalEnd !== 'string' || !time.test(arrivalStart) || !time.test(arrivalEnd) || arrivalStart >= arrivalEnd) {
    throw bad('Set a valid delivery window.');
  }
  return { cutoff, close, discount, arrivalStart, arrivalEnd };
}
function cleanMenu(input) {
  const schedule = cleanSchedule(input);
  if (!Array.isArray(input.entries) || input.entries.length > Object.keys(dishes).length) throw bad('Choose items from the dish catalog.');
  const seen = new Set();
  const entries = input.entries.map(entry => {
    if (!entry || !Object.hasOwn(dishes, entry.id) || seen.has(entry.id)) throw bad('Choose each dish once.');
    seen.add(entry.id);
    if (!Number.isInteger(entry.stock) || entry.stock < 0 || entry.stock > 10000 ||
        !Number.isInteger(entry.price) || entry.price < 1 || entry.price > 100000) throw bad('Check the prices and quantities.');
    const { id, price, stock } = entry;
    const bulk = Boolean(bulkPacks[id] && entry.bulk);
    if (!bulk) return { id, price, stock, bulk };
    const packPrice = sharingPackUnitPrice(entry);
    if (!Number.isInteger(packPrice) || packPrice < 1 || packPrice > 100000) throw bad('Check the sharing pack price per 500 g.');
    return { id, price, stock, bulk, packPrice };
  });
  return { ...schedule, entries };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const method = request.method;
    const path = url.pathname;
    if (method === 'GET' && path === '/api/menu') {
      const today = localTime().date;
      const site = url.searchParams.has('site') ? getSite(url.searchParams.get('site')) : locations[0];
      const date = deliveryDate(url.searchParams.get('date') || today, today);
      return send(response, 200, { date, today, menus: resolveMenus(date, site.hub, state) });
    }
    if (method === 'POST' && path === '/api/order') {
      const input = await bodyOf(request);
      const site = getSite(input.site);
      const meal = getMeal(input.meal);
      const detail = typeof input.detail === 'string' ? input.detail.trim() : '';
      if (!detail || detail.length > 140) throw bad('Enter your delivery details.');
      if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(input.requestId)) throw bad('Refresh and try again.');
      const result = await mutate(next => {
        const previous = next.orders[input.requestId];
        if (previous) {
          if (previous.site !== site.id || previous.detail !== detail || previous.summary.date !== input.date || previous.summary.meal !== meal) {
            throw bad('This order reference has already been used.');
          }
          return previous.summary;
        }
        const now = new Date();
        const date = deliveryDate(input.date, localTime(now).date);
        const menu = resolveMenus(date, site.hub, next, now)[meal];
        const bill = quote(input.lines, menu);
        if (input.expectedTotal !== bill.total || input.expectedPhase !== menu.phase) {
          throw bad('The price or ordering window changed. Review your updated cart before continuing.');
        }
        if (menu.phase === 'late') {
          const key = menuKey(site.hub, date, meal);
          const used = next.stock[key] ||= {};
          for (const [id, qty] of Object.entries(bill.stock)) used[id] = (used[id] || 0) + qty;
        }
        const summary = { reference: randomUUID().slice(0, 8).toUpperCase(), total: bill.total, date, meal };
        next.orders[input.requestId] = { summary, bill, site: site.id, detail, arrivalStart: menu.arrivalStart, arrivalEnd: menu.arrivalEnd, created: now.toISOString() };
        return summary;
      });
      return send(response, 201, result);
    }
    if (method === 'POST' && path === '/api/admin/menu') {
      if (adminKey && request.headers['x-admin-key'] !== adminKey) {
        return send(response, 401, { error: 'Enter the admin key to save changes.' });
      }
      const input = await bodyOf(request);
      const site = getSite(input.site);
      const today = localTime().date;
      const date = deliveryDate(input.date, today);
      const meal = getMeal(input.meal);
      const menu = cleanMenu(input);
      await mutate(next => {
        if (input.repeat) {
          const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
          next.schedules ||= {};
          next.schedules[`${site.hub}:${weekday}:${meal}`] = cleanSchedule(input);
        }
        next.menus[menuKey(site.hub, date, meal)] = menu;
      });
      return send(response, 200, { message: 'Menu published.' });
    }
    if (path.startsWith('/api/')) return send(response, 404, { error: 'This action is unavailable.' });
    if (method !== 'GET' && method !== 'HEAD') return send(response, 405, { error: 'Method unavailable.' });
    const file = resolve(publicRoot, path === '/' ? 'index.html' : '.' + decodeURIComponent(path));
    if (!file.startsWith(publicRoot + sep) || !mime[extname(file)]) return send(response, 404, { error: 'Page not found.' });
    const contents = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)], 'X-Content-Type-Options': 'nosniff' });
    response.end(method === 'HEAD' ? undefined : contents);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : request.url.startsWith('/api/order') && !error.code ? 400 : 500);
    if (status === 500) console.error(error);
    send(response, status, { error: status === 500 ? 'Something went wrong. Please try again.' : status === 404 ? 'Page not found.' : error.message });
  }
});

server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => {
  console.log(`DailyDish is running on port ${server.address().port}.`);
});
