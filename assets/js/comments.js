/**
 * Comments section — loaded on every /posts/<slug>/ page, rendered into the
 * empty <section id="comments"> that build.js bakes into each post.
 *
 * Backend is Supabase (Postgres + Auth). Design, end to end:
 *
 *   1. Identity is e-mail + confirmation, not a login page. A first-time
 *      commenter types a name + e-mail; we send a one-time magic link
 *      (signInWithOtp). Clicking it returns them here with a session. No
 *      password, no separate sign-in screen. Unconfirmed e-mails therefore
 *      can't post — that's the anti-spam gate.
 *   2. The session persists (supabase-js stores it), so afterwards they just
 *      type and post. The display name lives in localStorage so it survives
 *      across visits and devices independently of the auth profile.
 *   3. Bodies are markdown, rendered with the SAME `marked` the posts use, then
 *      run through DOMPurify — posts are authored by the owner and trusted,
 *      comments are untrusted input, so they must be sanitised.
 *   4. Replies nest Reddit-style via a `parent_id` column; we fetch the flat
 *      list and rebuild the tree client-side.
 *   5. Deleting soft-removes: the row stays (so replies under it survive) but
 *      its body/name are blanked to "[removed]".
 *   6. The owner's own comments carry an `is_author` flag the DATABASE sets from
 *      the authenticated identity (not the display name), surfaced here as an
 *      "AUTHOR" badge that can't be spoofed.
 *
 * Security note: the publishable key below is meant to ship in client code.
 * Row-level security policies in Postgres are what actually gate reads/writes.
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://cihmvyqcgxjltnfzfllx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bI6NC-0ds-HbtAtTo6M4rw_8YWQYpYq'; // public by design
  const OWNER_EMAIL  = 'unnobatroo@icloud.com';                          // who may moderate

  const mount = document.getElementById('comments');
  if (!mount || !window.supabase) return;   // not a post page, or CDN failed to load

  // The post slug is the path segment after "posts" (/posts/<slug>/) — same
  // derivation post.js uses, so the two always agree.
  const segs = location.pathname.split('/').filter(Boolean);
  const slug = segs[segs.indexOf('posts') + 1];
  if (!slug) return;

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let session = null;   // current auth session, or null when signed out

  // ── tiny DOM + format helpers ───────────────────────────────────────────────
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  // Escape user text before it goes into innerHTML / attributes (names, errors).
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Markdown → HTML, then sanitise. The only place untrusted bodies become HTML.
  const renderBody = src => DOMPurify.sanitize(marked.parse(src));

  const isOwner   = () => session && session.user.email === OWNER_EMAIL;
  const savedName = () => localStorage.getItem('c_name') || '';

  // Compact "2h ago" / "3d ago" relative time (largest unit that fits).
  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];
    for (const [label, secs] of units) {
      const n = Math.floor(s / secs);
      if (n >= 1) return `${n}${label} ago`;
    }
    return 'just now';
  }

  // ── static layout: heading, auth/composer area, the thread ──────────────────
  mount.innerHTML = '';
  const title   = el('h2', 'comments-title', 'Comments');
  const authBox = el('div', 'c-auth');   // holds either the register gate or "signed in" + composer
  const list    = el('div', 'c-list');   // holds the rendered thread
  mount.append(title, authBox, list);

  // Re-render the auth area whenever the session changes (sign in / out).
  function renderAuth() {
    authBox.innerHTML = '';
    if (session) {
      // Signed in: "Commenting as NAME … change name · sign out" + a composer.
      const name = savedName() || session.user.user_metadata?.display_name || session.user.email;
      const box  = el('div', 'c-who');
      const who  = el('span', null, `Commenting as <strong>${esc(name)}</strong>`);
      const change = el('button', 'c-btn--link', 'change name');
      const out    = el('button', 'c-btn--link', 'sign out');
      change.onclick = () => {
        const n = (prompt('Display name:', name) || '').trim();
        if (n) {
          localStorage.setItem('c_name', n.slice(0, 50));
          db.auth.updateUser({ data: { display_name: n } });   // best-effort sync to profile
          renderAuth();
        }
      };
      out.onclick = () => db.auth.signOut();
      const actions = el('span', 'c-who-actions');   // CSS pins this to the right end
      actions.append(change, document.createTextNode(' · '), out);
      box.append(who, actions);
      authBox.append(box, composer(null));
    } else {
      authBox.append(registerBox());   // signed out: show the e-mail confirm gate
    }
  }

  // The register/confirm gate: name + e-mail → magic link. Shown to signed-out
  // visitors. emailRedirectTo = this exact URL, so the link brings them back here.
  function registerBox() {
    const box = el('div', 'c-box');
    box.append(el('p', null, 'Feel free to join the discussion! First fill in the details to authenticate.'));
    const row   = el('div', 'c-row');
    const name  = el('input', 'c-input'); name.placeholder = 'name'; name.maxLength = 50; name.value = savedName();
    const email = el('input', 'c-input'); email.placeholder = 'email'; email.type = 'email';
    row.append(name, email);
    const btn = el('button', 'c-submit', 'Send');
    const msg = el('p', 'c-msg');

    btn.onclick = async () => {
      const n = name.value.trim(), e = email.value.trim();
      if (!n)                   { msg.className = 'c-msg c-msg--err'; msg.textContent = 'Please enter a name.';          return; }
      if (!/.+@.+\..+/.test(e)) { msg.className = 'c-msg c-msg--err'; msg.textContent = 'Please enter a valid email.';  return; }
      localStorage.setItem('c_name', n.slice(0, 50));
      btn.disabled = true; btn.textContent = 'Sending…';
      const { error } = await db.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: location.href, data: { display_name: n } },
      });
      btn.disabled = false; btn.textContent = 'Send';
      msg.className = error ? 'c-msg c-msg--err' : 'c-msg c-msg--ok';
      msg.textContent = error
        ? error.message
        : `Check ${e} inbox and spam for a confirmation link, then come back to this page.`;
    };

    box.append(row, btn, msg);
    return box;
  }

  // A composer box. parentId === null → new top-level comment; otherwise it's a
  // reply to that comment id. On success the thread is reloaded from the server.
  function composer(parentId) {
    const box = el('div', parentId ? 'c-box c-replybox' : 'c-box');
    const ta  = el('textarea', 'c-textarea'); ta.placeholder = 'Markdown editor';
    const btn = el('button', 'c-submit', parentId ? 'Reply' : 'Post');
    const msg = el('p', 'c-msg');

    btn.onclick = async () => {
      const body = ta.value.trim();
      if (!body) return;
      const name = (savedName() || session.user.user_metadata?.display_name || 'anon').slice(0, 50);
      btn.disabled = true;
      // RLS enforces user_id = auth.uid(); a BEFORE-INSERT trigger sets is_author.
      const { error } = await db.from('comments').insert({
        post_slug: slug, parent_id: parentId, user_id: session.user.id,
        display_name: name, body: body.slice(0, 5000),
      });
      btn.disabled = false;
      if (error) { msg.className = 'c-msg c-msg--err'; msg.textContent = error.message; return; }
      ta.value = '';
      if (parentId) box.remove();   // collapse the inline reply box once sent
      loadComments();
    };

    box.append(ta, btn, msg);
    return box;
  }

  // ── load the flat comment list and render it as a tree ──────────────────────
  async function loadComments() {
    const { data, error } = await db.from('comments')
      .select('*').eq('post_slug', slug).order('created_at', { ascending: true });
    if (error) {
      list.innerHTML = `<p class="c-msg c-msg--err">Couldn’t load comments: ${esc(error.message)}</p>`;
      return;
    }

    // Bucket every comment under its parent id ('root' for top-level ones), so
    // buildLevel can recurse without re-scanning the whole list each time.
    const byParent = new Map();
    data.forEach(c => {
      const key = c.parent_id || 'root';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    });

    const visible = data.filter(c => !c.hidden).length;
    title.innerHTML = `Comments <span class="comments-count">(${visible})</span>`;

    list.innerHTML = '';
    const roots = byParent.get('root') || [];
    if (!roots.length) { list.append(el('p', 'c-note', 'No comments yet. Be the first.')); return; }
    list.append(buildLevel(roots, byParent));
  }

  // One <ul.c-thread> of sibling comments.
  function buildLevel(items, byParent) {
    const ul = el('ul', 'c-thread');
    items.forEach(c => ul.append(buildItem(c, byParent)));
    return ul;
  }

  // One comment <li> = a left rail (collapse circle + thread-line, via CSS) plus
  // a .c-main column holding the header, body, actions, and any nested replies.
  function buildItem(c, byParent) {
    const li   = el('li', 'c-item');
    const kids = byParent.get(c.id);
    const hasKids = kids && kids.length;
    if (hasKids) li.classList.add('has-kids');   // CSS draws the thread-line for these

    const main = el('div', 'c-main');

    if (c.hidden) {
      main.append(el('div', 'c-body c-removed', '[removed]'));   // soft-deleted: keep the slot
    } else {
      // Collapse circle sits on the rail (positioned by CSS); folds this comment.
      const toggle = el('button', 'c-collapse', '−');
      toggle.setAttribute('aria-label', 'Collapse comment');
      toggle.onclick = () => {
        const collapsed = li.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '+' : '−';
        toggle.setAttribute('aria-label', collapsed ? 'Expand comment' : 'Collapse comment');
      };
      li.append(toggle);

      const head = el('div', 'c-head');
      head.append(el('span', 'c-name', esc(c.display_name)));
      // AUTHOR badge — trustworthy because is_author is set server-side from the
      // signed-in identity, never from the (free-text) display name.
      if (c.is_author) head.append(el('span', 'c-badge', 'author'));
      head.append(el('span', 'c-time', timeAgo(c.created_at)));

      const body    = el('div', 'c-body', renderBody(c.body));
      const actions = el('div', 'c-actions');

      // Reply: toggles an inline composer above this comment's replies.
      if (session) {
        const reply = el('button', 'c-btn--link', 'reply');
        reply.onclick = () => {
          const open = main.querySelector(':scope > .c-replybox');
          if (open) { open.remove(); return; }
          main.insertBefore(composer(c.id), main.querySelector(':scope > .c-thread'));
        };
        actions.append(reply);
      }
      // Delete: the owner may remove any comment; everyone else only their own.
      if (isOwner() || (session && c.user_id === session.user.id)) {
        const del = el('button', 'c-btn--link c-btn--danger', 'delete');
        del.onclick = async () => {
          if (!confirm('Delete this comment? Replies under it stay, this one shows as [removed].')) return;
          const { error } = await db.from('comments')
            .update({ hidden: true, body: '[removed]', display_name: '[removed]' }).eq('id', c.id);
          if (error) alert(error.message); else loadComments();
        };
        actions.append(del);
      }

      main.append(head, body, actions);
    }

    if (hasKids) main.append(buildLevel(kids, byParent));   // nested replies
    li.append(main);
    return li;
  }

  // ── return-from-magic-link handling ─────────────────────────────────────────
  // The magic link redirects back to this page with auth tokens in the URL.
  // When that's the case, scroll the visitor down to the comments once their
  // session resolves, so they land exactly where they left off.
  const cameFromLink = location.hash.includes('access_token') ||
                       new URLSearchParams(location.search).has('code');
  let scrolled = false;
  const scrollToComments = () => {
    if (scrolled) return;
    scrolled = true;
    mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── boot ────────────────────────────────────────────────────────────────────
  db.auth.getSession().then(({ data }) => {
    session = data.session;
    renderAuth();
    if (cameFromLink && session) scrollToComments();
  });
  db.auth.onAuthStateChange((event, s) => {
    session = s;
    renderAuth();
    if (cameFromLink && event === 'SIGNED_IN') scrollToComments();
  });
  loadComments();
})();
