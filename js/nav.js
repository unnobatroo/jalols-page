const SITE = {
  github:   "https://github.com/YOUR_GITHUB",
  linkedin: "https://linkedin.com/in/YOUR_LINKEDIN",
  email:    "mailto:unnobatroo@icloud.com",
};

(function injectNav() {
  // Root pages: <body data-root="">   (index.html, blog.html, bio.html)
  // Sub pages:  <body data-root=".."> (projects/*, blog/*)
  const root = document.body.dataset.root ?? "";
  const sep  = root ? "/" : "";
  const page = document.body.dataset.page || "";

  const nav = document.createElement("nav");
  nav.className = "menu-container";
  nav.innerHTML = `
    <a class="menu-link${page==="work"  ? " menu-link--active" : ""}" href="${root}${sep}index.html">work</a>
    <div class="menu-right">
      <a class="menu-link${page==="about" ? " menu-link--active" : ""}" href="${root}${sep}bio.html">about</a>
      <a class="menu-link${page==="blog"  ? " menu-link--active" : ""}" href="${root}${sep}blog.html">blog</a>
    </div>
  `;
  document.body.prepend(nav);
})();
