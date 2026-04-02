// ─── APP INITIALIZATION ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // DB 기반 데이터 초기화 (병렬 실행)
  await Promise.all([
    typeof _loadAllEmployees === 'function' ? _loadAllEmployees() : Promise.resolve(),
    typeof _initCurrentPersona === 'function'
      ? _initCurrentPersona(currentPersona).then(p => { currentPersona = p; })
      : Promise.resolve(),
  ]);
  renderGNB();
  renderFloatingBudget();
  // hash가 있으면 해당 페이지 복원, 없으면 대시보드
  const startPage = typeof _restorePageFromHash === 'function' ? _restorePageFromHash() : 'dashboard';
  navigate(startPage);
});
