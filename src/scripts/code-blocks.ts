const icon = (body: string) =>
  `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const icons = {
  copy: icon('<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3.2 10.5H2.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v.7"/>'),
  check: icon('<path d="M3 8.5l3.2 3.2L13 4.8"/>'),
  up: icon('<path d="M4 10l4-4 4 4"/>'),
  down: icon('<path d="M4 6l4 4 4-4"/>'),
};

// Astro renders the code first; this only adds optional browser controls.
document.querySelectorAll<HTMLPreElement>('.post-body pre').forEach((pre) => {
  if (pre.closest('.code-block-wrap')) return;
  const code = pre.querySelector('code');
  const languageClass = [...(code?.classList ?? [])].find((name) => name.startsWith('language-'));
  const language = pre.dataset.language || languageClass?.slice(9) || 'code';
  const source = (code?.textContent ?? pre.textContent).replace(/\n$/, '');
  const lineCount = source.split('\n').length;

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrap';
  const header = document.createElement('div');
  header.className = 'code-block-header';
  header.innerHTML = `<span class="lang">${language}</span>
    <span class="code-actions">
      <span class="copy-feedback" aria-hidden="true"></span>
      <button class="copy-btn" type="button" aria-label="Copy code" title="Copy">${icons.copy}</button>
      <span class="sr-only" aria-live="polite" aria-atomic="true"></span>
      <button class="toggle-btn" type="button" aria-label="Collapse code" title="Collapse">${icons.up}</button>
    </span>`;
  const body = document.createElement('div');
  body.className = 'code-block-body';
  const numbers = document.createElement('div');
  numbers.className = 'line-numbers';
  numbers.setAttribute('aria-hidden', 'true');
  numbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');

  pre.classList.add('code');
  pre.parentNode?.insertBefore(wrapper, pre);
  body.append(numbers, pre);
  wrapper.append(header, body);

  const copyButton = header.querySelector<HTMLButtonElement>('.copy-btn');
  const copyStatus = header.querySelector<HTMLElement>('.sr-only');
  const copyFeedback = header.querySelector<HTMLElement>('.copy-feedback');
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source);
      copyButton.innerHTML = icons.check;
      copyButton.classList.add('copied');
      copyButton.title = 'Copied';
      if (copyFeedback) {
        copyFeedback.textContent = 'copied';
        copyFeedback.classList.add('show');
      }
      if (copyStatus) copyStatus.textContent = 'Code copied.';
    } catch {
      if (copyStatus) copyStatus.textContent = 'Could not copy code.';
    }

    window.setTimeout(() => {
      copyButton.innerHTML = icons.copy;
      copyButton.classList.remove('copied');
      copyButton.title = 'Copy';
      copyFeedback?.classList.remove('show');
      if (copyFeedback) copyFeedback.textContent = '';
      if (copyStatus) copyStatus.textContent = '';
    }, 1500);
  });

  const toggleButton = header.querySelector<HTMLButtonElement>('.toggle-btn');
  toggleButton?.addEventListener('click', () => {
    const collapsed = body.classList.toggle('collapsed');
    toggleButton.innerHTML = collapsed ? icons.down : icons.up;
    toggleButton.setAttribute('aria-label', collapsed ? 'Expand code' : 'Collapse code');
    toggleButton.title = collapsed ? 'Expand' : 'Collapse';
  });
});
