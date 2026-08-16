import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!**/_*.md'],
    base: './src/data/posts',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    tags: z.array(z.string()).default([]),
    type: z.enum(['post', 'project']).default('post'),
    status: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const wiki = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/wiki' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

export const collections = { posts, wiki };
