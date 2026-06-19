# jalols.page

My personal website.

## Stack

Plain HTML + CSS + JS, no framework. One Node script (`scripts/build.js`) scans
the markdown files in `posts/` and generates `posts.json` and `feed.xml`. GitHub
Actions runs it on every push to `main`, then deploys to GitHub Pages.

Each post is served at a clean URL — `/posts/<slug>/` — from a small generated
page (`posts/<slug>/index.html`) that loads the shared renderer
(`assets/js/post.js`). The slug is just the markdown filename.

CSS lives as small clustered partials under `assets/css/` (tokens, base, nav,
home, post, code, comments, …); `style.css` is just an `@import` aggregator.
Stylesheet/script links carry a `?v=N` query that we bump when shipping CSS/JS
changes, so browsers refetch instead of serving stale cached files.

The home grid builds its tag filters automatically from the tags across all
entries in `posts.json` — add a post with new tags and the filters update on
the next build. Search (`assets/js/search.js`) is typo-tolerant and
concept-aware: a curated theme map means "ecology" matches the climate posts,
"hardware" the embedded ones, etc. Extend it via the `THEMES` object there.

## Comments

Each post page has a comments section (`assets/js/comments.js` +
`assets/css/comments.css`) backed by a Supabase project (`jalols-page-comments`).
To comment you register with an email and confirm it via a one-time magic link —
no password, no login page. Replies nest Reddit-style. Comments use the same
markdown renderer as posts (`marked`), sanitised with DOMPurify.

Moderation: sign in with the owner email (`unnobatroo@icloud.com`) and a
**delete** button appears on every comment; everyone else only sees it on their
own. Deleting blanks the text but keeps the thread (shows `[removed]`).

The owner's own comments show an **AUTHOR** badge. It's driven by an `is_author`
column the database sets from the signed-in identity (via a `BEFORE INSERT`
trigger) and locks afterward — it can't be faked by choosing a display name or
editing the row later.

### New-comment notifications

A Postgres trigger (`notify_new_comment`) emails the owner via Resend whenever
someone other than the owner posts a comment — author, body, and a link straight
to it. The Resend API key is read from **Supabase Vault**, so to enable it run
once in the SQL editor:

```sql
select vault.create_secret('YOUR_RESEND_API_KEY', 'RESEND_API_KEY');
```

Until that secret exists the trigger is a harmless no-op (comments still post
fine). Magic-link and notification mail both send from the Resend-verified
`comments.jalols.page` domain.

**One-time Supabase setup** (Dashboard → Authentication → URL Configuration):

- Site URL: `https://jalols.page`
- Redirect URLs: add `https://jalols.page/**`

Without this the confirmation links bounce to the default localhost URL. The
built-in email sender is rate-limited (a few per hour) on the free tier; add
custom SMTP under Authentication → Emails if volume grows.

## RSS feed

The feed at `https://jalols.page/feed.xml` is fully automated — `build.js`
regenerates it from `posts/*.md` on every push (via GitHub Actions), so you
never edit it by hand. Every page links it two ways: a `<link rel="alternate">`
tag in `<head>` (so browsers and feed readers auto-discover it) and a visible
`rss` link in the footer.
