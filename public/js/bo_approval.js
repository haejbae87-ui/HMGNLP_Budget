// ─── 📥 BO 결재 화면 — 상신 문서(submission_documents) 기반 전환 (S-8) ─────
// PRD: fo_submission_approval.md §10.1, §12 S-8
// 기존: 정책(SERVICE_POLICIES) 기반 개별 건 필터링
// 변경: submission_documents.approval_nodes[current_node_order] 기반 문서 단위 결재

let _boApprovalTab       = "pending";   // pending | done
let _boApprovalDocFilter = "all";       // all | plan | application | result
let _boApprovalLoaded    = false;
let _boSubDocs           = [];          // 내가 처리해야 할 상신 문서 목록

// ── 데이터 로드 ──────────────────────────────────────────────────────────────
async function _loadBoApprovalData() {
  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  if (!sb) { _boSubDocs = []; return; }
  try {
    // 1) 내가 현재 결재자인 상신 문서: approval_nodes[current_node_order].approverKey 매칭
    const personaKey = Object.keys(BO_PERSONAS || {}).find(k => BO_PERSONAS[k] === boCurrentPersona) || "";
    const { data: docs, error } = await sb
      .from("submission_documents")
      .select("*, submission_items(*)")
      .eq("tenant_id", tenantId)
      .in("status", ["submitted", "in_review", "approved", "rejected", "recalled"])
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    // 2) 내가 처리할 문서만 필터 (approval_nodes 기반)
    _boSubDocs = (docs || []).filter(doc => {
      const nodes = doc.approval_nodes || [];
      if (!nodes.length) return false;
      const cur = nodes[doc.current_node_order || 0];
      if (!cur) return false;
      return cur.approverKey === personaKey || cur.actorKey === personaKey;
    });
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

    // P12: 문서 타입 필터 적용
    const _filterByType = (arr) => _boApprovalDocFilter === "all" ? arr
      : arr.filter(d => d.doc_type === _boApprovalDocFilter);
    const currentDocs = _filterByType(_boApprovalTab === "pending" ? pendingDocs : doneDocs);

    // P12: 문서 타입 필터 탭 (전체/교육계획/신청/결과)
    const docTypeTabs = [
      { id:"all",         label:"전체",       color:"#374151" },
      { id:"plan",        label:"교육계획",    color:"#1D4ED8" },
      { id:"application", label:"교육신청",    color:"#7C3AED" },
      { id:"result",      label:"결과보고",    color:"#059669" },
      { id:"cancel",      label:"⚠️ 취소요청", color:"#DC2626" },
    ];
    const docFilterCounts = { all: _boSubDocs.length };
    ["plan","application","result","cancel"].forEach(t => {
      docFilterCounts[t] = _boSubDocs.filter(d => d.doc_type === t).length;
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
      { id:"pending", label:"📥 승인 대기", count: pendingDocs.length, color:"#1D4ED8" },
      { id:"done",    label:"✅ 처리 완료",  count: doneDocs.length,   color:"#059669" }
    ].map(t => {
      const active = _boApprovalTab === t.id;
      return `<div onclick="_boApprovalTab='${t.id}';renderMyOperations()"
        style="padding:10px 18px;border-radius:10px;border:1.5px solid ${active?t.color:"#E5E7EB"};
        background:${active?t.color:"white"};color:${active?"white":"#6B7280"};
        font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
        ${t.label}
        <span style="background:${active?"rgba(255,255,255,.25)":"#F3F4F6"};color:${active?"white":"#374151"};
          padding:2px 8px;border-radius:99px;font-size:11px;font-weight:900">${t.count}</span>
      </div>`;
    }).join("");

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

  return `<div class="bo-card" style="padding:20px;${!isPending?"opacity:0.75":""}">
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
  </div>`;
}
// ── P16: 역할별 승인 버튼 HTML 생성 ────────────────────────────────────────────
function _boRenderApprovalBtns(safeId, doc) {
  // P16 헬퍼 사용 가능 시 역할 분기
  const docType = doc.doc_type === "application" ? "application" : doc.doc_type === "result" ? "result" : "plan";
  // 운영담당자 + 이미 in_review인 건 → 총괄 처리 대기 표시
  if (typeof boIsOpManager === "function" && boIsOpManager() && doc.status === "in_review") {
    return `<div style="border-top:1px solid #F3F4F6;padding-top:10px;text-align:right;font-size:11px;color:#7C3AED;font-weight:700">🔄 1차 검토 완료 — 총괄담당자 최종 승인 대기</div>`;
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
        actor_id: actorId,
        actor_name: actorName,
        comment: "",
        acted_at: now
      });

      // 3) 최종 승인 시 — 포함 건들 approved 처리 + 예산 확정 차감
      if (isFinal) {
        const items = doc.submission_items || [];
        for (const it of items) {
          const table = it.item_type === "plan" ? "plans" : "applications";
          await sb.from(table).update({ status: "approved", updated_at: now }).eq("id", it.item_id);

          // 교육계획: allocated_amount 자동 배정
          if (it.item_type === "plan") {
            const { data: plan } = await sb.from("plans").select("amount,allocated_amount").eq("id", it.item_id).single();
            if (plan && (!plan.allocated_amount || Number(plan.allocated_amount) === 0)) {
              await sb.from("plans").update({ allocated_amount: plan.amount, updated_at: now }).eq("id", it.item_id);
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
        actor_id: boCurrentPersona?.id || "system",
        actor_name: boCurrentPersona?.name || "BO담당자",
        comment: reason.trim(),
        acted_at: now
      });

      // 3) 포함 건 → saved 복귀 + Hold 해제
      const items = doc.submission_items || [];
      for (const it of items) {
        const table = it.item_type === "plan" ? "plans" : "applications";
        await sb.from(table).update({ status: "saved", updated_at: now }).eq("id", it.item_id);
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
      .select("*").eq("submission_id", docId).order("acted_at");
    history = data || [];
  }

  const items = doc.submission_items || [];
  const itemsHtml = items.map(it => `
    <tr style="border-bottom:1px solid #F3F4F6">
      <td style="padding:8px 12px;font-size:12px;color:#374151">${it.item_title||"제목없음"}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#374151">${Number(it.item_amount||0).toLocaleString()}원</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center">
        <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
          background:${it.final_status==="approved"?"#D1FAE5":it.final_status==="rejected"?"#FEE2E2":"#EFF6FF"};
          color:${it.final_status==="approved"?"#065F46":it.final_status==="rejected"?"#991B1B":"#1D4ED8"}">
          ${it.final_status||"대기"}
        </span>
      </td>
    </tr>`).join("");

  const histHtml = history.map(h => `
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;
        background:${h.action==="approved"?"#059669":h.action==="rejected"?"#EF4444":"#9CA3AF"}"></div>
      <div style="font-size:12px">
        <span style="font-weight:700;color:#374151">${h.node_label||""} ${h.actor_name||""}</span>
        <span style="color:#9CA3AF;margin-left:6px">${h.action}</span>
        ${h.comment ? `<div style="color:#6B7280;margin-top:2px">"${h.comment}"</div>` : ""}
        <div style="color:#D1D5DB;font-size:11px;margin-top:2px">${new Date(h.acted_at).toLocaleString("ko-KR")}</div>
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
            <td style="padding:8px 12px;font-size:13px;font-weight:900;text-align:right;color:#002C5F">${Number(doc.total_amount||0).toLocaleString()}원</td>
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