// Issue #7: "I accidentally mislabeled one of my purchases. I don't want to delete it
// and have to refill it out. I want to instead be able to click on it and change the label."
const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, transaction, loadApp, saved, reload, navigate, choose, pressKey } = require('./helpers');

// "Concert tickets" was filed under Groceries by mistake; it belongs in Media.
function seed() {
  return {
    categories: CATEGORIES.map((c) => ({ ...c })),
    transactions: [
      transaction('t1', 'Weekly shop', 84.37, 'groceries', '2026-09-24'),
      transaction('t2', 'Concert tickets', 65, 'groceries', '2026-09-28'),
      transaction('t3', 'Train tickets', 120, 'travel', '2026-09-27'),
    ],
  };
}

function row(window, description) {
  return [...window.document.querySelectorAll('.transaction')].find(
    (r) => r.querySelector('.transaction-desc').textContent === description
  );
}

function card(window, description) {
  return [...window.document.querySelectorAll('.spend-card')].find(
    (c) => c.querySelector('.spend-card-desc').textContent === description
  );
}

function categoryPicker(element, description) {
  return element.querySelector(`select[aria-label="Category for ${description}"]`);
}

function categoryBoxAmount(window, name) {
  const item = [...window.document.querySelectorAll('#category-list .category-item')].find(
    (i) => i.querySelector('.category-name').textContent === name
  );
  return item.querySelector('.category-amount').textContent;
}

test('clicking a transaction on Home opens a category picker set to its current label', () => {
  const window = loadApp({ data: seed() });

  row(window, 'Concert tickets').click();

  const picker = categoryPicker(row(window, 'Concert tickets'), 'Concert tickets');
  assert.ok(picker, 'a category picker appears in the clicked row');
  assert.equal(picker.value, 'groceries');
  assert.deepEqual(
    [...picker.options].map((o) => o.textContent),
    ['Groceries', 'Media', 'Travel'],
    'every category is offered'
  );
  assert.equal(window.document.activeElement, picker, 'the picker gets focus');
});

test('choosing a new category relabels the same transaction without re-entering it', () => {
  const window = loadApp({ data: seed() });

  row(window, 'Concert tickets').click();
  choose(window, categoryPicker(row(window, 'Concert tickets'), 'Concert tickets'), 'media');

  const stored = saved(window).transactions;
  assert.equal(stored.length, 3, 'nothing was deleted or duplicated');
  assert.deepEqual(
    stored.find((t) => t.id === 't2'),
    { ...seed().transactions[1], categoryId: 'media' },
    'only the category changed; id, description, amount and date are kept'
  );

  const updated = row(window, 'Concert tickets');
  assert.equal(categoryPicker(updated, 'Concert tickets'), null, 'the picker closes after choosing');
  assert.equal(updated.querySelector('.badge').textContent, 'Media');
  assert.equal(updated.style.getPropertyValue('--cat'), '#60a5fa', 'the row takes the new category color');
});

test('the new label is saved and category totals move with it', () => {
  const window = loadApp({ data: seed() });
  assert.equal(categoryBoxAmount(window, 'Groceries'), '$149.37');
  assert.equal(categoryBoxAmount(window, 'Media'), '$0.00');

  row(window, 'Concert tickets').click();
  choose(window, categoryPicker(row(window, 'Concert tickets'), 'Concert tickets'), 'media');

  assert.equal(categoryBoxAmount(window, 'Groceries'), '$84.37');
  assert.equal(categoryBoxAmount(window, 'Media'), '$65.00');

  const refreshed = reload(window);
  assert.equal(row(refreshed, 'Concert tickets').querySelector('.badge').textContent, 'Media');
  assert.equal(categoryBoxAmount(refreshed, 'Media'), '$65.00');
});

test('pressing Escape closes the picker without changing the label', () => {
  const window = loadApp({ data: seed() });

  row(window, 'Concert tickets').click();
  const picker = categoryPicker(row(window, 'Concert tickets'), 'Concert tickets');
  picker.value = 'travel';
  pressKey(window, picker, 'Escape');

  assert.equal(categoryPicker(row(window, 'Concert tickets'), 'Concert tickets'), null);
  assert.equal(row(window, 'Concert tickets').querySelector('.badge').textContent, 'Groceries');
  assert.equal(saved(window).transactions.find((t) => t.id === 't2').categoryId, 'groceries');
});

test('the delete button still deletes instead of opening the picker', () => {
  const window = loadApp({ data: seed() });

  row(window, 'Concert tickets').querySelector('[aria-label="Delete Concert tickets"]').click();

  assert.equal(row(window, 'Concert tickets'), undefined);
  assert.equal(saved(window).transactions.length, 2);
});

test('clicking a card on a category page moves it to the chosen category', async () => {
  const window = loadApp({ data: seed(), hash: '#/category/groceries' });

  card(window, 'Concert tickets').click();
  const picker = categoryPicker(card(window, 'Concert tickets'), 'Concert tickets');
  assert.ok(picker, 'a category picker appears on the clicked card');
  choose(window, picker, 'media');

  assert.equal(card(window, 'Concert tickets'), undefined, 'the card leaves the Groceries page');
  assert.ok(card(window, 'Weekly shop'), 'other Groceries cards stay');

  await navigate(window, '#/category/media');
  assert.ok(card(window, 'Concert tickets'), 'the card now shows on the Media page');
  assert.equal(saved(window).transactions.length, 3);
});
