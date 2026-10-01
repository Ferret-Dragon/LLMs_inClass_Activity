const RECENT_COUNT = 5;
const UNCATEGORIZED = { id: '', name: 'Uncategorized', color: '#9a9aa8' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

let showAll = false;

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

function transactionRow(transaction) {
  const category = Store.getCategory(transaction.categoryId) || UNCATEGORIZED;

  const row = el('li', 'transaction');
  row.style.setProperty('--cat', category.color);
  row.dataset.category = category.id;

  const main = el('div', 'transaction-main');
  main.append(el('span', 'transaction-desc', transaction.description));
  const meta = el('div', 'transaction-meta');
  meta.append(el('span', 'badge', category.name), el('span', '', formatDate(transaction.date)));
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
  return row;
}

function renderCategoryOptions() {
  const select = document.querySelector('#transaction-form [name=categoryId]');
  const previous = select.value;
  select.replaceChildren(
    ...Store.getCategories().map((c) => {
      const option = el('option', '', c.name);
      option.value = c.id;
      return option;
    })
  );
  if (previous && Store.getCategory(previous)) select.value = previous;
}

function renderTransactions() {
  const all = Store.getTransactions();
  const visible = showAll ? all : all.slice(0, RECENT_COUNT);

  document.getElementById('list-heading').textContent = showAll ? 'All transactions' : 'Recent transactions';
  document.getElementById('transaction-list').replaceChildren(...visible.map(transactionRow));
  document.getElementById('transaction-empty').hidden = all.length > 0;

  const toggle = document.getElementById('toggle-all');
  toggle.hidden = all.length <= RECENT_COUNT;
  toggle.textContent = showAll ? `Show ${RECENT_COUNT} most recent` : `Show all (${all.length})`;

  const total = document.getElementById('transaction-total');
  total.hidden = all.length === 0;
  const sum = all.reduce((acc, t) => acc + t.amount, 0);
  total.replaceChildren('Total spent: ', el('strong', '', money.format(sum)));
}

function render() {
  renderCategoryOptions();
  renderTransactions();
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

document.querySelector('#transaction-form [name=date]').value = todayISO();
render();
