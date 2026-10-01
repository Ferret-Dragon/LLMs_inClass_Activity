// Data layer: categories and transactions persisted in localStorage.
const Store = (() => {
  const KEY = 'financer.v1';

  const DEFAULT_CATEGORIES = [
    { id: 'groceries', name: 'Groceries', color: '#34d399' },
    { id: 'media', name: 'Media', color: '#60a5fa' },
    { id: 'toys', name: 'Toys', color: '#fbbf24' },
    { id: 'travel', name: 'Travel', color: '#f472b6' },
  ];

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.categories) && Array.isArray(data.transactions)) return data;
    } catch (err) {
      console.warn('Financer: could not read saved data, starting fresh', err);
    }
    return { categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), transactions: [] };
  }

  let state = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getCategories() {
    return state.categories.slice();
  }

  function getCategory(id) {
    return state.categories.find((c) => c.id === id) || null;
  }

  function nameTaken(name, exceptId) {
    const wanted = name.trim().toLowerCase();
    return state.categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === wanted);
  }

  // Category writes return an error message, or null on success.
  function addCategory({ name, color }) {
    name = name.trim();
    if (!name) return 'Category name is required.';
    if (nameTaken(name)) return `A category named "${name}" already exists.`;
    state.categories.push({ id: newId(), name, color });
    save();
    return null;
  }

  function updateCategory(id, { name, color }) {
    const category = getCategory(id);
    if (!category) return 'Category not found.';
    if (name !== undefined) {
      name = name.trim();
      if (!name) return 'Category name is required.';
      if (nameTaken(name, id)) return `A category named "${name}" already exists.`;
      category.name = name;
    }
    if (color !== undefined) category.color = color;
    save();
    return null;
  }

  // Transactions keep their amounts and show as Uncategorized afterwards.
  function deleteCategory(id) {
    state.categories = state.categories.filter((c) => c.id !== id);
    save();
  }

  // Newest first: by transaction date, then by when it was entered.
  function getTransactions() {
    return state.transactions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  function addTransaction({ description, amount, categoryId, date }) {
    const transaction = {
      id: newId(),
      description: description.trim(),
      amount: Math.round(Number(amount) * 100) / 100,
      categoryId,
      date,
      createdAt: Date.now(),
    };
    state.transactions.push(transaction);
    save();
    return transaction;
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter((t) => t.id !== id);
    save();
  }

  return {
    getCategories,
    getCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    getTransactions,
    addTransaction,
    deleteTransaction,
  };
})();
