# jalols.page

My personal website.

## Stack

Plain HTML + CSS + JS. One Node script (`scripts/build.js`) scans the
markdown files in `posts/` and generates `posts.json` and `feed.xml`. GitHub
Actions runs it on every push to `main`, then deploys to GitHub Pages.

Each post is served at a clean URL — `/posts/<slug>/` — from a small generated
page (`posts/<slug>/index.html`) that loads the shared renderer
(`assets/js/post.js`). The slug is just the markdown filename.

The home grid builds its tag filters automatically from the tags across all
entries in `posts.json` — add a post with new tags and the filters update on
the next build.

## RSS feed

The feed at `https://jalols.page/feed.xml` is fully automated — `build.js`
regenerates it from `posts/*.md` on every push (via GitHub Actions), so you
never edit it by hand. Every page links it two ways: a `<link rel="alternate">`
tag in `<head>` (so browsers and feed readers auto-discover it) and a visible
`rss` link in the footer.
