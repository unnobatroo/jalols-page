import { readPostData, searchPosts } from '../lib/search';

const posts = readPostData();
const grid = document.querySelector<HTMLElement>('#card-grid');
const search = document.querySelector<HTMLInputElement>('#search');
const sortButton = document.querySelector<HTMLButtonElement>('#sort-date');
const filterRow = document.querySelector<HTMLElement>('#filter-row');
const noResults = document.querySelector<HTMLElement>('#no-results');
const resultsStatus = document.querySelector<HTMLElement>('#results-status');
const cards = new Map(
  [...document.querySelectorAll<HTMLElement>('[data-post-card]')]
    .map((card) => [card.dataset.slug ?? '', card]),
);

let activeTag = 'all';
let query = '';
let sortAscending = false;

const requestedTag = new URLSearchParams(location.search).get('tag');
if (requestedTag && document.querySelector(`[data-tag="${CSS.escape(requestedTag)}"]`)) {
  activeTag = requestedTag;
}

function syncTagButtons(): void {
  filterRow?.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((button) => {
    const active = button.dataset.tag === activeTag;
    button.classList.toggle('filter-btn--active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function render(): void {
  if (!grid) return;
  let visible = posts.filter((post) => activeTag === 'all' || post.tags.includes(activeTag));
  visible = query
    ? searchPosts(visible, query)
    : visible.sort((a, b) => sortAscending
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date));

  const visibleSlugs = new Set(visible.map((post) => post.slug));
  cards.forEach((card, slug) => card.classList.toggle('hidden', !visibleSlugs.has(slug)));
  visible.forEach((post) => {
    const card = cards.get(post.slug);
    if (card) grid.append(card);
  });

  noResults?.classList.toggle('hidden', visible.length > 0);
  if (resultsStatus) {
    resultsStatus.textContent = visible.length === 0
      ? 'No results found.'
      : `${visible.length} post${visible.length === 1 ? '' : 's'} shown.`;
  }
}

filterRow?.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-tag]');
  if (!button?.dataset.tag) return;
  activeTag = button.dataset.tag;
  syncTagButtons();
  render();
});

grid?.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-card-tag]');
  if (!button?.dataset.cardTag) return;
  activeTag = button.dataset.cardTag;
  syncTagButtons();
  render();
  document.querySelector(`[data-tag="${CSS.escape(activeTag)}"]`)?.scrollIntoView({ block: 'nearest' });
});

search?.addEventListener('input', () => {
  query = search.value.trim();
  render();
});

sortButton?.addEventListener('click', () => {
  sortAscending = !sortAscending;
  const arrow = sortButton.querySelector<HTMLElement>('.sort-arrow');
  if (arrow) arrow.textContent = sortAscending ? '↑' : '↓';
  sortButton.setAttribute('aria-label', sortAscending
    ? 'Sort by date, oldest first'
    : 'Sort by date, newest first');
  render();
});

syncTagButtons();
render();
