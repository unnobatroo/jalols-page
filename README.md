# jalols-page

Personal site for Jaloliddin Ismailov — embedded software · edge AI · climate tech · policy.

Deployed to GitHub Pages. No build step. Plain HTML, CSS, and JS.

## Structure

```
jalols-page/
├── index.html          # Projects index (card grid)
├── blog.html           # Blog feed (search + sort)
├── bio.html            # About / CV skeleton
├── CNAME               # Custom domain (update before deploy)
│
├── css/
│   └── style.css       # All styles — single file
│
├── js/
│   ├── nav.js          # Shared nav injector (include on every page)
│   ├── main.js         # Code block collapse toggle
│   ├── projects-data.js  # Project definitions — edit to add projects
│   └── blog-data.js      # Post definitions — edit to add posts
│
├── projects/           # One HTML file per project
│   └── tinyml-wildfire.html
│
├── blog/               # One HTML file per blog post
│   ├── edge-inference-power-budget.html
│   ├── cop29-technical-annex.html
│   └── risc-v-softcore-fpga.html
│
├── thumbs/             # Project thumbnail images (add your own)
│
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions — deploys on push to main
```

## Adding a project

1. Add an entry to `js/projects-data.js` following the existing format:

```js
{
  slug:     "my-project",          // matches the HTML filename
  title:    "My Project",
  desc:     "One-line description.",
  thumb:    "thumbs/my-project.jpg",
  thumbAlt: "Alt text for thumbnail",
  date:     "2024-11-01",
  status:   "complete",            // or "ongoing"
  cats:     ["embedded", "ai"],    // used for filter buttons
  featured: false,
  links:    [{ label: "GitHub", url: "https://github.com/..." }],
},
```

2. Create `projects/my-project.html` — copy `projects/tinyml-wildfire.html` as a template.
3. Add a thumbnail image to `thumbs/`.

## Adding a blog post

1. Add an entry to `js/blog-data.js`:

```js
{
  slug:    "my-post",
  title:   "My Post Title",
  excerpt: "One or two sentence summary shown on the feed.",
  date:    "2024-11-01",
  tags:    ["embedded", "fpga"],
},
```

2. Create `blog/my-post.html` — copy any existing post as a template.

## Code annotation hover markers

Inside a code block, wrap an annotated line and its bubble:

```html
<div class="code-line annotated">
  your_code_here();
  <span class="annotation-marker">◆</span>
  <span class="annotation-bubble">Explanation shown on hover.</span>
</div>
```

## Collapsible code blocks

Any `.code-block-wrap` with a `[collapse]` button in the header is automatically wired
by `js/main.js`. No extra markup needed.

## Deploy

### GitHub Pages (automatic)

Push to `main`. The `.github/workflows/deploy.yml` workflow publishes the entire repo
to the `gh-pages` branch. GitHub Pages serves from there.

### Custom domain

1. Update `CNAME` with your domain (e.g. `jaloliddin.dev`).
2. Add a CNAME DNS record pointing to `<your-github-username>.github.io`.
3. Enable "Enforce HTTPS" in the repo's Pages settings.

### First-time setup

1. Go to **Settings → Pages** in your GitHub repo.
2. Set source to **GitHub Actions**.
3. The workflow fires on the next push to `main`.

## Local development

No build step — open any `.html` file directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Personalise

- `js/nav.js` — update `SITE.github`, `SITE.linkedin`; email is already set.
- `bio.html` — fill in the placeholder sections.
- `CNAME` — replace `yourdomain.com` with your real domain.
- Footer links in each HTML file — replace `YOUR_GITHUB` with your username.
- `index.html` header — update the tagline.

## License

MIT — see [LICENSE](LICENSE).
