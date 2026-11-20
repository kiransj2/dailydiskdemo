import assert from 'node:assert/strict';
import test from 'node:test';
import { bulkPacks, defaultMenu, menuKey, quote, resolveMenus } from '../public/model.js';

const blank = { menus: {}, schedules: {}, stock: {} };
const date = '2026-11-20';
const at = time => new Date(`${date}T${time}:00+05:30`);
const bowl = qty => ({ id: 'harvest', kind: 'standard', qty });
const combo = { id: 'thali', kind: 'combo', qty: 1, main: 'roti', side: 'lentils', extras: ['raita', 'salad'] };
const pack = { id: 'biryani', kind: 'bulk', pack: '1000', qty: 1 };
const lunch = (time, db = blank) => resolveMenus(date, 'east', db, at(time)).lunch;

test('the configured cutoffs switch pricing and close ordering at the exact minute', () => {
  assert.equal(lunch('09:59').phase, 'preorder');
  assert.equal(lunch('10:00').phase, 'late');
  assert.equal(lunch('12:00').phase, 'closed');
  const early = quote([bowl(1)], lunch('09:59'));
  const late = quote([bowl(1)], lunch('10:00'));
  assert.equal(early.discount, 13.9);
  assert.equal(late.discount, 0);
  assert.equal(late.missed, 13.9);
  assert.throws(() => quote([bowl(1)], lunch('12:00')), /closed/);
});

test('a published date overrides a repeating weekday schedule', () => {
  const menu = defaultMenu(date, 'lunch', 'east');
  const repeating = { cutoff: '10:45', close: '12:30', discount: 15 };
  const db = { stock: {}, schedules: { 'east:5:lunch': repeating }, menus: {} };
  assert.equal(lunch('10:15', db).phase, 'preorder');
  assert.equal(quote([bowl(1)], lunch('10:15', db)).discount, 20.85);
  db.menus[menuKey('east', date, 'lunch')] = menu;
  assert.equal(lunch('10:15', db).phase, 'late');
  assert.equal(quote([bowl(1)], lunch('10:15', db)).missed, 13.9);
});

test('combos total nutrition and use stock across cart lines', () => {
  const early = quote([combo, bowl(2)], lunch('09:00'));
  assert.equal(early.protein, 74);
  assert.equal(early.fiber, 37);
  const db = { ...blank, stock: { [menuKey('east', date, 'lunch')]: { 'thali:raita': 7 } } };
  assert.doesNotThrow(() => quote([combo], lunch('11:00', db)));
  assert.throws(() => quote([combo, { ...combo, side: 'veg' }], lunch('11:00', db)), /fewer portions/);
  assert.throws(() => quote([{ ...combo, main: null }], lunch('09:00')), /one main/);
});

test('sharing packs scale the 500 g price and only allow advance orders', () => {
  const key = menuKey('east', date, 'lunch');
  const menu = defaultMenu(date, 'lunch', 'east');
  const entry = menu.entries.find(entry => entry.id === 'biryani');
  const db = { ...blank, menus: { [key]: menu } };
  assert.equal(quote([pack], lunch('09:00', db)).subtotal, 458);
  entry.packs = { '500': 225, '1000': 449, '5000': 1999 };
  const bill = quote([pack], lunch('09:00', db));
  assert.equal(bill.subtotal, 450);
  assert.equal(bill.discount, 0);
  assert.equal(bill.protein, 72);
  assert.deepEqual(bulkPacks.biryani.map(size => Number(size.id)), Array.from({ length: 10 }, (_, index) => (index + 1) * 500));
  entry.packPrice = 210;
  assert.equal(quote([{ ...pack, pack: '1500' }], lunch('09:00', db)).subtotal, 630);
  const largest = quote([{ ...pack, pack: '5000' }], lunch('09:00', db));
  assert.equal(largest.subtotal, 2100);
  assert.equal(largest.fiber, 50);
  assert.throws(() => quote([{ ...pack, pack: '5500' }], lunch('09:00', db)), /unavailable/);
  assert.throws(() => quote([{ ...pack, pack: '750' }], lunch('09:00', db)), /unavailable/);
  assert.throws(() => quote([pack], lunch('10:00', db)), /Sharing pack preorders/);
});
