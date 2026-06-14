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
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const SITE_URL  = 'https://jalols.page';
const ROOT      = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm  = m[1];
  const get = key => (fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm')) || [])[1]?.trim() ?? '';
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

function postUrl(p) {
  return `${SITE_URL}/post.html?slug=${p.slug}`;
}

// ── scan ──────────────────────────────────────────────────────────────────────
const posts = fs.readdirSync(POSTS_DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .map(file => {
    const slug = file.slice(0, -3);
    const meta = parseFrontMatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
    if (!meta?.title || !meta?.date) {
      console.warn(`  skip ${file}: missing title or date`);
      return null;
    }
    return { slug, ...meta };
  })
  .filter(Boolean)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// ── posts.json ────────────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(ROOT, 'posts.json'),
  JSON.stringify(posts, null, 2),
  'utf8'
);
console.log(`posts.json  ✓  (${posts.length} entries)`);

// ── feed.xml ──────────────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function rfc822(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2,'0')} ` +
         `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} 00:00:00 +0000`;
}

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
