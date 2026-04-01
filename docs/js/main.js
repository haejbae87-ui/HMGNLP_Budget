// ─── APP INITIALIZATION ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderGNB();
  renderFloatingBudget();
  // hash가 있으면 해당 페이지 복원, 없으면 대시보드
  const startPage = typeof _restorePageFromHash === 'function' ? _restorePageFromHash() : 'dashboard';
  navigate(startPage);
});
