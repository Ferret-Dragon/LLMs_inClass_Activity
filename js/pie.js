// Pie chart of spending per category. Slices link to the category page.
const SVG_NS = 'http://www.w3.org/2000/svg';
const PIE_RADIUS = 90;

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
  return node;
}

function pieSlices() {
  const totals = categoryTotals();
  const slices = Store.getCategories()
    .map((category) => ({ category, amount: (totals.get(category.id) || { amount: 0 }).amount }))
    .filter((slice) => slice.amount > 0);
  if (totals.has('')) slices.push({ category: UNCATEGORIZED, amount: totals.get('').amount });
  return slices;
}

// Angles are fractions of a full turn, starting at 12 o'clock.
function slicePath(start, end) {
  const point = (fraction) => {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return `${(PIE_RADIUS * Math.cos(angle)).toFixed(3)} ${(PIE_RADIUS * Math.sin(angle)).toFixed(3)}`;
  };
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M 0 0 L ${point(start)} A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArc} 1 ${point(end)} Z`;
}

function categoryHref(category) {
  return category.id ? `#/category/${encodeURIComponent(category.id)}` : null;
}

function renderPie() {
  const slices = pieSlices();
  const total = slices.reduce((acc, s) => acc + s.amount, 0);

  document.getElementById('pie-empty').hidden = slices.length > 0;
  document.getElementById('pie-body').hidden = slices.length === 0;

  const svg = document.getElementById('pie-chart');
  const legend = document.getElementById('pie-legend');
  svg.replaceChildren();
  legend.replaceChildren();

  let start = 0;
  for (const { category, amount } of slices) {
    const share = amount / total;
    const percent = `${(share * 100).toFixed(1)}%`;
    const label = `${category.name}: ${money.format(amount)} (${percent})`;
    const href = categoryHref(category);

    // A single full-circle slice cannot be drawn as an arc.
    const shape =
      slices.length === 1
        ? svgEl('circle', { r: PIE_RADIUS, fill: category.color })
        : svgEl('path', { d: slicePath(start, start + share), fill: category.color });
    shape.classList.add('pie-slice');
    const title = svgEl('title');
    title.textContent = label;
    shape.append(title);

    if (href) {
      const link = svgEl('a', { href, 'aria-label': label });
      link.dataset.category = category.id;
      link.append(shape);
      svg.append(link);
    } else {
      svg.append(shape);
    }

    const item = el('li');
    const row = el(href ? 'a' : 'span', 'pie-legend-row');
    if (href) row.href = href;
    row.style.setProperty('--cat', category.color);
    row.append(
      el('span', 'swatch'),
      el('span', 'pie-legend-name', category.name),
      el('span', 'pie-legend-percent', percent),
      el('span', 'pie-legend-amount', money.format(amount))
    );
    item.append(row);
    legend.append(item);

    start += share;
  }
}
