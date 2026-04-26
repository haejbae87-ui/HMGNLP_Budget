/**
 * bo_plan_detail_renderer.js
 * Phase D: BO 교육계획 상세뷰 정규화 컬럼 기반 렌더러
 *
 * bo_plan_mgmt.js의 _renderBoPlanDetail 내 상세정보 섹션을
 * form_template_id / _form_snapshot 의존 없이 정규화 컬럼 직접 읽기로 교체.
 * 기존 detail JSON은 폴백(fallback)으로만 사용.
 *
 * 관련 PRD: form_simplification.md > Phase D (EC-12, EC-13)
 * 작성: 2026-04-21
 */

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

/**
 * 국내/해외 뱃지
 */
function _boRenderOverseasBadge(plan) {
  const isOverseas = plan.is_overseas === true || plan.is_overseas === 'true';
  return isOverseas
    ? `<span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:#EFF6FF;color:#1D4ED8">🌏 해외</span>`
    : `<span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:#F0FDF4;color:#166534">🗺 국내</span>`;
}

/**
 * 장소유형 한글 변환
 */
function _boVenueTypeKr(val) {
  const map = {
    internal: '사내',
    external: '외부임차',
    online: '온라인/원격',
  };
  return val ? (map[val] || val) : '-';
}



// ─── 메인: 상세 정보 섹션 렌더러 ────────────────────────────────────────────

/**
 * BO 교육계획 상세뷰 — 정규화 컬럼 기반 정보 테이블 렌더링
 * bo_plan_mgmt.js의 _renderBoPlanDetail 에서 호출한다.
 *
 * @param {Object} plan - plans 테이블 레코드
 * @returns {string} HTML 문자열
 */
window.boRenderPlanDetailInfo = function(plan) {
  if (typeof window.foRenderStandardReadOnlyForm === 'function') {
    // 1. 공통 7단계 렌더러 호출
    const html = window.foRenderStandardReadOnlyForm(plan, 'BO');
    
    // 2. BO 전용 추가 UI (반려 사유 등)
    let extraHtml = '';
    if (plan.status === 'rejected' && plan.reject_reason) {
      extraHtml = `
      <div style="margin:24px 28px 0;padding:16px;background:#FEF2F2;border:2px solid #FCA5A5;border-radius:12px;color:#991B1B">
        <h4 style="margin:0 0 6px;font-size:14px;font-weight:900">❌ 반려 사유</h4>
        <p style="margin:0;font-size:13px;font-weight:700">${plan.reject_reason}</p>
      </div>`;
    }
    
    return extraHtml + `<div style="padding:24px 28px;background:#F9FAFB">${html}</div>`;
  }
  return `<div style="padding:24px 28px"><p style="color:#9CA3AF;font-size:12px">상세 렌더러 로딩 중...</p></div>`;
};

/**
 * BO 연결 신청서 상세 행 — 정규화 컬럼 우선 읽기
 * bo_plan_mgmt.js의 _buildAppDetailRows 를 대체/보완
 *
 * @param {Object} app - applications 테이블 레코드
 * @returns {string} HTML 문자열
 */
window.boRenderAppDetailRows = function(app) {
  const d = app.detail || {};
  const ef = app.extra_fields || {};

  // 정규화 컬럼 직접 읽기
  const isOverseas = app.is_overseas === true || app.is_overseas === 'true';
  const venueType = app.venue_type || null;
  const startDate = d.startDate || d.start_date || '-';
  const endDate = d.endDate || d.end_date || '-';
  const institution = ef.institution || d.institution || d.courseInfo || null;
  const purpose = d.purpose || d.apply_reason || app.apply_reason || null;

  const fields = [
    ['교육명', app.edu_name || d.edu_name || '-'],
    ['교육유형', app.edu_type || d.eduType || '-'],
    ['국내/해외', isOverseas ? '🌏 해외' : '🗺 국내'],
    venueType ? ['장소유형', _boVenueTypeKr(venueType)] : null,
    ['예산계정', app.account_code || '-'],
    ['신청금액', Number(app.amount || 0).toLocaleString() + '원'],
    ['신청일', (app.created_at || '').slice(0, 10) || '-'],
    startDate !== '-' ? ['교육기간', `${startDate} ~ ${endDate}`] : null,
    institution ? ['교육기관/과정', institution] : null,
    purpose ? ['신청목적', purpose] : null,
    app.status === 'rejected' && (app.reject_reason || d.reject_reason)
      ? ['반려사유', app.reject_reason || d.reject_reason]
      : null,
  ].filter(Boolean);

  return fields.map(([label, val]) =>
    `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:12px">
      <span style="width:90px;flex-shrink:0;font-weight:700;color:#6B7280">${label}</span>
      <span style="color:#111827">${val}</span>
    </div>`
  ).join('');
};

console.log('[bo_plan_detail_renderer] Phase D 렌더러 로드 완료');
