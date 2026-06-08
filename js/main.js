/* Code block collapse toggle */
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const body = btn.closest('.code-block-wrap').querySelector('.code-block-body');
    const collapsed = body.classList.toggle('collapsed');
    btn.textContent = collapsed ? '[expand]' : '[collapse]';
  });
});
