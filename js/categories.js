// Category box on the home page: every category with its color and spending,
// plus an edit mode to add, rename, recolor and delete categories.
let editingCategories = false;
let pendingDeleteId = null;

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

  const item = el('li', 'category-item');
  item.style.setProperty('--cat', category.color);
  item.dataset.category = category.id;

  item.append(
    el('span', 'swatch'),
    el('span', 'category-name', category.name),
    el('span', 'category-count', `${count} ${count === 1 ? 'transaction' : 'transactions'}`),
    el('span', 'category-amount', money.format(amount))
  );
  return item;
}

function categoryEditItem(category) {
  const item = el('li', 'category-item editing');
  item.dataset.category = category.id;

  const color = el('input');
  color.type = 'color';
  color.value = category.color;
  color.setAttribute('aria-label', `Color for ${category.name}`);
  color.addEventListener('change', () => {
    showCategoryError(Store.updateCategory(category.id, { color: color.value }));
    render();
  });

  const name = el('input');
  name.type = 'text';
  name.maxLength = 30;
  name.value = category.name;
  name.setAttribute('aria-label', `Name for ${category.name}`);
  name.addEventListener('change', () => {
    showCategoryError(Store.updateCategory(category.id, { name: name.value }));
    render();
  });

  // Delete asks for a second click instead of a blocking confirm dialog.
  const confirming = pendingDeleteId === category.id;
  const remove = el('button', `btn btn-danger${confirming ? ' confirming' : ''}`, confirming ? 'Confirm delete' : 'Delete');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    if (confirming) {
      Store.deleteCategory(category.id);
      pendingDeleteId = null;
      showCategoryError('');
    } else {
      pendingDeleteId = category.id;
    }
    render();
  });

  item.append(color, name, remove);
  return item;
}

function renderCategoryBox() {
  const categories = Store.getCategories();
  const totals = categoryTotals();
  const items = categories.map((c) => (editingCategories ? categoryEditItem(c) : categoryItem(c, totals)));
  document.getElementById('category-list').replaceChildren(...items);
  document.getElementById('category-empty').hidden = categories.length > 0 || editingCategories;
  document.getElementById('category-form').hidden = !editingCategories;
  document.getElementById('category-edit-toggle').textContent = editingCategories ? 'Done' : 'Edit categories';
}

document.getElementById('category-edit-toggle').addEventListener('click', () => {
  editingCategories = !editingCategories;
  pendingDeleteId = null;
  showCategoryError('');
  renderCategoryBox();
});

document.getElementById('category-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = Store.addCategory(Object.fromEntries(new FormData(form)));
  showCategoryError(error);
  if (!error) form.elements.name.value = '';
  render();
});
