/**
 * Shared site navigation, injected at the top of every page.
 *
 * Each page declares which nav item is "current" via <body data-page="...">
 * (e.g. data-page="work" on index.html, "about" on bio.html). The matching
 * link is highlighted and gets aria-current="page" for assistive tech.
 *
 * Links are root-relative ("/", "/bio.html", …) so the nav works the same from
 * the home page and from nested post pages at /posts/<slug>/.
 */
(function () {
  const page = document.body.dataset.page || '';

  const nav = document.createElement('nav');
  nav.className = 'menu-container';
  nav.setAttribute('aria-label', 'site');

  // Build one internal nav link; marks itself active when its id matches data-page.
  const link = (id, href, label) =>
    `<a class="menu-link${page === id ? ' menu-link--active' : ''}" href="${href}"${page === id ? ' aria-current="page"' : ''}>${label}</a>`;

  // "resume" is a direct PDF link (opens in a new tab), not an internal page.
  nav.innerHTML =
    link('work', '/', 'work') +
    `<a class="menu-link" href="/feed.xml">rss</a>` +
    `<a class="menu-link" href="/assets/img/jaloliddin_ismailov_resume.pdf" target="_blank" rel="noopener noreferrer">resume</a>` +
    link('about', '/bio.html', 'about');

  document.body.prepend(nav);
})();
