import { readPostData, searchPosts } from '../lib/search';

const input = document.querySelector<HTMLInputElement>('#post-search');
const results = document.querySelector<HTMLElement>('#search-results');
const posts = readPostData();

const hide = () => {
  results?.classList.add('hidden');
  results?.replaceChildren();
};

const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

input?.addEventListener('input', () => {
  if (!results) return;
  const query = input.value.trim();
  if (!query) return hide();

  const hits = searchPosts(posts, query).slice(0, 8);
  results.replaceChildren();

  if (hits.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'no matches';
    results.append(empty);
  } else {
    hits.forEach((post) => {
      const link = document.createElement('a');
      link.className = 'search-hit';
      link.href = `/posts/${post.slug}/`;
      const title = document.createElement('span');
      title.className = 'search-hit-title';
      title.textContent = post.title;
      const date = document.createElement('span');
      date.className = 'search-hit-meta';
      date.textContent = formatDate(post.date);
      link.append(title, date);
      results.append(link);
    });
  }

  results.classList.remove('hidden');
});

input?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hide();
});

document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('.post-search')) hide();
});
