(function () {
  const page = document.body.dataset.page || '';
  const nav = document.createElement('nav');
  nav.className = 'menu-container';
  nav.setAttribute('aria-label', 'site');
  const link = (id, href, label) =>
    `<a class="menu-link${page === id ? ' menu-link--active' : ''}" href="${href}"${page === id ? ' aria-current="page"' : ''}>${label}</a>`;
  nav.innerHTML =
    link('work',  'index.html', 'work') +
    `<a class="menu-link" href="assets/img/jaloliddin_ismailov_resume.pdf" target="_blank" rel="noopener">resume</a>` +
    link('about', 'bio.html', 'about');
  document.body.prepend(nav);
})();
