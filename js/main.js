/* Code block collapse toggle */
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.setAttribute('aria-expanded', 'true');
  btn.addEventListener('click', () => {
    const body = btn.closest('.code-block-wrap').querySelector('.code-block-body');
    const collapsed = body.classList.toggle('collapsed');
    btn.textContent = collapsed ? '[expand]' : '[collapse]';
    btn.setAttribute('aria-expanded', String(!collapsed));
  });
});

/* Fix line number alignment — regenerate from actual code content using \n
   so both the line-number div and the <pre> use the same whitespace model. */
document.querySelectorAll('.code-block-body').forEach(body => {
  const code = body.querySelector('pre.code code');
  const lineNumDiv = body.querySelector('.line-numbers');
  if (!code || !lineNumDiv) return;
  const text = code.textContent;
  const lineCount = text.trimEnd().split('\n').length;
  lineNumDiv.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
});
