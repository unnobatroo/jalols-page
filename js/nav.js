const SITE = {
  github: "https://github.com/unnobatroo",
  linkedin: "https://linkedin.com/in/unnobatroo",
  email: "mailto:unnobatroo@icloud.com",
};

(function injectNav() {
  // Root pages: <body data-root="">   (index.html, blog.html, bio.html)
  // Sub pages:  <body data-root=".."> (projects/*, blog/*)
  const root = document.body.dataset.root ?? "";
  const sep = root ? "/" : "";
  const page = document.body.dataset.page || "";

  const skip = document.createElement("a");
  skip.className = "skip-link";
  skip.href = "#main-content";
  skip.textContent = "skip to content";

  const nav = document.createElement("nav");
  nav.className = "menu-container";
  nav.setAttribute("aria-label", "site");
  nav.innerHTML = `
    <a class="menu-link${page === "work" ? " menu-link--active" : ""}"
       href="${root}${sep}index.html"${page === "work" ? ' aria-current="page"' : ""}>work</a>
    <div class="menu-right">
      <a class="menu-link${page === "about" ? " menu-link--active" : ""}"
         href="${root}${sep}bio.html"${page === "about" ? ' aria-current="page"' : ""}>about</a>
      <a class="menu-link${page === "blog" ? " menu-link--active" : ""}"
         href="${root}${sep}blog.html"${page === "blog" ? ' aria-current="page"' : ""}>blog</a>
    </div>
  `;
  document.body.prepend(nav);
  document.body.prepend(skip);
})();
