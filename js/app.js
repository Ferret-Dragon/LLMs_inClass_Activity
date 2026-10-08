const RECENT_COUNT = 5;
const UNCATEGORIZED = { id: '', name: 'Uncategorized', color: '#9a9aa8' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

let showAll = false;
// Transaction whose category picker is open, if any.
let editingTransactionId = null;
// Category ids the list is filtered to; empty means every category.
const activeFilters = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function closeCategoryPicker() {
  editingTransactionId = null;
  render();
}

// Dropdown that relabels a transaction in place, without deleting and re-entering it.
function categoryPicker(transaction) {
  const select = el('select', 'category-picker');
  select.setAttribute('aria-label', `Category for ${transaction.description}`);
  for (const category of Store.getCategories()) {
    const option = el('option', '', category.name);
    option.value = category.id;
    select.append(option);
  }
  if (!Store.getCategory(transaction.categoryId)) {
    const option = el('option', '', UNCATEGORIZED.name);
    option.value = transaction.categoryId;
    select.prepend(option);
  }
  select.value = transaction.categoryId;

  select.addEventListener('click', (event) => event.stopPropagation());
  select.addEventListener('change', () => {
    Store.updateTransaction(transaction.id, { categoryId: select.value });
    closeCategoryPicker();
  });
  select.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCategoryPicker();
  });
  select.addEventListener('blur', () => {
    if (editingTransactionId === transaction.id) closeCategoryPicker();
  });
  return select;
}

function openCategoryPicker(transaction) {
  editingTransactionId = transaction.id;
  render();
  const picker = document.querySelector('select.category-picker');
  if (picker) picker.focus();
}

// The category badge, or the picker while this transaction is being relabeled.
function categoryLabel(transaction, category) {
  if (editingTransactionId === transaction.id) return categoryPicker(transaction);

  const badge = el('button', 'badge', category.name);
  badge.type = 'button';
  badge.title = 'Change category';
  badge.setAttribute('aria-label', `Change category for ${transaction.description}`);
  badge.addEventListener('click', (event) => {
    event.stopPropagation();
    openCategoryPicker(transaction);
  });
  return badge;
}

// Clicking anywhere on a row or card that isn't a control opens its category picker.
function openPickerOnClick(node, transaction) {
  node.classList.add('relabelable');
  node.addEventListener('click', (event) => {
    if (event.target.closest('button, select, input, a')) return;
    openCategoryPicker(transaction);
  });
}

function transactionRow(transaction) {
  const category = Store.getCategory(transaction.categoryId) || UNCATEGORIZED;

  const row = el('li', 'transaction');
  row.style.setProperty('--cat', category.color);
  row.dataset.category = category.id;

  const main = el('div', 'transaction-main');
  main.append(el('span', 'transaction-desc', transaction.description));
  const meta = el('div', 'transaction-meta');
  meta.append(categoryLabel(transaction, category), el('span', '', formatDate(transaction.date)));
  main.append(meta);

  const remove = el('button', 'icon-btn', '✕');
  remove.type = 'button';
  remove.title = 'Delete transaction';
  remove.setAttribute('aria-label', `Delete ${transaction.description}`);
  remove.addEventListener('click', () => {
    Store.deleteTransaction(transaction.id);
    render();
  });

  row.append(main, el('span', 'transaction-amount', money.format(transaction.amount)), remove);
  openPickerOnClick(row, transaction);
  return row;
}

function renderCategoryOptions() {
  const select = document.querySelector('#transaction-form [name=categoryId]');
  const previous = select.value;
  const categories = Store.getCategories();
  select.replaceChildren(
    ...categories.map((c) => {
      const option = el('option', '', c.name);
      option.value = c.id;
      return option;
    })
  );
  if (categories.length === 0) {
    const placeholder = el('option', '', 'Create a category first');
    placeholder.value = '';
    select.append(placeholder);
  }
  if (previous && Store.getCategory(previous)) select.value = previous;
}

function effectiveCategoryId(transaction) {
  return Store.getCategory(transaction.categoryId) ? transaction.categoryId : UNCATEGORIZED.id;
}

function filterChip(label, color, pressed, onClick) {
  const chip = el('button', 'chip', label);
  chip.type = 'button';
  chip.style.setProperty('--cat', color);
  chip.setAttribute('aria-pressed', String(pressed));
  chip.addEventListener('click', onClick);
  return chip;
}

function renderFilterChips(all) {
  const options = Store.getCategories();
  if (all.some((t) => effectiveCategoryId(t) === UNCATEGORIZED.id)) options.push(UNCATEGORIZED);

  // Drop filters for categories that have since been deleted.
  for (const id of activeFilters) {
    if (!options.some((c) => c.id === id)) activeFilters.delete(id);
  }

  const chips = options.map((category) =>
    filterChip(category.name, category.color, activeFilters.has(category.id), () => {
      if (!activeFilters.delete(category.id)) activeFilters.add(category.id);
      renderTransactions();
    })
  );
  const allChip = filterChip('All', 'var(--accent-bright)', activeFilters.size === 0, () => {
    activeFilters.clear();
    renderTransactions();
  });

  const container = document.getElementById('filter-chips');
  container.replaceChildren(allChip, ...chips);
  container.hidden = all.length === 0;
}

function renderTransactions() {
  const all = Store.getTransactions();
  renderFilterChips(all);

  const filtering = activeFilters.size > 0;
  const matching = filtering ? all.filter((t) => activeFilters.has(effectiveCategoryId(t))) : all;
  const visible = showAll ? matching : matching.slice(0, RECENT_COUNT);

  document.getElementById('list-heading').textContent = showAll ? 'All transactions' : 'Recent transactions';
  document.getElementById('transaction-list').replaceChildren(...visible.map(transactionRow));
  document.getElementById('transaction-empty').hidden = all.length > 0;
  document.getElementById('filter-empty').hidden = all.length === 0 || matching.length > 0;

  const toggle = document.getElementById('toggle-all');
  toggle.hidden = matching.length <= RECENT_COUNT;
  toggle.textContent = showAll ? `Show ${RECENT_COUNT} most recent` : `Show all (${matching.length})`;

  const total = document.getElementById('transaction-total');
  total.hidden = matching.length === 0;
  const sum = matching.reduce((acc, t) => acc + t.amount, 0);
  total.replaceChildren(filtering ? 'Total in selected categories: ' : 'Total spent: ', el('strong', '', money.format(sum)));
}

function currentRoute() {
  const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
  if (view === 'category' && id) return { view: 'category', id: decodeURIComponent(id) };
  if (view === 'help') return { view: 'help' };
  return { view: 'home' };
}

function render() {
  const route = currentRoute();
  for (const view of document.querySelectorAll('#app > .view')) {
    view.hidden = view.id !== `view-${route.view}`;
  }
  document.body.classList.toggle('category-view', route.view === 'category');
  for (const link of document.querySelectorAll('.nav a')) {
    if (link.dataset.view === route.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (route.view === 'category') {
    renderCategoryPage(route.id);
  } else if (route.view === 'home') {
    renderCategoryOptions();
    renderPie();
    renderCategoryBox();
    renderTransactions();
  }
}

document.getElementById('transaction-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (!data.description.trim() || !(Number(data.amount) > 0)) return;
  Store.addTransaction(data);
  form.reset();
  form.elements.date.value = todayISO();
  form.elements.description.focus();
  render();
});

document.getElementById('toggle-all').addEventListener('click', () => {
  showAll = !showAll;
  renderTransactions();
});

window.addEventListener('hashchange', () => {
  editingTransactionId = null;
  window.scrollTo(0, 0);
  render();
});

document.querySelector('#transaction-form [name=date]').value = todayISO();
render();
