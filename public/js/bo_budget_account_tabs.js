// bo_budget_account_tabs.js
// 예산계정 관리 상세화면 - Tab 2 (서비스 정책·프로세스) & Tab 3 (결재라인)

// ─── 목적·유형 정의 (bo_policy_builder.js 과 동일 구조) ─────────────────
const _BAM_PURPOSE_MAP = {
  learner: [{ id: "external_personal", label: "개인직무 사외학습" }],
  operator: [
    { id: "elearning_class", label: "이러닝/집합(비대면) 운영" },
    { id: "conf_seminar", label: "워크샵/세미나/콘퍼런스 등 운영" },
    { id: "misc_ops", label: "기타 운영" },
  ],
};
const _BAM_EDU_MAP = {
  external_personal: [
    { id: "regular", label: "정규교육" }, { id: "academic", label: "학술 및 연구활동" },
    { id: "knowledge", label: "지식자원 학습" }, { id: "competency", label: "역량개발지원" }, { id: "etc", label: "기타" },
  ],
  elearning_class: [{ id: "elearning", label: "이러닝" }, { id: "class", label: "집합교육" }],
  conf_seminar: [{ id: "conference", label: "콘퍼런스" }, { id: "seminar", label: "세미나" }, { id: "teambuilding", label: "팀빌딩" }],
  misc_ops: [{ id: "course_dev", label: "과정개발" }, { id: "material_dev", label: "교안개발" }, { id: "facility", label: "교육시설운영" }],
};

// ─── Tab 2: 서비스 정책·프로세스 ────────────────────────────────────────
// 통합 그룹 체크박스 트리 — 직접학습/교육운영 동시 선택 가능
// BO policy_builder _EDU_TYPE_MAP + FO EDU_TYPE_SUBTYPES 완전 동기화
const _BAM_EDU_TREE = [
  { group: 'learner', icon: '📚', label: '직접학습', color: '#7C3AED', desc: '개인 학습자가 직접 참여',
    categories: [
      { purpose: 'regular', label: '정규교육', desc: '이러닝 · 집합 · 라이브',
        types: [
          { id: 'l_elearning', label: '이러닝' }, { id: 'l_class', label: '집합' }, { id: 'live', label: '라이브' },
        ]},
      { purpose: 'academic', label: '학술 및 연구활동', desc: '학회/컨퍼런스 · 세미나 · 연수',
        types: [
          { id: 'conf', label: '학회/컨퍼런스' }, { id: 'l_seminar', label: '세미나' }, { id: 'acad_study', label: '연수' },
        ]},
      { purpose: 'knowledge', label: '지식자원 학습', desc: '도서 · 논문/저널 · 기술자료',
        types: [
          { id: 'book', label: '도서구입' }, { id: 'journal', label: '논문/저널' }, { id: 'tech_resource', label: '기술자료(DB구독·자료구매)' },
        ]},
      { purpose: 'competency', label: '역량개발지원', desc: '어학 · 자격증 · 학협회비',
        types: [
          { id: 'lang', label: '어학학습비 지원' }, { id: 'cert', label: '자격증 취득지원' }, { id: 'assoc', label: '학협회비' },
        ]},
      { purpose: 'etc', label: '기타', desc: '교육출강 · 팀빌딩',
        types: [
          { id: 'teach', label: '교육출강(사/내외)' }, { id: 'l_team_build', label: '팀빌딩' },
        ]},
    ]},
  { group: 'operator', icon: '🎯', label: '교육운영', color: '#1D4ED8', desc: '교육과정을 기획·운영',
    categories: [
      { purpose: 'elearning_class', label: '이러닝/집합(비대면) 운영',
        types: [{ id: 'elearning', label: '이러닝' }, { id: 'class', label: '집합교육' }]},
      { purpose: 'conf_seminar', label: '워크샵/세미나/콘퍼런스 운영',
        types: [{ id: 'conference', label: '콘퍼런스' }, { id: 'seminar', label: '세미나' }, { id: 'teambuilding', label: '팀빌딩' }, { id: 'cert_maintain', label: '자격유지' }, { id: 'system_link', label: '제도연계' }]},
      { purpose: 'misc_ops', label: '기타 운영',
        types: [{ id: 'course_dev', label: '과정개발' }, { id: 'material_dev', label: '교안개발' }, { id: 'video_prod', label: '영상제작' }, { id: 'facility', label: '교육시설운영' }]},
    ]},
];

function _bamRenderPolicyTab(d) {
  const sel = d.edu_types || [];
  // 선택 카운트 뱃지
  const totalSel = sel.length;

  let html = `<div style="display:grid;gap:18px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;font-size:12px;color:#5B21B6;display:flex;align-items:center;gap:8px">
    🎯 이 예산 계정이 지원하는 <strong>교육 유형</strong>과 <strong>프로세스 패턴</strong>을 설정합니다.
    <span style="font-size:10px;color:#9CA3AF;margin-left:auto">직접학습 · 교육운영 동시 선택 가능</span>
  </div>

  <!-- 교육 유형 통합 선택 -->
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <label style="font-size:12px;font-weight:700">교육 유형 선택 <span style="color:#EF4444">*</span></label>
      ${totalSel > 0 ? `<span style="font-size:10px;padding:3px 10px;border-radius:20px;background:#7C3AED;color:white;font-weight:800">${totalSel}개 선택됨</span>` : ''}
    </div>
    <div style="display:grid;gap:12px">`;

  _BAM_EDU_TREE.forEach(g => {
    // 이 그룹 내 선택된 교육유형 수
    const allTypeIds = g.categories.flatMap(c => c.types.map(t => t.id));
    const grpSelCount = sel.filter(id => allTypeIds.includes(id)).length;
    const isExpanded = grpSelCount > 0 || !d._collapsedGroups || !d._collapsedGroups[g.group];

    html += `<div style="border:2px solid ${grpSelCount > 0 ? g.color : '#E5E7EB'};border-radius:14px;overflow:hidden;transition:border-color .2s">
      <!-- 그룹 헤더 -->
      <div onclick="_bamToggleGroupCollapse('${g.group}')"
        style="padding:12px 16px;background:${grpSelCount > 0 ? g.color + '08' : '#F9FAFB'};display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;border-bottom:1px solid ${grpSelCount > 0 ? g.color + '30' : '#F3F4F6'}">
        <span style="font-size:18px">${g.icon}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:900;color:${grpSelCount > 0 ? g.color : '#374151'}">${g.label}</div>
          <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${g.desc}</div>
        </div>
        ${grpSelCount > 0 ? `<span style="font-size:10px;padding:2px 9px;border-radius:20px;background:${g.color};color:white;font-weight:800">${grpSelCount}개</span>` : ''}
        <span style="font-size:14px;color:#9CA3AF;transition:transform .2s;transform:rotate(${isExpanded ? '180' : '0'}deg)">▼</span>
      </div>
      <!-- 그룹 내용 -->
      <div style="padding:${isExpanded ? '12px 16px' : '0 16px'};max-height:${isExpanded ? '600px' : '0'};overflow:hidden;transition:all .25s ease;background:white">`;

    g.categories.forEach(cat => {
      const catSelCount = cat.types.filter(t => sel.includes(t.id)).length;
      const allChecked = catSelCount === cat.types.length;

      html += `<div style="margin-bottom:10px">
        <!-- 카테고리 헤더 (전체 선택/해제) -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px 0;border-bottom:1px dotted #E5E7EB;cursor:pointer"
          onclick="_bamToggleCategoryAll('${cat.types.map(t=>t.id).join(',')}')">
          <input type="checkbox" ${allChecked ? 'checked' : (catSelCount > 0 ? 'indeterminate' : '')} style="margin:0;accent-color:${g.color};pointer-events:none">
          <span style="font-size:12px;font-weight:800;color:${catSelCount > 0 ? g.color : '#475569'}">${cat.label}</span>
          ${cat.desc ? `<span style="font-size:10px;color:#9CA3AF;margin-left:4px">${cat.desc}</span>` : ''}
          ${catSelCount > 0 ? `<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:${g.color}15;color:${g.color};font-weight:700">${catSelCount}/${cat.types.length}</span>` : ''}
        </div>
        <!-- 교육 유형 체크박스 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-left:4px">
          ${cat.types.map(t => {
            const chk = sel.includes(t.id);
            return `<label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;border:1.5px solid ${chk ? g.color : '#F3F4F6'};background:${chk ? g.color + '08' : 'white'};cursor:pointer;transition:all .12s"
              onclick="event.preventDefault();_bamToggleEduType('${t.id}')">
              <input type="checkbox" ${chk?'checked':''} style="margin:0;accent-color:${g.color};pointer-events:none">
              <span style="font-size:12px;font-weight:${chk?'800':'600'};color:${chk ? g.color : '#374151'}">${t.label}</span>
            </label>`;
          }).join('')}
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;

  // 프로세스 패턴
  html += `<div style="border-top:1px dashed #E5E7EB;padding-top:16px">
  <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">프로세스 패턴 <span style="color:#EF4444">*</span></label>
  <div style="display:grid;gap:8px">
    ${[{v:'A',c:'#7C3AED',i:'📊',l:'패턴A: 계획→신청→결과',d:'고통제형. 사전계획 필수, 예산 가점유 후 실차감'},
       {v:'B',c:'#1D4ED8',i:'📝',l:'패턴B: 신청→결과',d:'자율신청형. 신청 승인 시 가점유, 결과 후 실차감'},
       {v:'C',c:'#D97706',i:'🧾',l:'패턴C: 결과 단독(후정산)',d:'선지불 후정산. 개인 카드 결제 후 영수증 첨부'}
    ].map(o => {
      const sel2 = d.process_pattern === o.v;
      return `<label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;border:2px solid ${sel2?o.c:'#E5E7EB'};background:${sel2?o.c+'15':'white'};cursor:pointer"
        onclick="_bamDetailData.process_pattern='${o.v}';_bamRenderTabs()"><input type="radio" name="bam-pat" ${sel2?'checked':''} style="margin-top:2px;flex-shrink:0">
        <div><div style="font-weight:800;font-size:13px;color:${sel2?o.c:'#374151'}">${o.i} ${o.l}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div></div></label>`;
    }).join('')}
  </div></div>`;

  html += `</div>`;
  return html;
}

function _bamToggleEduType(id) {
  const arr = _bamDetailData.edu_types || [];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  _bamDetailData.edu_types = arr;
  _bamDetailData.purpose_types = _bamComputePurposeTypes(arr);
  _bamRenderTabs();
}

// ── edu_types 배열 → purpose_types JSONB 자동 계산 ──
// 결과: { learner: { regular: ["l_elearning","l_class"], academic: ["conf"] }, operator: { elearning_class: ["elearning"] } }
function _bamComputePurposeTypes(eduTypes) {
  const result = {};
  _BAM_EDU_TREE.forEach(g => {
    const groupPurposes = {};
    g.categories.forEach(cat => {
      const matched = cat.types.filter(t => eduTypes.includes(t.id)).map(t => t.id);
      if (matched.length > 0) {
        groupPurposes[cat.purpose] = matched;
      }
    });
    if (Object.keys(groupPurposes).length > 0) {
      result[g.group] = groupPurposes;
    }
  });
  return result;
}

function _bamToggleCategoryAll(idsStr) {
  const ids = idsStr.split(',');
  const arr = _bamDetailData.edu_types || [];
  const allIn = ids.every(id => arr.includes(id));
  if (allIn) {
    // 전체 해제
    _bamDetailData.edu_types = arr.filter(id => !ids.includes(id));
  } else {
    // 전체 선택
    ids.forEach(id => { if (!arr.includes(id)) arr.push(id); });
    _bamDetailData.edu_types = arr;
  }
  _bamDetailData.purpose_types = _bamComputePurposeTypes(_bamDetailData.edu_types);
  _bamRenderTabs();
}

function _bamToggleGroupCollapse(group) {
  if (!_bamDetailData._collapsedGroups) _bamDetailData._collapsedGroups = {};
  _bamDetailData._collapsedGroups[group] = !_bamDetailData._collapsedGroups[group];
  _bamRenderTabs();
}

// ─── Tab 3: 결재라인 ────────────────────────────────────────────────────
function _bamRenderApprovalTab(d) {
  if (!d.process_pattern) {
    return `<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
      <div style="font-size:32px;margin-bottom:8px">⚠️</div>
      <div style="font-size:13px;font-weight:700;color:#6B7280">먼저 '서비스 정책·프로세스' 탭에서 프로세스 패턴을 선택해주세요.</div></div>`;
  }

  const STAGES_MAP = { A:["forecast","ongoing","apply","result"], B:["apply","result"], C:["apply","result"] };
  const stages = STAGES_MAP[d.process_pattern] || ["apply"];
  const sLabel = { forecast:"📋 사업계획(수요예측)", ongoing:"📊 상시계획", apply:"📝 신청", result:"📄 결과" };
  const sColor = { forecast:"#8B5CF6", ongoing:"#7C3AED", apply:"#1D4ED8", result:"#059669" };
  const LEVELS = [{k:"team_leader",l:"팀장"},{k:"director",l:"실장"},{k:"division_head",l:"사업부장"},{k:"center_head",l:"센터장"},{k:"hq_head",l:"본부장"}];

  if (!d.approval_config) d.approval_config = {};

  // 계정코드 헤더 배지
  const acctCode = d.code || '(미지정)';
  const acctName = d.name || '';
  let html = `<div style="display:grid;gap:16px">
  <!-- 계정 식별 배지 -->
  <div style="padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #C7D2FE;border-radius:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-weight:800;color:#6B7280">예산계정</span>
      <code style="font-size:13px;font-weight:900;color:#1D4ED8;background:#DBEAFE;padding:3px 12px;border-radius:6px;border:1px solid #BFDBFE">${acctCode}</code>
      <span style="font-size:13px;font-weight:700;color:#374151">${acctName}</span>
    </div>
    <div style="margin-left:auto;font-size:10px;color:#7C3AED;font-weight:700;background:#F5F3FF;padding:3px 10px;border-radius:6px;border:1px solid #DDD6FE">
      📐 계정별 독립 결재라인 설정
    </div>
  </div>

  <div style="padding:12px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E">
    💡 각 단계별 결재라인을 설정하세요. 금액 구간별 결재자를 지정하면 FO 상신 시 자동 적용됩니다.
    <span style="font-weight:800;margin-left:4px">수요예측(사업계획) 단계의 결재라인은 forecast_approval_lines 테이블에 자동 동기화됩니다.</span>
  </div>`;

  stages.forEach(s => {
    const c = d.approval_config[s] || { thresholds:[], approvalType:"platform", reviewMode:"none" };
    if (!d.approval_config[s]) d.approval_config[s] = c;
    if (!c.thresholds) c.thresholds = [];
    const sc = sColor[s];
    const isForecast = s === 'forecast';

    html += `<div style="border:2px solid ${sc}50;border-radius:14px;overflow:hidden">
    <div style="padding:12px 16px;background:${sc}0A;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${sc}30">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:900;color:${sc}">${sLabel[s]} 결재라인</span>
        ${isForecast ? '<span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:4px;background:#8B5CF615;color:#8B5CF6;border:1px solid #8B5CF640">수요예측 핵심 결재</span>' : ''}
      </div>
      <span style="padding:2px 9px;border-radius:20px;background:${c.thresholds.length?sc:'#F3F4F6'};color:${c.thresholds.length?'white':'#9CA3AF'};font-size:10px;font-weight:900">${c.thresholds.length?'✓ '+c.thresholds.length+'개 구간':'미설정'}</span>
    </div>
    <div style="padding:16px;background:white;display:grid;gap:14px">
      <!-- 결재 시스템 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">결재 시스템</label>
        <div style="display:flex;gap:8px">
          ${['platform','hmg'].map(t => `<label style="flex:1;padding:10px 14px;border-radius:10px;border:2px solid ${c.approvalType===t?sc:'#E5E7EB'};background:${c.approvalType===t?sc+'0A':'white'};cursor:pointer"
            onclick="_bamDetailData.approval_config['${s}'].approvalType='${t}';_bamRenderTabs()"><div style="display:flex;align-items:center;gap:8px">
            <input type="radio" ${c.approvalType===t?'checked':''} style="margin:0;accent-color:${sc}">
            <span style="font-weight:800;font-size:12px;color:${c.approvalType===t?sc:'#374151'}">${t==='platform'?'⚙️ 자체결재':'🔗 통합결재'}</span></div></label>`).join('')}
        </div>
      </div>

      <!-- 금액별 결재자 -->
      <div style="border-top:1px solid #F3F4F6;padding-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-size:12px;font-weight:800;color:#374151">💰 금액별 결재자 <span style="font-size:10px;font-weight:500;color:#9CA3AF">(축1: 총액 → 승인자 레벨 상승)</span></label>
          <button onclick="_bamAddThreshold('${s}')" style="font-size:11px;padding:5px 14px;border-radius:8px;border:1.5px solid ${sc};color:${sc};background:white;cursor:pointer;font-weight:700">+ 추가</button>
        </div>
        ${c.thresholds.length === 0
          ? `<div style="padding:16px;text-align:center;background:#F9FAFB;border-radius:10px;border:1px dashed #D1D5DB;font-size:11px;color:#9CA3AF">결재 구간이 없습니다. + 추가 버튼으로 설정하세요</div>`
          : `<div style="display:grid;gap:8px">${c.thresholds.map((t,i) => `<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;padding:12px;background:#FAFAFA;border:1.5px solid #E5E7EB;border-radius:10px">
            <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">금액 상한 (원 이하)</label>
              <input type="number" value="${t.maxAmt||''}" placeholder="예: 1000000" onchange="_bamDetailData.approval_config['${s}'].thresholds[${i}].maxAmt=Number(this.value);_bamRenderTabs()"
                style="width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:8px;font-size:13px;font-weight:700;box-sizing:border-box"></div>
            <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">결재자</label>
              <select onchange="_bamDetailData.approval_config['${s}'].thresholds[${i}].approverKey=this.value;_bamRenderTabs()"
                style="width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:8px;font-size:13px;font-weight:700"><option value="">— 선택 —</option>
                ${LEVELS.map(lv => `<option value="${lv.k}" ${t.approverKey===lv.k?'selected':''}>${lv.l}</option>`).join('')}</select></div>
            <button onclick="_bamRemoveThreshold('${s}',${i})" style="padding:8px 12px;border-radius:8px;border:1.5px solid #FCA5A5;color:#DC2626;background:white;cursor:pointer;font-size:11px;font-weight:700;height:36px">삭제</button>
          </div>`).join('')}</div>`}
      </div>

      <!-- 구간별 결재 플로우 시각 프리뷰 -->
      ${c.thresholds.length > 0 ? `<div style="border-top:1px solid #F3F4F6;padding-top:12px">
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:8px">🔄 결재 플로우 프리뷰</label>
        <div style="display:grid;gap:6px">${_bamRenderFlowPreview(c, LEVELS, sc)}</div>
      </div>` : ''}

      <!-- 결재 후 검토자 -->
      <div style="border-top:1px solid #F3F4F6;padding-top:12px">
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:8px">🔍 결재 후 검토 모드</label>
        <div style="display:grid;gap:6px">
          ${[{k:'none',l:'검토 없음 (직접 승인만)',d:'금액 구간별 결재자가 직접 승인 처리',i:'⚡',c:'#6B7280'},
             {k:'leader_to_admin',l:'팀장 검토 → 총괄담당자 검토',d:'팀장 1차 검토 후 총괄담당자 최종 검토',i:'👤→🏛️',c:'#1D4ED8'},
             {k:'leader_to_manager_to_admin',l:'팀장 검토 → 운영담당자 검토 → 총괄담당자 검토',d:'팀장·운영담당자 순차 검토 후 총괄담당자 최종 승인',i:'👤→👤→🏛️',c:'#059669'}
          ].map(m => {
            const sel = (c.reviewMode||'none') === m.k;
            return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:2px solid ${sel?m.c:'#E5E7EB'};background:${sel?m.c+'10':'white'};cursor:pointer"
              onclick="_bamDetailData.approval_config['${s}'].reviewMode='${m.k}';_bamRenderTabs()">
              <input type="radio" ${sel?'checked':''} style="margin:0;accent-color:${m.c}"><span style="font-size:14px">${m.i}</span>
              <div style="flex:1"><div style="font-size:12px;font-weight:800;color:${sel?m.c:'#374151'}">${m.l}</div>
              <div style="font-size:10px;color:#6B7280;margin-top:1px">${m.d}</div></div></label>`;
          }).join('')}
        </div>
      </div>
    </div></div>`;
  });

  html += `</div>`;
  return html;
}

// 구간별 결재 플로우 시각 프리뷰 렌더러
function _bamRenderFlowPreview(stageConfig, LEVELS, stageColor) {
  const sorted = [...(stageConfig.thresholds || [])].sort((a, b) => (a.maxAmt || Infinity) - (b.maxAmt || Infinity));
  const reviewMode = stageConfig.reviewMode || 'none';
  const LABELS = { team_leader:'팀장', director:'실장', division_head:'사업부장', center_head:'센터장', hq_head:'본부장' };

  return sorted.map(t => {
    const approverLabel = LABELS[t.approverKey] || t.approverKey || '미지정';
    const amtLabel = t.maxAmt ? `${(t.maxAmt / 10000).toLocaleString()}만원 이하` : '최고 구간';
    // 노드 배열 구성
    const flowNodes = [];
    flowNodes.push({ icon: '✍️', label: '기안자', color: '#6B7280' });
    if (reviewMode === 'leader_to_admin' || reviewMode === 'leader_to_manager_to_admin') {
      flowNodes.push({ icon: '👤', label: '팀장 검토', color: '#1D4ED8' });
    }
    if (reviewMode === 'leader_to_manager_to_admin') {
      flowNodes.push({ icon: '👤', label: '운영담당자 검토', color: '#D97706' });
    }
    flowNodes.push({ icon: '✅', label: approverLabel + ' 승인', color: stageColor });
    if (reviewMode && reviewMode !== 'none') {
      flowNodes.push({ icon: '🏛️', label: '총괄담당자 최종', color: '#7C3AED' });
    }

    const nodesHtml = flowNodes.map((n, j) =>
      `${j > 0 ? '<span style="color:#9CA3AF;font-size:10px">→</span>' : ''}` +
      `<span style="padding:3px 8px;border-radius:12px;background:${n.color}10;border:1px solid ${n.color}30;font-size:10px;font-weight:700;color:${n.color};white-space:nowrap">${n.icon} ${n.label}</span>`
    ).join('');

    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#FAFAFA;border-radius:8px;border:1px solid #F0F0F0;flex-wrap:wrap">
      <span style="font-size:10px;font-weight:800;color:${stageColor};min-width:100px">${amtLabel}</span>
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">${nodesHtml}</div>
    </div>`;
  }).join('');
}

function _bamAddThreshold(stage) {
  if (!_bamDetailData.approval_config[stage]) _bamDetailData.approval_config[stage] = { thresholds:[], approvalType:'platform', reviewMode:'none' };
  _bamDetailData.approval_config[stage].thresholds.push({ maxAmt: null, approverKey: '' });
  _bamRenderTabs();
}

function _bamRemoveThreshold(stage, i) {
  _bamDetailData.approval_config[stage].thresholds.splice(i, 1);
  _bamRenderTabs();
}
