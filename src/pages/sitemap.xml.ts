import { getCollection } from 'astro:content';
import { SITE, sortPosts, toIsoDate } from '../lib/site';

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character);

export async function GET() {
  const posts = sortPosts(await getCollection('posts'));
  const newest = posts[0]?.data.date;
  const urls = [
    { location: `${SITE.url}/`, modified: newest ? toIsoDate(newest) : undefined },
    { location: `${SITE.url}/bio.html` },
    ...posts.map((post) => ({
      location: `${SITE.url}/posts/${post.id}/`,
      modified: toIsoDate(post.data.date),
    })),
  ];
  const entries = urls.map(({ location, modified }) => `
  <url>
    <loc>${escapeXml(location)}</loc>${modified ? `\n    <lastmod>${modified}</lastmod>` : ''}
  </url>`).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
