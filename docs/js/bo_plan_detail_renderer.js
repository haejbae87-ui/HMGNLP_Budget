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
  const d = plan.detail || {};
  const amt = Number(plan.amount || plan.planAmount || 0);
  const status = plan.status || 'pending';

  // 정규화 컬럼 직접 읽기 (Phase E: detail 폴백 제거)
  const isOverseas = plan.is_overseas === true || plan.is_overseas === 'true';
  const overseasCountry = plan.overseas_country || '-';
  const venueType = plan.venue_type || '-';
  const plannedRounds = plan.planned_rounds !== undefined && plan.planned_rounds !== null ? plan.planned_rounds : '-';
  const plannedDays = plan.planned_days !== undefined && plan.planned_days !== null ? plan.planned_days : '-';
  const plannedHeadcount = plan.participant_count !== undefined && plan.participant_count !== null ? plan.participant_count : (d.participantCount || '-');
  const startDate = d.startDate || '-';
  const endDate = d.endDate || '-';
  const eduFormat = plan.education_format || '-';
  const expectedBenefit = plan.expected_benefit || '-';

  // extra_fields (JSON)에서 읽기
  const ef = plan.extra_fields || d.extra_fields || {};
  const institution = ef.institution || d.institution || plan.institution || null;
  const elearningPlatform = ef.elearning_platform || d.elearningPlatform || null;
  const elearningUrl = ef.elearning_url || d.elearningUrl || null;

  const statusLabel = {
    draft: '임시저장', pending: '결재대기', pending_approval: '결재대기',
    saved: '상신대기', in_review: '1차검토', approved: '승인완료',
    rejected: '반려', cancelled: '취소', completed: '완료',
  };
  const statusColor = {
    draft: '#0369A1', pending: '#D97706', pending_approval: '#D97706',
    saved: '#7C3AED', in_review: '#7C3AED', approved: '#059669',
    rejected: '#DC2626', cancelled: '#9CA3AF', completed: '#059669',
  };
  const stLabel = statusLabel[status] || status;
  const stColor = statusColor[status] || '#6B7280';

  // 교육유형
  const eduTypeKr = typeof _planEduTypeKr === 'function'
    ? _planEduTypeKr(plan.edu_type || d.eduType)
    : (plan.edu_type || d.eduType || '-');
  const eduSubTypeKr = typeof _planEduTypeKr === 'function' && (plan.edu_sub_type || d.eduSubType)
    ? ' › ' + _planEduTypeKr(plan.edu_sub_type || d.eduSubType)
    : '';

  // 교육목적
  const purposeKr = typeof _planPurposeKr === 'function'
    ? _planPurposeKr(d.purpose || plan.purpose)
    : (d.purpose || plan.purpose || '-');

  // 산출근거 (정규화 컬럼 calcGrounds는 detail 내에 유지)
  const calcGrounds = d.calcGrounds || [];

  // 위탁기관 표시 조건
  const isConsignment = (plan.edu_sub_type || d.eduSubType || '').toLowerCase().includes('consignment')
    || (plan.edu_sub_type || d.eduSubType || '') === '위탁'
    || !!institution;

  // 이러닝 조건
  const isElearning = (plan.edu_type || d.eduType || '').toLowerCase().includes('elearning')
    || (plan.edu_type || d.eduType || '') === '이러닝';

  const row = (label, value, highlight = false) => `
    <tr style="border-bottom:1px solid #F3F4F6">
      <td style="padding:11px 0;font-weight:800;color:#6B7280;width:140px;font-size:13px">${label}</td>
      <td style="padding:11px 0;color:${highlight ? '#002C5F' : '#374151'};font-weight:${highlight ? '900' : '500'};font-size:${highlight ? '15px' : '13px'}">${value}</td>
    </tr>`;

  const rows = [
    row('계획명', `<strong style="color:#111827">${plan.title || plan.edu_name || '-'}</strong>`),
    row('상신자', plan.applicant_name || plan.submitter || '-'),
    row('소속', `${plan.team || plan.dept || '-'} / ${plan.hq || plan.center || '-'}`),
    row('교육목적', purposeKr),
    row('교육유형', `${eduTypeKr}${eduSubTypeKr}`),
    row('국내/해외', `${_boRenderOverseasBadge(plan)}${isOverseas && overseasCountry !== '-' ? ` <span style="font-size:12px;color:#6B7280;margin-left:6px">(${overseasCountry})</span>` : ''}`),
    row('장소유형', _boVenueTypeKr(venueType !== '-' ? venueType : null)),
    row('예상인원', plannedHeadcount !== '-' ? `${plannedHeadcount}명` : '-'),
    row('예상차수', plannedRounds !== '-' ? `${plannedRounds}회` : '-'),
    plannedDays !== '-' ? row('교육일수', `${plannedDays}일`) : '',
    row('예산계정', plan.account_code || plan.account || '-'),
    row('계획액', `${amt.toLocaleString()}원`, true),
    row('배정액', `${Number(plan.allocated_amount || 0).toLocaleString()}원`),
    row('실사용액', `${Number(plan.actual_amount || 0).toLocaleString()}원`),
    row('교육기간', startDate !== '-' ? `${startDate} ~ ${endDate !== '-' ? endDate : ''}` : '-'),
    row('상태', `<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:${stColor}15;color:${stColor}">${stLabel}</span>`),
    plan.reject_reason
      ? `<tr style="border-bottom:1px solid #F3F4F6">
           <td style="padding:11px 0;font-weight:800;color:#DC2626;font-size:13px">반려사유</td>
           <td style="padding:11px 0;color:#DC2626;font-weight:700;font-size:13px">${plan.reject_reason}</td>
         </tr>`
      : '',
    isConsignment && institution ? row('위탁기관', institution) : '',
    isElearning && elearningPlatform ? row('이러닝 플랫폼', elearningPlatform) : '',
    isElearning && elearningUrl
      ? row('이러닝 URL', `<a href="${elearningUrl}" target="_blank" style="color:#1D4ED8;text-decoration:underline;font-size:12px">${elearningUrl}</a>`)
      : '',
    expectedBenefit !== '-' ? row('기대효과', `<span style="white-space:pre-wrap">${expectedBenefit}</span>`) : '',
    row('상세내용', `<span style="white-space:pre-wrap">${d.content || plan.content || '-'}</span>`),
  ].filter(Boolean).join('');

  // 산출근거 테이블
  const calcGroundsHtml = calcGrounds.length > 0 ? `
    <div style="padding:0 28px 24px">
      <h3 style="font-size:13px;font-weight:900;color:#374151;margin-bottom:10px">📐 세부산출근거</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#F9FAFB">
            <th style="padding:8px 12px;text-align:left;font-weight:800;color:#6B7280">항목</th>
            <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">단가</th>
            <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">수량</th>
            <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">소계</th>
          </tr>
        </thead>
        <tbody>
          ${calcGrounds.map(cg => `
            <tr style="border-top:1px solid #F3F4F6">
              <td style="padding:8px 12px;font-weight:700">${cg.type || cg.label || cg.name || '-'}</td>
              <td style="padding:8px 12px;text-align:right">${Number(cg.price || cg.unit_price || 0).toLocaleString()}원</td>
              <td style="padding:8px 12px;text-align:right">${cg.qty || cg.quantity || 1}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:900">${(Number(cg.price || cg.unit_price || 0) * Number(cg.qty || cg.quantity || 1)).toLocaleString()}원</td>
            </tr>`).join('')}
          <tr style="background:#F9FAFB;border-top:2px solid #E5E7EB">
            <td colspan="3" style="padding:8px 12px;font-weight:900;color:#374151">합계</td>
            <td style="padding:8px 12px;text-align:right;font-weight:900;color:#002C5F">
              ${calcGrounds.reduce((s, cg) => s + Number(cg.price || cg.unit_price || 0) * Number(cg.qty || cg.quantity || 1), 0).toLocaleString()}원
            </td>
          </tr>
        </tbody>
      </table>
    </div>` : '';

  // 교육장소 태그
  const locations = plan.locations || d.locations || [];
  const locationsHtml = locations.length > 0 ? `
    <tr style="border-bottom:1px solid #F3F4F6">
      <td style="padding:11px 0;font-weight:800;color:#6B7280;font-size:13px">교육장소</td>
      <td style="padding:11px 0">
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${locations.map(loc => {
            const name = typeof loc === 'string' ? loc : (loc.name || loc.label || JSON.stringify(loc));
            return `<span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${name}</span>`;
          }).join('')}
        </div>
      </td>
    </tr>` : '';

  return `
    <!-- Phase D: 정규화 컬럼 기반 상세 정보 -->
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${rows}
        ${locationsHtml}
      </table>
    </div>
    ${calcGroundsHtml}`;
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
