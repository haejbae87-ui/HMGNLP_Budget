// ─── APP INITIALIZATION ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 1. DB에서 전체 학습자 + 테넌트 로드 (GNB 스위처용)
  if (typeof _loadAllEmployees === 'function') {
    await _loadAllEmployees();
  }
  // 2. sessionStorage 저장된 키 기반으로 currentPersona 초기화
  //    (users.id 또는 PERSONAS key 모두 처리)
  if (typeof _resolveCurrentPersona === 'function') {
    currentPersona = await _resolveCurrentPersona();
  }
  renderGNB();
  renderFloatingBudget();
  // hash가 있으면 해당 페이지 복원, 없으면 대시보드
  const startPage = typeof _restorePageFromHash === 'function' ? _restorePageFromHash() : 'dashboard';
  navigate(startPage);
});
