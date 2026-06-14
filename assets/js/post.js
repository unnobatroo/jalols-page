/**
 * Shared post renderer, loaded by every generated /posts/<slug>/ page.
 *
 * The page sets `window.POST_SLUG` (build.js bakes it in); we fetch that post's
 * markdown, parse its front matter, render the body with marked + highlight.js,
 * then upgrade each code block with a language label, line numbers, and a
 * collapse toggle. One script serves every post — no per-post logic here.
 */
(function () {
  const mount = document.getElementById('post-mount');
  const slug = window.POST_SLUG;   // baked into the page by build.js
  if (!slug) { mount.textContent = 'No post specified.'; return; }

  fetch(`/posts/${slug}.md`)
    .then(res => { if (!res.ok) throw new Error(); return res.text(); })
    .then(render)
    .catch(() => { mount.textContent = 'Post not found.'; });

  function render(raw) {
    // Parse front matter (same format build.js reads). Missing fields fall back.
    const meta = { title: slug, date: '', tags: [], status: '', type: 'post' };
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const content = fm ? raw.slice(fm[0].length) : raw;   // body after front matter
    if (fm) {
      const f = fm[1];
      const get = k => (f.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim() || '';
      meta.title  = get('title') || slug;
      meta.date   = get('date');
      meta.type   = get('type') || 'post';
      meta.status = get('status');
      const tl = (f.match(/^tags:\s*\[(.+)\]$/m) || [])[1] || '';
      meta.tags = tl.split(',').map(t => t.trim()).filter(Boolean);
    }

    document.title = `${meta.title} — Jaloliddin Ismailov`;
    // Projects highlight "work" in the nav, posts highlight "blog".
    document.body.dataset.page = meta.type === 'project' ? 'work' : 'blog';

    const fmtDate = iso => iso
      ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // Render header + markdown body (marked's defaults already enable GFM).
    mount.innerHTML = `
      <div class="post-header">
        <h1>${meta.title}</h1>
        <div class="post-meta">
          ${[fmtDate(meta.date), meta.status].filter(Boolean).join(' · ')}
          ${meta.tags.length ? ' · ' + meta.tags.map(t => `<a class="tag" href="/?tag=${encodeURIComponent(t)}">${t}</a>`).join('') : ''}
        </div>
      </div>
      <div class="post-body" id="post-body">${marked.parse(content)}</div>`;

    // Syntax-highlight every code block.
    mount.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));

    // Wrap each <pre> so it gains a header (language + collapse button) and a
    // line-number gutter. Final structure: .code-block-wrap > header + body(nums + pre).
    mount.querySelectorAll('#post-body pre').forEach(pre => {
      const code = pre.querySelector('code');
      // marked tags the language as a "language-xxx" class; fall back to "code".
      const lang = ([...(code?.classList || [])].find(c => c.startsWith('language-')) || '').slice(9) || 'code';
      const lines = (code?.textContent || pre.textContent).trimEnd().split('\n').length;

      const wrap = document.createElement('div');
      wrap.className = 'code-block-wrap';
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `<span class="lang">${lang}</span><button class="toggle-btn">[collapse]</button>`;
      const body = document.createElement('div');
      body.className = 'code-block-body';
      const nums = document.createElement('div');
      nums.className = 'line-numbers';
      nums.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');

      // Insert the wrapper where the <pre> was, then move the <pre> inside it.
      pre.classList.add('code');
      body.appendChild(nums);
      pre.parentNode.insertBefore(wrap, pre);
      body.appendChild(pre);
      wrap.appendChild(header);
      wrap.appendChild(body);
    });

    // Collapse / expand a code block when its toggle button is clicked.
    mount.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.closest('.code-block-wrap').querySelector('.code-block-body');
        const collapsed = body.classList.toggle('collapsed');
        btn.textContent = collapsed ? '[expand]' : '[collapse]';
      });
    });
  }
})();
