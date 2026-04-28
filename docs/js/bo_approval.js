// ─── 📥 BO 결재 화면 — 상신 문서(submission_documents) 기반 전환 (S-8) ─────
// PRD: fo_submission_approval.md §10.1, §12 S-8
// 기존: 정책(SERVICE_POLICIES) 기반 개별 건 필터링
// 변경: submission_documents.approval_nodes[current_node_order] 기반 문서 단위 결재

let _boApprovalTab       = "pending";   // pending | done
let _boApprovalDocFilter = "all";       // all | plan | application | result
let _boApprovalLoaded    = false;
let _boSubDocs           = [];          // 내가 처리해야 할 상신 문서 목록
let _boSelectedForecasts = new Set();   // P13: 선택된 사업계획 묶음 ID 집합

// ── 데이터 로드 ──────────────────────────────────────────────────────────────
async function _loadBoApprovalData() {
  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  if (!sb) { _boSubDocs = []; return; }
  try {
    // [S-8] 역할 기반 조회: 운영담당자 또는 총괄 역할이면 테넌트 전체 제출 문서 조회
    const isBoRole = typeof boIsOpManager === "function" || typeof boIsGlobalAdmin === "function";
    const { data: docs, error } = await sb
      .from("submission_documents")
      .select("*, submission_items(*)")
      .eq("tenant_id", tenantId)
      .in("status", ["submitted", "in_review", "approved", "rejected", "recalled"])
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    if (isBoRole) {
      // BO 역할이면 테넌트의 모든 문서를 표시 (담당자 화면)
      // 단, 운영담당자는 관할 교육조직의 문서만, 총괄은 전체
      const isGlobal = typeof boIsGlobalAdmin === "function" ? boIsGlobalAdmin() : true;
      const isOp = typeof boIsOpManager === "function" ? boIsOpManager() : false;
      if (isGlobal) {
        _boSubDocs = docs || [];
      } else if (isOp) {
        // 운영담당자: 관할 교육조직(managedGroups) 소속 상신자 문서만
        const myGroups = boCurrentPersona?.managedGroups || boCurrentPersona?.managed_groups || [];
        _boSubDocs = (docs || []).filter(doc => {
          if (myGroups.length === 0) return true; // 관할 없으면 전체 허용(fallback)
          return myGroups.some(g =>
            doc.submitter_org_id === g ||
            doc.submitter_org_name?.includes(g)
          );
        });
      } else {
        _boSubDocs = docs || [];
      }
    } else {
      // personaKey 기반 레거시 매칭 (BO_PERSONAS 사용 환경)
      const personaKey = Object.keys(BO_PERSONAS || {}).find(k => BO_PERSONAS[k] === boCurrentPersona) || "";
      _boSubDocs = (docs || []).filter(doc => {
        const nodes = doc.approval_nodes || [];
        if (!nodes.length) return ["submitted","in_review"].includes(doc.status); // nodes 없으면 pending 문서 허용
        const cur = nodes[doc.current_node_order || 0];
        if (!cur) return false;
        return cur.approverKey === personaKey || cur.actorKey === personaKey;
      });
    }
  } catch (err) {
    console.error("[_loadBoApprovalData] 실패:", err.message);
    _boSubDocs = [];
  }
}

// ── 메인 렌더 ─────────────────────────────────────────────────────────────────
function renderMyOperations() {
  const el = document.getElementById("bo-content");
  if (!el) return;
  try {
    if (!_boApprovalLoaded) {
      _boApprovalLoaded = true;
      _loadBoApprovalData().then(() => renderMyOperations());
      el.innerHTML = '<div style="padding:60px;text-align:center;color:#9CA3AF"><div style="font-size:32px">⏳</div><div style="margin-top:8px;font-size:13px;font-weight:700">결재 문서 로딩 중...</div></div>';
      return;
    }

    const pendingDocs = _boSubDocs.filter(d => ["submitted","in_review"].includes(d.status));
    const doneDocs    = _boSubDocs.filter(d => ["approved","rejected","recalled"].includes(d.status));

    // P12/P13: 문서 타입 필터 적용
    const _filterByType = (arr) => _boApprovalDocFilter === "all" ? arr
      : _boApprovalDocFilter === "forecast" ? arr.filter(d => d.submission_type === 'team_business' || d.submission_type === 'org_business')
      : arr.filter(d => d.doc_type === _boApprovalDocFilter && d.submission_type !== 'team_business' && d.submission_type !== 'org_business');
    const currentDocs = _filterByType(_boApprovalTab === "pending" ? pendingDocs : doneDocs);

    // [P13-B] 취합현황 탭 선택 시 대시보드로 전환
    if (_boApprovalTab === "consolidation") {
      el.innerHTML = '<div id="bo-consolidation-container" class="bo-fade"></div>';
      boRenderConsolidationDashboard(document.getElementById("bo-consolidation-container"));
      return;
    }

    // 문서 타입 필터 탭
    const docTypeTabs = [
      { id:"all",         label:"전체",       color:"#374151" },
      { id:"forecast",    label:"📦 사업계획 묶음", color:"#D97706" },
      { id:"plan",        label:"교육계획",    color:"#1D4ED8" },
      { id:"application", label:"교육신청",    color:"#7C3AED" },
      { id:"result",      label:"결과보고",    color:"#059669" },
      { id:"cancel",      label:"⚠️ 취소요청", color:"#DC2626" },
    ];
    const docFilterCounts = { all: _boSubDocs.length };
    ["forecast","plan","application","result","cancel"].forEach(t => {
      docFilterCounts[t] = _boSubDocs.filter(d => 
        t === "forecast" ? (d.submission_type === 'team_business' || d.submission_type === 'org_business')
        : (d.doc_type === t && d.submission_type !== 'team_business' && d.submission_type !== 'org_business')
      ).length;
    });
    // GAP-1: 취소요청 탭 선택 시 bo_cancel_handler 렌더링
    if (_boApprovalDocFilter === 'cancel') {
      if (typeof renderBoCancelRequests === 'function') {
        el.innerHTML = '<div id="alloc-content"></div>';
        renderBoCancelRequests();
        return;
      }
    }
    const docFilterHtml = docTypeTabs.map(t => {
      const active = _boApprovalDocFilter === t.id;
      const cnt = docFilterCounts[t.id] || 0;
      return `<span onclick="_boApprovalDocFilter='${t.id}';renderMyOperations()"
        style="padding:4px 12px;border-radius:20px;border:1.5px solid ${active?t.color:'#E5E7EB'};
        background:${active?t.color:'white'};color:${active?'white':'#6B7280'};
        font-size:11px;font-weight:700;cursor:pointer">
        ${t.label} <span style="font-size:10px;opacity:.8">${cnt}</span>
      </span>`;
    }).join("");

    const tabHtml = [
      { id:"pending",       label:"📥 승인 대기",  count: pendingDocs.length, color:"#1D4ED8" },
      { id:"done",          label:"✅ 처리 완료",   count: doneDocs.length,   color:"#059669" },
      { id:"consolidation", label:"📊 취합현황",   count: null,              color:"#D97706" }
    ].map(t => {
      const active = _boApprovalTab === t.id;
      return `<div onclick="_boApprovalTab='${t.id}';renderMyOperations()"
        style="padding:10px 18px;border-radius:10px;border:1.5px solid ${active?t.color:"#E5E7EB"};
        background:${active?t.color:"white"};color:${active?"white":"#6B7280"};
        font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
        ${t.label}
        ${t.count !== null ? `<span style="background:${active?"rgba(255,255,255,.25)":"#F3F4F6"};color:${active?"white":"#374151"};
          padding:2px 8px;border-radius:99px;font-size:11px;font-weight:900">${t.count}</span>` : ""}
      </div>`;
    }).join("");

    // P13: 교육조직 묶음 생성 플로팅 바 (운영담당자 전용)
    const isOpManager = typeof boIsOpManager === "function" && boIsOpManager();
    const canBundle = isOpManager && _boApprovalTab === "pending" && _boApprovalDocFilter === "forecast";
    const bundleBarHtml = canBundle && _boSelectedForecasts.size > 0 ? `
      <div style="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:99;
        background:#1F2937;color:white;padding:16px 32px;border-radius:99px;box-shadow:0 10px 25px rgba(0,0,0,0.3);
        display:flex;align-items:center;gap:20px">
        <div style="font-size:14px;font-weight:700">📦 선택한 팀 묶음 <span style="color:#FBBF24;font-size:18px;margin:0 4px">${_boSelectedForecasts.size}</span>건</div>
        <button onclick="boOrgForecastModal()" style="padding:10px 24px;border-radius:99px;background:#D97706;color:white;border:none;font-weight:900;cursor:pointer">
          교육조직 묶음 생성 및 상신 →
        </button>
      </div>` : "";

    const cards = currentDocs.length === 0
      ? `<div style="padding:60px;text-align:center;color:#9CA3AF">
           <div style="font-size:40px">📭</div>
           <div style="font-weight:700;font-size:14px;margin-top:8px">
             ${_boApprovalTab==="pending"?"승인 대기 문서가 없습니다":"처리 완료 문서가 없습니다"}
           </div>
         </div>`
      : currentDocs.map(renderSubDocCard).join("");

    el.innerHTML = `<div class="bo-fade">
      ${typeof boIsolationGroupBanner==="function" ? boIsolationGroupBanner() : ""}
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <h1 class="bo-page-title" style="margin:0">📥 나의 운영 업무</h1>
          ${typeof boRoleModeBadge==="function" ? boRoleModeBadge() : ""}
        </div>
        <p class="bo-page-sub">${typeof boIsOpManager==="function" && boIsOpManager()
          ? "운영담당자 — 1차 검토 처리 후 총괄담당자에게 전달됩니다"
          : "총괄담당자 — 최종 승인/반려 권한을 가집니다"}</p>
      </div>
      <!-- P12: 문서 타입 필터 -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${docFilterHtml}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">${tabHtml}</div>
      <div style="display:flex;flex-direction:column;gap:12px">${cards}</div>
      ${bundleBarHtml}
    </div>`;
  } catch(err) {
    console.error("[renderMyOperations]", err);
    el.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444">
      <h2>결재 화면 로드 실패</h2><p>${err.message}</p>
      <button onclick="_boApprovalLoaded=false;renderMyOperations()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}
// ── 상신 문서 카드 렌더 ────────────────────────────────────────────────────────
function renderSubDocCard(doc) {
  const items = doc.submission_items || [];
  const isPending = ["submitted","in_review"].includes(doc.status);
  const statusMap = {
    submitted: { label:"상신됨",    bg:"#DBEAFE", c:"#1E40AF" },
    in_review: { label:"결재중",    bg:"#FEF3C7", c:"#92400E" },
    approved:  { label:"승인완료",  bg:"#D1FAE5", c:"#065F46" },
    rejected:  { label:"반려됨",    bg:"#FEE2E2", c:"#991B1B" },
    recalled:  { label:"회수됨",    bg:"#F3F4F6", c:"#6B7280" }
  };
  const st = statusMap[doc.status] || { label: doc.status, bg:"#F3F4F6", c:"#6B7280" };
  const dtypeLabel = doc.doc_type === "application" ? "신청" : doc.doc_type === "result" ? "결과보고" : "교육계획";
  const safeId = String(doc.id).replace(/'/g,"\\'");
  const submittedAt = doc.submitted_at ? new Date(doc.submitted_at).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-";

  // 결재선 진행 표시
  const nodes = doc.approval_nodes || [];
  const nodeHtml = nodes.map((n, i) => {
    const isCur = i === (doc.current_node_order || 0) && isPending;
    const isDone = i < (doc.current_node_order || 0);
    const clr = isDone ? "#059669" : isCur ? "#1D4ED8" : "#9CA3AF";
    const icon = isDone ? "✅" : isCur ? "🔄" : "⏳";
    return `<span style="font-size:11px;color:${clr};font-weight:${isCur?"900":"500"}">${icon} ${n.label||n.approverKey||"결재자"}</span>`;
  }).join(`<span style="color:#D1D5DB;margin:0 4px">→</span>`);

  // 첨부 건 목록 (최대 3건)
  const itemsHtml = items.slice(0,3).map(it =>
    `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#F9FAFB;border-radius:6px;font-size:11px">
      <span style="color:#374151;font-weight:600">📋 ${it.item_title || "제목없음"}</span>
      <span style="color:#6B7280">${it.item_amount ? Number(it.item_amount).toLocaleString()+"원" : "-"}</span>
    </div>`
  ).join("");
  const moreHtml = items.length > 3 ? `<div style="font-size:11px;color:#9CA3AF;padding:4px 10px">... 외 ${items.length-3}건</div>` : "";

  // P13: 체크박스 렌더링 (운영담당자 + team_business + pending)
  const isOpManager = typeof boIsOpManager === "function" && boIsOpManager();
  const showCheckbox = isOpManager && isPending && doc.submission_type === "team_business";
  const isChecked = typeof _boSelectedForecasts !== 'undefined' && _boSelectedForecasts.has(doc.id);
  const chkHtml = showCheckbox ? `
    <div style="margin-right:12px;display:flex;align-items:center">
      <input type="checkbox" ${isChecked?"checked":""} onchange="boToggleForecastBundle('${doc.id}', this.checked)"
        style="width:20px;height:20px;cursor:pointer;accent-color:#D97706">
    </div>
  ` : "";

  return `<div class="bo-card" style="padding:20px;${!isPending?"opacity:0.75":""};display:flex;align-items:flex-start">
    ${chkHtml}
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${st.bg};color:${st.c}">${st.label}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EDE9FE;color:#7C3AED;font-weight:700">${dtypeLabel}</span>
          ${doc.account_code ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F0FDF4;color:#166534;font-weight:600">${doc.account_code}</span>` : ""}
        </div>
        <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:3px">${doc.title || "제목없음"}</div>
        <div style="font-size:12px;color:#9CA3AF">${doc.submitter_name||""} · ${doc.submitter_org_name||""} · ${submittedAt} 상신</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#9CA3AF;font-weight:700">총 금액</div>
        <div style="font-size:18px;font-weight:900;color:#002C5F">${Number(doc.total_amount||0).toLocaleString()}원</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">${items.length}건</div>
      </div>
    </div>

    ${nodeHtml ? `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:8px 10px;background:#F9FAFB;border-radius:8px;margin-bottom:12px">${nodeHtml}</div>` : ""}

    ${itemsHtml ? `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">${itemsHtml}${moreHtml}</div>` : ""}

    ${doc.reject_reason ? `<div style="padding:8px 12px;background:#FEF2F2;border-radius:8px;font-size:12px;color:#991B1B;margin-bottom:12px">❌ 반려 사유: ${doc.reject_reason}</div>` : ""}

    ${isPending ? _boRenderApprovalBtns(safeId, doc) : `<div style="text-align:right;font-size:12px;font-weight:700;color:#9CA3AF;border-top:1px solid #F3F4F6;padding-top:10px">처리 완료</div>`}
    </div>
  </div>`;
}
// ── P16: 역할별 승인 버튼 HTML 생성 ────────────────────────────────────────────
function _boRenderApprovalBtns(safeId, doc) {
  const docType = doc.doc_type === "application" ? "application" : doc.doc_type === "result" ? "result" : "plan";
  if (typeof boIsOpManager === "function" && boIsOpManager() && doc.status === "in_review") {
    return `<div style="border-top:1px solid #F3F4F6;padding-top:10px;text-align:right;font-size:11px;color:#7C3AED;font-weight:700">🔄 1차 검토 완료 — 총괄담당자 최종 승인 대기</div>`;
  }
  
  // P14: org_business인 경우 총괄담당자에게는 최종 배정(시뮬레이션) 버튼 노출
  if (doc.submission_type === "org_business" && typeof boIsGlobalAdmin === "function" && boIsGlobalAdmin() && doc.status === "in_review") {
    return `<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;border-top:1px solid #F3F4F6;padding-top:12px">
      <button onclick="_boShowSubDocDetail('${safeId}')"
        style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:white;font-size:12px;font-weight:900;cursor:pointer">
        🧮 최종 예산 배정 (시뮬레이션)
      </button>
    </div>`;
  }

  const act = typeof boGetApproveAction === "function"
    ? boGetApproveAction(docType)
    : { label: "✅ 승인", newStatus: "approved", color: "#059669" };

  return `<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;border-top:1px solid #F3F4F6;padding-top:12px">
      <button onclick="_boShowSubDocDetail('${safeId}')"
        style="padding:7px 14px;border-radius:8px;border:1.5px solid #BFDBFE;background:#EFF6FF;font-size:11px;font-weight:800;color:#1D4ED8;cursor:pointer">
        📄 상세보기
      </button>
      <button onclick="boApproveSubDoc('${safeId}')"
        style="padding:8px 20px;border-radius:8px;border:none;background:${act.color};color:white;font-size:12px;font-weight:900;cursor:pointer">
        ${act.label}
      </button>
      <button onclick="boRejectSubDoc('${safeId}')"
        style="padding:8px 16px;border-radius:8px;border:1.5px solid #EF4444;color:#EF4444;background:white;font-size:12px;font-weight:700;cursor:pointer">
        ❌ 반려
      </button>
    </div>`;
}

// ── 승인 처리 ─────────────────────────────────────────────────────────────────
async function boApproveSubDoc(docId) {
  if (!confirm("이 상신 문서를 승인하시겠습니까?")) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  const doc = _boSubDocs.find(d => d.id === docId);
  if (!doc) return;

  try {
    const nodes = doc.approval_nodes || [];
    const curIdx = doc.current_node_order || 0;
    const nextIdx = curIdx + 1;
    // P16: 역할에 따라 최종 상태 결정
    // 총괄담당자: 노드 소진 시 approved / 운영담당자: 무조건 in_review(1차검토)
    const isLastNode = nextIdx >= nodes.length;
    const isGlobal = typeof boIsGlobalAdmin === "function" ? boIsGlobalAdmin() : true;
    const isFinal = isLastNode && isGlobal; // 총괄이 마지막 노드를 처리해야 최종 승인
    const newStatus = isFinal ? "approved" : "in_review";
    const now = new Date().toISOString();

    if (sb) {
      // 1) 상신 문서 상태 업데이트
      await sb.from("submission_documents").update({
        status: newStatus,
        current_node_order: nextIdx,
        ...(isFinal ? { approved_at: now } : {}),
        updated_at: now
      }).eq("id", docId);

      // 2) 결재 이력 기록
      const actorName = boCurrentPersona?.name || "BO담당자";
      const actorId = boCurrentPersona?.id || "system";
      await sb.from("approval_history").insert({
        submission_id: docId,
        node_order: curIdx,
        node_type: nodes[curIdx]?.type || "approval",
        node_label: nodes[curIdx]?.label || "결재",
        action: "approved",
        approver_id: actorId,
        approver_name: actorName,
        approver_role: nodes[curIdx]?.approverKey || "",
        comment: "",
        action_at: now
      });

      // 3) 최종 승인 시 — 포함 건들 approved 처리 + 예산 확정 차감
      if (isFinal) {
        const items = doc.submission_items || [];
        for (const it of items) {
          const table = it.item_type === "plan" ? "plans" : "applications";
          await sb.from(table).update({ status: "approved", updated_at: now }).eq("id", it.item_id);

          // submission_items.final_status → 'approved'
          await sb.from("submission_items").update({ final_status: "approved" }).eq("id", it.id);

          // 교육계획: allocated_amount 자동 배정 및 운영계획 복사
          if (it.item_type === "plan") {
            const { data: plan } = await sb.from("plans").select("*").eq("id", it.item_id).single();
            if (plan) {
              const finalAmt = (plan.allocated_amount && Number(plan.allocated_amount) > 0) ? plan.allocated_amount : plan.amount;
              await sb.from("plans").update({ allocated_amount: finalAmt, updated_at: now }).eq("id", it.item_id);
              
              // 운영계획으로 자동 복사 (Phase 4: forecast/business → operation)
              if (plan.plan_type === 'forecast' || plan.plan_type === 'business') {
                if (typeof _autoCreateOperationPlan === 'function') {
                  _autoCreateOperationPlan(sb, plan).catch(e =>
                    console.warn('[Phase4] 운영계획 자동복사 실패 (비치명적):', e.message)
                  );
                }
              }
            }
          }

          // 예산 Hold → 확정 차감 (frozen→used)
          if (it.item_amount && doc.account_code) {
            try {
              const { data: bk } = await sb.from("bankbooks")
                .select("id,current_balance,frozen_amount,used_amount")
                .eq("tenant_id", doc.tenant_id)
                .eq("account_code", doc.account_code)
                .eq("status", "active")
                .order("current_balance", { ascending: false })
                .limit(1).single();
              if (bk) {
                const amt = Number(it.item_amount);
                await sb.from("bankbooks").update({
                  frozen_amount: Math.max(0, Number(bk.frozen_amount || 0) - amt),
                  used_amount: Number(bk.used_amount || 0) + amt,
                  updated_at: now
                }).eq("id", bk.id);
              }
            } catch(bkErr) { console.warn("[boApproveSubDoc] 예산 처리 skip:", bkErr.message); }
          }
        }
      }
    }

    // 메모리 갱신
    if (doc) { doc.status = newStatus; doc.current_node_order = nextIdx; }
    if (isFinal) {
      alert("✅ 최종 승인 완료되었습니다.");
    } else if (!isGlobal) {
      alert(`📤 1차 검토 완료. 총괄담당자에게 전달됩니다.`);
    } else {
      alert(`✅ 승인되었습니다. 다음 결재자(${nodes[nextIdx]?.label || ""})에게 전달됩니다.`);
    }
  } catch(err) {
    alert("❌ 승인 처리 실패: " + err.message);
  }
  _boApprovalLoaded = false;
  renderMyOperations();
}

// ── 반려 처리 ─────────────────────────────────────────────────────────────────
async function boRejectSubDoc(docId) {
  const reason = prompt("반려 사유를 입력하세요 (필수):");
  if (!reason || !reason.trim()) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  const doc = _boSubDocs.find(d => d.id === docId);
  if (!doc) return;

  try {
    const now = new Date().toISOString();
    const nodes = doc.approval_nodes || [];
    const curIdx = doc.current_node_order || 0;

    if (sb) {
      // 1) 상신 문서 반려
      await sb.from("submission_documents").update({
        status: "rejected",
        reject_reason: reason.trim(),
        reject_node_label: nodes[curIdx]?.label || "결재자",
        rejected_at: now,
        updated_at: now
      }).eq("id", docId);

      // 2) 결재 이력
      await sb.from("approval_history").insert({
        submission_id: docId,
        node_order: curIdx,
        node_type: "approval",
        node_label: nodes[curIdx]?.label || "결재",
        action: "rejected",
        approver_id: boCurrentPersona?.id || "system",
        approver_name: boCurrentPersona?.name || "BO담당자",
        approver_role: nodes[curIdx]?.approverKey || "",
        comment: reason.trim(),
        action_at: now
      });

      // 3) 포함 건 → saved 복귀 + Hold 해제
      const items = doc.submission_items || [];
      for (const it of items) {
        const table = it.item_type === "plan" ? "plans" : "applications";
        await sb.from(table).update({ status: "saved", updated_at: now }).eq("id", it.item_id);
        // submission_items.final_status → 'rejected'
        await sb.from("submission_items").update({ final_status: "rejected" }).eq("id", it.id);
      }

      // 4) frozen_amount 해제
      if (doc.total_amount && doc.account_code) {
        try {
          const { data: bk } = await sb.from("bankbooks")
            .select("id,frozen_amount")
            .eq("tenant_id", doc.tenant_id)
            .eq("account_code", doc.account_code)
            .eq("status", "active").limit(1).single();
          if (bk) {
            await sb.from("bankbooks").update({
              frozen_amount: Math.max(0, Number(bk.frozen_amount||0) - Number(doc.total_amount)),
              updated_at: now
            }).eq("id", bk.id);
          }
        } catch(bkErr) { console.warn("[boRejectSubDoc] Hold해제 skip:", bkErr.message); }
      }
    }

    if (doc) doc.status = "rejected";
    alert("반려 처리되었습니다. 상신자가 수정 후 재상신할 수 있습니다.");
  } catch(err) {
    alert("❌ 반려 처리 실패: " + err.message);
  }
  _boApprovalLoaded = false;
  renderMyOperations();
}

// ── 상세 모달 ─────────────────────────────────────────────────────────────────
async function _boShowSubDocDetail(docId) {
  const doc = _boSubDocs.find(d => d.id === docId);
  if (!doc) return;
  const sb = typeof getSB === "function" ? getSB() : null;

  // 결재 이력 조회
  let history = [];
  if (sb) {
    const { data } = await sb.from("approval_history")
      .select("*").eq("submission_id", docId).order("action_at");
    history = data || [];
  }

  let itemsHtml = "";
  if (doc.submission_type === "org_business") {
    const childDocs = _boSubDocs.filter(d => d.parent_submission_id === doc.id);
    itemsHtml = childDocs.map(cd => {
      const childItems = cd.submission_items || [];
      const childRows = childItems.map(it => `
        <tr style="border-bottom:1px solid #F3F4F6;background:#fdfdfd">
          <td style="padding:6px 12px;font-size:11px;color:#6B7280;padding-left:24px">└ ${it.item_title||"제목없음"}</td>
          <td style="padding:6px 12px;font-size:11px;text-align:right;color:#6B7280">${Number(it.item_amount||0).toLocaleString()}원</td>
          <td style="padding:6px 12px;font-size:11px;text-align:center">-</td>
        </tr>
      `).join("");
      return `
        <tr style="background:#F9FAFB;border-top:1px solid #E5E7EB">
          <td style="padding:8px 12px;font-size:12px;font-weight:800;color:#111827">🏢 ${cd.submitter_org_name || '팀'} 묶음</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:800;text-align:right;color:#111827">${Number(cd.total_adjusted || cd.total_amount || 0).toLocaleString()}원</td>
          <td style="padding:8px 12px;font-size:12px;text-align:center"><span style="font-size:10px;padding:2px 6px;background:#E5E7EB;border-radius:4px">${childItems.length}건</span></td>
        </tr>
        ${childRows}
      `;
    }).join("");
  } else {
    const items = doc.submission_items || [];
    const isOpManager = typeof boIsOpManager === "function" && boIsOpManager();
    const canEditAmount = isOpManager && doc.submission_type === "team_business" && ["submitted", "in_review"].includes(doc.status);
    
    itemsHtml = items.map(it => {
      const amtHtml = canEditAmount 
        ? `<input type="text" value="${Number(it.item_amount||0).toLocaleString()}" 
            onblur="boAdjustForecastAmount('${doc.id}', '${it.id}', '${it.item_id}', '${it.item_amount||0}', this.value)"
            style="width:90px;text-align:right;padding:4px 8px;border:1px solid #D1D5DB;border-radius:4px;font-size:12px;background:#F9FAFB">원`
        : `${Number(it.item_amount||0).toLocaleString()}원`;

      return `
        <tr style="border-bottom:1px solid #F3F4F6">
          <td style="padding:8px 12px;font-size:12px;color:#374151">${it.item_title||"제목없음"}</td>
          <td style="padding:8px 12px;font-size:12px;text-align:right;color:#374151">${amtHtml}</td>
          <td style="padding:8px 12px;font-size:12px;text-align:center">
            <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
              background:${it.final_status==="approved"?"#D1FAE5":it.final_status==="rejected"?"#FEE2E2":"#EFF6FF"};
              color:${it.final_status==="approved"?"#065F46":it.final_status==="rejected"?"#991B1B":"#1D4ED8"}">
              ${it.final_status||"대기"}
            </span>
          </td>
        </tr>`;
    }).join("");
  }

  const ACTION_LABEL = { approved: "승인", rejected: "반려", in_review: "1차검토완료", recalled: "회수" };
  const histHtml = history.map(h => `
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;
        background:${h.action==="approved"?"#059669":h.action==="rejected"?"#EF4444":"#9CA3AF"}"></div>
      <div style="font-size:12px">
        <span style="font-weight:700;color:#374151">${h.node_label||""} ${h.approver_name||h.approver_name||"-"}</span>
        <span style="color:#9CA3AF;margin-left:6px">${ACTION_LABEL[h.action]||h.action}</span>
        ${h.comment ? `<div style="color:#6B7280;margin-top:2px">"${h.comment}"</div>` : ""}
        <div style="color:#D1D5DB;font-size:11px;margin-top:2px">${new Date(h.action_at||h.created_at).toLocaleString("ko-KR")}</div>
      </div>
    </div>`).join("");


  const modal = document.createElement("div");
  modal.id = "bo-subdoc-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:640px;max-height:80vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:900;color:#111827;margin:0">${doc.title||"상신 문서"}</h2>
          <p style="font-size:12px;color:#9CA3AF;margin:4px 0 0">${doc.submitter_name||""} · ${doc.submitter_org_name||""}</p>
        </div>
        <button onclick="document.getElementById('bo-subdoc-modal').remove()"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      ${doc.content ? `<div style="padding:12px 16px;background:#F9FAFB;border-radius:8px;font-size:13px;color:#374151;margin-bottom:16px">${doc.content}</div>` : ""}
      
      ${doc.submission_type === "org_business" && typeof boIsGlobalAdmin === "function" && boIsGlobalAdmin() && doc.status === "in_review"
        ? `<div style="margin-bottom:16px;text-align:right">
            <button onclick="boShowSimulationModal('${doc.id}')"
              style="padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.3)">
              🧮 최종 배정 시뮬레이션 시작
            </button>
          </div>`
        : ""
      }

      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase">첨부 건 목록</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
          <thead><tr style="background:#F9FAFB">
            <th style="padding:8px 12px;font-size:11px;text-align:left;color:#6B7280">건명</th>
            <th style="padding:8px 12px;font-size:11px;text-align:right;color:#6B7280">금액</th>
            <th style="padding:8px 12px;font-size:11px;text-align:center;color:#6B7280">상태</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr style="background:#F9FAFB">
            <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#374151">합계</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:900;text-align:right;color:#002C5F">${Number(doc.total_adjusted||doc.total_amount||0).toLocaleString()}원</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
      ${histHtml ? `<div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase">결재 이력</div>
        <div style="display:flex;flex-direction:column;gap:10px">${histHtml}</div>
      </div>` : ""}
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// ── 레거시 호환 ───────────────────────────────────────────────────────────────
// 기존 plans.js / apply.js 에서 호출하던 함수들 — 제거하지 않고 빈 wrapper 유지
async function myOpsApprove(id) { console.warn("[Deprecated] myOpsApprove — boApproveSubDoc 사용"); }
async function myOpsReject(id)  { console.warn("[Deprecated] myOpsReject — boRejectSubDoc 사용"); }
async function myOpsCancel(id)  { console.warn("[Deprecated] myOpsCancel — 상신 문서 단위로 처리"); }
// ── P13: 사업계획 묶음 상신(교육조직 묶음) 처리 로직 ──────────────────────────
function boToggleForecastBundle(docId, isChecked) {
  if (isChecked) {
    _boSelectedForecasts.add(docId);
  } else {
    _boSelectedForecasts.delete(docId);
  }
  renderMyOperations();
}

async function boOrgForecastModal() {
  if (_boSelectedForecasts.size === 0) return;
  const docs = Array.from(_boSelectedForecasts).map(id => _boSubDocs.find(d => d.id === id)).filter(Boolean);
  const totalAmount = docs.reduce((sum, d) => sum + Number(d.total_adjusted || d.total_amount || 0), 0);
  
  const html = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
      <div style="background:white;width:500px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;animation:boSlideUp 0.3s ease">
        <div style="padding:20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
          <h2 style="margin:0;font-size:16px;font-weight:900;color:#111827">📦 교육조직 묶음 상신</h2>
          <button onclick="document.getElementById('boOrgBundleModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF">×</button>
        </div>
        <div style="padding:24px">
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">선택한 팀 묶음</label>
            <div style="font-size:14px;color:#111827;font-weight:600">${docs.length}건</div>
          </div>
          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">총 예산액 (1차 조정액 반영)</label>
            <div style="font-size:20px;color:#002C5F;font-weight:900">${totalAmount.toLocaleString()}원</div>
          </div>
          <div style="margin-bottom:20px">
            <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">상신 제목 (자동생성)</label>
            <input type="text" id="boOrgBundleTitle" value="2026년 교육조직 사업계획 묶음 상신 (${docs.length}개 팀)"
              style="width:100%;padding:10px;border-radius:8px;border:1px solid #D1D5DB;font-size:14px">
          </div>
        </div>
        <div style="padding:16px 24px;background:#F9FAFB;border-top:1px solid #E5E7EB;display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('boOrgBundleModal').remove()" style="padding:10px 16px;border-radius:8px;border:1px solid #D1D5DB;background:white;color:#374151;font-weight:700;cursor:pointer">취소</button>
          <button onclick="boSubmitOrgForecast()" style="padding:10px 24px;border-radius:8px;border:none;background:#D97706;color:white;font-weight:900;cursor:pointer">
            상신하기
          </button>
        </div>
      </div>
    </div>
  `;
  const el = document.createElement("div");
  el.id = "boOrgBundleModal";
  el.innerHTML = html;
  document.body.appendChild(el);
}

async function boSubmitOrgForecast() {
  const title = document.getElementById("boOrgBundleTitle").value;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  
  const docs = Array.from(_boSelectedForecasts).map(id => _boSubDocs.find(d => d.id === id)).filter(Boolean);
  const totalAmount = docs.reduce((sum, d) => sum + Number(d.total_adjusted || d.total_amount || 0), 0);
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  
  try {
    const now = new Date().toISOString();
    
    // 1) org_business 생성
    const { data: newDoc, error: insertErr } = await sb.from("submission_documents").insert({
      tenant_id: tenantId,
      submission_type: "org_business",
      title: title,
      content: `운영담당자가 ${docs.length}개의 팀 묶음을 하나로 묶어 상신합니다.`,
      submitter_id: boCurrentPersona?.id || "sys",
      submitter_name: boCurrentPersona?.name || "운영담당자",
      submitter_org_id: boCurrentPersona?.dept || "교육조직",
      submitter_org_name: boCurrentPersona?.dept || "교육조직",
      total_amount: totalAmount,
      total_adjusted: totalAmount,
      status: "in_review",
      submitted_at: now
    }).select().single();
    
    if (insertErr) throw insertErr;
    
    // 2) 팀 묶음(team_business) 들의 parent_submission_id 업데이트 및 상태 in_review로 변경
    for (const d of docs) {
      await sb.from("submission_documents").update({
        parent_submission_id: newDoc.id,
        status: "in_review",
        updated_at: now
      }).eq("id", d.id);
    }
    
    alert(`✅ 교육조직 묶음이 성공적으로 생성되어 상신되었습니다. (${docs.length}건)`);
    document.getElementById("boOrgBundleModal").remove();
    _boSelectedForecasts.clear();
    _boApprovalLoaded = false;
    renderMyOperations();
  } catch(err) {
    alert("❌ 상신 실패: " + err.message);
  }
}

// 1차 조정 (인라인 수정)
async function boAdjustForecastAmount(docId, subItemId, planId, oldAmt, newAmtStr) {
  const newAmt = Number(newAmtStr.replace(/[^0-9]/g, ''));
  if (isNaN(newAmt)) return;
  if (newAmt === Number(oldAmt)) return; // 변경 없음
  
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  
  try {
    const now = new Date().toISOString();
    // 1. plans.allocated_amount 업데이트
    await sb.from("plans").update({ allocated_amount: newAmt, updated_at: now }).eq("id", planId);
    
    // 2. submission_items.item_amount 업데이트 (선택적)
    await sb.from("submission_items").update({ item_amount: newAmt }).eq("id", subItemId);
    
    // 3. budget_adjust_logs 기록
    await sb.from("budget_adjust_logs").insert({
      tenant_id: boCurrentPersona?.tenantId || "HMC",
      submission_id: docId,
      plan_id: planId,
      before_amount: oldAmt,
      after_amount: newAmt,
      adjusted_by: boCurrentPersona?.id || "system",
      adjusted_at: now,
      reason: "운영담당자 1차 예산 조정"
    });
    
    // 4. submission_documents 의 total_adjusted 재계산
    const { data: items } = await sb.from("submission_items").select("item_amount").eq("submission_id", docId);
    if (items) {
      const newTotal = items.reduce((sum, it) => sum + Number(it.item_amount||0), 0);
      await sb.from("submission_documents").update({ total_adjusted: newTotal }).eq("id", docId);
    }
    
    alert("✅ 1차 예산 조정이 완료되었습니다.");
    _boApprovalLoaded = false;
    // 상세보기 모달 다시 렌더링하도록 닫고 열기
    const modal = document.getElementById("boSubDocModal");
    if (modal) modal.remove();
    _boShowSubDocDetail(docId);
  } catch(err) {
    alert("❌ 조정 실패: " + err.message);
  }
}

let _boSimEdits = {};
let _boSimEnvelope = 0;

window.boShowSimulationModal = function(docId) {
  const doc = _boSubDocs.find(d => d.id === docId);
  if (!doc) return;
  
  _boSimEdits = {};
  _boSimEnvelope = Number(doc.total_adjusted || doc.total_amount || 0);

  const childDocs = _boSubDocs.filter(d => d.parent_submission_id === doc.id);
  const allItems = [];
  childDocs.forEach(cd => {
    if (cd.submission_items) {
      cd.submission_items.forEach(it => {
        allItems.push({ ...it, team_name: cd.submitter_org_name, account_code: cd.account_code || doc.account_code });
      });
    }
  });

  const renderModal = () => {
    let allocTotal = 0;
    const itemsHtml = allItems.map(it => {
      const amt = Number(it.item_amount||0);
      const editVal = _boSimEdits.hasOwnProperty(it.item_id) ? _boSimEdits[it.item_id] : amt;
      allocTotal += editVal;
      const isEdited = _boSimEdits.hasOwnProperty(it.item_id);
      
      return `
        <tr style="border-bottom:1px solid #E5E7EB;background:${isEdited ? '#FFFBEB' : '#FFFFFF'}">
          <td style="padding:10px 12px;font-size:12px;color:#6B7280">${it.team_name||'-'}</td>
          <td style="padding:10px 12px;font-size:12px;color:#111827;font-weight:700">${it.item_title}</td>
          <td style="padding:10px 12px;font-size:12px;text-align:right;color:#6B7280">${amt.toLocaleString()}원</td>
          <td style="padding:10px 12px;text-align:right">
            <input type="text" value="${editVal.toLocaleString()}" 
              onblur="boUpdateSimEdit('${it.item_id}', this.value)"
              style="width:100px;text-align:right;padding:6px;border:1px solid ${isEdited ? '#D97706' : '#D1D5DB'};border-radius:6px;font-size:12px;font-weight:700;color:#111827">원
          </td>
        </tr>
      `;
    }).join('');

    const remaining = _boSimEnvelope - allocTotal;
    const remColor = remaining < 0 ? '#DC2626' : remaining > 0 ? '#059669' : '#111827';

    return `
      <div id="bo-sim-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center">
        <div style="background:white;border-radius:16px;width:800px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden;animation:boSlideUp 0.3s ease">
          <div style="padding:24px 28px;background:linear-gradient(135deg,#1E1B4B,#4338CA);color:white;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;color:#A5B4FC;margin-bottom:4px;font-weight:700">최종 예산 배정 시뮬레이션</div>
              <h2 style="margin:0;font-size:20px;font-weight:900">${doc.title}</h2>
            </div>
            <button onclick="document.getElementById('bo-sim-modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#A5B4FC">×</button>
          </div>
          
          <div style="padding:24px 28px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;gap:20px;align-items:flex-end">
            <div style="flex:1">
              <label style="display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:8px">Envelope (최종 가용 예산 총액)</label>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="text" id="boSimEnvInput" value="${_boSimEnvelope.toLocaleString()}"
                  onblur="boUpdateSimEnv(this.value, '${docId}')"
                  style="width:200px;padding:10px 14px;border-radius:8px;border:2px solid #CBD5E1;font-size:18px;font-weight:900;color:#0F172A;text-align:right">
                <span style="font-size:16px;font-weight:800;color:#475569">원</span>
              </div>
            </div>
            <div style="flex:1;background:white;padding:12px 20px;border-radius:12px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,.02)">
              <div style="font-size:11px;font-weight:800;color:#64748B;margin-bottom:4px">현재 배정 합계</div>
              <div style="font-size:16px;font-weight:900;color:#0F172A">${allocTotal.toLocaleString()}원</div>
            </div>
            <div style="flex:1;background:${remaining < 0 ? '#FEF2F2' : remaining > 0 ? '#ECFDF5' : '#F1F5F9'};padding:12px 20px;border-radius:12px;border:1px solid ${remaining < 0 ? '#FECACA' : remaining > 0 ? '#A7F3D0' : '#E2E8F0'}">
              <div style="font-size:11px;font-weight:800;color:${remaining < 0 ? '#991B1B' : remaining > 0 ? '#065F46' : '#475569'};margin-bottom:4px">잔여 재원 (차액)</div>
              <div style="font-size:16px;font-weight:900;color:${remColor}">${remaining > 0 ? '+' : ''}${remaining.toLocaleString()}원</div>
            </div>
          </div>

          <div style="flex:1;overflow-y:auto;padding:20px 28px">
            <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden">
              <thead style="position:sticky;top:0;background:#F1F5F9;z-index:1">
                <tr>
                  <th style="padding:10px 12px;font-size:11px;text-align:left;color:#475569;font-weight:800;border-bottom:2px solid #E2E8F0">소속팀</th>
                  <th style="padding:10px 12px;font-size:11px;text-align:left;color:#475569;font-weight:800;border-bottom:2px solid #E2E8F0">계획명 (건명)</th>
                  <th style="padding:10px 12px;font-size:11px;text-align:right;color:#475569;font-weight:800;border-bottom:2px solid #E2E8F0">1차 조정액 (요청)</th>
                  <th style="padding:10px 12px;font-size:11px;text-align:right;color:#475569;font-weight:800;border-bottom:2px solid #E2E8F0">최종 배정액 수정</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>

          <div style="padding:20px 28px;background:white;border-top:1px solid #E2E8F0;display:flex;justify-content:flex-end;gap:12px">
            <button onclick="document.getElementById('bo-sim-modal-overlay').remove()" style="padding:10px 20px;border-radius:8px;border:1px solid #CBD5E1;background:white;color:#475569;font-weight:800;cursor:pointer">취소</button>
            <button onclick="boApproveOrgForecast('${docId}')" style="padding:10px 28px;border-radius:8px;border:none;background:linear-gradient(135deg,#059669,#10B981);color:white;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,.3)">
              ✅ 최종 승인 및 확정
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.boUpdateSimEdit = function(planId, valStr) {
    const val = Number(valStr.replace(/[^0-9]/g, ''));
    if (!isNaN(val)) _boSimEdits[planId] = val;
    const existing = document.getElementById('bo-sim-modal-overlay');
    if (existing) existing.outerHTML = renderModal();
  };

  window.boUpdateSimEnv = function(valStr, did) {
    const val = Number(valStr.replace(/[^0-9]/g, ''));
    if (!isNaN(val)) _boSimEnvelope = val;
    const existing = document.getElementById('bo-sim-modal-overlay');
    if (existing) existing.outerHTML = renderModal();
    const input = document.getElementById('boSimEnvInput');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderModal();
  document.body.appendChild(wrapper.firstElementChild);
};

window.boApproveOrgForecast = async function(docId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  const doc = _boSubDocs.find(d => d.id === docId);
  if (!doc) return;

  if (!confirm("모든 하위 문서와 계획이 '최종 확정' 처리됩니다. 진행하시겠습니까?")) return;

  const now = new Date().toISOString();
  try {
    document.getElementById('bo-sim-modal-overlay').remove();
    
    // 1) Update child items & plans based on _boSimEdits
    const childDocs = _boSubDocs.filter(d => d.parent_submission_id === doc.id);
    for (const cd of childDocs) {
      if (cd.submission_items) {
        for (const it of cd.submission_items) {
          const finalAmt = _boSimEdits.hasOwnProperty(it.item_id) ? _boSimEdits[it.item_id] : Number(it.item_amount||0);
          
          await sb.from("plans").update({ allocated_amount: finalAmt, status: "approved", updated_at: now }).eq("id", it.item_id);
          
          // 사업계획 원본 조회 및 운영계획으로 복사
          const { data: origPlan } = await sb.from("plans").select("*").eq("id", it.item_id).single();
          if (origPlan && origPlan.plan_type === "business") {
            const newPlan = { ...origPlan };
            delete newPlan.id;
            newPlan.plan_type = "operation";
            newPlan.parent_id = origPlan.id;
            newPlan.allocated_amount = finalAmt;
            newPlan.status = "approved";
            newPlan.created_at = now;
            newPlan.updated_at = now;
            try {
              await sb.from("plans").insert(newPlan);
            } catch (copyErr) { console.error("운영계획 복사 실패:", copyErr); }
          }

          await sb.from("submission_items").update({ final_status: "approved" }).eq("id", it.id);
          
          await sb.from("budget_adjust_logs").insert({
            tenant_id: boCurrentPersona?.tenantId || "HMC",
            submission_id: doc.id,
            plan_id: it.item_id,
            before_amount: Number(it.item_amount||0),
            after_amount: finalAmt,
            adjusted_by: boCurrentPersona?.id || "system",
            adjusted_at: now,
            reason: "총괄담당자 최종 배정 및 확정"
          });

          // 예산 Hold → 확정 차감 (frozen→used)
          const acctCode = cd.account_code || doc.account_code;
          if (acctCode) {
            try {
              const { data: bk } = await sb.from("bankbooks")
                .select("id,current_balance,frozen_amount,used_amount")
                .eq("tenant_id", doc.tenant_id)
                .eq("account_code", acctCode)
                .eq("status", "active")
                .order("current_balance", { ascending: false })
                .limit(1).single();
              if (bk) {
                // 원요청액(item_amount)만큼 가점유 차감, 최종 배정액(finalAmt)만큼 사용액 증가
                await sb.from("bankbooks").update({
                  frozen_amount: Math.max(0, Number(bk.frozen_amount || 0) - Number(it.item_amount||0)),
                  used_amount: Number(bk.used_amount || 0) + finalAmt,
                  updated_at: now
                }).eq("id", bk.id);
              }
            } catch(bkErr) { console.warn("예산 처리 skip:", bkErr.message); }
          }
        }
      }
      await sb.from("submission_documents").update({ status: "approved", updated_at: now }).eq("id", cd.id);
    }

    await sb.from("submission_documents").update({ status: "approved", updated_at: now }).eq("id", doc.id);
    
    await sb.from("approval_history").insert({
      submission_id: doc.id,
      node_order: 0,
      node_type: "approval",
      node_label: "총괄담당자",
      action: "approved",
      approver_id: boCurrentPersona?.id || "system",
      approver_name: boCurrentPersona?.name || "BO총괄",
      approver_role: "global_admin",
      comment: `최종 배정 완료 (총 Envelope: ${_boSimEnvelope.toLocaleString()}원)`,
      action_at: now
    });

    alert("✅ 최종 배정 및 승인이 완료되었습니다.");
    const detailModal = document.getElementById('bo-subdoc-modal');
    if (detailModal) detailModal.remove();
    
    _boApprovalLoaded = false;
    renderMyOperations();
  } catch (err) {
    alert("❌ 최종 확정 중 오류가 발생했습니다: " + err.message);
  }
};

// ─── [P13-B] 취합 대시보드 ────────────────────────────────────────────────────
// PRD: bo_budget_consolidation.md §F-010~F-013
// 계정별/팀별 사업계획 집계 + bankbooks 잔액 현황 표시
async function boRenderConsolidationDashboard(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <h1 class="bo-page-title" style="margin:0">📊 예산 취합 현황</h1>
        ${typeof boRoleModeBadge==="function" ? boRoleModeBadge() : ""}
      </div>
      <p class="bo-page-sub">계정별 신청액·배정액 집계 및 팀별 사업계획 상신 현황</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:40px;color:#9CA3AF;justify-content:center">
      <div style="font-size:32px">⏳</div>
      <div style="font-size:13px;font-weight:700">취합 현황 집계 중...</div>
    </div>`;

  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  if (!sb) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#9CA3AF">DB 연결 필요</div>'; return; }

  try {
    // 1) bankbooks 조회 (계정별 예산 현황)
    const { data: books } = await sb.from("bankbooks")
      .select("id, account_code, org_name, initial_amount, current_balance, used_amount, frozen_amount, status")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("account_code");

    // 2) 사업계획 문서 집계 (team_business + org_business)
    const { data: forecasts } = await sb.from("submission_documents")
      .select("id, title, status, submission_type, submitter_org_name, account_code, total_amount, total_adjusted, submitted_at, parent_submission_id")
      .eq("tenant_id", tenantId)
      .in("submission_type", ["team_business", "org_business"])
      .order("submitted_at", { ascending: false });

    const teamForecasts = (forecasts || []).filter(d => d.submission_type === "team_business");
    const orgForecasts  = (forecasts || []).filter(d => d.submission_type === "org_business");

    // KPI 집계
    const kpiTotalRequested = teamForecasts.reduce((s, d) => s + Number(d.total_amount || 0), 0);
    const kpiTotalAdjusted  = teamForecasts.reduce((s, d) => s + Number(d.total_adjusted || d.total_amount || 0), 0);
    const kpiApproved       = teamForecasts.filter(d => d.status === "approved").length;
    const kpiPending        = teamForecasts.filter(d => ["submitted","in_review"].includes(d.status)).length;
    const kpiRejected       = teamForecasts.filter(d => d.status === "rejected").length;

    // 계정별 집계
    const accountMap = {};
    teamForecasts.forEach(d => {
      const code = d.account_code || "(계정없음)";
      if (!accountMap[code]) accountMap[code] = { code, requested: 0, adjusted: 0, approved: 0, pending: 0, rejected: 0, total: 0 };
      accountMap[code].requested += Number(d.total_amount || 0);
      accountMap[code].adjusted  += Number(d.total_adjusted || d.total_amount || 0);
      accountMap[code].total++;
      if (d.status === "approved") accountMap[code].approved++;
      else if (["submitted","in_review"].includes(d.status)) accountMap[code].pending++;
      else if (d.status === "rejected") accountMap[code].rejected++;
    });

    // 계정별 bankbook 매핑
    const bkMap = {};
    (books || []).forEach(b => { bkMap[b.account_code] = b; });

    // 상태 배지
    const ST = {
      submitted: { label: "결재대기", bg: "#DBEAFE", c: "#1E40AF" },
      in_review: { label: "1차검토중", bg: "#FEF3C7", c: "#92400E" },
      approved:  { label: "승인완료",  bg: "#D1FAE5", c: "#065F46" },
      rejected:  { label: "반려됨",    bg: "#FEE2E2", c: "#991B1B" },
      recalled:  { label: "회수됨",    bg: "#F3F4F6", c: "#6B7280" },
    };

    // ── KPI 카드 ──────────────────────────────────────────────────────────
    const kpiHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px">
        ${[[
          { label:"총 신청액",   value: kpiTotalRequested.toLocaleString()+"원", color:"#1D4ED8",  bg:"#EFF6FF" },
          { label:"1차 조정액",  value: kpiTotalAdjusted.toLocaleString()+"원",  color:"#D97706",  bg:"#FFFBEB" },
          { label:"✅ 승인 건수", value: kpiApproved+"건",                        color:"#059669",  bg:"#ECFDF5" },
          { label:"🔄 대기 건수", value: kpiPending+"건",                         color:"#7C3AED",  bg:"#F5F3FF" },
          { label:"❌ 반려 건수", value: kpiRejected+"건",                         color:"#DC2626",  bg:"#FEF2F2" },
        ]].flat().map(k => `
          <div style="background:${k.bg};border-radius:12px;padding:14px 18px">
            <div style="font-size:10px;font-weight:700;color:#6B7280;margin-bottom:6px">${k.label}</div>
            <div style="font-size:20px;font-weight:900;color:${k.color}">${k.value}</div>
          </div>`).join("")}
      </div>`;

    // ── 계정별 집계 테이블 ────────────────────────────────────────────────
    const accountRows = Object.values(accountMap).map(ac => {
      const bk = bkMap[ac.code];
      const initial   = bk ? Number(bk.initial_amount || 0) : 0;
      const balance   = bk ? Number(bk.current_balance || 0) : 0;
      const usedAmt   = bk ? Number(bk.used_amount || 0) : 0;
      const usePct    = initial > 0 ? Math.min(100, Math.round(usedAmt / initial * 100)) : 0;
      const barColor  = usePct >= 90 ? "#EF4444" : usePct >= 70 ? "#D97706" : "#059669";
      return `
        <tr style="border-bottom:1px solid #F3F4F6">
          <td style="padding:12px 14px;font-weight:900;color:#111827;font-size:13px">${ac.code}</td>
          <td style="padding:12px 14px;font-size:12px;color:#374151;text-align:right">${ac.requested.toLocaleString()}원</td>
          <td style="padding:12px 14px;font-size:12px;font-weight:700;color:#D97706;text-align:right">${ac.adjusted.toLocaleString()}원</td>
          <td style="padding:12px 14px;font-size:12px;color:#374151;text-align:center">
            ${initial > 0 ? `
              <div style="font-size:11px;color:#6B7280;margin-bottom:3px">${usePct}% 사용</div>
              <div style="height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${usePct}%;background:${barColor};border-radius:3px"></div>
              </div>` : '<span style="color:#9CA3AF;font-size:11px">통장 없음</span>'}
          </td>
          <td style="padding:12px 14px;font-size:12px;text-align:center">
            <span style="color:#059669;font-weight:700">${ac.approved}승인</span> /
            <span style="color:#7C3AED">${ac.pending}대기</span> /
            <span style="color:#DC2626">${ac.rejected}반려</span>
          </td>
          <td style="padding:12px 14px;font-size:12px;color:#374151;text-align:right">${balance.toLocaleString()}원</td>
        </tr>`;
    }).join("");

    const accountTableHtml = `
      <div class="bo-card" style="margin-bottom:20px;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1.5px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:14px;font-weight:900;color:#374151">📋 계정별 집계</h3>
          <span style="font-size:11px;color:#9CA3AF">${Object.keys(accountMap).length}개 계정</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#F9FAFB">
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">계정코드</th>
                <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">신청액</th>
                <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">1차 조정액</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">예산 소진율</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">건수</th>
                <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">잔액</th>
              </tr>
            </thead>
            <tbody>${accountRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#9CA3AF">사업계획 데이터 없음</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    // ── 팀별 사업계획 현황 테이블 ─────────────────────────────────────────
    const teamRows = teamForecasts.map(d => {
      const st = ST[d.status] || { label: d.status, bg:"#F3F4F6", c:"#6B7280" };
      const reqAmt  = Number(d.total_amount || 0);
      const adjAmt  = Number(d.total_adjusted || reqAmt);
      const diff    = adjAmt - reqAmt;
      const diffStr = diff === 0 ? '' : `<span style="font-size:10px;color:${diff>0?'#059669':'#DC2626'};margin-left:4px">${diff>0?'+':''}${diff.toLocaleString()}원</span>`;
      const hasParent = !!d.parent_submission_id;
      const subDate = d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('ko-KR') : '-';
      return `
        <tr style="border-bottom:1px solid #F3F4F6">
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#374151">${d.submitter_org_name || '-'}</td>
          <td style="padding:10px 14px;font-size:11px;color:#9CA3AF">${d.account_code || '-'}</td>
          <td style="padding:10px 14px;font-size:12px;text-align:right;color:#374151">${reqAmt.toLocaleString()}원</td>
          <td style="padding:10px 14px;font-size:12px;text-align:right;font-weight:700;color:#D97706">${adjAmt.toLocaleString()}원${diffStr}</td>
          <td style="padding:10px 14px;text-align:center">
            <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:${st.bg};color:${st.c}">${st.label}</span>
            ${hasParent ? '<span style="font-size:9px;color:#7C3AED;margin-left:4px">📦묶음</span>' : ''}
          </td>
          <td style="padding:10px 14px;font-size:11px;color:#9CA3AF;text-align:center">${subDate}</td>
        </tr>`;
    }).join("");

    const teamTableHtml = `
      <div class="bo-card" style="overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1.5px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:14px;font-weight:900;color:#374151">🏢 팀별 사업계획 상신 현황</h3>
          <span style="font-size:11px;color:#9CA3AF">${teamForecasts.length}팀</span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#F9FAFB">
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">팀명</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">계정</th>
                <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">신청액</th>
                <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">1차 조정액</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">상태</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">상신일</th>
              </tr>
            </thead>
            <tbody>${teamRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#9CA3AF">사업계획 상신 데이터 없음</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    // org_business 묶음 현황
    const orgRows = orgForecasts.map(d => {
      const st = ST[d.status] || { label: d.status, bg:"#F3F4F6", c:"#6B7280" };
      return `
        <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:12px;font-weight:900;color:#92400E">📦 ${d.title || '교육조직 묶음'}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('ko-KR') : ''} 상신</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:900;color:#92400E">${Number(d.total_adjusted||d.total_amount||0).toLocaleString()}원</div>
            <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:${st.bg};color:${st.c}">${st.label}</span>
          </div>
        </div>`;
    }).join("");

    const orgSection = orgForecasts.length > 0 ? `
      <div class="bo-card" style="padding:20px;margin-bottom:20px">
        <h3 style="margin:0 0 12px;font-size:14px;font-weight:900;color:#374151">📦 교육조직 묶음 상신 현황</h3>
        <div style="display:flex;flex-direction:column;gap:8px">${orgRows}</div>
      </div>` : "";

    container.innerHTML = `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <h1 class="bo-page-title" style="margin:0">📊 예산 취합 현황</h1>
          ${typeof boRoleModeBadge==="function" ? boRoleModeBadge() : ""}
        </div>
        <p class="bo-page-sub">계정별 신청액·배정액 집계 및 팀별 수요예측 상신 현황</p>
      </div>
      <button onclick="boRenderConsolidationDashboard(document.getElementById('bo-consolidation-container'))" style="margin-bottom:16px;padding:6px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">🔄 새로고침</button>
      ${kpiHtml}
      ${orgSection}
      ${accountTableHtml}
      ${teamTableHtml}`;

  } catch(err) {
    console.error("[boRenderConsolidationDashboard]", err);
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444">집계 로드 실패: ${err.message}</div>`;
  }
}
window.boRenderConsolidationDashboard = boRenderConsolidationDashboard;
