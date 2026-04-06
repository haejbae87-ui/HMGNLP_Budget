// ─── APP INITIALIZATION ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 0. DB에서 교육목적/유형 로드 → PURPOSES 교체 (misc_ops 등 동적 노출)
  if (typeof sbLoadEduTypes === 'function') {
    try {
      const eduTypes = await sbLoadEduTypes();
      if (eduTypes?.purposes?.length && eduTypes.purposeMap) {
        window.PURPOSES = eduTypes.purposes.map(p => eduTypes.purposeMap[p.id]).filter(Boolean);
        window.EDU_PURPOSE_GROUPS = eduTypes.purposes.map(p => ({
          id: p.id, label: p.label, audience: p.audience,
          icon: p.icon, description: p.description,
        }));
        window.EDU_PURPOSE_MAP = eduTypes.purposeMap;
        window.EDU_TYPE_ITEMS_FLAT = eduTypes.itemsFlat;
        console.log('[FO] PURPOSES DB 교체 완료:', window.PURPOSES.map(p => p.id));
      }
    } catch (e) { console.warn('[FO] PURPOSES DB 로드 실패 → mock 유지:', e.message); }
  }
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
