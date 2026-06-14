#!/usr/bin/env node
/**
 * Scans posts/*.md (skips _*.md), extracts front matter,
 * writes posts.json and feed.xml.
 *
 * Usage:
 *   node scripts/build.js          # run manually before local preview
 *   GitHub Actions runs this automatically on every push
 *
 * To add a new post or project:
 *   1. Copy posts/_template.md → posts/your-slug.md
 *   2. Fill in front matter + write content
 *   3. git add posts/your-slug.md && git push  (CI handles the rest)
 *
 * Front matter fields:
 *   title   — required
 *   date    — required, YYYY-MM-DD
 *   excerpt — shown on index cards
 *   tags    — array e.g. [embedded, climate]
 *   type    — "post" | "project" (default: "post")
 *   status  — optional short string shown on project cards
 *
 * The card thumbnail is NOT a front-matter field — it's derived automatically
 * from the first image in the post body (see firstImage below).
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const SITE_URL  = 'https://jalols.page';
const ROOT      = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');

/**
 * Parse the `--- ... ---` YAML-ish front matter at the top of a post.
 * Returns null when there's no front-matter block, otherwise an object with
 * the known fields (missing fields come back as '' or [], never undefined).
 * @param {string} src - full raw .md file contents
 */
function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm  = m[1];
  // Pull a single scalar field by name, e.g. get('title'); '' if absent.
  const get = key => (fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm')) || [])[1]?.trim() ?? '';
  // tags is a bracketed list: tags: [a, b, c]
  const tagsRaw = (fm.match(/^tags:\s*\[(.+)\]$/m) || [])[1] ?? '';
  return {
    title:   get('title'),
    date:    get('date'),
    excerpt: get('excerpt'),
    type:    get('type') || 'post',
    status:  get('status'),
    tags:    tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
  };
}

/** Canonical public URL for a post, used in both the link and the RSS guid. */
function postUrl(p) {
  return `${SITE_URL}/posts/${p.slug}/`;
}

/**
 * Write a static page for one post at posts/<slug>/index.html, giving every
 * post a clean URL (/posts/<slug>/) instead of a ?slug= query string. The page
 * is a thin shell: it bakes in the slug and loads the shared renderer
 * (assets/js/post.js), which fetches and renders the markdown in the browser.
 */
function writePostPage(p) {
  const dir = path.join(ROOT, 'posts', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'),
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg" />
  <title>${p.title} — Jaloliddin Ismailov</title>
  <link rel="stylesheet" href="/assets/css/style.css" />
  <link rel="alternate" type="application/rss+xml" title="Jaloliddin Ismailov — RSS" href="/feed.xml" />
</head>
<body data-page="${p.type === 'project' ? 'work' : 'blog'}">
  <script>window.POST_SLUG = ${JSON.stringify(p.slug)};</script>
  <script src="/assets/js/nav.js"></script>
  <main id="main-content">
    <div class="page-content page-content--narrow"><div id="post-mount"></div></div>
  </main>
  <footer class="site-footer">
    made with care · <a href="https://github.com/unnobatroo/jalols-page" target="_blank" rel="noopener">source</a> · <a href="/feed.xml">rss</a>
  </footer>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="/assets/js/post.js"></script>
</body>
</html>
`,
    'utf8');
}

/**
 * First image in the markdown body — markdown ![alt](src) or a raw <img src>.
 * Fenced code blocks are stripped first so a sample image inside a ``` block
 * isn't mistaken for a real one. The earlier of the two matches wins.
 * @param {string} body - post content with front matter already removed
 * @returns {{image: string, imageAlt: string}|{}} - {} when there's no image,
 *          so cards without a picture render no thumbnail at all.
 */
function firstImage(body) {
  const text   = body.replace(/```[\s\S]*?```/g, '');
  const md     = text.match(/!\[([^\]]*)\]\(\s*([^)\s]+)/);
  const html   = text.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  const mdAt   = md ? text.indexOf(md[0]) : Infinity;
  const htmlAt = html ? text.indexOf(html[0]) : Infinity;
  if (mdAt === Infinity && htmlAt === Infinity) return {};
  if (mdAt <= htmlAt) return { image: md[2], imageAlt: md[1] || '' };
  const a = html[0].match(/\balt=["']([^"']*)["']/i);
  return { image: html[1], imageAlt: a ? a[1] : '' };
}

// ── scan ──────────────────────────────────────────────────────────────────────
// Read every posts/*.md (skipping _-prefixed templates) into one sorted list.
const posts = fs.readdirSync(POSTS_DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .map(file => {
    const slug = file.slice(0, -3);                 // filename without ".md" → URL slug
    const raw  = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const meta = parseFrontMatter(raw);
    if (!meta?.title || !meta?.date) {              // title + date are the only hard requirements
      console.warn(`  skip ${file}: missing title or date`);
      return null;
    }
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');   // everything after front matter
    return { slug, ...meta, ...firstImage(body) };
  })
  .filter(Boolean)                                  // drop the skipped (null) entries
  .sort((a, b) => new Date(b.date) - new Date(a.date));       // newest first

// ── posts.json ────────────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(ROOT, 'posts.json'),
  JSON.stringify(posts, null, 2),
  'utf8'
);
console.log(`posts.json  ✓  (${posts.length} entries)`);

// ── per-post pages ────────────────────────────────────────────────────────────
posts.forEach(writePostPage);
console.log(`post pages  ✓  (posts/<slug>/index.html)`);

// ── feed.xml ──────────────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Format a YYYY-MM-DD date as an RFC-822 string, the date format RSS requires
 * (e.g. "Tue, 11 Mar 2025 00:00:00 +0000"). Built from fixed English day/month
 * names so output never depends on the build machine's locale.
 */
function rfc822(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2,'0')} ` +
         `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} 00:00:00 +0000`;
}

// One <item> per post. Title/excerpt go in CDATA so punctuation needs no
// escaping; category text isn't wrapped, so its & is escaped by hand.
const items = posts.map(p => `
  <item>
    <title><![CDATA[${p.title}]]></title>
    <link>${postUrl(p)}</link>
    <guid isPermaLink="true">${postUrl(p)}</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description><![CDATA[${p.excerpt}]]></description>
    ${p.tags.map(t => `<category>${t.replace(/&/g, '&amp;')}</category>`).join('\n    ')}
  </item>`).join('');

fs.writeFileSync(
  path.join(ROOT, 'feed.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jaloliddin Ismailov</title>
    <link>${SITE_URL}</link>
    <description>Notes on embedded systems, edge AI, and climate science</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`,
  'utf8'
);
console.log(`feed.xml    ✓`);
