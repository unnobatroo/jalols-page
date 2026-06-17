/**
 * Shared post renderer, loaded by every generated /posts/<slug>/ page.
 *
 * The slug is read from the URL (the page lives at /posts/<slug>/); we fetch
 * that post's markdown, parse its front matter, render the body with marked +
 * highlight.js, then upgrade each code block with a language label, line
 * numbers, a copy button, and a collapse toggle. One script serves every post.
 */
(function () {
  const mount = document.getElementById('post-mount');

  // Slug = the path segment right after "posts" (works for /posts/<slug>/ and
  // /posts/<slug>/index.html). No per-page inline script needed.
  const segs = location.pathname.split('/').filter(Boolean);
  const slug = segs[segs.indexOf('posts') + 1];
  if (!slug) { mount.textContent = 'No post specified.'; return; }

  // Inline SVG icons for the code-block buttons (CSP blocks icon fonts/inline
  // styles, so these are injected as markup by this same-origin script).
  // 14×14, stroke = currentColor so they inherit the button's text colour.
  const svg = body =>
    `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" ` +
    `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const IC = {
    copy: svg('<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3.2 10.5H2.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v.7"/>'),
    check: svg('<path d="M3 8.5l3.2 3.2L13 4.8"/>'),
    up: svg('<path d="M4 10l4-4 4 4"/>'),
    down: svg('<path d="M4 6l4 4 4-4"/>'),
  };

  fetch(`/posts/${encodeURIComponent(slug)}.md`)
    .then(res => { if (!res.ok) throw new Error(); return res.text(); })
    .then(render)
    .catch(() => { mount.textContent = 'Post not found.'; });

  function render(raw) {
    // Parse front matter (same format build.js reads). Missing fields fall back.
    const meta = { title: slug, date: '', tags: [], status: '' };
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const content = fm ? raw.slice(fm[0].length) : raw;   // body after front matter
    if (fm) {
      const f = fm[1];
      const get = k => (f.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim() || '';
      meta.title = get('title') || slug;
      meta.date = get('date');
      meta.status = get('status');
      const tl = (f.match(/^tags:\s*\[(.+)\]$/m) || [])[1] || '';
      meta.tags = tl.split(',').map(t => t.trim()).filter(Boolean);
    }

    document.title = `${meta.title} — Jaloliddin Ismailov`;

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

    // VS Code Light Modern paints control-flow keywords purple but storage
    // keywords (const/function/class…) blue. highlight.js tags both as
    // .hljs-keyword, so re-tag the control-flow ones by name to split them.
    const CONTROL = new Set((
      'if elif else for foreach while do loop switch case default match when ' +
      'break continue return goto throw throws try catch except finally raise ' +
      'with pass assert del yield await import export from as new defer go ' +
      'range select fallthrough where unless until ' +
      'include define undef ifdef ifndef endif pragma'   // C/C++ preprocessor directives
    ).split(' '));
    mount.querySelectorAll('.hljs-keyword').forEach(s => {
      if (CONTROL.has(s.textContent.trim())) s.classList.add('hljs-keyword--control');
    });

    // Wrap each <pre> so it gains a header (language + copy + collapse) and a
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
      header.innerHTML = `<span class="lang">${lang}</span>` +
        `<span class="code-actions">` +
          `<button class="copy-btn" type="button" aria-label="Copy code" title="Copy">${IC.copy}</button>` +
          `<button class="toggle-btn" type="button" aria-label="Collapse code" title="Collapse">${IC.up}</button>` +
        `</span>`;
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

      // Copy the raw source to the clipboard (same-origin, no external calls).
      // Icon briefly flips to a checkmark on success.
      const copyBtn = header.querySelector('.copy-btn');
      copyBtn.addEventListener('click', async () => {
        const src = (code?.textContent || pre.textContent).replace(/\n$/, '');
        try {
          await navigator.clipboard.writeText(src);
          copyBtn.innerHTML = IC.check;
          copyBtn.classList.add('copied');
          copyBtn.title = 'Copied';
        } catch {
          copyBtn.title = 'Press ⌘/Ctrl+C to copy';
        }
        setTimeout(() => {
          copyBtn.innerHTML = IC.copy;
          copyBtn.classList.remove('copied');
          copyBtn.title = 'Copy';
        }, 1500);
      });
    });

    // Collapse / expand a code block when its toggle button is clicked.
    // Chevron points up when open (click to fold), down when collapsed.
    mount.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.closest('.code-block-wrap').querySelector('.code-block-body');
        const collapsed = body.classList.toggle('collapsed');
        btn.innerHTML = collapsed ? IC.down : IC.up;
        btn.setAttribute('aria-label', collapsed ? 'Expand code' : 'Collapse code');
        btn.title = collapsed ? 'Expand' : 'Collapse';
      });
    });
  }
})();
