// Issue #8: "Instead of being a button that says "edit categories", I want it to be a '+'
// button in the categories that says "add category" when hovered on."
const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, loadApp, saved } = require('./helpers');

function seed() {
  return { categories: CATEGORIES.map((c) => ({ ...c })), transactions: [] };
}

function categoryBox(window) {
  return window.document.getElementById('category-box');
}

function isShown(node) {
  for (let n = node; n; n = n.parentElement) if (n.hidden) return false;
  return true;
}

function plusButton(window) {
  return [...categoryBox(window).querySelectorAll('button')].find((b) => b.textContent.trim() === '+');
}

// What a user sees when hovering: the native tooltip (title) or a tooltip element
// linked with aria-describedby.
function hoverText(window, button) {
  if (button.title) return button.title;
  const tooltip = button.getAttribute('aria-describedby');
  return tooltip ? window.document.getElementById(tooltip).textContent : '';
}

function shownCategoryNames(window) {
  return [...window.document.querySelectorAll('#category-list .category-name')].map((n) => n.textContent);
}

test('the category box no longer has an "Edit categories" button', () => {
  const window = loadApp({ data: seed() });

  const editButton = [...categoryBox(window).querySelectorAll('button')].find((b) =>
    /edit categories/i.test(b.textContent)
  );
  assert.equal(editButton, undefined);
});

test('a "+" button sits in among the categories', () => {
  const window = loadApp({ data: seed() });

  const plus = plusButton(window);
  assert.ok(plus, 'the category box has a button labelled "+"');
  assert.ok(isShown(plus), 'the "+" button is visible without entering an edit mode');
  assert.ok(window.document.getElementById('category-list').contains(plus), 'the "+" is part of the category list');
});

test('hovering the "+" button says "Add category"', () => {
  const window = loadApp({ data: seed() });

  const plus = plusButton(window);
  assert.ok(plus, 'the category box has a button labelled "+"');
  assert.match(hoverText(window, plus), /^add category$/i);
  assert.match(plus.getAttribute('aria-label') || hoverText(window, plus), /^add category$/i, 'screen readers hear the same name');
});

test('the "+" button lets the user add a category that then shows in the box', () => {
  const window = loadApp({ data: seed() });

  const plus = plusButton(window);
  assert.ok(plus, 'the category box has a button labelled "+"');
  plus.click();

  const form = [...categoryBox(window).querySelectorAll('form')].find(isShown);
  assert.ok(form, 'clicking "+" shows a form for the new category');
  form.querySelector('input[name="name"]').value = 'Dining out';
  form.requestSubmit();

  assert.ok(
    saved(window).categories.some((c) => c.name === 'Dining out'),
    'the new category is saved'
  );
  assert.ok(shownCategoryNames(window).includes('Dining out'), 'the new category appears in the box');
  assert.ok(plusButton(window), 'the "+" button is still there for adding another');
});
