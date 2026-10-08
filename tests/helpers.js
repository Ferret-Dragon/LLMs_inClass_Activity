// Loads the real index.html and app scripts into jsdom so tests drive the UI like a user.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const STORAGE_KEY = 'financer.v1';

const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#34d399' },
  { id: 'media', name: 'Media', color: '#60a5fa' },
  { id: 'travel', name: 'Travel', color: '#f472b6' },
];

function transaction(id, description, amount, categoryId, date) {
  return { id, description, amount, categoryId, date, createdAt: Date.parse(date) };
}

// Scripts run in the order index.html lists them, sharing one global scope.
function scriptPaths(html) {
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => path.join(ROOT, m[1]));
}

function loadApp({ data, hash = '' } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ''), {
    url: `http://localhost/index.html${hash}`,
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.scrollTo = () => {};
  if (data) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const context = dom.getInternalVMContext();
  for (const file of scriptPaths(html)) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  return window;
}

function saved(window) {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
}

// Reopen the app on the same storage, like refreshing the page.
function reload(window, hash = '') {
  return loadApp({ data: saved(window), hash });
}

async function navigate(window, hash) {
  window.location.hash = hash;
  await new Promise((resolve) => window.addEventListener('hashchange', resolve, { once: true }));
}

function choose(window, select, value) {
  select.value = value;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function pressKey(window, target, key) {
  target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
}

module.exports = { CATEGORIES, transaction, loadApp, saved, reload, navigate, choose, pressKey };
