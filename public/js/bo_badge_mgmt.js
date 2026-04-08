// bo_badge_mgmt.js
// 뱃지 기준 설정 - 상세 페이지 기반 편집 (팝업 방식 폐기)
// PRD 반영: 뱃지 그룹, 레벨, 유효기간, 취득 조건(룰 빌더), 갱신 조건, 선수 뱃지, 크로스 테넌트 인정

let mgmtBadgeGroups = [];
let allBadges = [];
let _bmAllTenants = [];
let _bmVorgTemplates = [];
let _bmFilterTenantId = '';
let _bmFilterVorgId = '';
let _bmFilterGroupId = '';

// ── 상세 편집 모드 상태 ──────────────────────────────────────────────────────
let _bmDetailMode = false;   // true: 상세 편집 화면
let _bmEditingId = null;     // null: 신규, string: 수정 중인 뱃지 ID
let _bmEditData = {};        // 현재 편집 중인 데이터
let _bmConditionNodes = [];  // 룰 빌더 노드 배열

// ── 메인 렌더 ─────────────────────────────────────────────────────────────────
async function renderBadgeMgmt() {
  _bmDetailMode = false;
  _bmEditingId = null;
  const container = document.getElementById('bo-content');
  const isSuperAdmin = boCurrentPersona?.role === 'platform_admin';
  const myTenantId = boCurrentPersona?.tenantId || 'HMC';
  _bmFilterTenantId = myTenantId;

  container.innerHTML = `
    <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h1 class="bo-page-title">🎖️ 뱃지 기준 설정</h1>
        <p class="bo-page-sub">뱃지 취득 조건, 레벨 체계, 갱신 규칙을 설정합니다</p>
      </div>
      <button onclick="openBadgeMgmtDetail(null)"
        style="padding:10px 18px;background:var(--brand);color:#fff;border:none;border-radius:8px;
               font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.12)">
        <span style="font-size:16px">+</span> 뱃지 생성
      </button>
    </div>

    <!-- 필터 바 -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:14px 20px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.04)">
      <span style="font-size:12px;font-weight:800;color:#6B7280;white-space:nowrap">🔍 조회 조건</span>
      ${isSuperAdmin ? `
      <select id="bm-filter-tenant" onchange="onBmTenantChange()"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;min-width:130px">
        <option value="">전체 회사</option>
      </select>` : `<span style="font-size:13px;font-weight:700;color:#374151;padding:8px 12px;background:#F1F5F9;border-radius:8px">${myTenantId}</span>`}
      <select id="bm-filter-vorg" onchange="onBmVorgChange()"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;min-width:180px">
        <option value="">전체 가상조직</option>
      </select>
      <select id="bm-filter-group" onchange="_bmFilterGroupId=this.value;loadBadgeMgmtData()"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;min-width:150px">
        <option value="">전체 뱃지그룹</option>
      </select>
      <button onclick="loadBadgeMgmtData()"
        style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.35)">
        ● 조회
      </button>
    </div>

    <!-- 목록 테이블 -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)">
      <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
        <thead>
          <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">소속 그룹</th>
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">레벨</th>
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">뱃지명</th>
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">유효기간</th>
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">취득 조건</th>
            <th style="padding:12px 16px;font-size:11px;font-weight:800;color:#6B7280">선수 뱃지</th>
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">관리</th>
          </tr>
        </thead>
        <tbody id="badges-body">
          <tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">필터를 선택하고 조회해주세요.</td></tr>
        </tbody>
      </table>
    </div>
    </div>
  `;

  await _bmLoadTenants(isSuperAdmin, myTenantId);
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}

// ── 상세 편집 화면 렌더 (팝업 대신 상세 페이지로 이동) ─────────────────────────
function openBadgeMgmtDetail(badgeId) {
  _bmDetailMode = true;
  _bmEditingId = badgeId;

  const existing = badgeId ? allBadges.find(b => b.id === badgeId) : null;
  _bmEditData = existing ? JSON.parse(JSON.stringify(existing)) : {
    group_id: mgmtBadgeGroups[0]?.id || '',
    name: '', level: '', valid_months: null, allow_manual_award: false,
    prerequisite_badge_id: null, equivalent_badge_ids: [],
    condition_rules: { operator: 'AND', nodes: [] },
    renewal_rules: {}
  };

  // 룰 빌더 노드 파싱
  _bmConditionNodes = Array.isArray(_bmEditData.condition_rules?.nodes)
    ? JSON.parse(JSON.stringify(_bmEditData.condition_rules.nodes)) : [];

  _renderBadgeDetailPage();
}

function _renderBadgeDetailPage() {
  const container = document.getElementById('bo-content');
  const isNew = !_bmEditingId;
  const d = _bmEditData;

  const groupOptions = mgmtBadgeGroups.map(g =>
    `<option value="${g.id}" ${d.group_id === g.id ? 'selected' : ''}>${g.name}</option>`
  ).join('');

  const prereqOptions = allBadges
    .filter(b => b.id !== _bmEditingId)
    .map(b => `<option value="${b.id}" ${d.prerequisite_badge_id === b.id ? 'selected' : ''}>${b.name}</option>`)
    .join('');

  const conditionNodesHtml = _bmConditionNodes.length === 0
    ? `<div style="padding:20px;text-align:center;background:#F8FAFC;border-radius:8px;border:1.5px dashed #E5E7EB;color:#9CA3AF;font-size:12px">
        아직 취득 조건이 없습니다. 아래 [+ 조건 추가] 버튼으로 추가하세요.
       </div>`
    : _bmConditionNodes.map((node, idx) => _bmRenderConditionNode(node, idx)).join('');

  container.innerHTML = `
    <div class="bo-fade">
    <!-- 헤더 breadcrumb -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
      <button onclick="renderBadgeMgmt()" style="padding:6px 12px;border:1.5px solid #E5E7EB;border-radius:7px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280;display:flex;align-items:center;gap:4px">
        ← 목록
      </button>
      <span style="color:#9CA3AF;font-size:13px">/</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${isNew ? '🆕 새 뱃지 생성' : '✏️ 뱃지 수정'}</span>
      ${!isNew ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${d.name}</span>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1100px">

      <!-- ── 좌측: 기본 정보 ── -->
      <div>
        <!-- 섹션 1: 기본 정보 -->
        <div class="bo-card" style="padding:24px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px solid #F3F4F6">
            <span style="font-size:18px">📋</span>
            <span style="font-size:14px;font-weight:900;color:#111827">기본 정보</span>
          </div>
          
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">
              뱃지 그룹 <span style="color:#EF4444">*</span>
            </label>
            <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">이 뱃지가 속하는 그룹. 그룹 = 역량 영역(예: 개발기술, 리더십)</p>
            <select id="bmd-group" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700">
              <option value="">-- 그룹 선택 --</option>
              ${groupOptions || '<option disabled>그룹 없음 (뱃지 그룹 먼저 생성)</option>'}
            </select>
          </div>

          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">
              뱃지명 <span style="color:#EF4444">*</span>
            </label>
            <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">사용자에게 표시될 뱃지 이름 (예: 하이테크 기술인증 뱃지 Level 1)</p>
            <input type="text" id="bmd-name" value="${d.name || ''}" placeholder="예: Python 기초 인증" 
              style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700;box-sizing:border-box">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div>
              <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">레벨</label>
              <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">뱃지 내 단계 (예: Level 1 → 2 → 3)</p>
              <input type="text" id="bmd-level" value="${d.level || ''}" placeholder="예: Level 1"
                style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">유효기간</label>
              <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">0 또는 빈칸 = 영구유효, 숫자 입력 시 N개월 후 만료</p>
              <input type="number" id="bmd-months" value="${d.valid_months || ''}" placeholder="0 = 영구"
                style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
          </div>

          <div style="margin-bottom:0">
            <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">수동 발급 허용</label>
            <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px">운영자가 조건 충족 없이 직접 뱃지를 수여할 수 있는지 여부</p>
            <div style="display:flex;gap:10px">
              <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px solid ${!d.allow_manual_award ? '#1D4ED8' : '#E5E7EB'};border-radius:8px;cursor:pointer;background:${!d.allow_manual_award ? '#EFF6FF' : '#fff'}">
                <input type="radio" name="bmd-manual" value="false" ${!d.allow_manual_award ? 'checked' : ''} style="accent-color:#1D4ED8">
                <div>
                  <div style="font-size:12px;font-weight:700;color:${!d.allow_manual_award ? '#1D4ED8' : '#374151'}">🤖 시스템 자동 취득만</div>
                  <div style="font-size:10px;color:#9CA3AF">조건 충족 시에만 자동 발급</div>
                </div>
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px solid ${d.allow_manual_award ? '#059669' : '#E5E7EB'};border-radius:8px;cursor:pointer;background:${d.allow_manual_award ? '#F0FDF4' : '#fff'}">
                <input type="radio" name="bmd-manual" value="true" ${d.allow_manual_award ? 'checked' : ''} style="accent-color:#059669">
                <div>
                  <div style="font-size:12px;font-weight:700;color:${d.allow_manual_award ? '#059669' : '#374151'}">👤 수동 발급 허용</div>
                  <div style="font-size:10px;color:#9CA3AF">운영자 심사 후 직접 수여 가능</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- 섹션 2: 선행 조건 및 상호 인정 -->
        <div class="bo-card" style="padding:24px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px">🔗</span>
            <span style="font-size:14px;font-weight:900;color:#111827">선행 조건 및 상호 인정</span>
          </div>
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 16px">이 뱃지를 취득하기 위한 전제 뱃지 설정 및 타사 상호 인정 뱃지를 지정합니다</p>

          <div style="margin-bottom:14px">
            <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">선수 뱃지 (강등 낙하 지점)</label>
            <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">이 뱃지 취득 전 반드시 보유해야 하는 뱃지. 이 뱃지를 잃으면 선수 뱃지로 강등됨</p>
            <select id="bmd-prereq" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
              <option value="">선수 뱃지 없음 (독립 취득 가능)</option>
              ${prereqOptions}
            </select>
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">타사 상호 인정 뱃지 ID</label>
            <p style="font-size:11px;color:#9CA3AF;margin:0 0 6px">HMC 외 계열사에서 발급된 동등 뱃지 UUID 목록. 이 뱃지 보유자는 이 뱃지도 보유한 것으로 간주</p>
            <div style="background:#F8FAFC;border:1.5px solid #E5E7EB;border-radius:8px;padding:12px">
              <textarea id="bmd-equivalent" rows="3" placeholder='["kia-badge-uuid-1", "hmg-badge-uuid-2"]'
                style="width:100%;background:transparent;color:#374151;border:none;outline:none;font-family:monospace;font-size:12px;resize:none;box-sizing:border-box">${JSON.stringify(d.equivalent_badge_ids || [], null, 2)}</textarea>
            </div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:4px">💡 JSON 배열 형식으로 입력. 빈 경우 []</div>
          </div>
        </div>
      </div>

      <!-- ── 우측: 취득 조건 룰 빌더 ── -->
      <div>
        <!-- 섹션 3: 최초 취득 조건 -->
        <div class="bo-card" style="padding:24px;margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">🎯</span>
              <span style="font-size:14px;font-weight:900;color:#111827">최초 취득 조건 (룰 빌더)</span>
            </div>
            <select id="bmd-operator" style="padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:7px;font-size:11px;font-weight:700">
              <option value="AND" ${(_bmEditData.condition_rules?.operator||'AND')==='AND'?'selected':''}>AND (모두 충족)</option>
              <option value="OR" ${(_bmEditData.condition_rules?.operator||'AND')==='OR'?'selected':''}>OR (하나 이상)</option>
            </select>
          </div>
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 16px">뱃지를 처음 취득하기 위한 학습 조건을 설정합니다. 조건끼리의 결합 방식(AND/OR)을 선택하세요.</p>
          
          <!-- 조건 유형 설명 -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#FEE2E2;color:#B91C1C;font-weight:700">📌 course_group(path): 순서대로 이수</span>
            <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#DBEAFE;color:#1D4ED8;font-weight:700">🎲 course_group(pool): N개 이상 이수</span>
            <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#FEF3C7;color:#92400E;font-weight:700">📝 exam: 시험 합격</span>
          </div>

          <!-- 룰 빌더 노드 목록 -->
          <div id="bmd-condition-nodes" style="margin-bottom:12px">
            ${conditionNodesHtml}
          </div>

          <!-- 조건 추가 버튼 -->
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button onclick="_bmAddConditionNode('course_path')" style="padding:7px 12px;border:1.5px solid #EF4444;border-radius:7px;background:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;cursor:pointer">
              + 순서형 과정 그룹 (path)
            </button>
            <button onclick="_bmAddConditionNode('course_pool')" style="padding:7px 12px;border:1.5px solid #3B82F6;border-radius:7px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700;cursor:pointer">
              + 선택형 과정 그룹 (pool)
            </button>
            <button onclick="_bmAddConditionNode('exam')" style="padding:7px 12px;border:1.5px solid #F59E0B;border-radius:7px;background:#FFFBEB;color:#92400E;font-size:11px;font-weight:700;cursor:pointer">
              + 시험 조건 (exam)
            </button>
          </div>
        </div>

        <!-- 섹션 4: 갱신 조건 -->
        <div class="bo-card" style="padding:24px;border-left:4px solid #10B981">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px">🔄</span>
            <span style="font-size:14px;font-weight:900;color:#111827">갱신 조건 (선택사항)</span>
          </div>
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 12px">유효기간이 있는 뱃지의 경우, 갱신을 위한 특별 조건을 설정합니다. 비워두면 최초 취득 조건과 동일하게 적용됩니다.</p>
          <div style="background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:8px;padding:12px">
            <textarea id="bmd-renewal" rows="5" placeholder='{}  ← 비워두면 최초 취득 조건과 동일하게 적용'
              style="width:100%;background:transparent;color:#065F46;border:none;outline:none;font-family:monospace;font-size:12px;resize:vertical;box-sizing:border-box">${JSON.stringify(d.renewal_rules || {}, null, 2)}</textarea>
          </div>
          <div style="font-size:10px;color:#6B7280;margin-top:6px">💡 {} 이면 갱신 조건 없음 (최초 취득 조건 동일 적용)</div>
        </div>
      </div>
    </div>

    <!-- 저장/취소 -->
    <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:20px;border-top:1.5px solid #E5E7EB;max-width:1100px">
      <button onclick="renderBadgeMgmt()" style="padding:11px 20px;background:#F3F4F6;color:#6B7280;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
        취소
      </button>
      <button onclick="saveBadgeDef()" style="padding:11px 24px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.3)">
        💾 뱃지 저장
      </button>
    </div>
    </div>
  `;
}

// ── 룰 빌더: 단일 노드 렌더 ──────────────────────────────────────────────────
function _bmRenderConditionNode(node, idx) {
  const isCourse = node.type === 'course_group';
  const isExam = node.type === 'exam';
  const mode = node.mode || 'path';

  if (isCourse && mode === 'path') {
    const itemsHtml = (node.items || []).map((item, ii) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-size:10px;color:#9CA3AF;width:16px;text-align:right">${ii+1}.</span>
        <input type="text" value="${item}" placeholder="과정 ID"
          onchange="_bmUpdateConditionItem(${idx},${ii},this.value)"
          style="flex:1;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px;font-family:monospace">
        <button onclick="_bmRemoveConditionItem(${idx},${ii})" style="border:none;background:none;color:#EF4444;cursor:pointer;font-size:14px;padding:2px">✕</button>
      </div>`).join('');
    return `
    <div style="border:1.5px solid #FCA5A5;border-radius:10px;padding:14px;margin-bottom:10px;background:#FFF5F5">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:12px;font-weight:800;color:#DC2626">📌 순서형 과정 그룹 (path)</span>
        <button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#FEE2E2;color:#DC2626;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button>
      </div>
      <p style="font-size:10px;color:#9CA3AF;margin:0 0 8px">아래 과정을 순서대로 이수해야 합니다 (1번→2번→...)</p>
      <div id="bmd-items-${idx}">
        ${itemsHtml || '<div style="font-size:11px;color:#9CA3AF;padding:6px">과정 ID를 추가하세요</div>'}
      </div>
      <button onclick="_bmAddConditionItem(${idx})" style="margin-top:6px;padding:5px 10px;border:1.5px dashed #FCA5A5;border-radius:6px;background:none;color:#DC2626;font-size:11px;font-weight:700;cursor:pointer">+ 과정 추가</button>
    </div>`;
  }

  if (isCourse && mode === 'pool') {
    const itemsHtml = (node.items || []).map((item, ii) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <input type="text" value="${item}" placeholder="과정 ID"
          onchange="_bmUpdateConditionItem(${idx},${ii},this.value)"
          style="flex:1;padding:6px 10px;border:1.5px solid #BFDBFE;border-radius:6px;font-size:12px;font-family:monospace">
        <button onclick="_bmRemoveConditionItem(${idx},${ii})" style="border:none;background:none;color:#6B7280;cursor:pointer;font-size:14px">✕</button>
      </div>`).join('');
    return `
    <div style="border:1.5px solid #BFDBFE;border-radius:10px;padding:14px;margin-bottom:10px;background:#EFF6FF">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;font-weight:800;color:#1D4ED8">🎲 선택형 과정 그룹 (pool)</span>
        <button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#DBEAFE;color:#1D4ED8;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;color:#374151;font-weight:700">아래</span>
        <input type="number" value="${node.required_count || 1}" min="1"
          onchange="_bmUpdateConditionProp(${idx},'required_count',Number(this.value))"
          style="width:50px;padding:5px 8px;border:1.5px solid #BFDBFE;border-radius:6px;font-size:12px;font-weight:700;text-align:center">
        <span style="font-size:11px;color:#374151;font-weight:700">개 이상 이수하면 합격</span>
      </div>
      <div>${itemsHtml || '<div style="font-size:11px;color:#9CA3AF;padding:6px">과정 ID를 추가하세요</div>'}</div>
      <button onclick="_bmAddConditionItem(${idx})" style="margin-top:6px;padding:5px 10px;border:1.5px dashed #BFDBFE;border-radius:6px;background:none;color:#1D4ED8;font-size:11px;font-weight:700;cursor:pointer">+ 과정 추가</button>
    </div>`;
  }

  if (isExam) {
    return `
    <div style="border:1.5px solid #FDE68A;border-radius:10px;padding:14px;margin-bottom:10px;background:#FFFBEB">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;font-weight:800;color:#92400E">📝 시험 조건 (exam)</span>
        <button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#FDE68A;color:#92400E;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button>
      </div>
      <div style="display:flex;gap:10px">
        <div style="flex:2">
          <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">시험 ID</label>
          <input type="text" value="${node.exam_id || ''}" placeholder="exam_id"
            onchange="_bmUpdateConditionProp(${idx},'exam_id',this.value)"
            style="width:100%;padding:7px 10px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;font-family:monospace;box-sizing:border-box">
        </div>
        <div style="flex:1">
          <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">합격 기준 (%)</label>
          <input type="number" value="${node.pass_score || 80}" min="0" max="100"
            onchange="_bmUpdateConditionProp(${idx},'pass_score',Number(this.value))"
            style="width:100%;padding:7px 10px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;text-align:center;box-sizing:border-box">
        </div>
      </div>
    </div>`;
  }

  return `<div style="padding:10px;background:#F3F4F6;border-radius:8px;font-size:11px;color:#9CA3AF;margin-bottom:8px">알 수 없는 조건 유형: ${node.type}</div>`;
}

// ── 룰 빌더 액션 ─────────────────────────────────────────────────────────────
function _bmAddConditionNode(type) {
  if (type === 'course_path') {
    _bmConditionNodes.push({ type: 'course_group', mode: 'path', items: [] });
  } else if (type === 'course_pool') {
    _bmConditionNodes.push({ type: 'course_group', mode: 'pool', required_count: 1, items: [] });
  } else if (type === 'exam') {
    _bmConditionNodes.push({ type: 'exam', exam_id: '', pass_score: 80 });
  }
  _refreshConditionNodes();
}

function _bmRemoveConditionNode(idx) {
  _bmConditionNodes.splice(idx, 1);
  _refreshConditionNodes();
}

function _bmAddConditionItem(nodeIdx) {
  if (!_bmConditionNodes[nodeIdx].items) _bmConditionNodes[nodeIdx].items = [];
  _bmConditionNodes[nodeIdx].items.push('');
  _refreshConditionNodes();
}

function _bmRemoveConditionItem(nodeIdx, itemIdx) {
  _bmConditionNodes[nodeIdx].items.splice(itemIdx, 1);
  _refreshConditionNodes();
}

function _bmUpdateConditionItem(nodeIdx, itemIdx, value) {
  _bmConditionNodes[nodeIdx].items[itemIdx] = value;
}

function _bmUpdateConditionProp(nodeIdx, prop, value) {
  _bmConditionNodes[nodeIdx][prop] = value;
}

function _refreshConditionNodes() {
  const container = document.getElementById('bmd-condition-nodes');
  if (!container) return;
  if (_bmConditionNodes.length === 0) {
    container.innerHTML = `<div style="padding:20px;text-align:center;background:#F8FAFC;border-radius:8px;border:1.5px dashed #E5E7EB;color:#9CA3AF;font-size:12px">조건 없음. 아래 버튼으로 추가하세요.</div>`;
    return;
  }
  container.innerHTML = _bmConditionNodes.map((node, idx) => _bmRenderConditionNode(node, idx)).join('');
}

// ── 데이터 로딩 ──────────────────────────────────────────────────────────────
async function _bmLoadTenants(isSuperAdmin, myTenantId) {
  if (!isSuperAdmin) return;
  try {
    const { data } = await _sb().from('tenants').select('id, name').order('name');
    _bmAllTenants = data || [];
    const sel = document.getElementById('bm-filter-tenant');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 회사</option>` +
      _bmAllTenants.map(t => `<option value="${t.id}"${t.id === myTenantId ? ' selected' : ''}>${t.name}(${t.id})</option>`).join('');
    _bmFilterTenantId = myTenantId;
    sel.value = myTenantId;
  } catch (e) { console.warn('[_bmLoadTenants]', e.message); }
}

async function _bmLoadVorgs(tenantId) {
  try {
    let q = _sb().from('virtual_org_templates').select('id, name').eq('service_type', 'badge').order('name');
    if (tenantId) q = q.eq('tenant_id', tenantId);
    const { data } = await q;
    _bmVorgTemplates = data || [];
    const sel = document.getElementById('bm-filter-vorg');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 가상조직</option>` +
      _bmVorgTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    _bmFilterVorgId = '';
    const gsel = document.getElementById('bm-filter-group');
    if (gsel) { gsel.innerHTML = `<option value="">전체 뱃지그룹</option>`; }
    _bmFilterGroupId = '';
  } catch (e) { console.warn('[_bmLoadVorgs]', e.message); }
}

async function _bmLoadGroups(vorgId) {
  try {
    let q = _sb().from('badge_groups').select('id, name');
    const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || 'HMC';
    if (tenantId) q = q.eq('tenant_id', tenantId);
    if (vorgId) q = q.eq('vorg_template_id', vorgId);
    const { data } = await q.order('name');
    mgmtBadgeGroups = data || [];
    const gsel = document.getElementById('bm-filter-group');
    if (!gsel) return;
    gsel.innerHTML = `<option value="">전체 뱃지그룹</option>` +
      mgmtBadgeGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    _bmFilterGroupId = '';
  } catch (e) { console.warn('[_bmLoadGroups]', e.message); }
}

async function onBmTenantChange() {
  const sel = document.getElementById('bm-filter-tenant');
  _bmFilterTenantId = sel ? sel.value : '';
  _bmFilterVorgId = '';
  _bmFilterGroupId = '';
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}

async function onBmVorgChange() {
  const sel = document.getElementById('bm-filter-vorg');
  _bmFilterVorgId = sel ? sel.value : '';
  _bmFilterGroupId = '';
  await _bmLoadGroups(_bmFilterVorgId);
  await loadBadgeMgmtData();
}

async function loadBadgeMgmtData() {
  const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || 'HMC';
  const tbody = document.getElementById('badges-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>`;

  try {
    if (!mgmtBadgeGroups.length || !_bmFilterVorgId) {
      let gq = _sb().from('badge_groups').select('id, name').eq('tenant_id', tenantId);
      if (_bmFilterVorgId) gq = gq.eq('vorg_template_id', _bmFilterVorgId);
      const { data: gData } = await gq;
      mgmtBadgeGroups = gData || [];
    }

    let groupIdFilter = _bmFilterGroupId
      ? [_bmFilterGroupId]
      : mgmtBadgeGroups.map(g => g.id);

    if (groupIdFilter.length === 0) {
      allBadges = [];
      renderBadgesList();
      return;
    }

    const { data: bList, error: bErr } = await _sb()
      .from('badges').select('*')
      .in('group_id', groupIdFilter)
      .order('level', { ascending: true });

    if (bErr) throw bErr;
    allBadges = bList || [];
    renderBadgesList();
  } catch (error) {
    console.error('[loadBadgeMgmtData]', error);
    const tb = document.getElementById('badges-body');
    if (tb) tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ef4444">⚠️ 오류: ${error.message||'데이터를 불러오지 못했습니다.'}</td></tr>`;
  }
}

function renderBadgesList() {
  const tbody = document.getElementById('badges-body');
  if (!tbody) return;
  if (!allBadges.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#9ca3af">등록된 뱃지가 없습니다.<br><span style="font-size:12px">+ 뱃지 생성 버튼으로 추가하세요.</span></td></tr>`;
    return;
  }

  tbody.innerHTML = allBadges.map(b => {
    const groupName = mgmtBadgeGroups.find(g => g.id === b.group_id)?.name || '-';
    const prereq = allBadges.find(x => x.id === b.prerequisite_badge_id)?.name || '-';
    const condNodeCount = (b.condition_rules?.nodes || []).length;
    const hasCondition = condNodeCount > 0;
    return `
      <tr style="border-bottom:1px solid #F3F4F6;transition:background .1s" onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''">
        <td style="padding:14px 16px;color:#6B7280;font-size:12px">${groupName}</td>
        <td style="padding:14px 16px;font-weight:900;color:#111827">${b.level || '-'}</td>
        <td style="padding:14px 16px">
          <div style="font-weight:700;color:#1D4ED8">${b.name}</div>
          ${b.allow_manual_award ? '<span style="font-size:9px;padding:1px 6px;border-radius:5px;background:#F0FDF4;color:#059669;font-weight:700">수동발급가능</span>' : ''}
        </td>
        <td style="padding:14px 16px;color:#6B7280;font-size:12px">${b.valid_months ? b.valid_months+'개월' : '영구'}</td>
        <td style="padding:14px 16px">
          ${hasCondition
            ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${condNodeCount}개 조건</span>`
            : `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FEF2F2;color:#DC2626;font-weight:700">미설정</span>`}
        </td>
        <td style="padding:14px 16px;color:#6B7280;font-size:12px">${prereq}</td>
        <td style="padding:14px 16px;text-align:right">
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button onclick="openBadgeMgmtDetail('${b.id}')" style="padding:5px 11px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;color:#1D4ED8">✏️ 수정</button>
            <button onclick="deleteBadge('${b.id}')" style="padding:5px 11px;background:#FEF2F2;color:#EF4444;border:1.5px solid #FECACA;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── 저장 ────────────────────────────────────────────────────────────────────
async function saveBadgeDef() {
  const id = _bmEditingId;
  const groupId = document.getElementById('bmd-group')?.value || '';
  const name = (document.getElementById('bmd-name')?.value || '').trim();
  const level = (document.getElementById('bmd-level')?.value || '').trim();
  const monthsStr = document.getElementById('bmd-months')?.value || '';
  const valid_months = monthsStr ? parseInt(monthsStr) : null;
  const allow_manual_award = document.querySelector('input[name="bmd-manual"]:checked')?.value === 'true';
  const preId = document.getElementById('bmd-prereq')?.value || null;
  const operator = document.getElementById('bmd-operator')?.value || 'AND';

  if (!name) return alert('뱃지명을 입력해주세요.');
  if (!groupId) return alert('뱃지 그룹을 선택해주세요.');

  let equivalent_badge_ids, renewal_rules;
  try {
    equivalent_badge_ids = JSON.parse(document.getElementById('bmd-equivalent')?.value || '[]');
    renewal_rules = JSON.parse(document.getElementById('bmd-renewal')?.value || '{}');
  } catch(e) {
    return alert('JSON 파싱 에러: 양식을 올바르게 작성해주세요.\n' + e.message);
  }

  const condition_rules = { operator, nodes: _bmConditionNodes };

  const payload = {
    group_id: groupId, name, level, valid_months, allow_manual_award,
    prerequisite_badge_id: preId || null,
    equivalent_badge_ids, condition_rules, renewal_rules
  };

  let error;
  if (!id) {
    ({ error } = await _sb().from('badges').insert([payload]));
  } else {
    payload.updated_at = new Date().toISOString();
    ({ error } = await _sb().from('badges').update(payload).eq('id', id));
  }
  if (error) return alert('저장 오류: ' + error.message);

  // 저장 성공 → 목록으로
  await renderBadgeMgmt();
}

// ── 삭제 ────────────────────────────────────────────────────────────────────
async function deleteBadge(id) {
  if (!confirm('삭제하시겠습니까?\n연결된 학습자 내역이 있으면 심각한 문제가 발생할 수 있습니다.')) return;
  const { error } = await _sb().from('badges').delete().eq('id', id); // _sb()로 수정
  if (error) alert('삭제 실패: ' + error.message);
  else loadBadgeMgmtData();
}

// 하위 호환: 팝업 방식 호출 → 상세 페이지로 리디렉션
function openBadgeMgmtModal() { openBadgeMgmtDetail(null); }
function editBadge(id) { openBadgeMgmtDetail(id); }
