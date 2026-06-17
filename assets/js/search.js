/**
 * Shared post search.
 *
 * Exposes window.searchPosts(posts, query) → posts ranked by relevance, with
 * light typo tolerance. Scoring weights title > tags > excerpt; each query word
 * must match somewhere (AND), so unrelated posts drop out. Used by the home
 * page grid and by the popup search bar on post pages.
 *
 * If the page has a #post-search input + #search-results box (post pages), this
 * file also wires the live dropdown. The home page has neither, so that part
 * no-ops there and only the engine is used.
 */
(function () {
  // ── engine ──

  // Levenshtein edit distance with an early bail once it exceeds `max`.
  function lev(a, b, max) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > max) return max + 1;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      let best = i, cur = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        cur[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return max + 1;   // whole row already over budget
      prev = cur;
    }
    return prev[n];
  }

  // Score one query term against one field's text: a substring match (with a
  // word-start bonus) beats a typo-tolerant per-word match.
  function fieldScore(text, term) {
    if (!text) return 0;
    const idx = text.indexOf(term);
    if (idx !== -1) return (idx === 0 || /\W/.test(text[idx - 1])) ? 1 : 0.85;
    const tol = term.length >= 6 ? 2 : 1;   // allow more typos in longer words
    for (const w of text.split(/\W+/))
      if (w && Math.abs(w.length - term.length) <= tol && lev(w, term, tol) <= tol) return 0.6;
    return 0;
  }

  function scorePost(p, terms) {
    const fields = [
      { text: (p.title || '').toLowerCase(), w: 10 },
      { text: (p.tags || []).join(' ').toLowerCase(), w: 6 },
      { text: (p.excerpt || '').toLowerCase(), w: 3 },
    ];
    let total = 0;
    for (const term of terms) {
      let best = 0;
      for (const f of fields) best = Math.max(best, fieldScore(f.text, term) * f.w);
      if (best === 0) return 0;   // this word matched nothing → drop the post
      total += best;
    }
    return total;
  }

  window.searchPosts = function (posts, query) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return posts.slice();
    return posts
      .map(p => ({ p, s: scorePost(p, terms) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.p);
  };

  // ── popup dropdown (post pages only) ──
  const input = document.getElementById('post-search');
  const box = document.getElementById('search-results');
  if (!input || !box) return;

  let posts = [];
  fetch('/posts.json').then(r => r.json()).then(d => { posts = d; }).catch(() => { });

  // aria-live so screen readers announce results as they appear.
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('aria-atomic', 'true');

  const fmt = iso => iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const hide = () => { box.classList.add('hidden'); box.innerHTML = ''; };

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) return hide();
    const hits = window.searchPosts(posts, q).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map(p => `<a class="search-hit" href="/posts/${p.slug}/">` +
          `<span class="search-hit-title">${p.title}</span>` +
          `<span class="search-hit-meta">${fmt(p.date)}</span></a>`).join('')
      : '<div class="search-empty">no matches</div>';
    box.classList.remove('hidden');
  });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  document.addEventListener('click', e => { if (!e.target.closest('.post-search')) hide(); });
})();
