// Category box on the home page: every category with its color and spending,
// plus a "+" tile that opens the form for adding a category.
let addingCategory = false;

function showCategoryError(message) {
  const error = document.getElementById('category-error');
  error.textContent = message || '';
  error.hidden = !message;
}

function categoryTotals() {
  const totals = new Map();
  for (const t of Store.getTransactions()) {
    const id = Store.getCategory(t.categoryId) ? t.categoryId : '';
    const entry = totals.get(id) || { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    totals.set(id, entry);
  }
  return totals;
}

function categoryItem(category, totals) {
  const { amount, count } = totals.get(category.id) || { amount: 0, count: 0 };

  const item = el('li');
  const link = el('a', 'category-item');
  link.href = `#/category/${encodeURIComponent(category.id)}`;
  link.title = `Open ${category.name}`;
  link.style.setProperty('--cat', category.color);
  item.append(link);

  link.append(
    el('span', 'swatch'),
    el('span', 'category-name', category.name),
    el('span', 'category-count', `${count} ${count === 1 ? 'transaction' : 'transactions'}`),
    el('span', 'category-amount', money.format(amount))
  );
  return item;
}

function addCategoryTile() {
  const item = el('li');
  const button = el('button', 'category-add', '+');
  button.type = 'button';
  button.title = 'Add category';
  button.setAttribute('aria-label', 'Add category');
  button.setAttribute('aria-expanded', String(addingCategory));
  button.addEventListener('click', () => {
    addingCategory = !addingCategory;
    showCategoryError('');
    renderCategoryBox();
    if (addingCategory) document.querySelector('#category-form [name=name]').focus();
  });
  item.append(button);
  return item;
}

function renderCategoryBox() {
  const categories = Store.getCategories();
  const totals = categoryTotals();
  document
    .getElementById('category-list')
    .replaceChildren(...categories.map((c) => categoryItem(c, totals)), addCategoryTile());
  document.getElementById('category-form').hidden = !addingCategory;
}

document.getElementById('category-cancel').addEventListener('click', () => {
  addingCategory = false;
  showCategoryError('');
  renderCategoryBox();
});

document.getElementById('category-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = Store.addCategory(Object.fromEntries(new FormData(form)));
  showCategoryError(error);
  if (!error) {
    form.elements.name.value = '';
    addingCategory = false;
  }
  render();
});
