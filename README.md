# jalols.page

My personal website — [jalols.page](https://jalols.page).

### Stack

- Plain HTML, CSS, and JS.
- One Node script (`scripts/build.js`) scans the markdown files in `posts/` and spits out `posts.json` and `feed.xml`.
- GitHub Actions runs it on every push to `main`, then ships it to GitHub Pages.

Each post lives at a clean URL — `/posts/<slug>/` — via a small generated page that loads the shared renderer (`assets/js/post.js`). The slug is just the markdown filename.

CSS is split into small partials under `assets/css/` (tokens, base, nav, home, post, code, comments, …), with `style.css` as a thin `@import` aggregator. Stylesheet and script links carry a `?v=N` cache-buster that gets bumped with each CSS/JS change.

The home grid builds its tag filters automatically from whatever tags exist across all entries in `posts.json`, so adding a post with a new tag just works on the next build. Search (`assets/js/search.js`) is typo-tolerant and has a curated theme map — so "ecology" finds the climate posts, "hardware" the embedded ones, and so on. Extend it via the `THEMES` object.

## Comments

Each post has a comments section (`assets/js/comments.js` + `assets/css/comments.css`) backed by Supabase. To comment you register with an email and confirm via a magic link. Comments support the same markdown renderer as posts (`marked`), sanitised with DOMPurify.

Moderation is simple: signing in with the owner email reveals a **delete** button on every comment; everyone else only sees it on their own. Deleting blanks the text but preserves the thread structure — `[removed]`.

The owner's comments get an **AUTHOR** badge, driven by an `is_author` column the database sets via a `BEFORE INSERT` trigger and locks afterward. It can't be faked by choosing a clever display name or editing the row later.

### New-comment notifications

A Postgres trigger (`notify_new_comment`) emails me via Resend whenever someone other than the owner posts — with author, body, and a direct link to it. The Resend API key lives in Supabase Vault, so to enable it, run this once in the SQL editor:

```sql
select vault.create_secret('YOUR_RESEND_API_KEY', 'RESEND_API_KEY');
```

Until that secret exists the trigger is a no-op — comments still post fine. Both the magic link and the notification mail send from `comments.jalols.page`, which is verified on Resend.

**One-time Supabase setup** (Dashboard → Authentication → URL Configuration):

- Site URL: `https://jalols.page`
- Redirect URLs: add `https://jalols.page/**`

Without this, confirmation links bounce back to localhost — learned that one the hard way.

The free tier's built-in email sender is rate-limited to a handful per hour. If traffic ever picks up, add custom SMTP under Authentication → Emails.

## RSS

The feed at `https://jalols.page/feed.xml` is fully automated — `build.js` regenerates it from `posts/*.md` on every push, so it's never out of sync and never needs touching by hand. Every page links it two ways: a `<link rel="alternate">` in `<head>` for auto-discovery, and a visible `rss` link in the footer for everyone else.
