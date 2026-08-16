import type { CollectionEntry } from 'astro:content';

export const SITE = {
  title: 'Jaloliddin Ismailov',
  description:
    'Jaloliddin Ismailov — using comp sci to connect the dots, from cultural heritage to climate policy.',
  url: 'https://jalols.page',
  image: '/assets/img/jalols_photo.jpg',
  source: 'https://github.com/unnobatroo/jalols-page',
} as const;

export type PostEntry = CollectionEntry<'posts'>;

export interface PostSummary {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  type: 'post' | 'project';
  draft: boolean;
  status?: string | undefined;
  image?: string | undefined;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Fenced examples are removed so only real post images can become thumbnails.
export function firstImage(body = ''): Pick<PostSummary, 'image'> {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const markdown = text.match(/!\[([^\]]*)\]\(\s*([^)\s]+)/);
  const html = text.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  const markdownAt = markdown ? text.indexOf(markdown[0]) : Number.POSITIVE_INFINITY;
  const htmlAt = html ? text.indexOf(html[0]) : Number.POSITIVE_INFINITY;

  if (markdownAt === Number.POSITIVE_INFINITY && htmlAt === Number.POSITIVE_INFINITY) return {};
  if (markdownAt <= htmlAt && markdown) {
    return { image: markdown[2] ?? '' };
  }

  if (!html) return {};
  return { image: html[1] ?? '' };
}

export function summarizePost(post: PostEntry): PostSummary {
  return {
    slug: post.id,
    title: post.data.title,
    date: toIsoDate(post.data.date),
    excerpt: post.data.excerpt,
    tags: post.data.tags,
    type: post.data.type,
    draft: post.data.draft,
    status: post.data.status,
    ...firstImage(post.body),
  };
}

export function sortPosts(posts: PostEntry[], includeDrafts = false): PostEntry[] {
  return posts
    .filter((post) => includeDrafts || !post.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
