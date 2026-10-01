// Category box on the home page: every category with its color and spending.
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

function renderCategoryBox() {
  const categories = Store.getCategories();
  const totals = categoryTotals();
  document.getElementById('category-list').replaceChildren(...categories.map((c) => categoryItem(c, totals)));
  document.getElementById('category-empty').hidden = categories.length > 0;
}
