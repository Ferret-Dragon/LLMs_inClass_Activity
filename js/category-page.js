// Category page (#/category/<id>): that category's spending as cards.
let categoryPageId = null;
let editingLabel = false;

function showLabelError(message) {
  const error = document.getElementById('label-error');
  error.textContent = message || '';
  error.hidden = !message;
}

function spendingCard(transaction) {
  const card = el('li', 'spend-card');

  const remove = el('button', 'icon-btn', '✕');
  remove.type = 'button';
  remove.title = 'Delete card';
  remove.setAttribute('aria-label', `Delete ${transaction.description}`);
  remove.addEventListener('click', () => {
    Store.deleteTransaction(transaction.id);
    render();
  });

  card.append(
    el('span', 'spend-card-desc', transaction.description),
    remove,
    el('span', 'spend-card-amount', money.format(transaction.amount)),
    el('span', 'spend-card-date', formatDate(transaction.date))
  );
  return card;
}

function renderCategoryPage(id) {
  const category = Store.getCategory(id);
  // Arriving from another page or category closes any half-finished label edit.
  if (!category || category.id !== categoryPageId) {
    editingLabel = false;
    showLabelError('');
  }
  categoryPageId = category ? category.id : null;

  document.getElementById('category-page-missing').hidden = Boolean(category);
  document.getElementById('category-page-body').hidden = !category;
  document.body.style.setProperty('--cat', category ? category.color : UNCATEGORIZED.color);
  if (!category) return;

  const transactions = Store.getTransactions().filter((t) => t.categoryId === category.id);
  const total = transactions.reduce((acc, t) => acc + t.amount, 0);

  document.getElementById('category-page-name').textContent = category.name;
  document.getElementById('category-page-total').textContent =
    `${money.format(total)} across ${transactions.length} ${transactions.length === 1 ? 'card' : 'cards'}`;
  document.getElementById('spend-cards').replaceChildren(...transactions.map(spendingCard));
  document.getElementById('spend-cards-empty').hidden = transactions.length > 0;

  const labelForm = document.getElementById('label-form');
  if (editingLabel && labelForm.hidden) {
    labelForm.elements.name.value = category.name;
    labelForm.elements.color.value = category.color;
  }
  labelForm.hidden = !editingLabel;
  document.getElementById('label-edit-toggle').hidden = editingLabel;

  const date = document.querySelector('#card-form [name=date]');
  if (!date.value) date.value = todayISO();
}

document.getElementById('card-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  if (!categoryPageId || !data.description.trim() || !(Number(data.amount) > 0)) return;
  Store.addTransaction({ ...data, categoryId: categoryPageId });
  form.reset();
  form.elements.date.value = todayISO();
  form.elements.description.focus();
  render();
});

document.getElementById('label-edit-toggle').addEventListener('click', () => {
  editingLabel = true;
  render();
  document.querySelector('#label-form [name=name]').focus();
});

document.getElementById('label-cancel').addEventListener('click', () => {
  editingLabel = false;
  showLabelError('');
  render();
});

document.getElementById('label-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const { name, color } = Object.fromEntries(new FormData(event.currentTarget));
  const error = Store.updateCategory(categoryPageId, { name, color });
  showLabelError(error);
  if (!error) editingLabel = false;
  render();
});
