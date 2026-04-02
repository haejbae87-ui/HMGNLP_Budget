// ─── APP INITIALIZATION ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // DB 기반 페르소나 정보 로드 (orgId 있는 HMC 등)
  if (typeof _initCurrentPersona === 'function') {
    currentPersona = await _initCurrentPersona(currentPersona);
  }
  renderGNB();
  renderFloatingBudget();
  // hash가 있으면 해당 페이지 복원, 없으면 대시보드
  const startPage = typeof _restorePageFromHash === 'function' ? _restorePageFromHash() : 'dashboard';
  navigate(startPage);
});
