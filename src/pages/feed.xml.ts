import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPosts } from '../lib/site';

export async function GET(context: { site?: URL }) {
  const posts = sortPosts(await getCollection('posts'));

  return rss({
    title: 'Jaloliddin Ismailov',
    description: 'Notes on embedded systems, edge AI, and climate science',
    site: context.site ?? new URL('https://jalols.page'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
