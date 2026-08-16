export interface SearchablePost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
}

// Title matches rank above tags, and tags rank above excerpts.
const searchableFields = (post: SearchablePost) => [
  { value: post.title, weight: 3 },
  { value: post.tags.join(' '), weight: 2 },
  { value: post.excerpt, weight: 1 },
];

export function searchPosts(posts: SearchablePost[], query: string): SearchablePost[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...posts];

  return posts
    .map((post) => {
      const fields = searchableFields(post).map(({ value, weight }) => ({
        value: value.toLowerCase(),
        weight,
      }));
      const scores = terms.map((term) => Math.max(
        ...fields.map(({ value, weight }) => value.includes(term) ? weight : 0),
      ));
      return { post, score: scores.every(Boolean) ? scores.reduce((sum, score) => sum + score, 0) : 0 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}

export function readPostData(): SearchablePost[] {
  const data = document.querySelector<HTMLScriptElement>('#posts-data')?.textContent;
  if (!data) return [];

  try {
    return JSON.parse(data) as SearchablePost[];
  } catch {
    return [];
  }
}
