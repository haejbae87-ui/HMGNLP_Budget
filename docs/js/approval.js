// ─── FO 결재 페이지 (DB 연동) ────────────────────────────────────────────────
// 팀원용 결재함 / 리더용 결재함

// 리더 역할 판별 (pos 기반)
function _isLeaderPersona() {
  const leaderTitles = ["팀장", "실장", "센터장", "본부장", "사업부장"];
  return leaderTitles.some((t) => (currentPersona.pos || "").includes(t));
}

// ─── 한글 라벨 변환 ──────────────────────────────────────────────────────────
const _APR_PURPOSE_KR = {
  external_personal: "개인직무 사외학습",
  elearning_class: "이러닝/집합(비대면) 운영",
  conf_seminar: "워크샵/세미나/콘퍼런스 등 운영",
  misc_ops: "기타 운영",
};
const _APR_EDU_TYPE_KR = {
  regular: "정규교육",
  elearning: "이러닝",
  class: "집합",
  live: "라이브",
  academic: "학술 및 연구활동",
  conf: "학회/컨퍼런스",
  seminar: "세미나",
  knowledge: "지식자원 학습",
  book: "도서구입",
  online: "온라인콘텐츠",
  competency: "역량개발지원",
  lang: "어학학습비 지원",
  cert: "자격증 취득지원",
};
function _aprPurpose(k) {
  return _APR_PURPOSE_KR[k] || k || "-";
}
function _aprEduType(k) {
  return _APR_EDU_TYPE_KR[k] || k || "-";
}

// ─── 상태 매핑 ───────────────────────────────────────────────────────────────
function _aprStatusLabel(s) {
  const m = {
    draft: "작성중",
    pending: "결재대기",
    pending_approval: "결재대기",
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
  };
  return m[s] || s || "결재대기";
}

// ─── DB 캐시 ─────────────────────────────────────────────────────────────────
let _aprMemberLoaded = false;
let _aprMemberData = []; // plans + applications (내가 신청한 것)
let _aprLeaderLoaded = false;
let _aprLeaderData = []; // plans + applications (결재대기, 남이 신청한 것)

// ─── 팀원용 결재함 ────────────────────────────────────────────────────────────
// 내가 신청한 교육의 결재 상태 확인 (DB 실시간)

async function renderApprovalMember() {
  const el = document.getElementById("page-approval-member");
  const sb = typeof getSB === "function" ? getSB() : null;

  // DB 조회 (최초 1회)
  if (sb && !_aprMemberLoaded) {
    _aprMemberLoaded = true;
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;

      // plans 조회 (draft 제외 — 결재함에는 상신된 것만)
      const { data: plans, error: pe } = await sb
        .from("plans")
        .select("*")
        .eq("applicant_id", pid)
        .eq("tenant_id", tid)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      if (pe) throw pe;

      // applications 조회
      const { data: apps, error: ae } = await sb
        .from("applications")
        .select("*")
        .eq("applicant_id", pid)
        .eq("tenant_id", tid)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      if (ae) throw ae;

      // 통합
      _aprMemberData = [
        ...(plans || []).map((p) => ({
          _type: "plan",
          id: p.id,
          title: p.edu_name || p.title || "-",
          type: _aprEduType(p.edu_type),
          purpose: _aprPurpose(p.detail?.purpose),
          amount: Number(p.amount || 0),
          status: p.status,
          date: (p.created_at || "").slice(0, 10),
          rejectReason: p.reject_reason || null,
        })),
        ...(apps || []).map((a) => ({
          _type: "app",
          id: a.id,
          title: a.edu_name || "-",
          type: _aprEduType(a.edu_type),
          purpose: _aprPurpose(a.detail?.purpose),
          amount: Number(a.amount || 0),
          status: a.status,
          date: (a.created_at || "").slice(0, 10),
          rejectReason: a.reject_reason || null,
        })),
      ];
    } catch (err) {
      console.error("[renderApprovalMember] DB 조회 실패:", err.message);
      _aprMemberData = [];
    }
  }

  // 상태별 통계 (saved 제외)
  const stats = {
    saved: _aprSavedData.length,
    total: data.length,
    approved: data.filter((d) => d.status === "approved").length,
    inProgress: data.filter(
      (d) => ['pending','pending_approval','submitted','in_review'].includes(d.status)
    ).length,
    rejected: data.filter((d) => d.status === "rejected").length,
  };

  const STATUS_FINAL = {
    approved: { label: "승인완료", color: "#059669", bg: "#F0FDF4", icon: "✅" },
    pending: { label: "결재대기", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
    pending_approval: { label: "결재대기", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
    submitted: { label: "결재대기", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
    in_review: { label: "결재진행중", color: "#7C3AED", bg: "#F5F3FF", icon: "🔄" },
    rejected: { label: "반려", color: "#DC2626", bg: "#FEF2F2", icon: "❌" },
    recalled: { label: "회수됨", color: "#6B7280", bg: "#F9FAFB", icon: "↩️" },
    cancelled: { label: "취소", color: "#9CA3AF", bg: "#F9FAFB", icon: "🚫" },
    completed: { label: "완료", color: "#059669", bg: "#F0FDF4", icon: "✅" },
  };

  // ── [S-4] 저장완료(상신대기) 섹션 ───────────────────────────────────────
  const savedSection = _aprSavedData.length > 0 ? `
  <div style="background:#F0FDF4;border:2px solid #6EE7B7;border-radius:16px;padding:20px 24px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:18px">📤</span>
          <span style="font-size:15px;font-weight:900;color:#065F46">상신 대기 목록</span>
          <span style="background:#059669;color:white;font-size:11px;font-weight:800;padding:2px 8px;border-radius:8px">${_aprSavedData.length}건</span>
        </div>
        <div style="font-size:11px;color:#6B7280">작성이 완료된 항목들입니다. 단건 혹은 다건 선택 후 상신할 수 있습니다.</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="_aprBulkSubmit()" id="btn-bulk-submit"
          style="padding:10px 20px;border-radius:10px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;opacity:.5;pointer-events:none"
          >📤 다건 상신 (<span id="apr-bulk-count">0</span>건)
        </button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${_aprSavedData.map(item => {
        const typeBadge = item._type === 'plan'
          ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8">📋 교육계획</span>'
          : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309">📝 교육신청</span>';
        const safeId = String(item.id).replace(/'/g,"\\'");
        const safeTable = item._table || (item._type === 'plan' ? 'plans' : 'applications');
        return `
        <div style="background:white;border-radius:10px;border:1.5px solid #D1FAE5;padding:14px 16px;display:flex;align-items:center;gap:12px">
          <input type="checkbox" id="apr-chk-${safeId}" data-id="${safeId}" data-type="${item._type}" data-table="${safeTable}" data-account="${item.account_code || ''}"
            onchange="_aprToggleSelect(this)"
            style="width:18px;height:18px;accent-color:#059669;cursor:pointer;flex-shrink:0">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:13px;font-weight:800;color:#111827">${item.title}</span>
              ${typeBadge}
            </div>
            <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
              <span>📅 ${item.date}</span>
              <span>📚 ${item.type}</span>
              <span>💰 ${item.amount.toLocaleString()}원</span>
              ${item.account_code ? `<span>🏷 ${item.account_code}</span>` : ''}
            </div>
          </div>
          <button onclick="_aprSingleSubmit('${safeId}','${safeTable}','${item.title.replace(/'/g,"")}')"
            style="padding:8px 16px;border-radius:8px;background:#059669;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0">
            📤 단건 상신
          </button>
        </div>`;
      }).join('')}
    </div>
  </div>` : '';

  const cards = data
    .map((item) => {
      const fc = STATUS_FINAL[item.status] || {
        label: _aprStatusLabel(item.status),
        color: "#6B7280",
        bg: "#F9FAFB",
        icon: "🕐",
      };
      const typeBadge =
        item._type === "plan"
          ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-left:4px">📋 교육계획</span>'
          : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309;margin-left:4px">📝 교육신청</span>';

      return `
    <div style="border-radius:14px;border:1.5px solid ${fc.color}30;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>
            ${typeBadge}
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 신청 ${item.date}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${item.amount.toLocaleString()}원</span>
            ${item.purpose !== "-" ? `<span>🎯 ${item.purpose}</span>` : ""}
          </div>
        </div>
        <span style="flex-shrink:0;font-size:11px;font-weight:900;padding:4px 12px;border-radius:10px;
                     background:${fc.bg};color:${fc.color}">${fc.icon} ${fc.label}</span>
      </div>

      <!-- P-2: 결재 상태 타임라인 -->
      <div style="display:flex;align-items:center;gap:0;margin:12px 0;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        ${(() => {
          const steps = [
            { label: '신청', done: true, icon: '📄' },
            { label: '1차검토', done: ['in_review','approved','rejected'].includes(item.status), icon: '🔍', active: item.status === 'in_review' },
            { label: '최종결재', done: ['approved','rejected'].includes(item.status), icon: item.status === 'approved' ? '✅' : item.status === 'rejected' ? '❌' : '⏳', active: item.status === 'approved' || item.status === 'rejected' },
          ];
          return steps.map((step, i) => `
            <div style="display:flex;align-items:center;flex:1">
              <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;
                  background:${step.done ? '#059669' : step.active ? '#7C3AED' : '#E5E7EB'};
                  color:${step.done || step.active ? 'white' : '#9CA3AF'}">${step.done ? '✔' : step.icon}</div>
                <span style="font-size:9px;font-weight:800;color:${step.done ? '#059669' : step.active ? '#7C3AED' : '#9CA3AF'}">${step.label}</span>
              </div>
              ${i < steps.length - 1 ? `<div style="flex:1;height:2px;background:${step.done ? '#059669' : '#E5E7EB'};margin:0 4px;margin-bottom:14px"></div>` : ''}
            </div>`).join('');
        })()}
      </div>

      ${
        item.rejectReason
          ? `
      <div style="margin-top:8px;padding:10px 14px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
        ⚠️ 반려 사유: ${item.rejectReason}
      </div>`
          : ""
      }
      ${
        // E-5: pending/submitted 상태에서만 회수 버튼 표시 (결재 시작 전)
        ['pending','submitted'].includes(item.status)
          ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6">
              <button onclick="_aprRecallSubmit('${String(item.id).replace(/'/g,"\\'")}',${'\'' + (item._table || (item._type==='plan'?'plans':'applications')) + '\''})"
                style="padding:6px 14px;border-radius:8px;border:1.5px solid #9CA3AF;background:white;color:#6B7280;font-size:11px;font-weight:800;cursor:pointer"
                onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                ↩️ 회수
              </button>
              <span style="font-size:10px;color:#9CA3AF;margin-left:6px">결재 시작 전 회수 가능</span>
             </div>`
          : ""
      }
    </div>`;
    })
    .join("");


  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">결재 내역이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF">교육계획 또는 교육신청을 제출하면 결재 현황을 이 화면에서 확인할 수 있습니다.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 팀원용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">팀원용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept} — 내 교육신청의 결재 현황</p>
    </div>
    <button onclick="_aprMemberLoaded=false;_aprMemberData=[];_aprSavedData=[];_aprSelectedItems=new Set();renderApprovalMember()"
      style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">🔄 새로고침</button>
  </div>

  <!-- [S-4] 저장완료(상신 대기) 섹션 -->
  ${savedSection}

  <!-- 통계 카드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[
      { label: "상신대기", val: stats.saved, color: "#059669", bg: "#F0FDF4", icon: "📤" },
      { label: "전체", val: stats.total, color: "#002C5F", bg: "#EFF6FF", icon: "📋" },
      { label: "승인완료", val: stats.approved, color: "#059669", bg: "#F0FDF4", icon: "✅" },
      { label: "결재대기", val: stats.inProgress, color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
    ]
      .map(
        (s) => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`,
      )
      .join("")}
  </div>

  <!-- 결재 목록 -->
  <div>${data.length === 0 ? emptyMsg : cards}</div>
</div>

<!-- [S-3] 상신 문서 작성 인라인 모달 (id=apr-submit-modal) -->
<div id="apr-submit-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:540px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:13px;font-weight:900;color:#059669;margin-bottom:2px">📤 상신 문서 작성</div>
        <div style="font-size:11px;color:#6B7280">상신 제목과 내용을 입력하린 승인자에게 전달됩니다.</div>
      </div>
      <button onclick="_aprCloseModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">상신 제목 <span style="color:#EF4444">*</span></label>
        <input id="apr-doc-title" type="text" placeholder="예) 2026년 2분기 교육계획 상신"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">상신 내용</label>
        <textarea id="apr-doc-content" rows="3" placeholder="예) AI 역량 교육 3건 일괄 상신합니다."
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:none"></textarea>
      </div>
      <div id="apr-modal-items" style="background:#F9FAFB;border-radius:10px;padding:12px 14px;font-size:12px;color:#374151">
        <div style="font-weight:800;margin-bottom:8px">📋 첨부 항목</div>
        <div id="apr-modal-items-list"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:10px;border-top:1px solid #F3F4F6">
        <button onclick="_aprCloseModal()" style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
        <button onclick="_aprConfirmSubmit()" style="padding:10px 28px;border-radius:10px;border:none;background:#059669;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,.3)">✅ 상신 확정</button>
      </div>
    </div>
  </div>
</div>`;

  // 모달 초기 숨김 (값 설정 후 display none)
  const modal = document.getElementById('apr-submit-modal');
  if (modal) modal.style.display = 'none';
}

// ─── 리더용 결재함 ────────────────────────────────────────────────────────────
// 같은 테넌트 내 결재대기 문서 (본인 제외) 조회 + 승인/반려 처리

async function renderApprovalLeader() {
  const el = document.getElementById("page-approval-leader");

  // 권한 체크
  if (!_isLeaderPersona()) {
    el.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="card p-16 text-center">
        <div style="font-size:48px;margin-bottom:16px">🔒</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">접근 권한이 없습니다</div>
        <div style="font-size:12px;color:#9CA3AF">리더용 결재함은 팀장·실장·센터장·본부장·사업부장만 접근할 수 있습니다.</div>
      </div>
    </div>`;
    return;
  }

  const sb = typeof getSB === "function" ? getSB() : null;

  // DB 조회 (최초 1회)
  if (sb && !_aprLeaderLoaded) {
    _aprLeaderLoaded = true;
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;
      // 크로스 테넌트: 총괄부서 팀장이면 양쪽 회사 pending 문서 조회
      const ctInfo =
        typeof getCrossTenantInfo === "function"
          ? await getCrossTenantInfo(currentPersona)
          : null;
      const filterTids = ctInfo?.linkedTids || [tid];

      // plans: pending/in_review/submitted 상태 + 본인이 아닌 문서 (S-6)
      let plansQ = sb
        .from("plans")
        .select("*")
        .in("status", ["pending", "submitted", "in_review"])
        .neq("applicant_id", pid)
        .order("created_at", { ascending: false });
      if (filterTids.length > 1) plansQ = plansQ.in("tenant_id", filterTids);
      else plansQ = plansQ.eq("tenant_id", tid);
      const { data: plans, error: pe } = await plansQ;
      if (pe) throw pe;

      // applications: pending/submitted/in_review 상태 + 본인이 아닌 문서 (S-6)
      let appsQ = sb
        .from("applications")
        .select("*")
        .in("status", ["pending", "submitted", "in_review"])
        .neq("applicant_id", pid)
        .order("created_at", { ascending: false });
      if (filterTids.length > 1) appsQ = appsQ.in("tenant_id", filterTids);
      else appsQ = appsQ.eq("tenant_id", tid);
      const { data: apps, error: ae } = await appsQ;
      if (ae) throw ae;

      _aprLeaderData = [
        ...(plans || []).map((p) => ({
          _type: "plan",
          _table: "plans",
          id: p.id,
          applicant: p.applicant_name || "-",
          dept: p.detail?.dept || p.dept || "-",
          title: p.edu_name || p.title || "-",
          type: _aprEduType(p.edu_type),
          purpose: _aprPurpose(p.detail?.purpose),
          amount: Number(p.amount || 0),
          date: (p.created_at || "").slice(0, 10),
          account_code: p.account_code || "",
          tenantId: p.tenant_id || "",
          status: p.status || "pending", // S-6: 상태 포함
        })),
        ...(apps || []).map((a) => ({
          _type: "app",
          _table: "applications",
          id: a.id,
          applicant: a.applicant_name || "-",
          dept: a.dept || a.detail?.dept || "-",
          title: a.edu_name || "-",
          type: _aprEduType(a.edu_type),
          purpose: _aprPurpose(a.detail?.purpose),
          amount: Number(a.amount || 0),
          date: (a.created_at || "").slice(0, 10),
          account_code: a.account_code || a.detail?.account_code || "",
          tenantId: a.tenant_id || "",
          status: a.status || "pending", // S-6: 상태 포함
        })),
      ];

      // 결재라인 매칭 필터 — 정책(SERVICE_POLICIES) approvalConfig 기반
      if (
        typeof SERVICE_POLICIES !== "undefined" &&
        SERVICE_POLICIES.length > 0
      ) {
        const myPos = currentPersona.pos || "";
        const posToKey = {
          팀장: "team_leader",
          실장: "director",
          사업부장: "division_head",
          센터장: "center_head",
          본부장: "hq_head",
        };
        const myKey =
          Object.entries(posToKey).find(([k]) => myPos.includes(k))?.[1] || "";
        _aprLeaderData = _aprLeaderData.filter((item) => {
          // 매칭 정책 찾기
          const policy = SERVICE_POLICIES.find(
            (p) =>
              p.tenantId === item.tenantId &&
              (p.accountCodes || []).some((c) => item.account_code.includes(c)),
          );
          if (!policy || !policy.approvalConfig) return true; // 정책 미설정 → 기본 표시
          // 신청 단계 결재라인 확인 (apply 기본)
          const stage = item._type === "plan" ? "plan" : "apply";
          const cfg = policy.approvalConfig[stage];
          if (!cfg || !cfg.thresholds || cfg.thresholds.length === 0)
            return true; // 구간 미설정 → 기본 표시
          // 금액에 맞는 구간 결재자 매칭
          const sorted = [...cfg.thresholds].sort(
            (a, b) => (a.maxAmt || Infinity) - (b.maxAmt || Infinity),
          );
          const matched =
            sorted.find((t) => t.maxAmt && item.amount <= t.maxAmt) ||
            sorted[sorted.length - 1];
          if (!matched || !matched.approverKey) return true;
          return matched.approverKey === myKey;
        });
      }
    } catch (err) {
      console.error("[renderApprovalLeader] DB 조회 실패:", err.message);
      _aprLeaderData = [];
    }
  }

  const pending = _aprLeaderData;

  const cards = pending
    .map((item) => {
      const typeBadge =
        item._type === "plan"
          ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8">📋 교육계획</span>'
          : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309">📝 교육신청</span>';
      const tenantBadge =
        typeof getTenantBadgeHtml === "function"
          ? getTenantBadgeHtml(item.tenantId, currentPersona.tenantId)
          : "";
      const safeId = String(item.id).replace(/'/g, "\\'");
      const safeTable = item._table;

      return `
    <div style="border-radius:14px;border:1.5px solid #E5E7EB;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#1D4ED8;flex-shrink:0">
              ${item.applicant.charAt(0)}
            </div>
            <div>
              <div style="font-size:13px;font-weight:900;color:#374151">${item.applicant}</div>
              <div style="font-size:11px;color:#9CA3AF">${item.dept}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>
            ${typeBadge}${tenantBadge}
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 신청 ${item.date}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${item.amount.toLocaleString()}원</span>
            ${item.purpose !== "-" ? `<span>🎯 ${item.purpose}</span>` : ""}
          </div>
        </div>
        <!-- S-6: 상태 별 다른 모양 -->
        ${item.status === 'in_review'
          ? `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#F5F3FF;color:#7C3AED">
              🔄 1차검토완료
             </div>`
          : `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#FFF7ED;color:#C2410C">
              🕐 결재 대기
             </div>`
        }
      </div>
      <!-- 결재 액션 -->
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1">
          <textarea id="comment-${safeId}" placeholder="결재 의견 입력 (선택사항)" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalAction('${safeId}','${safeTable}','approve')"
            style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;white-space:nowrap;min-width:80px"
            onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
            ✅ 승인
          </button>
          <button onclick="_approvalAction('${safeId}','${safeTable}','reject')"
            style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;white-space:nowrap;min-width:80px"
            onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">
            ❌ 반려
          </button>
        </div>
      </div>
    </div>`;
    })
    .join("");

  const emptyMsg = `<div class="card p-16 text-center">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">결재 대기 건이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF">팀원의 교육계획 또는 교육신청이 접수되면 여기서 결재할 수 있습니다.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 리더용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">리더용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} ${currentPersona.pos} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button onclick="_aprLeaderLoaded=false;_aprLeaderData=[];renderApprovalLeader()"
        style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">🔄 새로고침</button>
      <div style="background:#EFF6FF;border-radius:12px;padding:10px 18px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px">결재 대기</div>
        <div style="font-size:28px;font-weight:900;color:#002C5F">${pending.length}<span style="font-size:14px">건</span></div>
      </div>
    </div>
  </div>

  <div>${pending.length === 0 ? emptyMsg : cards}</div>
</div>`;
}

// ─── 결재 액션 (승인/반려) — DB 실반영 ───────────────────────────────────────
async function _approvalAction(id, table, action) {
  const comment = document.getElementById("comment-" + id)?.value || "";
  const actionLabel = action === "approve" ? "승인" : "반려";

  if (action === "reject" && !comment.trim()) {
    alert("반려 시 의견을 입력해주세요.");
    return;
  }

  if (!confirm(`이 문서를 ${actionLabel} 처리하시겠습니까?`)) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 실패");
    return;
  }

  try {
    // 결재 이력 기록 (detail.approval_logs)
    const logEntry = {
      actor: currentPersona.name,
      actor_pos: currentPersona.pos,
      action: action,
      comment: comment || null,
      timestamp: new Date().toISOString(),
    };
    // 기존 detail 조회 후 approval_logs 배열에 추가
    const { data: existing } = await sb
      .from(table)
      .select("detail")
      .eq("id", id)
      .single();
    const prevDetail = existing?.detail || {};
    const prevLogs = prevDetail.approval_logs || [];
    prevLogs.push(logEntry);

    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      detail: { ...prevDetail, approval_logs: prevLogs },
    };
    if (action === "reject") {
      updateData.reject_reason = comment;
    }

    const { error } = await sb.from(table).update(updateData).eq("id", id);
    if (error) throw error;

    // 항목 7: 승인 시 예산 차감
    if (action === "approve") {
      try {
        const { data: doc } = await sb
          .from(table)
          .select("amount, account_code, tenant_id, applicant_id")
          .eq("id", id)
          .single();
        if (doc && doc.amount && doc.account_code) {
          // 신청자의 org_id 조회
          const { data: user } = await sb
            .from("users")
            .select("org_id")
            .eq("id", doc.applicant_id)
            .single();
          if (user?.org_id) {
            // bankbook 조회
            const { data: bbs } = await sb
              .from("org_budget_bankbooks")
              .select("id")
              .eq("org_id", user.org_id)
              .eq("tenant_id", doc.tenant_id);
            // account_id 매칭
            if (bbs && bbs.length > 0) {
              for (const bb of bbs) {
                const { data: alloc } = await sb
                  .from("budget_allocations")
                  .select("id, used_amount")
                  .eq("bankbook_id", bb.id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .single();
                if (alloc) {
                  await sb
                    .from("budget_allocations")
                    .update({
                      used_amount:
                        Number(alloc.used_amount || 0) + Number(doc.amount),
                    })
                    .eq("id", alloc.id);
                  console.log(
                    `[예산차감] ${doc.amount}원 차감 완료 (alloc ${alloc.id})`,
                  );
                  break; // 첫 매칭 bankbook만 차감
                }
              }
            }
          }
        }
      } catch (budgetErr) {
        console.warn(
          "[예산차감] 예산 자동 차감 실패 (비치명적):",
          budgetErr.message,
        );
      }
    }

    alert(
      `✅ ${actionLabel} 처리가 완료되었습니다.${comment ? "\n의견: " + comment : ""}`,
    );

    // 목록 갱신
    _aprLeaderLoaded = false;
    _aprLeaderData = [];
    renderApprovalLeader();

    // 팀원 목록도 갱신 (다른 탭에서 볼 때 반영)
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
  } catch (err) {
    alert("처리 실패: " + err.message);
    console.error("[_approvalAction]", err.message);
  }
}

// ─── [S-3/S-4] 상신 처리 함수 ────────────────────────────────────────────────

// 체크박스 선택/해제 + 다건 상신 버튼 활성화
function _aprToggleSelect(el) {
  const id = el.dataset.id;
  const account = el.dataset.account || '';

  if (el.checked) {
    // 계정 동일성 검사 — 다건 상신은 같은 예산 계정만 허용
    if (_aprSelectedItems.size > 0) {
      const firstAccount = [..._aprSelectedItems.values()][0]?.account || '';
      if (firstAccount && account && firstAccount !== account) {
        alert('⚠️ 다건 상신은 같은 예산 계정만 가능합니다.\n\n선택된 계정: ' + firstAccount + '\n현재 항목 계정: ' + account);
        el.checked = false;
        return;
      }
    }
    _aprSelectedItems.set(id, { id, table: el.dataset.table, type: el.dataset.type, account });
  } else {
    _aprSelectedItems.delete(id);
  }

  // 다건 상신 버튼 활성화/비활성화
  const btn = document.getElementById('btn-bulk-submit');
  const countEl = document.getElementById('apr-bulk-count');
  const count = _aprSelectedItems.size;
  if (btn) {
    btn.style.opacity = count > 0 ? '1' : '.5';
    btn.style.pointerEvents = count > 0 ? 'auto' : 'none';
  }
  if (countEl) countEl.textContent = count;
}

// 단건 상신 — 모달 열기 (선택 항목 1건)
function _aprSingleSubmit(id, table, title) {
  _aprSelectedItems.clear();
  _aprSelectedItems.set(id, { id, table, type: table === 'plans' ? 'plan' : 'app', account: '' });
  _aprOpenModal([{ id, title }]);
}

// 다건 상신 — 모달 열기
function _aprBulkSubmit() {
  if (_aprSelectedItems.size === 0) return;
  const items = [..._aprSelectedItems.values()].map(sel => {
    const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
    return { id: sel.id, title: item?.title || sel.id };
  });
  _aprOpenModal(items);
}

// 상신 모달 열기
function _aprOpenModal(items) {
  const modal = document.getElementById('apr-submit-modal');
  if (!modal) return;

  // 제목 자동 생성
  const titleEl = document.getElementById('apr-doc-title');
  if (titleEl) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    titleEl.value = items.length === 1
      ? `${items[0].title} 상신`
      : `교육 ${items.length}건 일괄 상신 (${today})`;
  }

  // 첨부 항목 목록
  const listEl = document.getElementById('apr-modal-items-list');
  if (listEl) {
    listEl.innerHTML = items.map((item, i) =>
      `<div style="padding:6px 0;border-bottom:1px solid #E5E7EB;font-size:12px;color:#374151">
        ${i + 1}. ${item.title}
      </div>`
    ).join('');
  }

  modal.style.display = 'flex';
}

// 모달 닫기
function _aprCloseModal() {
  const modal = document.getElementById('apr-submit-modal');
  if (modal) modal.style.display = 'none';
}

// 상신 확정 — DB에 pending 상태로 업데이트 + submission_documents 생성
async function _aprConfirmSubmit() {
  const titleEl = document.getElementById('apr-doc-title');
  const contentEl = document.getElementById('apr-doc-content');
  const docTitle = titleEl?.value?.trim();
  const docContent = contentEl?.value?.trim() || '';

  if (!docTitle) {
    alert('상신 제목을 입력해주세요.');
    titleEl?.focus();
    return;
  }
  if (_aprSelectedItems.size === 0) {
    alert('상신할 항목이 없습니다.');
    return;
  }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    const selectedArr = [..._aprSelectedItems.values()];
    const now = new Date().toISOString();

    // 1. submission_documents 테이블에 상신 문서 생성
    const docId = `SUBDOC-${Date.now()}`;
    const docRow = {
      id: docId,
      tenant_id: currentPersona.tenantId,
      submitter_id: currentPersona.id,
      submitter_name: currentPersona.name,
      title: docTitle,
      content: docContent,
      status: 'pending',
      submitted_at: now,
      item_count: selectedArr.length,
      total_amount: selectedArr.reduce((sum, sel) => {
        const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
        return sum + (item?.amount || 0);
      }, 0),
    };

    // submission_documents 테이블이 존재하는 경우에만 삽입
    try {
      await sb.from('submission_documents').insert(docRow);
      console.log('[_aprConfirmSubmit] 상신 문서 생성:', docId);
    } catch (e) {
      console.warn('[_aprConfirmSubmit] submission_documents 테이블 없음 (무시):', e.message);
    }

    // 2. 각 항목의 status를 'pending'으로 업데이트 (saved → pending)
    const errors = [];
    for (const sel of selectedArr) {
      try {
        const { error } = await sb
          .from(sel.table)
          .update({ status: 'pending', updated_at: now })
          .eq('id', sel.id)
          .eq('status', 'saved'); // 낙관적 잠금 — saved 상태만 업데이트
        if (error) errors.push(error.message);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      alert('⚠️ 일부 항목 상신 실패:\n' + errors.join('\n'));
    } else {
      alert(`✅ 상신 완료!\n\n제목: ${docTitle}\n항목 수: ${selectedArr.length}건\n\n담당자 검토 후 결재선이 자동 구성됩니다.`);
    }

    _aprCloseModal();
    _aprSelectedItems.clear();

    // 목록 새로고침
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
    renderApprovalMember();
  } catch (err) {
    alert('상신 처리 실패: ' + err.message);
    console.error('[_aprConfirmSubmit]', err.message);
  }
}

// ─── E-5: 상신 회수 (pending → saved/recalled) ───────────────────────────────
// 팀원이 상신한 항목을 결재 시작 전에 회수
async function _aprRecallSubmit(id, table) {
  if (!confirm('이 항목의 상신을 회수하시겠습니까?\n\n• 결재 대기 상태로 돌아갑니다.\n• 수정 후 다시 상신할 수 있습니다.')) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    // 현재 상태 확인 — in_review 이후면 회수 불가
    const { data: cur } = await sb.from(table).select('status').eq('id', id).single();
    if (cur?.status === 'in_review' || cur?.status === 'approved') {
      alert('⚠️ 결재가 이미 진행 중이거나 완료된 항목은 회수할 수 없습니다.');
      return;
    }

    const { error } = await sb.from(table).update({
      status: 'saved', // 회수 후 saved(저장완료)로 복귀 → 수정 후 재상신 가능
      updated_at: new Date().toISOString(),
    }).eq('id', id).in('status', ['pending', 'submitted']); // 낙관적 잠금

    if (error) throw error;

    alert('✅ 상신이 회수되었습니다.\n\n저장완료 상태로 복귀됩니다. 수정 후 다시 상신할 수 있습니다.');

    // 목록 새로고침
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
    renderApprovalMember();
  } catch (err) {
    alert('회수 실패: ' + err.message);
    console.error('[_aprRecallSubmit]', err.message);
  }
}

// ─── S-5: plans.js 카드 상신 버튼 → 결재함 상신 모달 연결 ────────────────────
// plans.js의 _renderPlanCard()에서 saved 상태 카드의 "상신하기" 버튼이 이 함수를 호출
function _aprSingleSubmitFromPlan(planId, planTitle) {
  // 결재함 페이지가 로드되어 있으면 바로 모달 표시
  // 그렇지 않으면 approval.js의 _aprSingleSubmit 직접 호출
  if (typeof _aprSingleSubmit === 'function') {
    _aprSingleSubmit(planId, 'plans', planTitle || '교육계획 상신');
  } else {
    // approval.js가 아직 초기화되지 않은 경우 — 결재함 탭으로 이동
    if (typeof navigateTo === 'function') {
      navigateTo('approval-member');
    }
    setTimeout(() => {
      if (typeof _aprSingleSubmit === 'function') {
        _aprSingleSubmit(planId, 'plans', planTitle || '교육계획 상신');
      }
    }, 600);
  }
}


// ─── #4: 팀원 수요예측 계획 대표 상신 (팀뷰 → 일괄 상신 모달) ──────────────
// plans.js 팀뷰에서 teamSavedBar의 "일괄 상신" 버튼이 이 함수를 호출
// planIds: saved 상태인 팀원 계획 ID 배열
async function _aprBulkSubmitFromTeam(planIds) {
  if (!planIds || planIds.length === 0) {
    alert('상신할 계획이 없습니다.');
    return;
  }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    // DB에서 해당 계획 상세 조회 (계정 동일성 검증)
    const { data: plans, error } = await sb.from('plans')
      .select('id, edu_name, account_code, status, applicant_name')
      .in('id', planIds)
      .eq('status', 'saved');
    if (error) throw error;
    if (!plans || plans.length === 0) {
      alert('상신 가능한 계획이 없습니다. (이미 상신됐거나 상태가 변경됐을 수 있습니다)');
      return;
    }

    // 계정 동일성 검사
    const accounts = [...new Set(plans.map(p => p.account_code).filter(Boolean))];
    if (accounts.length > 1) {
      alert(`⚠️ 일괄 상신은 같은 예산 계정만 가능합니다.\n\n발견된 계정: ${accounts.join(', ')}\n\n동일 계정의 계획만 선택해 주세요.`);
      return;
    }

    // _aprSelectedItems에 등록 후 모달 오픈
    if (typeof _aprSelectedItems !== 'undefined') _aprSelectedItems.clear();
    const items = plans.map(p => ({
      id: p.id,
      title: `${p.applicant_name || '팀원'} — ${p.edu_name || p.id}`,
      account: p.account_code || '',
    }));

    // _aprSelectedItems에 추가
    if (typeof _aprSelectedItems !== 'undefined') {
      items.forEach(item => {
        _aprSelectedItems.set(item.id, {
          id: item.id,
          table: 'plans',
          type: 'plan',
          account: item.account,
        });
      });
    }

    // 모달 오픈
    if (typeof _aprOpenModal === 'function') {
      _aprOpenModal(items);
    } else {
      // approval.js가 아직 로드되지 않은 경우 — 결재함으로 이동
      if (typeof navigateTo === 'function') navigateTo('approval-member');
      setTimeout(() => { if (typeof _aprOpenModal === 'function') _aprOpenModal(items); }, 600);
    }
  } catch (err) {
    alert('팀원 계획 조회 실패: ' + err.message);
    console.error('[_aprBulkSubmitFromTeam]', err.message);
  }
}
