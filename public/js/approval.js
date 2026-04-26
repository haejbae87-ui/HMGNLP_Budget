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
    saved: "저장완료",           // fo_submission_approval.md S-2
    pending: "결재대기",
    pending_approval: "결재대기",
    submitted: "결재대기",       // fo_submission_approval.md S-2 (pending 대체)
    in_review: "결재진행중",     // fo_submission_approval.md S-2
    recalled: "회수됨",          // fo_submission_approval.md S-6
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
    result_pending: "BO 검토 중",  // 정산 검토 대기
  };
  return m[s] || s || "결재대기";
}

// ─── DB 캐시 ─────────────────────────────────────────────────────────────────
let _aprMemberLoaded = false;
let _aprMemberData = []; // plans + applications (내가 신청한 것)
let _aprLeaderLoaded = false;
let _aprLeaderData = []; // plans + applications (결재대기, 남이 신청한 것) — 레거시
let _aprSubDocData = []; // submission_documents (S-5: 상신 문서 기반 쯸사)
let _aprSavedData = [];  // [A-1] saved 상태 항목 (상신 대기 — 저장완료 섹션 표시용)
let _aprSelectedItems = new Map(); // [A-1] 다건 상신 선택 항목

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

      // [S-7] 내 항목이 포함된 submission_documents + 결재 이력 조회
      let mySubDocMap = {};   // item_id → submission_document
      let myHistoryMap = {};  // submission_id → approval_history[]
      try {
        const allItemIds = [
          ...(plans || []).map(p => String(p.id)),
          ...(apps  || []).map(a => String(a.id)),
        ];
        if (allItemIds.length > 0) {
          // submission_items 에서 내 항목과 연결된 submission_id 찾기
          const { data: myItems } = await sb.from("submission_items")
            .select("submission_id, item_id, item_type")
            .in("item_id", allItemIds);
          if (myItems && myItems.length > 0) {
            const subIds = [...new Set(myItems.map(i => i.submission_id))];
            // submission_documents 조회
            const { data: subDocs } = await sb.from("submission_documents")
              .select("id, status, title, approval_nodes, current_node_order, reject_reason, reject_node_label, approved_at, rejected_at, submitted_at")
              .in("id", subIds);
            if (subDocs) {
              subDocs.forEach(doc => {
                myItems.filter(i => i.submission_id === doc.id).forEach(i => {
                  mySubDocMap[i.item_id] = doc;
                });
              });
              // approval_history 조회 (결재 이력)
              const { data: histories } = await sb.from("approval_history")
                .select("submission_id, node_order, node_label, action, approver_name, comment, action_at")
                .in("submission_id", subIds)
                .order("action_at");
              if (histories) {
                histories.forEach(h => {
                  if (!myHistoryMap[h.submission_id]) myHistoryMap[h.submission_id] = [];
                  myHistoryMap[h.submission_id].push(h);
                });
              }
            }
          }
        }
      } catch(e) { console.warn("[S-7] submission 연동 실패:", e.message); }

      // 통합
      _aprMemberData = [
        ...(plans || []).map((p) => ({
          _type: "plan",
          _table: "plans",
          id: p.id,
          title: p.edu_name || p.title || "-",
          type: _aprEduType(p.edu_type),
          purpose: _aprPurpose(p.detail?.purpose),
          amount: Number(p.amount || 0),
          account_code: p.account_code || '',
          status: p.status,
          date: (p.created_at || "").slice(0, 10),
          rejectReason: p.reject_reason || null,
          submissionDoc: mySubDocMap[String(p.id)] || null,
          approvalHistory: myHistoryMap[mySubDocMap[String(p.id)]?.id] || [],
        })),
        ...(apps || []).map((a) => ({
          _type: "app",
          _table: "applications",
          id: a.id,
          title: a.edu_name || "-",
          type: _aprEduType(a.edu_type),
          purpose: _aprPurpose(a.detail?.purpose),
          amount: Number(a.amount || 0),
          account_code: a.account_code || '',
          status: a.status,
          date: (a.created_at || "").slice(0, 10),
          rejectReason: a.reject_reason || null,
          submissionDoc: mySubDocMap[String(a.id)] || null,
          approvalHistory: myHistoryMap[mySubDocMap[String(a.id)]?.id] || [],
        })),
      ];

      // [A-1] saved 항목 제거: 상신대기(저장완료)는 이제 계획 목록(plans.js)에서 직접 상신하므로 결재함에서는 제거
      _aprSavedData = [];

      // [S-9] 예산 잔액 조회 (frozen 포함 실가용 잔액)
      try {
        const { data: bbs } = await sb.from('org_budget_bankbooks')
          .select('id, account_code, current_balance')
          .eq('tenant_id', tid)
          .eq("org_id", currentPersona.orgId)
          .eq('status', 'active');
        if (bbs && bbs.length > 0) {
          let totalAllocated = 0, totalUsed = 0, totalFrozen = 0;
          for (const bb of bbs) {
            const { data: alloc } = await sb.from('budget_allocations')
              .select('allocated_amount, used_amount, frozen_amount')
              .eq('bankbook_id', bb.id)
              .order('created_at', { ascending: false }).limit(1).single();
            if (alloc) {
              totalAllocated += Number(alloc.allocated_amount || 0);
              totalUsed += Number(alloc.used_amount || 0);
              totalFrozen += Number(alloc.frozen_amount || 0);
            } else {
              totalAllocated += Number(bb.current_balance || 0);
            }
          }
          window._aprBudgetSummary = { totalAllocated, totalUsed, totalFrozen, available: totalAllocated - totalUsed - totalFrozen };
        } else {
          window._aprBudgetSummary = null;
        }
      } catch { window._aprBudgetSummary = null; }

    } catch (err) {
      console.error("[renderApprovalMember] DB 조회 실패:", err.message);
      _aprMemberData = [];
    }
  }

  // 상태별 통계 (saved·recalled·draft 제외 — recalled는 회수됐으므로 목록에서 숨김. saved는 계획 목록으로 이관됨)
  const data = _aprMemberData.filter(d => !['recalled', 'draft', 'saved'].includes(d.status));
  const stats = {
    saved: 0, // 더 이상 결재함에서 카운트하지 않음
    total: data.length,
    approved: data.filter((d) => d.status === "approved").length,
    inProgress: data.filter(
      (d) => ['pending','pending_approval','submitted','in_review'].includes(d.status)
    ).length,
    rejected: data.filter((d) => d.status === "rejected").length,
    resultPending: data.filter((d) => d.status === "result_pending").length,
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
    result_pending: { label: "BO 검토 중", color: "#1D4ED8", bg: "#EFF6FF", icon: "🔵" },
    // BO 담당자가 정산 결과를 검토 중인 상태 (result.js → result_pending 전환 후)
  };


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

      <!-- [S-7] 결재선 진행 타임라인 -->
      <div style="margin:12px 0;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        ${(() => {
          const doc = item.submissionDoc;
          const hist = item.approvalHistory || [];
          if (doc && (doc.approval_nodes || []).length > 0) {
            // [S-7] 실제 결재 노드 기반 타임라인
            const nodes = doc.approval_nodes;
            const curIdx = doc.current_node_order || 0;
            const docStatus = doc.status;
            return `<div style="display:flex;align-items:center;gap:0;flex-wrap:wrap">
              <div style="display:flex;align-items:center;flex-shrink:0">
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;background:#059669;color:white">✔</div>
                  <span style="font-size:9px;font-weight:800;color:#059669">상신완료</span>
                </div>
              </div>
              ${nodes.map((n, i) => {
                const matchH = hist.filter(h => h.node_order === i);
                const lastH = matchH[matchH.length - 1];
                const isDone = i < curIdx || (i === curIdx && ['approved','rejected'].includes(docStatus));
                const isCur  = i === curIdx && ['submitted','in_review'].includes(docStatus);
                const isRej  = lastH?.action === 'rejected';
                const nodeColor = isRej ? '#DC2626' : isDone ? '#059669' : isCur ? '#7C3AED' : '#9CA3AF';
                const nodeBg    = isRej ? '#FEE2E2' : isDone ? '#059669'  : isCur ? '#7C3AED' : '#E5E7EB';
                const nodeIcon  = isRej ? '❌' : isDone ? '✔' : isCur ? '🔄' : '⏳';
                const lineColor = isDone && !isRej ? '#059669' : '#E5E7EB';
                const tooltip = lastH ? ` title="${lastH.approver_name||''} ${lastH.action==='approved'?'승인':'반려'} (${(lastH.action_at||'').slice(0,10)})"` : '';
                return `<div style="display:flex;align-items:center;flex-shrink:0">
                  <div style="width:24px;height:2px;background:${lineColor}"></div>
                  <div${tooltip} style="display:flex;flex-direction:column;align-items:center;gap:2px">
                    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;background:${nodeBg};color:${isDone||isCur?'white':'#9CA3AF'}">${nodeIcon}</div>
                    <span style="font-size:9px;font-weight:800;color:${nodeColor};max-width:52px;text-align:center;line-height:1.2">${n.label||n.approverKey||'결재'}</span>
                    ${lastH?.approver_name ? `<span style="font-size:8px;color:#9CA3AF">${lastH.approver_name}</span>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>`;
          } else {
            // [S-7] submission_doc 없음(레거시) → 간단한 상태 기반 타임라인
            const steps = [
              { label: '신청', done: true },
              { label: '1차검토', done: ['in_review','approved','rejected'].includes(item.status), active: item.status === 'in_review' },
              { label: '최종결재', done: ['approved','rejected'].includes(item.status), icon: item.status === 'approved' ? '✅' : item.status === 'rejected' ? '❌' : '⏳' },
            ];
            return `<div style="display:flex;align-items:center;gap:0">${steps.map((step, i) => `
              <div style="display:flex;align-items:center;flex:1">
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;
                    background:${step.done ? '#059669' : step.active ? '#7C3AED' : '#E5E7EB'};
                    color:${step.done || step.active ? 'white' : '#9CA3AF'}">${step.done ? '✔' : step.icon||'⏳'}</div>
                  <span style="font-size:9px;font-weight:800;color:${step.done ? '#059669' : step.active ? '#7C3AED' : '#9CA3AF'}">${step.label}</span>
                </div>
                ${i < steps.length - 1 ? `<div style="flex:1;height:2px;background:${step.done ? '#059669' : '#E5E7EB'};margin:0 4px;margin-bottom:14px"></div>` : ''}
              </div>`).join('')}</div>`;
          }
        })()}
      </div>

      <!-- [S-7] 반려 사유 + 담당자 표시 -->
      ${(() => {
        const doc = item.submissionDoc;
        const hist = item.approvalHistory || [];
        const rejectH = hist.find(h => h.action === 'rejected');
        const rejectReason = doc?.reject_reason || item.rejectReason || (rejectH?.comment || null);
        const rejectBy = doc?.reject_node_label || rejectH?.node_label || null;
        const rejectWho = rejectH?.approver_name || null;
        if (rejectReason) {
          return `<div style="margin-top:8px;padding:10px 14px;border-radius:8px;background:#FEF2F2;border:1px solid #FECACA;font-size:11px">
            <div style="font-weight:800;color:#DC2626;margin-bottom:3px">❌ 반려 사유${rejectBy||rejectWho ? ` (${[rejectBy,rejectWho].filter(Boolean).join(' · ')})` : ''}</div>
            <div style="color:#991B1B;line-height:1.5">${rejectReason}</div>
          </div>`;
        }
        // 승인 완료인 경우 승인 정보 표시
        if (item.status === 'approved' && doc?.approved_at) {
          const approveH = [...hist].reverse().find(h => h.action === 'approved');
          return `<div style="margin-top:8px;padding:8px 14px;border-radius:8px;background:#F0FDF4;border:1px solid #A7F3D0;font-size:11px;display:flex;align-items:center;gap:8px">
            <span style="font-weight:800;color:#059669">✅ 승인완료</span>
            ${approveH?.approver_name ? `<span style="color:#6B7280">${approveH.approver_name}${approveH.node_label ? ' · ' + approveH.node_label : ''}</span>` : ''}
            <span style="color:#9CA3AF">${new Date(doc.approved_at).toLocaleDateString('ko-KR')}</span>
          </div>`;
        }
        return '';
      })()}
      ${(() => {
        // [A-3] 회수 조건 강화: current_node_order === 0 + docStatus 기반
        // PRD fo_submission_approval.md Q2 확정: "첫 노드 액션 전까지만 회수 가능"
        const isSubmitted = ['pending','submitted','in_review'].includes(item.status);
        if (!isSubmitted) return '';
        const doc = item.submissionDoc;
        let canRecall = false;
        let recallBlockMsg = '';
        if (doc) {
          const curOrder = typeof doc.current_node_order === 'number' ? doc.current_node_order : 0;
          const docStatus = doc.status;
          if (['approved','rejected','recalled'].includes(docStatus)) {
            canRecall = false;
            recallBlockMsg = docStatus === 'recalled' ? '이미 회수된 상신입니다.' : '결재가 완료된 항목입니다.';
          } else if (curOrder === 0 && ['submitted','pending'].includes(docStatus)) {
            canRecall = true; // 첫 결재자 검토 전 — 회수 가능
          } else if (docStatus === 'in_review') {
            canRecall = false;
            recallBlockMsg = '담당자가 검토 중입니다. 검토 완료 후 반려될 수 있습니다. (PRD Q2)';
          } else if (curOrder > 0) {
            canRecall = false;
            recallBlockMsg = `${curOrder + 1}단계 결재 진행 중입니다. 담당자에게 반려 요청하세요.`;
          }
        } else {
          // 레거시(submission_doc 없음): status 기반 폴백
          canRecall = ['pending','submitted'].includes(item.status);
          if (!canRecall && item.status === 'in_review') {
            recallBlockMsg = '담당자가 검토 중입니다. 회수할 수 없습니다.';
          }
        }
        if (canRecall) {
          const _tid = String(item.id).replace(/'/g,"\\'");
          const _ttbl = item._table || (item._type === 'plan' ? 'plans' : 'applications');
          return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;display:flex;align-items:center;gap:8px">
              <button onclick="_aprRecallSubmit('${_tid}','${_ttbl}')"
                style="padding:6px 14px;border-radius:8px;border:1.5px solid #9CA3AF;background:white;color:#6B7280;font-size:11px;font-weight:800;cursor:pointer"
                onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                ↩️ 회수
              </button>
              <span style="font-size:10px;color:#9CA3AF">첫 결재자 검토 전만 회수 가능</span>
             </div>`;
        } else if (recallBlockMsg) {
          return `<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#FFF7ED;border:1px solid #FED7AA;font-size:10px;color:#92400E;font-weight:700">⚠️ ${recallBlockMsg}</div>`;
        }
        return '';
      })()}
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

  <!-- 통계 카드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[
      { label: "전체", val: stats.total, color: "#002C5F", bg: "#EFF6FF", icon: "📋" },
      { label: "승인완료", val: stats.approved, color: "#059669", bg: "#F0FDF4", icon: "✅" },
      { label: "결재대기", val: stats.inProgress, color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
      { label: "BO 검토 중", val: stats.resultPending, color: "#1D4ED8", bg: "#EFF6FF", icon: "🔵" },
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

  <!-- [S-9] 예산 실잔액 배너 -->
  ${
    (() => {
      const bs = window._aprBudgetSummary;
      if (!bs) return '';
      const avail = bs.available;
      const frozen = bs.totalFrozen;
      const used = bs.totalUsed;
      const alloc = bs.totalAllocated;
      const pct = alloc > 0 ? Math.min(100, Math.round((used + frozen) / alloc * 100)) : 0;
      const availColor = avail < 0 ? '#DC2626' : avail < alloc * 0.1 ? '#D97706' : '#059669';
      const availBg = avail < 0 ? '#FEF2F2' : avail < alloc * 0.1 ? '#FFFBEB' : '#F0FDF4';
      return `
  <div style="background:${availBg};border:1.5px solid ${availColor}33;border-radius:14px;padding:16px 20px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;font-weight:800;color:${availColor};margin-bottom:4px">💰 팀 예산 실가용 잔액</div>
        <div style="font-size:22px;font-weight:900;color:${availColor}">${avail.toLocaleString()}<span style="font-size:13px;margin-left:2px">원</span></div>
        <div style="font-size:10px;color:#6B7280;margin-top:2px">배정: ${alloc.toLocaleString()}원 | 사용: ${used.toLocaleString()}원 | 예약(대기): <strong style="color:#D97706">${frozen.toLocaleString()}원</strong></div>
      </div>
      <div style="min-width:120px;flex:1;max-width:220px">
        <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden">
          <div style="height:100%;background:linear-gradient(90deg,#002C5F ${Math.round(used/alloc*100)}%,#FDE68A ${Math.round(used/alloc*100)}% ${pct}%);border-radius:4px;transition:width .4s"></div>
        </div>
        <div style="font-size:10px;color:#6B7280;margin-top:4px;text-align:right">${pct}% 사용 (예약 포함)</div>
      </div>
    </div>
  </div>`;
    })()
  }

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

  // 상신 브릿지를 통해 넘어온 건이 있으면 모달 오픈
  if (window._pendingAprSubmit) {
    const p = window._pendingAprSubmit;
    window._pendingAprSubmit = null;
    if (typeof _aprSingleSubmit === 'function') {
      setTimeout(() => {
        _aprSingleSubmit(p.id, p.table, p.title);
      }, 50); // DOM 초기화 후 약간의 지연
    }
  }
}

// --- 리더용 결재함 (S-5: submission_documents 기반) ---

async function renderApprovalLeader() {
  const el = document.getElementById("page-approval-leader");

  if (!_isLeaderPersona()) {
    el.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="card p-16 text-center">
        <div style="font-size:48px;margin-bottom:16px">&#x1F512;</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">&#xC811;&#xADFC; &#xAD8C;&#xD55C;&#xC774; &#xC5C6;&#xC2B5;&#xB2C8;&#xB2E4;</div>
        <div style="font-size:12px;color:#9CA3AF">&#xB9AC;&#xB354;&#xC6A9; &#xACB0;&#xC7AC;&#xD568;&#xC740; &#xD300;&#xC7A5;&#xB7B7;&#xC2E4;&#xC7A5;&#xB7B7;&#xC13C;&#xD130;&#xC7A5;&#xB7B7;&#xBCF8;&#xBD80;&#xC7A5;&#xB7B7;&#xC0AC;&#xC5C5;&#xBD80;&#xC7A5;&#xB9CC; &#xC811;&#xADFC;&#xD560; &#xC218; &#xC788;&#xC2B5;&#xB2C8;&#xB2E4;.</div>
      </div>
    </div>`;
    return;
  }

  const sb = typeof getSB === "function" ? getSB() : null;

  if (sb && !_aprLeaderLoaded) {
    _aprLeaderLoaded = true;
    _aprSubDocData = [];
    _aprLeaderData = [];
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;
      const ctInfo = typeof getCrossTenantInfo === "function"
        ? await getCrossTenantInfo(currentPersona) : null;
      const filterTids = ctInfo?.linkedTids || [tid];

      // [S-5] submission_documents 기반 조회
      try {
        let sdQ = sb.from("submission_documents")
          .select("*, submission_items(*)")
          .in("status", ["submitted", "in_review"])
          .neq("submitter_id", pid)
          .order("submitted_at", { ascending: false });
        if (filterTids.length > 1) sdQ = sdQ.in("tenant_id", filterTids);
        else sdQ = sdQ.eq("tenant_id", tid);
        const { data: sdDocs } = await sdQ;
        _aprSubDocData = sdDocs || [];
        console.log(`[renderApprovalLeader] 상신문서 ${_aprSubDocData.length}건`);
      } catch (sdErr) {
        console.warn("[renderApprovalLeader] submission_documents 조회 실패:", sdErr.message);
      }

      // 레거시: 상신 문서에 포함되지 않은 건
      const linkedIds = new Set(_aprSubDocData.flatMap(d => (d.submission_items||[]).map(i => i.item_id)));
      const legacySt = ["pending","submitted","in_review"];

      let plansQ = sb.from("plans").select("*").in("status",legacySt).neq("applicant_id",pid).order("created_at",{ascending:false});
      if (filterTids.length > 1) plansQ = plansQ.in("tenant_id",filterTids); else plansQ = plansQ.eq("tenant_id",tid);
      const { data: plans } = await plansQ;

      let appsQ = sb.from("applications").select("*").in("status",legacySt).neq("applicant_id",pid).order("created_at",{ascending:false});
      if (filterTids.length > 1) appsQ = appsQ.in("tenant_id",filterTids); else appsQ = appsQ.eq("tenant_id",tid);
      const { data: apps } = await appsQ;

      const toLegacy = (rows,type,tab) => (rows||[]).filter(r=>!linkedIds.has(r.id)).map(r=>({
        _type:type,_table:tab,id:r.id,
        applicant:r.applicant_name||"-",dept:r.detail?.dept||r.dept||"-",
        title:r.edu_name||r.title||"-",type:_aprEduType(r.edu_type),
        purpose:_aprPurpose(r.detail?.purpose),amount:Number(r.amount||0),
        date:(r.created_at||"").slice(0,10),account_code:r.account_code||"",
        tenantId:r.tenant_id||"",status:r.status||"pending",
      }));
      _aprLeaderData = [...toLegacy(plans,"plan","plans"),...toLegacy(apps,"app","applications")];

      // 결재라인 필터 (레거시)
      if (typeof SERVICE_POLICIES!=="undefined" && SERVICE_POLICIES.length>0) {
        const myPos = currentPersona.pos||"";
        const posToKey = {팀장:"team_leader",실장:"director",사업부장:"division_head",센터장:"center_head",본부장:"hq_head"};
        const myKey = Object.entries(posToKey).find(([k])=>myPos.includes(k))?.[1]||"";
        _aprLeaderData = _aprLeaderData.filter(item=>{
          const pol = SERVICE_POLICIES.find(p=>p.tenantId===item.tenantId&&(p.accountCodes||[]).some(c=>item.account_code.includes(c)));
          if (!pol?.approvalConfig) return true;
          const cfg = pol.approvalConfig[item._type==="plan"?"plan":"apply"];
          if (!cfg?.thresholds?.length) return true;
          const sorted=[...cfg.thresholds].sort((a,b)=>(a.maxAmt||Infinity)-(b.maxAmt||Infinity));
          const matched=sorted.find(t=>t.maxAmt&&item.amount<=t.maxAmt)||sorted[sorted.length-1];
          return !matched?.approverKey||matched.approverKey===myKey;
        });
      }
    } catch (err) {
      console.error("[renderApprovalLeader] 조회 실패:", err.message);
    }
  }

  const totalPending = _aprSubDocData.length + _aprLeaderData.length;

  // 상신 문서 카드 (파란 테두리)
  const subDocCards = _aprSubDocData.map(doc => {
    const items = doc.submission_items||[];
    const safeDocId = String(doc.id).replace(/'/g,"\\'");
    const totalAmt = Number(doc.total_amount||0);
    const subAt = (doc.submitted_at||doc.created_at||"").slice(0,16).replace("T"," ");
    const stBadge = doc.status==="in_review"
      ? `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#F5F3FF;color:#7C3AED">🔄 검토완료</span>`
      : `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#FFF7ED;color:#C2410C">🕐 결재대기</span>`;
    const itemList = items.length>0
      ? items.map((it,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F9FAFB;font-size:12px"><span>${i+1}. ${it.item_title||it.item_id}</span><span style="font-weight:800;color:#002C5F">${Number(it.item_amount||0).toLocaleString()}원</span></div>`).join("")
      : `<div style="font-size:11px;color:#9CA3AF;padding:6px 0">연결된 항목 없음</div>`;
    return `
    <div style="border-radius:16px;border:2px solid #DBEAFE;background:white;padding:20px 22px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,44,95,.06)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">📤 상신문서</span>
            ${stBadge}
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:6px">${doc.title}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>👤 ${doc.submitter_name}${doc.submitter_org_name?" · "+doc.submitter_org_name:""}</span>
            <span>📅 ${subAt}</span>
            <span>📊 ${items.length}건</span>
            ${doc.account_code?`<span>🏦 ${doc.account_code}</span>`:""}
            ${doc.approval_system === 'integrated' ? `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-left:2px">🔗 통합결재</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px">신청 총액</div>
          <div style="font-size:22px;font-weight:900;color:#002C5F">${totalAmt.toLocaleString()}원</div>
        </div>
      </div>
      <div style="background:#F8FAFF;border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">📋 첨부 항목</div>
        ${itemList}
      </div>
      ${doc.content?`<div style="font-size:12px;color:#6B7280;background:#F9FAFB;border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.6">"${doc.content}"</div>`:""}
      ${(() => {
        const coop = Array.isArray(doc.coop_teams) ? doc.coop_teams : [];
        const ref = Array.isArray(doc.reference_teams) ? doc.reference_teams : [];
        if (doc.approval_system !== 'integrated' || (coop.length === 0 && ref.length === 0)) return '';
        return `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:11px">
          <div style="font-weight:900;color:#1D4ED8;margin-bottom:6px">🔗 통합결재 정보</div>
          ${coop.length > 0 ? `<div style="margin-bottom:4px"><span style="color:#6B7280;font-weight:700">협조처:</span> <span style="color:#374151">${coop.map(c => c.name||c).join(', ')}</span></div>` : ''}
          ${ref.length > 0 ? `<div><span style="color:#6B7280;font-weight:700">참조처:</span> <span style="color:#374151">${ref.map(r => r.name||r).join(', ')}</span></div>` : ''}
        </div>`;
      })()}
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1">
          <textarea id="comment-doc-${safeDocId}" placeholder="결재 의견 (반려 시 필수)" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalActionDoc('${safeDocId}','approve')" style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:80px" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">✅ 승인</button>
          <button onclick="_approvalActionDoc('${safeDocId}','reject')"  style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">❌ 반려</button>
        </div>
      </div>
    </div>`;
  }).join("");

  // 레거시 카드
  const legacyCards = _aprLeaderData.map(item=>{
    const typeBdg = item._type==="plan"
      ? `<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8">📋 교육계획</span>`
      : `<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309">📝 교육신청</span>`;
    const tBdg = typeof getTenantBadgeHtml==="function"?getTenantBadgeHtml(item.tenantId,currentPersona.tenantId):"";
    const sid = String(item.id).replace(/'/g,"\\'");
    return `
    <div style="border-radius:14px;border:1.5px solid #E5E7EB;background:#FAFAFA;padding:18px 20px;margin-bottom:12px">
      <div style="font-size:10px;color:#9CA3AF;font-weight:700;margin-bottom:8px">📄 레거시 방식 (상신 문서 미연결)</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#1D4ED8;flex-shrink:0">${item.applicant.charAt(0)}</div>
            <div><div style="font-size:13px;font-weight:900;color:#374151">${item.applicant}</div><div style="font-size:11px;color:#9CA3AF">${item.dept}</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>${typeBdg}${tBdg}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 ${item.date}</span><span>📚 ${item.type}</span><span>💰 ${item.amount.toLocaleString()}원</span>
            ${item.purpose!=="-"?`<span>🎯 ${item.purpose}</span>`:""}
          </div>
        </div>
        ${item.status==="in_review"
          ? `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#F5F3FF;color:#7C3AED">🔄 검토완료</div>`
          : `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#FFF7ED;color:#C2410C">🕐 결재대기</div>`}
      </div>
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1"><textarea id="comment-${sid}" placeholder="결재 의견 (반려 시 필수)" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea></div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalAction('${sid}','${item._table}','approve')" style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:80px" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">✅ 승인</button>
          <button onclick="_approvalAction('${sid}','${item._table}','reject')"  style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">❌ 반려</button>
        </div>
      </div>
    </div>`;
  }).join("");

  const emptyMsg = `<div class="card p-16 text-center">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">결재 대기 건이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF">팀원의 교육계획·신청이 상신되면 여기서 결재할 수 있습니다.</div>
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
      <button onclick="_aprLeaderLoaded=false;_aprLeaderData=[];_aprSubDocData=[];renderApprovalLeader()"
        style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">🔄 새로고침</button>
      <div style="background:#EFF6FF;border-radius:12px;padding:10px 18px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px">결재 대기</div>
        <div style="font-size:28px;font-weight:900;color:#002C5F">${totalPending}<span style="font-size:14px">건</span></div>
      </div>
    </div>
  </div>
  ${totalPending===0 ? emptyMsg : `
    ${_aprSubDocData.length>0?`<div style="font-size:11px;font-weight:800;color:#1D4ED8;margin:8px 0 4px">📤 상신 문서 기반 (${_aprSubDocData.length}건)</div>${subDocCards}`:""}
    ${_aprLeaderData.length>0?`<div style="font-size:11px;font-weight:800;color:#9CA3AF;margin:${_aprSubDocData.length>0?"16px":"8px"} 0 4px">📄 레거시 방식 (${_aprLeaderData.length}건)</div>${legacyCards}`:""}
  `}
</div>`;
}

async function _approvalActionDoc(docId, action) {
  const commentEl = document.getElementById("comment-doc-" + docId);
  const comment = commentEl?.value?.trim() || "";
  const actionLabel = action === "approve" ? "승인" : "반려";

  if (action === "reject" && !comment) {
    alert("반려 시 의견을 입력해주세요.");
    return;
  }
  if (!confirm(`이 상신 문서를 ${actionLabel} 처리하시겠습니까?`)) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  try {
    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "approved" : "rejected";

    // 1. submission_documents 상태 업데이트
    const updateDoc = { status: newStatus, updated_at: now };
    if (action === "approve") updateDoc.approved_at = now;
    if (action === "reject") { updateDoc.rejected_at = now; updateDoc.reject_reason = comment; updateDoc.reject_node_label = currentPersona.pos || "팀장"; }
    const { error: docErr } = await sb.from("submission_documents").update(updateDoc).eq("id", docId);
    if (docErr) throw docErr;

    // 2. submission_items 조회 → 연결된 plans/applications 상태 업데이트
    const { data: sItems } = await sb.from("submission_items").select("*").eq("submission_id", docId);
    if (sItems && sItems.length > 0) {
      for (const si of sItems) {
        const tab = si.item_type === "plan" ? "plans" : "applications";
        const upd = { status: newStatus, updated_at: now };
        if (action === "reject") upd.reject_reason = comment;
        await sb.from(tab).update(upd).eq("id", si.item_id);
        await sb.from("submission_items").update({ item_status: action === "approve" ? "approved" : "rejected" }).eq("id", si.id);
      }
    }

    // 3. [S-9] 예산 처리: 승인 → 확정 차감, 반려 → 예약 해제
    if (action === "approve") {
      _s9ConfirmBudget(sb, { submissionId: docId }).catch(e => console.warn('[S-9] 확정 차감 실패:', e.message));
    } else if (action === "reject") {
      _s9ReleaseBudget(sb, { submissionId: docId, reason: 'rejected' }).catch(e => console.warn('[S-9] 예약 해제 실패:', e.message));
    }

    alert(`✅ ${actionLabel} 처리 완료!\n\n${comment ? "의견: " + comment + "\n\n" : ""}연결된 건들의 상태가 모두 업데이트되었습니다.`);

    _aprLeaderLoaded = false; _aprLeaderData = []; _aprSubDocData = [];
    _aprMemberLoaded = false; _aprMemberData = []; _aprSavedData = [];
    renderApprovalLeader();
  } catch (err) {
    alert("처리 실패: " + err.message);
    console.error("[_approvalActionDoc]", err.message);
  }
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

// 상신 모달 열기 (S-3 고도화: 예산 요약 + 계정 정보)
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

  // 첨부 항목 목록 + 예산 요약
  const listEl = document.getElementById('apr-modal-items-list');
  if (listEl) {
    const totalAmt = items.reduce((sum, item) => {
      const d = _aprSavedData.find(x => String(x.id) === String(item.id));
      return sum + (d?.amount || 0);
    }, 0);
    const acctCodes = [...new Set(items.map(item => {
      const d = _aprSavedData.find(x => String(x.id) === String(item.id));
      return d?.accountCode || d?.account_code || '';
    }).filter(Boolean))];
    const multiAcct = acctCodes.length > 1;

    listEl.innerHTML = `
      <div style="margin-bottom:10px">
        ${items.map((item, i) => {
          const d = _aprSavedData.find(x => String(x.id) === String(item.id));
          const amt = d?.amount || 0;
          return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F3F4F6;font-size:12px">
            <span style="color:#374151;font-weight:700">${i + 1}. ${item.title}</span>
            <span style="color:#002C5F;font-weight:900">${amt.toLocaleString()}원</span>
          </div>`;
        }).join('')}
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:900;color:#002C5F">
          <span>합계</span><span>${totalAmt.toLocaleString()}원</span>
        </div>
      </div>
      ${multiAcct ? `<div style="font-size:11px;color:#EF4444;padding:6px 8px;background:#FEF2F2;border-radius:6px;margin-top:6px">⚠️ 서로 다른 예산계정의 건이 포함되어 있습니다. 같은 계정의 건만 모아 상신하는 것을 권장합니다.</div>` : acctCodes.length ? `<div style="font-size:11px;color:#6B7280">예산계정: <strong>${acctCodes[0]}</strong></div>` : ''}`;
  }

  // [S-7] 통합결재 여부 감지 → 협조처/참조처 섹션 동적 삽입
  const acct = (selectedArr?.length > 0 ? selectedArr[0]?.account : '') ||
    ([..._aprSelectedItems.values()][0]?.account || '');
  let isIntegrated = false;
  if (acct && typeof SERVICE_POLICIES !== 'undefined' && SERVICE_POLICIES.length > 0) {
    const matchedPol = SERVICE_POLICIES.find(pol =>
      (pol.accountCodes || []).some(c => acct.includes(c))
    );
    if (matchedPol?.approvalConfig?.approvalSystem === 'integrated') isIntegrated = true;
  }
  // 협조처/참조처 섹션을 모달에 삽입/제거
  const existCoopSec = document.getElementById('apr-integrated-section');
  if (existCoopSec) existCoopSec.remove();
  if (isIntegrated) {
    const coopSection = document.createElement('div');
    coopSection.id = 'apr-integrated-section';
    coopSection.innerHTML = `
      <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;padding:14px 16px;margin-top:14px">
        <div style="font-size:11px;font-weight:900;color:#1D4ED8;margin-bottom:10px">🔗 통합결재 — 협조처/참조처</div>
        <div style="margin-bottom:10px">
          <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:5px">협조처 <span style="color:#6B7280;font-weight:400">(쉼표 구분)</span></label>
          <input id="apr-coop-input" type="text" placeholder="예) 교육협조처, 인사팀"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:600;color:#374151"
            onfocus="this.style.borderColor='#1D4ED8'" onblur="this.style.borderColor='#BFDBFE'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:5px">참조처 <span style="color:#6B7280;font-weight:400">(쉼표 구분)</span></label>
          <input id="apr-ref-input" type="text" placeholder="예) 재경팀, 전략기획팀"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:600;color:#374151"
            onfocus="this.style.borderColor='#1D4ED8'" onblur="this.style.borderColor='#BFDBFE'">
        </div>
        <div style="font-size:10px;color:#6B7280;margin-top:8px">📌 통합결재 계정 — 협조처·참조처 정보가 결재문서에 포함됩니다.</div>
      </div>`;
    const modalItems = document.getElementById('apr-modal-items');
    if (modalItems) modalItems.parentNode.insertBefore(coopSection, modalItems.nextSibling);
  }

  modal.style.display = 'flex';
}

// 모달 닫기
function _aprCloseModal() {
  const modal = document.getElementById('apr-submit-modal');
  if (modal) modal.style.display = 'none';
}

// 상신 확정 — submission_documents + submission_items 생성 + status → submitted
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

    // ── 계정코드·총액 집계
    const totalAmount = selectedArr.reduce((sum, sel) => {
      const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
      return sum + (item?.amount || 0);
    }, 0);
    const acctCodes = [...new Set(selectedArr.map(sel => {
      const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
      return item?.accountCode || item?.account_code || '';
    }).filter(Boolean))];
    const accountCode = acctCodes[0] || null;

    // [S-7] 통합결재 여부 + 협조처/참조처 수집
    const acct = accountCode || '';
    let approvalSystem = 'platform';
    let coopTeams = [];
    let referenceTeams = [];
    if (acct && typeof SERVICE_POLICIES !== 'undefined') {
      const matchedPol = SERVICE_POLICIES.find(pol =>
        (pol.accountCodes || []).some(c => acct.includes(c))
      );
      if (matchedPol?.approvalConfig?.approvalSystem === 'integrated') {
        approvalSystem = 'integrated';
        const coopInput = document.getElementById('apr-coop-input');
        const refInput = document.getElementById('apr-ref-input');
        if (coopInput?.value?.trim()) {
          coopTeams = coopInput.value.split(',').map(s => ({ name: s.trim() })).filter(x => x.name);
        }
        if (refInput?.value?.trim()) {
          referenceTeams = refInput.value.split(',').map(s => ({ name: s.trim() })).filter(x => x.name);
        }
      }
    }

    // [S-8] approval_nodes 자동 구성: APPROVAL_ROUTING에서 계정+금액 기반 노드 생성
    let approvalNodes = [];
    try {
      const routing = typeof APPROVAL_ROUTING !== 'undefined'
        ? APPROVAL_ROUTING.find(r =>
            r.tenantId === currentPersona.tenantId &&
            (r.accountCodes || []).some(c => accountCode && accountCode.includes(c))
          )
        : null;
      if (routing && routing.ranges && routing.ranges.length > 0) {
        // 금액 구간 매칭 (max가 null이면 상한 없음)
        const matchedRange = routing.ranges
          .filter(rng => rng.max === null || totalAmount <= rng.max)
          .sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity))[0];
        if (matchedRange) {
          approvalNodes = (matchedRange.nodes || [])
            .filter(n => n.type !== 'draft') // 기안 노드 제외
            .map((n, i) => ({
              order: i,
              type: n.type,
              label: n.label || n.role || '결재자',
              approverKey: n.role || n.coopType || n.label || '',
              activation: n.activation || 'always',
              conditionRuleId: n.conditionRuleId || null,
            }));
        }
      }
      // 라우팅 없으면 기본 1단계 노드
      if (approvalNodes.length === 0) {
        approvalNodes = [{ order: 0, type: 'approval', label: '결재자', approverKey: 'leader', activation: 'always' }];
      }
    } catch (nodeErr) {
      console.warn('[S-8] approval_nodes 구성 실패:', nodeErr.message);
      approvalNodes = [{ order: 0, type: 'approval', label: '결재자', approverKey: 'leader', activation: 'always' }];
    }

    // doc_type 파생: item 유형에서 자동 결정
    const itemTypes = [...new Set(selectedArr.map(sel =>
      sel.table === 'plans' ? 'plan' : 'application'
    ))];
    const docType = itemTypes.length === 1 ? itemTypes[0] : 'plan';

    // 1. submission_documents 행 생성 (S-1 테이블 활용, id는 DB auto UUID)
    const docRow = {
      tenant_id: currentPersona.tenantId,
      submission_type: 'fo_user',
      submitter_id: currentPersona.id,
      submitter_name: currentPersona.name,
      submitter_org_id: currentPersona.orgId || null,
      submitter_org_name: currentPersona.dept || null,
      title: docTitle,
      content: docContent,
      account_code: accountCode,
      total_amount: totalAmount,
      approval_system: approvalSystem,
      approval_nodes: approvalNodes,
      current_node_order: 0,
      doc_type: docType,
      coop_teams: coopTeams.length > 0 ? coopTeams : [],
      reference_teams: referenceTeams.length > 0 ? referenceTeams : [],
      status: 'submitted',
      submitted_at: now,
    };

    try {
      const { data: insertedDoc, error: insertErr } = await sb.from('submission_documents').insert(docRow).select('id').single();
      if (insertErr) throw insertErr;
      const docId = insertedDoc?.id;
      if (!docId) throw new Error('submission_documents insert 후 id 미반환');
      console.log('[_aprConfirmSubmit] 상신 문서 생성:', docId);

      // 2. submission_items — 건별 연결 행 삽입 (실제 DB 컬럼에 맞게)
      const itemRows = selectedArr.map((sel, idx) => {
        const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
        return {
          submission_id: docId,
          item_type: sel.table === 'plans' ? 'plan' : 'application',
          item_id: String(sel.id),
          item_title: item?.title || String(sel.id),
          item_amount: item?.amount || 0,
          item_status_at_submit: item?.status || 'saved',
          final_status: 'pending',
          sort_order: idx,
        };
      });
      await sb.from('submission_items').insert(itemRows);
      console.log('[_aprConfirmSubmit] 상신 항목 연결:', itemRows.length, '건');

      // [S-9] 예산 예약 — 상신 시 frozen_amount 증가
      if (totalAmount > 0 && accountCode) {
        _s9ReserveBudget(sb, {
          submissionId: docId,
          submitterId: currentPersona.id,
          submitterName: currentPersona.name,
          tenantId: currentPersona.tenantId,
          accountCode,
          amount: totalAmount,
        }).catch(e => console.warn('[S-9] 예산 예약 실패:', e.message));
      }
    } catch (e) {
      console.warn('[_aprConfirmSubmit] submission 테이블 삽입 실패 (무시):', e.message);
    }

    // 3. 각 항목 status → 'submitted' (saved → submitted, 낙관적 잠금)
    const errors = [];
    for (const sel of selectedArr) {
      try {
        const { error } = await sb
          .from(sel.table)
          .update({ status: 'submitted', updated_at: now })
          .eq('id', sel.id)
          .in('status', ['saved', 'pending']); // pending 레거시도 허용
        if (error) errors.push(error.message);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      alert('⚠️ 일부 항목 상신 실패:\n' + errors.join('\n'));
    } else {
      alert(`✅ 상신 완료!\n\n제목: ${docTitle}\n항목 수: ${selectedArr.length}건 │ 합계: ${totalAmount.toLocaleString()}원\n\n담당자 검토 후 결재선이 자동 구성됩니다.`);
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


// ─── E-5 / A-3: 상신 회수 (submitted → saved) ───────────────────────────────
// [A-3] current_node_order === 0 + docStatus 기반 엄격한 회수 검증
async function _aprRecallSubmit(id, table) {
  if (!confirm('이 항목의 상신을 회수하시겠습니까?\n\n• 저장완료 상태로 복귀됩니다.\n• 수정 후 다시 상신할 수 있습니다.')) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    // [A-3] 1단계: submission_documents 조회 → current_node_order 검증
    let subDocId = null;
    try {
      const { data: siRow } = await sb.from('submission_items')
        .select('submission_id')
        .eq('item_id', id)
        .order('created_at', { ascending: false })
        .limit(1).single();
      if (siRow?.submission_id) {
        subDocId = siRow.submission_id;
        const { data: subDoc } = await sb.from('submission_documents')
          .select('id, status, current_node_order')
          .eq('id', subDocId).single();
        if (subDoc) {
          const curOrder = typeof subDoc.current_node_order === 'number' ? subDoc.current_node_order : 0;
          if (['approved','rejected'].includes(subDoc.status)) {
            alert('⚠️ 결재가 완료된 항목은 회수할 수 없습니다.');
            return;
          }
          if (subDoc.status === 'in_review') {
            alert('⚠️ 담당자가 검토 중입니다.\n검토 완료 후 반려될 수 있습니다. (PRD Q2)');
            return;
          }
          if (curOrder > 0) {
            alert(`⚠️ 결재가 ${curOrder + 1}단계까지 진행되었습니다.\n담당자에게 반려를 요청하세요.`);
            return;
          }
          // curOrder === 0 && status in [submitted, pending] → 회수 가능
        }
      }
    } catch(e) {
      // submission_doc 없음 (레거시) → DB status 기반 폴백 검사
      const { data: cur } = await sb.from(table).select('status').eq('id', id).single();
      if (['approved','in_review'].includes(cur?.status)) {
        alert('⚠️ 결재가 이미 진행 중이거나 완료된 항목은 회수할 수 없습니다.');
        return;
      }
    }

    // [A-3] 2단계: 낙관적 잠금으로 saved로 업데이트
    const { error: recallErr } = await sb.from(table).update({
      status: 'saved',
      updated_at: new Date().toISOString(),
    }).eq('id', id).in('status', ['pending', 'submitted']);
    if (recallErr) throw recallErr;

    // [S-9] 연결된 submission_documents 찾아 예산 예약 해제
    sb.from('submission_items').select('submission_id').eq('item_id', id)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data: si }) => {
        if (!si?.submission_id) return;
        _s9ReleaseBudget(sb, { submissionId: si.submission_id, reason: 'recalled' }).catch(() => {});
        sb.from('submission_documents').update({ status: 'recalled', recalled_at: new Date().toISOString() })
          .eq('id', si.submission_id).catch(() => {});
      }).catch(() => {});

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
  // 모달을 띄우기 위해 항상 결재함 페이지로 이동 (렌더링 완료 후 모달 오픈)
  window._pendingAprSubmit = { id: planId, table: 'plans', title: planTitle || '교육계획 상신' };
  if (typeof navigate === 'function') {
    navigate('approval-member');
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
