// ?€?€?€ FO ê²°ì¬ ?˜ì´ì§€ (DB ?°ë™) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ?€?ìš© ê²°ì¬??/ ë¦¬ë”??ê²°ì¬??

// ë¦¬ë” ??•  ?ë³„ (pos ê¸°ë°˜)
function _isLeaderPersona() {
  const leaderTitles = ["?€??, "?¤ì¥", "?¼í„°??, "ë³¸ë???, "?¬ì—…ë¶€??];
  return leaderTitles.some((t) => (currentPersona.pos || "").includes(t));
}

// ?€?€?€ ?œê? ?¼ë²¨ ë³€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const _APR_PURPOSE_KR = {
  external_personal: "ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ",
  elearning_class: "?´ëŸ¬??ì§‘í•©(ë¹„ë?ë©? ?´ì˜",
  conf_seminar: "?Œí¬???¸ë???ì½˜í¼?°ìŠ¤ ???´ì˜",
  misc_ops: "ê¸°í? ?´ì˜",
};
const _APR_EDU_TYPE_KR = {
  regular: "?•ê·œêµìœ¡",
  elearning: "?´ëŸ¬??,
  class: "ì§‘í•©",
  live: "?¼ì´ë¸?,
  academic: "?™ìˆ  ë°??°êµ¬?œë™",
  conf: "?™íšŒ/ì»¨í¼?°ìŠ¤",
  seminar: "?¸ë???,
  knowledge: "ì§€?ì???™ìŠµ",
  book: "?„ì„œêµ¬ì…",
  online: "?¨ë¼?¸ì½˜?ì¸ ",
  competency: "??Ÿ‰ê°œë°œì§€??,
  lang: "?´í•™?™ìŠµë¹?ì§€??,
  cert: "?ê²©ì¦?ì·¨ë“ì§€??,
};
function _aprPurpose(k) {
  return _APR_PURPOSE_KR[k] || k || "-";
}
function _aprEduType(k) {
  return _APR_EDU_TYPE_KR[k] || k || "-";
}

// ?€?€?€ ?íƒœ ë§¤í•‘ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _aprStatusLabel(s) {
  const m = {
    draft: "?‘ì„±ì¤?,
    saved: "?€?¥ì™„ë£?,           // fo_submission_approval.md S-2
    pending: "ê²°ì¬?€ê¸?,
    pending_approval: "ê²°ì¬?€ê¸?,
    submitted: "ê²°ì¬?€ê¸?,       // fo_submission_approval.md S-2 (pending ?€ì²?
    in_review: "ê²°ì¬ì§„í–‰ì¤?,     // fo_submission_approval.md S-2
    recalled: "?Œìˆ˜??,          // fo_submission_approval.md S-6
    approved: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
    completed: "?„ë£Œ",
    result_pending: "BO ê²€??ì¤?,  // ?•ì‚° ê²€???€ê¸?
  };
  return m[s] || s || "ê²°ì¬?€ê¸?;
}

// ?€?€?€ DB ìºì‹œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
let _aprMemberLoaded = false;
let _aprMemberData = []; // plans + applications (?´ê? ? ì²­??ê²?
let _aprLeaderLoaded = false;
let _aprLeaderData = []; // plans + applications (ê²°ì¬?€ê¸? ?¨ì´ ? ì²­??ê²? ???ˆê±°??
let _aprSubDocData = []; // submission_documents (S-5: ?ì‹  ë¬¸ì„œ ê¸°ë°˜ ì¯¸ì‚¬)
let _aprSavedData = [];  // [A-1] saved ?íƒœ ??ª© (?ì‹  ?€ê¸????€?¥ì™„ë£??¹ì…˜ ?œì‹œ??
let _aprSelectedItems = new Map(); // [A-1] ?¤ê±´ ?ì‹  ? íƒ ??ª©

// ?€?€?€ ?€?ìš© ê²°ì¬???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ?´ê? ? ì²­??êµìœ¡??ê²°ì¬ ?íƒœ ?•ì¸ (DB ?¤ì‹œê°?

async function renderApprovalMember() {
  const el = document.getElementById("page-approval-member");
  const sb = typeof getSB === "function" ? getSB() : null;

  // DB ì¡°íšŒ (ìµœì´ˆ 1??
  if (sb && !_aprMemberLoaded) {
    _aprMemberLoaded = true;
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;

      // plans ì¡°íšŒ (draft ?œì™¸ ??ê²°ì¬?¨ì—???ì‹ ??ê²ƒë§Œ)
      const { data: plans, error: pe } = await sb
        .from("plans")
        .select("*")
        .eq("applicant_id", pid)
        .eq("tenant_id", tid)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      if (pe) throw pe;

      // applications ì¡°íšŒ
      const { data: apps, error: ae } = await sb
        .from("applications")
        .select("*")
        .eq("applicant_id", pid)
        .eq("tenant_id", tid)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      if (ae) throw ae;

      // [S-7] ????ª©???¬í•¨??submission_documents + ê²°ì¬ ?´ë ¥ ì¡°íšŒ
      let mySubDocMap = {};   // item_id ??submission_document
      let myHistoryMap = {};  // submission_id ??approval_history[]
      try {
        const allItemIds = [
          ...(plans || []).map(p => String(p.id)),
          ...(apps  || []).map(a => String(a.id)),
        ];
        if (allItemIds.length > 0) {
          // submission_items ?ì„œ ????ª©ê³??°ê²°??submission_id ì°¾ê¸°
          const { data: myItems } = await sb.from("submission_items")
            .select("submission_id, item_id, item_type")
            .in("item_id", allItemIds);
          if (myItems && myItems.length > 0) {
            const subIds = [...new Set(myItems.map(i => i.submission_id))];
            // submission_documents ì¡°íšŒ
            const { data: subDocs } = await sb.from("submission_documents")
              .select("id, status, title, approval_nodes, current_node_order, reject_reason, reject_node_label, approved_at, rejected_at, submitted_at")
              .in("id", subIds);
            if (subDocs) {
              subDocs.forEach(doc => {
                myItems.filter(i => i.submission_id === doc.id).forEach(i => {
                  mySubDocMap[i.item_id] = doc;
                });
              });
              // approval_history ì¡°íšŒ (ê²°ì¬ ?´ë ¥)
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
      } catch(e) { console.warn("[S-7] submission ?°ë™ ?¤íŒ¨:", e.message); }

      // ?µí•©
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

      // [A-1] saved ??ª© ?œê±°: ?ì‹ ?€ê¸??€?¥ì™„ë£????´ì œ ê³„íš ëª©ë¡(plans.js)?ì„œ ì§ì ‘ ?ì‹ ?˜ë?ë¡?ê²°ì¬?¨ì—?œëŠ” ?œê±°
      _aprSavedData = [];

      // [S-9] ?ˆì‚° ?”ì•¡ ì¡°íšŒ (frozen ?¬í•¨ ?¤ê????”ì•¡)
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
      console.error("[renderApprovalMember] DB ì¡°íšŒ ?¤íŒ¨:", err.message);
      _aprMemberData = [];
    }
  }

  // ?íƒœë³??µê³„ (savedÂ·recalledÂ·draft ?œì™¸ ??recalled???Œìˆ˜?ìœ¼ë¯€ë¡?ëª©ë¡?ì„œ ?¨ê?. saved??ê³„íš ëª©ë¡?¼ë¡œ ?´ê???
  const data = _aprMemberData.filter(d => !['recalled', 'draft', 'saved'].includes(d.status));
  const stats = {
    saved: 0, // ???´ìƒ ê²°ì¬?¨ì—??ì¹´ìš´?¸í•˜ì§€ ?ŠìŒ
    total: data.length,
    approved: data.filter((d) => d.status === "approved").length,
    inProgress: data.filter(
      (d) => ['pending','pending_approval','submitted','in_review'].includes(d.status)
    ).length,
    rejected: data.filter((d) => d.status === "rejected").length,
    resultPending: data.filter((d) => d.status === "result_pending").length,
  };

  const STATUS_FINAL = {
    approved: { label: "?¹ì¸?„ë£Œ", color: "#059669", bg: "#F0FDF4", icon: "?? },
    pending: { label: "ê²°ì¬?€ê¸?, color: "#D97706", bg: "#FFFBEB", icon: "?? },
    pending_approval: { label: "ê²°ì¬?€ê¸?, color: "#D97706", bg: "#FFFBEB", icon: "?? },
    submitted: { label: "ê²°ì¬?€ê¸?, color: "#D97706", bg: "#FFFBEB", icon: "?? },
    in_review: { label: "ê²°ì¬ì§„í–‰ì¤?, color: "#7C3AED", bg: "#F5F3FF", icon: "?”„" },
    rejected: { label: "ë°˜ë ¤", color: "#DC2626", bg: "#FEF2F2", icon: "?? },
    recalled: { label: "?Œìˆ˜??, color: "#6B7280", bg: "#F9FAFB", icon: "?©ï¸" },
    cancelled: { label: "ì·¨ì†Œ", color: "#9CA3AF", bg: "#F9FAFB", icon: "?š«" },
    completed: { label: "?„ë£Œ", color: "#059669", bg: "#F0FDF4", icon: "?? },
    result_pending: { label: "BO ê²€??ì¤?, color: "#1D4ED8", bg: "#EFF6FF", icon: "?”µ" },
    // BO ?´ë‹¹?ê? ?•ì‚° ê²°ê³¼ë¥?ê²€??ì¤‘ì¸ ?íƒœ (result.js ??result_pending ?„í™˜ ??
  };


  const cards = data
    .map((item) => {
      const fc = STATUS_FINAL[item.status] || {
        label: _aprStatusLabel(item.status),
        color: "#6B7280",
        bg: "#F9FAFB",
        icon: "?•",
      };
      const typeBadge =
        item._type === "plan"
          ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-left:4px">?“‹ êµìœ¡ê³„íš</span>'
          : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309;margin-left:4px">?“ êµìœ¡? ì²­</span>';

      return `
    <div style="border-radius:14px;border:1.5px solid ${fc.color}30;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>
            ${typeBadge}
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>?“… ? ì²­ ${item.date}</span>
            <span>?“š ${item.type}</span>
            <span>?’° ${item.amount.toLocaleString()}??/span>
            ${item.purpose !== "-" ? `<span>?¯ ${item.purpose}</span>` : ""}
          </div>
        </div>
        <span style="flex-shrink:0;font-size:11px;font-weight:900;padding:4px 12px;border-radius:10px;
                     background:${fc.bg};color:${fc.color}">${fc.icon} ${fc.label}</span>
      </div>

      <!-- [S-7] ê²°ì¬??ì§„í–‰ ?€?„ë¼??-->
      <div style="margin:12px 0;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        ${(() => {
          const doc = item.submissionDoc;
          const hist = item.approvalHistory || [];
          if (doc && (doc.approval_nodes || []).length > 0) {
            // [S-7] ?¤ì œ ê²°ì¬ ?¸ë“œ ê¸°ë°˜ ?€?„ë¼??
            const nodes = doc.approval_nodes;
            const curIdx = doc.current_node_order || 0;
            const docStatus = doc.status;
            return `<div style="display:flex;align-items:center;gap:0;flex-wrap:wrap">
              <div style="display:flex;align-items:center;flex-shrink:0">
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;background:#059669;color:white">??/div>
                  <span style="font-size:9px;font-weight:800;color:#059669">?ì‹ ?„ë£Œ</span>
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
                const nodeIcon  = isRej ? '?? : isDone ? '?? : isCur ? '?”„' : '??;
                const lineColor = isDone && !isRej ? '#059669' : '#E5E7EB';
                const tooltip = lastH ? ` title="${lastH.approver_name||''} ${lastH.action==='approved'?'?¹ì¸':'ë°˜ë ¤'} (${(lastH.action_at||'').slice(0,10)})"` : '';
                return `<div style="display:flex;align-items:center;flex-shrink:0">
                  <div style="width:24px;height:2px;background:${lineColor}"></div>
                  <div${tooltip} style="display:flex;flex-direction:column;align-items:center;gap:2px">
                    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;background:${nodeBg};color:${isDone||isCur?'white':'#9CA3AF'}">${nodeIcon}</div>
                    <span style="font-size:9px;font-weight:800;color:${nodeColor};max-width:52px;text-align:center;line-height:1.2">${n.label||n.approverKey||'ê²°ì¬'}</span>
                    ${lastH?.approver_name ? `<span style="font-size:8px;color:#9CA3AF">${lastH.approver_name}</span>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>`;
          } else {
            // [S-7] submission_doc ?†ìŒ(?ˆê±°?? ??ê°„ë‹¨???íƒœ ê¸°ë°˜ ?€?„ë¼??
            const steps = [
              { label: '? ì²­', done: true },
              { label: '1ì°¨ê???, done: ['in_review','approved','rejected'].includes(item.status), active: item.status === 'in_review' },
              { label: 'ìµœì¢…ê²°ì¬', done: ['approved','rejected'].includes(item.status), icon: item.status === 'approved' ? '?? : item.status === 'rejected' ? '?? : '?? },
            ];
            return `<div style="display:flex;align-items:center;gap:0">${steps.map((step, i) => `
              <div style="display:flex;align-items:center;flex:1">
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                  <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;
                    background:${step.done ? '#059669' : step.active ? '#7C3AED' : '#E5E7EB'};
                    color:${step.done || step.active ? 'white' : '#9CA3AF'}">${step.done ? '?? : step.icon||'??}</div>
                  <span style="font-size:9px;font-weight:800;color:${step.done ? '#059669' : step.active ? '#7C3AED' : '#9CA3AF'}">${step.label}</span>
                </div>
                ${i < steps.length - 1 ? `<div style="flex:1;height:2px;background:${step.done ? '#059669' : '#E5E7EB'};margin:0 4px;margin-bottom:14px"></div>` : ''}
              </div>`).join('')}</div>`;
          }
        })()}
      </div>

      <!-- [S-7] ë°˜ë ¤ ?¬ìœ  + ?´ë‹¹???œì‹œ -->
      ${(() => {
        const doc = item.submissionDoc;
        const hist = item.approvalHistory || [];
        const rejectH = hist.find(h => h.action === 'rejected');
        const rejectReason = doc?.reject_reason || item.rejectReason || (rejectH?.comment || null);
        const rejectBy = doc?.reject_node_label || rejectH?.node_label || null;
        const rejectWho = rejectH?.approver_name || null;
        if (rejectReason) {
          return `<div style="margin-top:8px;padding:10px 14px;border-radius:8px;background:#FEF2F2;border:1px solid #FECACA;font-size:11px">
            <div style="font-weight:800;color:#DC2626;margin-bottom:3px">??ë°˜ë ¤ ?¬ìœ ${rejectBy||rejectWho ? ` (${[rejectBy,rejectWho].filter(Boolean).join(' Â· ')})` : ''}</div>
            <div style="color:#991B1B;line-height:1.5">${rejectReason}</div>
          </div>`;
        }
        // ?¹ì¸ ?„ë£Œ??ê²½ìš° ?¹ì¸ ?•ë³´ ?œì‹œ
        if (item.status === 'approved' && doc?.approved_at) {
          const approveH = [...hist].reverse().find(h => h.action === 'approved');
          return `<div style="margin-top:8px;padding:8px 14px;border-radius:8px;background:#F0FDF4;border:1px solid #A7F3D0;font-size:11px;display:flex;align-items:center;gap:8px">
            <span style="font-weight:800;color:#059669">???¹ì¸?„ë£Œ</span>
            ${approveH?.approver_name ? `<span style="color:#6B7280">${approveH.approver_name}${approveH.node_label ? ' Â· ' + approveH.node_label : ''}</span>` : ''}
            <span style="color:#9CA3AF">${new Date(doc.approved_at).toLocaleDateString('ko-KR')}</span>
          </div>`;
        }
        return '';
      })()}
      ${(() => {
        // [A-3] ?Œìˆ˜ ì¡°ê±´ ê°•í™”: current_node_order === 0 + docStatus ê¸°ë°˜
        // PRD fo_submission_approval.md Q2 ?•ì •: "ì²??¸ë“œ ?¡ì…˜ ?„ê¹Œì§€ë§??Œìˆ˜ ê°€??
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
            recallBlockMsg = docStatus === 'recalled' ? '?´ë? ?Œìˆ˜???ì‹ ?…ë‹ˆ??' : 'ê²°ì¬ê°€ ?„ë£Œ????ª©?…ë‹ˆ??';
          } else if (curOrder === 0 && ['submitted','pending'].includes(docStatus)) {
            canRecall = true; // ì²?ê²°ì¬??ê²€???????Œìˆ˜ ê°€??
          } else if (docStatus === 'in_review') {
            canRecall = false;
            recallBlockMsg = '?´ë‹¹?ê? ê²€??ì¤‘ì…?ˆë‹¤. ê²€???„ë£Œ ??ë°˜ë ¤?????ˆìŠµ?ˆë‹¤. (PRD Q2)';
          } else if (curOrder > 0) {
            canRecall = false;
            recallBlockMsg = `${curOrder + 1}?¨ê³„ ê²°ì¬ ì§„í–‰ ì¤‘ì…?ˆë‹¤. ?´ë‹¹?ì—ê²?ë°˜ë ¤ ?”ì²­?˜ì„¸??`;
          }
        } else {
          // ?ˆê±°??submission_doc ?†ìŒ): status ê¸°ë°˜ ?´ë°±
          canRecall = ['pending','submitted'].includes(item.status);
          if (!canRecall && item.status === 'in_review') {
            recallBlockMsg = '?´ë‹¹?ê? ê²€??ì¤‘ì…?ˆë‹¤. ?Œìˆ˜?????†ìŠµ?ˆë‹¤.';
          }
        }
        if (canRecall) {
          const _tid = String(item.id).replace(/'/g,"\\'");
          const _ttbl = item._table || (item._type === 'plan' ? 'plans' : 'applications');
          return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;display:flex;align-items:center;gap:8px">
              <button onclick="_aprRecallSubmit('${_tid}','${_ttbl}')"
                style="padding:6px 14px;border-radius:8px;border:1.5px solid #9CA3AF;background:white;color:#6B7280;font-size:11px;font-weight:800;cursor:pointer"
                onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                ?©ï¸ ?Œìˆ˜
              </button>
              <span style="font-size:10px;color:#9CA3AF">ì²?ê²°ì¬??ê²€???„ë§Œ ?Œìˆ˜ ê°€??/span>
             </div>`;
        } else if (recallBlockMsg) {
          return `<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#FFF7ED;border:1px solid #FED7AA;font-size:10px;color:#92400E;font-weight:700">? ï¸ ${recallBlockMsg}</div>`;
        }
        return '';
      })()}
    </div>`;
    })
    .join("");


  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">?“­</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">ê²°ì¬ ?´ì—­???†ìŠµ?ˆë‹¤</div>
    <div style="font-size:12px;color:#9CA3AF">êµìœ¡ê³„íš ?ëŠ” êµìœ¡? ì²­???œì¶œ?˜ë©´ ê²°ì¬ ?„í™©?????”ë©´?ì„œ ?•ì¸?????ˆìŠµ?ˆë‹¤.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-5xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??ê²°ì¬ ???€?ìš©</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">?€?ìš© ê²°ì¬??/h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} Â· ${currentPersona.dept} ????êµìœ¡? ì²­??ê²°ì¬ ?„í™©</p>
    </div>
    <button onclick="_aprMemberLoaded=false;_aprMemberData=[];_aprSavedData=[];_aprSelectedItems=new Set();renderApprovalMember()"
      style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">?”„ ?ˆë¡œê³ ì¹¨</button>
  </div>

  <!-- ?µê³„ ì¹´ë“œ -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[
      { label: "?„ì²´", val: stats.total, color: "#002C5F", bg: "#EFF6FF", icon: "?“‹" },
      { label: "?¹ì¸?„ë£Œ", val: stats.approved, color: "#059669", bg: "#F0FDF4", icon: "?? },
      { label: "ê²°ì¬?€ê¸?, val: stats.inProgress, color: "#D97706", bg: "#FFFBEB", icon: "?? },
      { label: "BO ê²€??ì¤?, val: stats.resultPending, color: "#1D4ED8", bg: "#EFF6FF", icon: "?”µ" },
    ]
      .map(
        (s) => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">ê±?/span></div>
    </div>`,
      )
      .join("")}
  </div>

  <!-- [S-9] ?ˆì‚° ?¤ì”??ë°°ë„ˆ -->
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
        <div style="font-size:11px;font-weight:800;color:${availColor};margin-bottom:4px">?’° ?€ ?ˆì‚° ?¤ê????”ì•¡</div>
        <div style="font-size:22px;font-weight:900;color:${availColor}">${avail.toLocaleString()}<span style="font-size:13px;margin-left:2px">??/span></div>
        <div style="font-size:10px;color:#6B7280;margin-top:2px">ë°°ì •: ${alloc.toLocaleString()}??| ?¬ìš©: ${used.toLocaleString()}??| ?ˆì•½(?€ê¸?: <strong style="color:#D97706">${frozen.toLocaleString()}??/strong></div>
      </div>
      <div style="min-width:120px;flex:1;max-width:220px">
        <div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden">
          <div style="height:100%;background:linear-gradient(90deg,#002C5F ${Math.round(used/alloc*100)}%,#FDE68A ${Math.round(used/alloc*100)}% ${pct}%);border-radius:4px;transition:width .4s"></div>
        </div>
        <div style="font-size:10px;color:#6B7280;margin-top:4px;text-align:right">${pct}% ?¬ìš© (?ˆì•½ ?¬í•¨)</div>
      </div>
    </div>
  </div>`;
    })()
  }

  <!-- ê²°ì¬ ëª©ë¡ -->
  <div>${data.length === 0 ? emptyMsg : cards}</div>
</div>

<!-- [S-3] ?ì‹  ë¬¸ì„œ ?‘ì„± ?¸ë¼??ëª¨ë‹¬ (id=apr-submit-modal) -->
<div id="apr-submit-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:540px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:13px;font-weight:900;color:#059669;margin-bottom:2px">?“¤ ?ì‹  ë¬¸ì„œ ?‘ì„±</div>
        <div style="font-size:11px;color:#6B7280">?ì‹  ?œëª©ê³??´ìš©???…ë ¥?˜ë¦° ?¹ì¸?ì—ê²??„ë‹¬?©ë‹ˆ??</div>
      </div>
      <button onclick="_aprCloseModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF">??/button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">?ì‹  ?œëª© <span style="color:#EF4444">*</span></label>
        <input id="apr-doc-title" type="text" placeholder="?? 2026??2ë¶„ê¸° êµìœ¡ê³„íš ?ì‹ "
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">?ì‹  ?´ìš©</label>
        <textarea id="apr-doc-content" rows="3" placeholder="?? AI ??Ÿ‰ êµìœ¡ 3ê±??¼ê´„ ?ì‹ ?©ë‹ˆ??"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:none"></textarea>
      </div>
      <div id="apr-modal-items" style="background:#F9FAFB;border-radius:10px;padding:12px 14px;font-size:12px;color:#374151">
        <div style="font-weight:800;margin-bottom:8px">?“‹ ì²¨ë? ??ª©</div>
        <div id="apr-modal-items-list"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:10px;border-top:1px solid #F3F4F6">
        <button onclick="_aprCloseModal()" style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">ì·¨ì†Œ</button>
        <button onclick="_aprConfirmSubmit()" style="padding:10px 28px;border-radius:10px;border:none;background:#059669;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,.3)">???ì‹  ?•ì •</button>
      </div>
    </div>
  </div>
</div>`;

  // ëª¨ë‹¬ ì´ˆê¸° ?¨ê? (ê°??¤ì • ??display none)
  const modal = document.getElementById('apr-submit-modal');
  if (modal) modal.style.display = 'none';

  // ?ì‹  ë¸Œë¦¿ì§€ë¥??µí•´ ?˜ì–´??ê±´ì´ ?ˆìœ¼ë©?ëª¨ë‹¬ ?¤í”ˆ
  if (window._pendingAprSubmit) {
    const p = window._pendingAprSubmit;
    window._pendingAprSubmit = null;
    if (typeof _aprSingleSubmit === 'function') {
      setTimeout(() => {
        _aprSingleSubmit(p.id, p.table, p.title);
      }, 50); // DOM ì´ˆê¸°?????½ê°„??ì§€??
    }
  }
}

// --- ë¦¬ë”??ê²°ì¬??(S-5: submission_documents ê¸°ë°˜) ---

async function renderApprovalLeader() {
  const el = document.getElementById("page-approval-leader");

  if (!_isLeaderPersona()) {
    el.innerHTML = `
    <div class="max-w-5xl mx-auto">
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

      // [S-5] submission_documents ê¸°ë°˜ ì¡°íšŒ (team_forecast ë²ˆë“¤ ?¬í•¨)
      try {
        let sdQ = sb.from("submission_documents")
          .select("*, submission_items(*)")
          .in("status", ["submitted", "in_review", "team_approved"])
          .neq("submitter_id", pid)
          .order("submitted_at", { ascending: false });
        if (filterTids.length > 1) sdQ = sdQ.in("tenant_id", filterTids);
        else sdQ = sdQ.eq("tenant_id", tid);
        const { data: sdDocs } = await sdQ;
        _aprSubDocData = sdDocs || [];
        console.log(`[renderApprovalLeader] ?ì‹ ë¬¸ì„œ ${_aprSubDocData.length}ê±?);
      } catch (sdErr) {
        console.warn("[renderApprovalLeader] submission_documents ì¡°íšŒ ?¤íŒ¨:", sdErr.message);
      }

      // ?ˆê±°?? ?ì‹  ë¬¸ì„œ???¬í•¨?˜ì? ?Šì? ê±?
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

      // ê²°ì¬?¼ì¸ ?„í„° (?ˆê±°??
      if (typeof SERVICE_POLICIES!=="undefined" && SERVICE_POLICIES.length>0) {
        const myPos = currentPersona.pos||"";
        const posToKey = {?€??"team_leader",?¤ì¥:"director",?¬ì—…ë¶€??"division_head",?¼í„°??"center_head",ë³¸ë???"hq_head"};
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
      console.error("[renderApprovalLeader] ì¡°íšŒ ?¤íŒ¨:", err.message);
    }
  }

  const totalPending = _aprSubDocData.length + _aprLeaderData.length;

  // ?ì‹  ë¬¸ì„œ ì¹´ë“œ (?Œë? ?Œë‘ë¦?
  const subDocCards = _aprSubDocData.map(doc => {
    const items = doc.submission_items||[];
    const safeDocId = String(doc.id).replace(/'/g,"\\'");
    const totalAmt = Number(doc.total_amount||0);
    const subAt = (doc.submitted_at||doc.created_at||"").slice(0,16).replace("T"," ");
    const stBadge = doc.status==="in_review"
      ? `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#F5F3FF;color:#7C3AED">?”„ ê²€? ì™„ë£?/span>`
      : `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#FFF7ED;color:#C2410C">?• ê²°ì¬?€ê¸?/span>`;
    const itemList = items.length>0
      ? items.map((it,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F9FAFB;font-size:12px"><span>${i+1}. ${it.item_title||it.item_id}</span><span style="font-weight:800;color:#002C5F">${Number(it.item_amount||0).toLocaleString()}??/span></div>`).join("")
      : `<div style="font-size:11px;color:#9CA3AF;padding:6px 0">?°ê²°????ª© ?†ìŒ</div>`;
    return `
    <div style="border-radius:16px;border:2px solid #DBEAFE;background:white;padding:20px 22px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,44,95,.06)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">?“¤ ?ì‹ ë¬¸ì„œ</span>
            ${stBadge}
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:6px">${doc.title}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>?‘¤ ${doc.submitter_name}${doc.submitter_org_name?" Â· "+doc.submitter_org_name:""}</span>
            <span>?“… ${subAt}</span>
            <span>?“Š ${items.length}ê±?/span>
            ${doc.account_code?`<span>?¦ ${doc.account_code}</span>`:""}
            ${doc.approval_system === 'integrated' ? `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-left:2px">?”— ?µí•©ê²°ì¬</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px">? ì²­ ì´ì•¡</div>
          <div style="font-size:22px;font-weight:900;color:#002C5F">${totalAmt.toLocaleString()}??/div>
        </div>
      </div>
      <div style="background:#F8FAFF;border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">?“‹ ì²¨ë? ??ª©</div>
        ${itemList}
      </div>
      ${doc.content?`<div style="font-size:12px;color:#6B7280;background:#F9FAFB;border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.6">"${doc.content}"</div>`:""}
      ${(() => {
        const coop = Array.isArray(doc.coop_teams) ? doc.coop_teams : [];
        const ref = Array.isArray(doc.reference_teams) ? doc.reference_teams : [];
        if (doc.approval_system !== 'integrated' || (coop.length === 0 && ref.length === 0)) return '';
        return `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:11px">
          <div style="font-weight:900;color:#1D4ED8;margin-bottom:6px">?”— ?µí•©ê²°ì¬ ?•ë³´</div>
          ${coop.length > 0 ? `<div style="margin-bottom:4px"><span style="color:#6B7280;font-weight:700">?‘ì¡°ì²?</span> <span style="color:#374151">${coop.map(c => c.name||c).join(', ')}</span></div>` : ''}
          ${ref.length > 0 ? `<div><span style="color:#6B7280;font-weight:700">ì°¸ì¡°ì²?</span> <span style="color:#374151">${ref.map(r => r.name||r).join(', ')}</span></div>` : ''}
        </div>`;
      })()}
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1">
          <textarea id="comment-doc-${safeDocId}" placeholder="ê²°ì¬ ?˜ê²¬ (ë°˜ë ¤ ???„ìˆ˜)" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalActionDoc('${safeDocId}','approve')" style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:80px" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">???¹ì¸</button>
          <button onclick="_approvalActionDoc('${safeDocId}','reject')"  style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">??ë°˜ë ¤</button>
        </div>
      </div>
    </div>`;
  }).join("");

  // ?ˆê±°??ì¹´ë“œ
  const legacyCards = _aprLeaderData.map(item=>{
    const typeBdg = item._type==="plan"
      ? `<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8">?“‹ êµìœ¡ê³„íš</span>`
      : `<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309">?“ êµìœ¡? ì²­</span>`;
    const tBdg = typeof getTenantBadgeHtml==="function"?getTenantBadgeHtml(item.tenantId,currentPersona.tenantId):"";
    const sid = String(item.id).replace(/'/g,"\\'");
    return `
    <div style="border-radius:14px;border:1.5px solid #E5E7EB;background:#FAFAFA;padding:18px 20px;margin-bottom:12px">
      <div style="font-size:10px;color:#9CA3AF;font-weight:700;margin-bottom:8px">?“„ ?ˆê±°??ë°©ì‹ (?ì‹  ë¬¸ì„œ ë¯¸ì—°ê²?</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#1D4ED8;flex-shrink:0">${item.applicant.charAt(0)}</div>
            <div><div style="font-size:13px;font-weight:900;color:#374151">${item.applicant}</div><div style="font-size:11px;color:#9CA3AF">${item.dept}</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>${typeBdg}${tBdg}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>?“… ${item.date}</span><span>?“š ${item.type}</span><span>?’° ${item.amount.toLocaleString()}??/span>
            ${item.purpose!=="-"?`<span>?¯ ${item.purpose}</span>`:""}
          </div>
        </div>
        ${item.status==="in_review"
          ? `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#F5F3FF;color:#7C3AED">?”„ ê²€? ì™„ë£?/div>`
          : `<div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#FFF7ED;color:#C2410C">?• ê²°ì¬?€ê¸?/div>`}
      </div>
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1"><textarea id="comment-${sid}" placeholder="ê²°ì¬ ?˜ê²¬ (ë°˜ë ¤ ???„ìˆ˜)" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea></div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalAction('${sid}','${item._table}','approve')" style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:80px" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">???¹ì¸</button>
          <button onclick="_approvalAction('${sid}','${item._table}','reject')"  style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">??ë°˜ë ¤</button>
        </div>
      </div>
    </div>`;
  }).join("");

  const emptyMsg = `<div class="card p-16 text-center">
    <div style="font-size:48px;margin-bottom:16px">?“­</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">ê²°ì¬ ?€ê¸?ê±´ì´ ?†ìŠµ?ˆë‹¤</div>
    <div style="font-size:12px;color:#9CA3AF">?€?ì˜ êµìœ¡ê³„íšÂ·? ì²­???ì‹ ?˜ë©´ ?¬ê¸°??ê²°ì¬?????ˆìŠµ?ˆë‹¤.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-5xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??ê²°ì¬ ??ë¦¬ë”??/div>
      <h1 class="text-3xl font-black text-brand tracking-tight">ë¦¬ë”??ê²°ì¬??/h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} ${currentPersona.pos} Â· ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button onclick="_aprLeaderLoaded=false;_aprLeaderData=[];_aprSubDocData=[];renderApprovalLeader()"
        style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">?”„ ?ˆë¡œê³ ì¹¨</button>
      <div style="background:#EFF6FF;border-radius:12px;padding:10px 18px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px">ê²°ì¬ ?€ê¸?/div>
        <div style="font-size:28px;font-weight:900;color:#002C5F">${totalPending}<span style="font-size:14px">ê±?/span></div>
      </div>
    </div>
  </div>
  ${(() => {
    // Phase 3: team_forecast ë²ˆë“¤ ì¹´ë“œ (ë³„ë„ ?¹ì…˜)
    const tfDocs = _aprSubDocData.filter(d => d.submission_type === 'team_forecast');
    const otherDocs = _aprSubDocData.filter(d => d.submission_type !== 'team_forecast');
    const tfCards = tfDocs.map(doc => {
      const items = doc.submission_items || [];
      const safeDocId = String(doc.id).replace(/'/g, "\\'");
      const totalAmt = Number(doc.total_amount || 0);
      const subAt = (doc.submitted_at || doc.created_at || '').slice(0, 16).replace('T', ' ');
      const isTeamApproved = doc.status === 'team_approved';
      const stBadge = isTeamApproved
        ? `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#F0FDF4;color:#059669">???€???•ì¸?„ë£Œ</span>`
        : `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#FFFBEB;color:#D97706">?• ê²€???€ê¸?/span>`;
      const itemList = items.length > 0
        ? items.map((it, i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F9FAFB;font-size:12px"><span>${i+1}. ${it.item_title||it.item_id}</span><span style="font-weight:800;color:#1D4ED8">${Number(it.item_amount||0).toLocaleString()}??/span></div>`).join('')
        : `<div style="font-size:11px;color:#9CA3AF;padding:6px 0">?°ê²°??ê³„íš ?†ìŒ</div>`;
      const boTransferBtn = !isTeamApproved
        ? `<button onclick="_teamForecastBoTransfer('${safeDocId}')"
            style="padding:8px 20px;border-radius:8px;background:#1D4ED8;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:100px"
            onmouseover="this.style.background='#1E40AF'" onmouseout="this.style.background='#1D4ED8'">?“¤ BO ?„ë‹¬</button>`
        : `<button disabled style="padding:8px 20px;border-radius:8px;background:#E5E7EB;color:#9CA3AF;font-size:12px;font-weight:900;border:none;min-width:100px;cursor:default">???„ë‹¬?„ë£Œ</button>`;
      const rejectBundleBtn = !isTeamApproved
        ? `<button onclick="_teamForecastReject('${safeDocId}')"
            style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px"
            onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">??ë°˜ë ¤</button>`
        : '';
      return `
    <div style="border-radius:16px;border:2px solid #BFDBFE;background:white;padding:20px 22px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,44,95,.06)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E">?“¦ ?€ ?¬ì—…ê³„íš ë²ˆë“¤</span>
            ${stBadge}
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:6px">${doc.title}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>?‘¤ ?•ì •?? ${doc.submitter_name}${doc.submitter_org_name ? ' Â· ' + doc.submitter_org_name : ''}</span>
            <span>?“… ${subAt}</span>
            <span>?“Š ${items.length}ê±?/span>
            ${doc.account_code ? `<span>?¦ ${doc.account_code}</span>` : ''}
            ${doc.fiscal_year ? `<span>?“† ${doc.fiscal_year}??/span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px">ì´??”ì²­??/div>
          <div style="font-size:22px;font-weight:900;color:#1D4ED8">${totalAmt.toLocaleString()}??/div>
          <div style="font-size:10px;color:#9CA3AF">Hold ?†ìŒ Â· ?˜ìš”?ˆì¸¡ ?”ì²­</div>
        </div>
      </div>
      <div style="background:#F8FAFF;border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">?“‹ ?¬í•¨ ê³„íš ëª©ë¡</div>
        ${itemList}
      </div>
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6;justify-content:flex-end">
        ${rejectBundleBtn}
        ${boTransferBtn}
      </div>
    </div>`;
    }).join('');

    // ?¼ë°˜ ?ì‹ ë¬¸ì„œ ì¹´ë“œ (ê¸°ì¡´ ë¡œì§ ? ì?)
    const regularSubDocCards = otherDocs.map(doc => {
      const items = doc.submission_items||[];
      const safeDocId = String(doc.id).replace(/'/g,"\\'");
      const totalAmt = Number(doc.total_amount||0);
      const subAt = (doc.submitted_at||doc.created_at||'').slice(0,16).replace('T',' ');
      const stBadge = doc.status==='in_review'
        ? `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#F5F3FF;color:#7C3AED">?”„ ê²€? ì™„ë£?/span>`
        : `<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:8px;background:#FFF7ED;color:#C2410C">?• ê²°ì¬?€ê¸?/span>`;
      const itemList = items.length>0
        ? items.map((it,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F9FAFB;font-size:12px"><span>${i+1}. ${it.item_title||it.item_id}</span><span style="font-weight:800;color:#002C5F">${Number(it.item_amount||0).toLocaleString()}??/span></div>`).join('')
        : `<div style="font-size:11px;color:#9CA3AF;padding:6px 0">?°ê²°????ª© ?†ìŒ</div>`;
      return `
    <div style="border-radius:16px;border:2px solid #DBEAFE;background:white;padding:20px 22px;margin-bottom:14px;box-shadow:0 2px 12px rgba(0,44,95,.06)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">?“¤ ?ì‹ ë¬¸ì„œ</span>
            ${stBadge}
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:6px">${doc.title}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>?‘¤ ${doc.submitter_name}${doc.submitter_org_name?' Â· '+doc.submitter_org_name:''}</span>
            <span>?“… ${subAt}</span>
            <span>?“Š ${items.length}ê±?/span>
            ${doc.account_code?`<span>?¦ ${doc.account_code}`:''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:#6B7280;margin-bottom:2px">? ì²­ ì´ì•¡</div>
          <div style="font-size:22px;font-weight:900;color:#002C5F">${totalAmt.toLocaleString()}??/div>
        </div>
      </div>
      <div style="background:#F8FAFF;border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">?“‹ ì²¨ë? ??ª©</div>
        ${itemList}
      </div>
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1"><textarea id="comment-doc-${safeDocId}" placeholder="ê²°ì¬ ?˜ê²¬ (ë°˜ë ¤ ???„ìˆ˜)" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea></div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalActionDoc('${safeDocId}','approve')" style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;min-width:80px" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">???¹ì¸</button>
          <button onclick="_approvalActionDoc('${safeDocId}','reject')"  style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;min-width:80px" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">??ë°˜ë ¤</button>
        </div>
      </div>
    </div>`;
    }).join('');

    if (totalPending === 0) return emptyMsg;
    return `
      ${tfDocs.length>0 ? `<div style="font-size:11px;font-weight:800;color:#D97706;margin:8px 0 4px">?“¦ ?€ ?¬ì—…ê³„íš ë²ˆë“¤ (${tfDocs.length}ê±?</div>${tfCards}` : ''}
      ${otherDocs.length>0 ? `<div style="font-size:11px;font-weight:800;color:#1D4ED8;margin:${tfDocs.length>0?'16px':'8px'} 0 4px">?“¤ ?ì‹  ë¬¸ì„œ ê¸°ë°˜ (${otherDocs.length}ê±?</div>${regularSubDocCards}` : ''}
      ${_aprLeaderData.length>0 ? `<div style="font-size:11px;font-weight:800;color:#9CA3AF;margin:${_aprSubDocData.length>0?'16px':'8px'} 0 4px">?“„ ?ˆê±°??ë°©ì‹ (${_aprLeaderData.length}ê±?</div>${legacyCards}` : ''}
    `;
  })()}
</div>`;
}

async function _approvalActionDoc(docId, action) {
  const commentEl = document.getElementById("comment-doc-" + docId);
  const comment = commentEl?.value?.trim() || "";
  const actionLabel = action === "approve" ? "?¹ì¸" : "ë°˜ë ¤";

  if (action === "reject" && !comment) {
    alert("ë°˜ë ¤ ???˜ê²¬???…ë ¥?´ì£¼?¸ìš”.");
    return;
  }
  if (!confirm(`???ì‹  ë¬¸ì„œë¥?${actionLabel} ì²˜ë¦¬?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB ?°ê²° ?¤íŒ¨"); return; }

  try {
    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "approved" : "rejected";

    // 1. submission_documents ?íƒœ ?…ë°?´íŠ¸
    const updateDoc = { status: newStatus, updated_at: now };
    if (action === "approve") updateDoc.approved_at = now;
    if (action === "reject") { updateDoc.rejected_at = now; updateDoc.reject_reason = comment; updateDoc.reject_node_label = currentPersona.pos || "?€??; }
    const { error: docErr } = await sb.from("submission_documents").update(updateDoc).eq("id", docId);
    if (docErr) throw docErr;

    // 2. submission_items ì¡°íšŒ ???°ê²°??plans/applications ?íƒœ ?…ë°?´íŠ¸
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

    // 3. [S-9] ?ˆì‚° ì²˜ë¦¬: ?¹ì¸ ???•ì • ì°¨ê°, ë°˜ë ¤ ???ˆì•½ ?´ì œ
    if (action === "approve") {
      _s9ConfirmBudget(sb, { submissionId: docId }).catch(e => console.warn('[S-9] ?•ì • ì°¨ê° ?¤íŒ¨:', e.message));
    } else if (action === "reject") {
      _s9ReleaseBudget(sb, { submissionId: docId, reason: 'rejected' }).catch(e => console.warn('[S-9] ?ˆì•½ ?´ì œ ?¤íŒ¨:', e.message));
    }

    alert(`??${actionLabel} ì²˜ë¦¬ ?„ë£Œ!\n\n${comment ? "?˜ê²¬: " + comment + "\n\n" : ""}?°ê²°??ê±´ë“¤???íƒœê°€ ëª¨ë‘ ?…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ??`);

    _aprLeaderLoaded = false; _aprLeaderData = []; _aprSubDocData = [];
    _aprMemberLoaded = false; _aprMemberData = []; _aprSavedData = [];
    renderApprovalLeader();
  } catch (err) {
    alert("ì²˜ë¦¬ ?¤íŒ¨: " + err.message);
    console.error("[_approvalActionDoc]", err.message);
  }
}


// ?€?€?€ ê²°ì¬ ?¡ì…˜ (?¹ì¸/ë°˜ë ¤) ??DB ?¤ë°˜???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function _approvalAction(id, table, action) {
  const comment = document.getElementById("comment-" + id)?.value || "";
  const actionLabel = action === "approve" ? "?¹ì¸" : "ë°˜ë ¤";

  if (action === "reject" && !comment.trim()) {
    alert("ë°˜ë ¤ ???˜ê²¬???…ë ¥?´ì£¼?¸ìš”.");
    return;
  }

  if (!confirm(`??ë¬¸ì„œë¥?${actionLabel} ì²˜ë¦¬?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB ?°ê²° ?¤íŒ¨");
    return;
  }

  try {
    // ê²°ì¬ ?´ë ¥ ê¸°ë¡ (detail.approval_logs)
    const logEntry = {
      actor: currentPersona.name,
      actor_pos: currentPersona.pos,
      action: action,
      comment: comment || null,
      timestamp: new Date().toISOString(),
    };
    // ê¸°ì¡´ detail ì¡°íšŒ ??approval_logs ë°°ì—´??ì¶”ê?
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

    // ??ª© 7: ?¹ì¸ ???ˆì‚° ì°¨ê°
    if (action === "approve") {
      try {
        const { data: doc } = await sb
          .from(table)
          .select("amount, account_code, tenant_id, applicant_id")
          .eq("id", id)
          .single();
        if (doc && doc.amount && doc.account_code) {
          // ? ì²­?ì˜ org_id ì¡°íšŒ
          const { data: user } = await sb
            .from("users")
            .select("org_id")
            .eq("id", doc.applicant_id)
            .single();
          if (user?.org_id) {
            // bankbook ì¡°íšŒ
            const { data: bbs } = await sb
              .from("org_budget_bankbooks")
              .select("id")
              .eq("org_id", user.org_id)
              .eq("tenant_id", doc.tenant_id);
            // account_id ë§¤ì¹­
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
                    `[?ˆì‚°ì°¨ê°] ${doc.amount}??ì°¨ê° ?„ë£Œ (alloc ${alloc.id})`,
                  );
                  break; // ì²?ë§¤ì¹­ bankbookë§?ì°¨ê°
                }
              }
            }
          }
        }
      } catch (budgetErr) {
        console.warn(
          "[?ˆì‚°ì°¨ê°] ?ˆì‚° ?ë™ ì°¨ê° ?¤íŒ¨ (ë¹„ì¹˜ëª…ì ):",
          budgetErr.message,
        );
      }
    }

    alert(
      `??${actionLabel} ì²˜ë¦¬ê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ??${comment ? "\n?˜ê²¬: " + comment : ""}`,
    );

    // ëª©ë¡ ê°±ì‹ 
    _aprLeaderLoaded = false;
    _aprLeaderData = [];
    renderApprovalLeader();

    // ?€??ëª©ë¡??ê°±ì‹  (?¤ë¥¸ ??—??ë³???ë°˜ì˜)
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
  } catch (err) {
    alert("ì²˜ë¦¬ ?¤íŒ¨: " + err.message);
    console.error("[_approvalAction]", err.message);
  }
}

// ?€?€?€ [S-3/S-4] ?ì‹  ì²˜ë¦¬ ?¨ìˆ˜ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

// ì²´í¬ë°•ìŠ¤ ? íƒ/?´ì œ + ?¤ê±´ ?ì‹  ë²„íŠ¼ ?œì„±??
function _aprToggleSelect(el) {
  const id = el.dataset.id;
  const account = el.dataset.account || '';

  if (el.checked) {
    // ê³„ì • ?™ì¼??ê²€?????¤ê±´ ?ì‹ ?€ ê°™ì? ?ˆì‚° ê³„ì •ë§??ˆìš©
    if (_aprSelectedItems.size > 0) {
      const firstAccount = [..._aprSelectedItems.values()][0]?.account || '';
      if (firstAccount && account && firstAccount !== account) {
        alert('? ï¸ ?¤ê±´ ?ì‹ ?€ ê°™ì? ?ˆì‚° ê³„ì •ë§?ê°€?¥í•©?ˆë‹¤.\n\n? íƒ??ê³„ì •: ' + firstAccount + '\n?„ì¬ ??ª© ê³„ì •: ' + account);
        el.checked = false;
        return;
      }
    }
    _aprSelectedItems.set(id, { id, table: el.dataset.table, type: el.dataset.type, account });
  } else {
    _aprSelectedItems.delete(id);
  }

  // ?¤ê±´ ?ì‹  ë²„íŠ¼ ?œì„±??ë¹„í™œ?±í™”
  const btn = document.getElementById('btn-bulk-submit');
  const countEl = document.getElementById('apr-bulk-count');
  const count = _aprSelectedItems.size;
  if (btn) {
    btn.style.opacity = count > 0 ? '1' : '.5';
    btn.style.pointerEvents = count > 0 ? 'auto' : 'none';
  }
  if (countEl) countEl.textContent = count;
}

// ?¨ê±´ ?ì‹  ??ëª¨ë‹¬ ?´ê¸° (? íƒ ??ª© 1ê±?
function _aprSingleSubmit(id, table, title) {
  _aprSelectedItems.clear();
  const item = _aprSavedData.find(d => String(d.id) === String(id));
  _aprSelectedItems.set(id, { id, table, type: table === 'plans' ? 'plan' : 'app', account: '', amount: item?.amount||0, plan_type: item?.plan_type });
  _aprOpenModal([{ id, title, _type: table === 'plans' ? 'plan' : 'app', item }]);
}

// ?¤ê±´ ?ì‹  ??ëª¨ë‹¬ ?´ê¸°
function _aprBulkSubmit() {
  if (_aprSelectedItems.size === 0) return;
  const items = [..._aprSelectedItems.values()].map(sel => {
    const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
    // ? íƒ ??ª© ?•ë³´ ë³´ê°•
    if (item) {
      sel.amount = item.amount || 0;
      sel.plan_type = item.plan_type;
    }
    return { id: sel.id, title: item?.title || sel.id, _type: sel.type, item };
  });
  _aprOpenModal(items);
}

// ?ì‹  ëª¨ë‹¬ ?´ê¸° (S-3 ê³ ë„?? ?ˆì‚° ?”ì•½ + ê³„ì • ?•ë³´)
// ?ì‹  ëª¨ë‹¬ ?™ì  ì£¼ì…
function _injectAprSubmitModal() {
  if (document.getElementById('apr-submit-modal')) return;
  const modalDiv = document.createElement('div');
  modalDiv.id = 'apr-submit-modal';
  modalDiv.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);align-items:center;justify-content:center';
  modalDiv.innerHTML = `
  <div style="background:white;border-radius:20px;width:540px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:13px;font-weight:900;color:#059669;margin-bottom:2px">?“¤ ?ì‹  ë¬¸ì„œ ?‘ì„±</div>
        <div style="font-size:11px;color:#6B7280">?ì‹  ?œëª©ê³?ê°„ë‹¨??ë©”ì‹œì§€ë¥??…ë ¥?˜ë©´ ?¹ì¸?ì—ê²??„ë‹¬?©ë‹ˆ??</div>
      </div>
      <button onclick="_aprCloseModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF">??/button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">?ì‹  ?œëª© <span style="color:#EF4444">*</span></label>
        <input id="apr-doc-title" type="text" placeholder="?? 2026??2ë¶„ê¸° êµìœ¡ê³„íš ?ì‹ "
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">ê°„ë‹¨??ë©”ì‹œì§€</label>
        <textarea id="apr-doc-content" rows="3" placeholder="?? AI ??Ÿ‰ êµìœ¡ 3ê±??¼ê´„ ?ì‹ ?©ë‹ˆ??"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:none"></textarea>
      </div>
      <div id="apr-modal-items" style="background:#F9FAFB;border-radius:10px;padding:12px 14px;font-size:12px;color:#374151">
        <div style="font-weight:800;margin-bottom:8px">?“‹ ì²¨ë? ??ª©</div>
        <div id="apr-modal-items-list"></div>
      </div>
      <div id="apr-modal-approval-line"></div>
      <div id="apr-integrated-wrapper"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:10px;border-top:1px solid #F3F4F6">
        <button onclick="_aprCloseModal()" style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">ì·¨ì†Œ</button>
        <button onclick="_aprConfirmSubmit()" style="padding:10px 28px;border-radius:10px;border:none;background:#059669;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,.3)">???ì‹  ?•ì •</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modalDiv);
}

// [S-8] approval_nodes ?ë™ êµ¬ì„± ?¬í¼ (ê²°ì¬???Œë”ë§???
function _calculateApprovalLine(accountCode, totalAmount, stage = 'apply') {
  let nodes = [];

  // [S-17] ?¬ì—…ê³„íš??ê²½ìš° ?•ì±…ë¹Œë” ë¬´ì‹œ?˜ê³  ê³ ì • ê²°ì¬??ë°˜í™˜
  if (stage === 'business') {
    nodes.push({ order: 1, type: 'approval', label: '?€??, approverKey: 'team_leader' });
    nodes.push({ order: 2, type: 'review', label: '?´ì˜?´ë‹¹??, approverKey: 'manager' });
    nodes.push({ order: 3, type: 'review', label: 'ì´ê´„?´ë‹¹??, approverKey: 'admin' });
    return nodes;
  }

  let matchedPol = null;
  
  if (typeof SERVICE_POLICIES !== 'undefined' && accountCode) {
    matchedPol = SERVICE_POLICIES.find(pol => 
      (pol.accountCodes || []).some(c => accountCode.includes(c))
    );
  }

  if (matchedPol && matchedPol.approvalConfig && matchedPol.approvalConfig[stage]) {
    const cfg = matchedPol.approvalConfig[stage];
    
    // 1. thresholds ???°ë¥¸ ê¸ˆì•¡ë³?ê²°ì¬??(?¹ì¸??
    let finalApprover = null;
    if (cfg.thresholds && cfg.thresholds.length > 0) {
       const sorted = [...cfg.thresholds].sort((a,b) => (a.maxAmt ?? Infinity) - (b.maxAmt ?? Infinity));
       for (const t of sorted) {
          if (!t.maxAmt || totalAmount <= t.maxAmt) {
             finalApprover = t;
             break;
          }
       }
       if (!finalApprover) finalApprover = sorted[sorted.length - 1];
    }
    
    const LEVEL_LABELS = {
      team_leader: "?€??, director: "?¤ì¥", division_head: "?¬ì—…ë¶€??, center_head: "?¼í„°??, hq_head: "ë³¸ë???
    };

    if (finalApprover && finalApprover.approverKey) {
       // ?”ë©´?œì‹œ?©ìœ¼ë¡?êµ¬ê°„??ìµœì¢… ?¹ì¸?ë§Œ ?¨ìˆœ ì¶”ê? (?¤ì œ???„ì ?????ˆìŒ)
       nodes.push({ order: 1, type: 'approval', label: LEVEL_LABELS[finalApprover.approverKey] || finalApprover.approverKey, approverKey: finalApprover.approverKey });
    }

    // 2. ?µí•©ê²°ì¬(hmg) ??ê²½ìš°, ?‘ì¡°ì²??œì‹œ
    if (cfg.approvalType === 'hmg' || cfg.approvalType === 'integrated') {
       nodes.push({ order: 2, type: 'coop', label: 'êµìœ¡?‘ì¡°ì²?, approverKey: 'coop_edu' });
       nodes.push({ order: 3, type: 'coop', label: '?¬ê²½?‘ì¡°?€', approverKey: 'coop_fin' });
    }

    // 3. ê²°ì¬ ??ê²€? ì (reviewMode)
    let order = nodes.length + 1;
    if (cfg.reviewMode === 'admin_only') {
       nodes.push({ order: order++, type: 'review', label: 'ì´ê´„?´ë‹¹??, approverKey: 'admin' });
    } else if (cfg.reviewMode === 'manager_only') {
       nodes.push({ order: order++, type: 'review', label: '?´ì˜?´ë‹¹??, approverKey: 'manager' });
    } else if (cfg.reviewMode === 'both') {
       nodes.push({ order: order++, type: 'review', label: '?´ì˜?´ë‹¹??, approverKey: 'manager' });
       nodes.push({ order: order++, type: 'review', label: 'ì´ê´„?´ë‹¹??, approverKey: 'admin' });
    }
    
  } else {
    // Fallback: ë°±ì˜¤?¼ìŠ¤ ?°ì´?°ê? ?†ì„ ê²½ìš° ê¸°ë³¸ê°?
    nodes.push({ order: 1, type: 'approval', label: 'ê²°ì¬??, approverKey: 'leader' });
  }

  return nodes;
}

// ?ì‹  ëª¨ë‹¬ ?´ê¸° (S-3 ê³ ë„?? ?ˆì‚° ?”ì•½ + ê³„ì • ?•ë³´ + ê²°ì¬??
function _aprOpenModal(items) {
  _injectAprSubmitModal();
  const modal = document.getElementById('apr-submit-modal');
  if (!modal) return;

  // ?œëª© ?ë™ ?ì„±
  const titleEl = document.getElementById('apr-doc-title');
  if (titleEl) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    titleEl.value = items.length === 1
      ? `${items[0].title} ?ì‹ `
      : `êµìœ¡ ${items.length}ê±??¼ê´„ ?ì‹  (${today})`;
  }

  // ì²¨ë? ??ª© ëª©ë¡ + ?ˆì‚° ?”ì•½ ê³„ì‚° (_aprSelectedItems ì°¸ì¡°)
  const totalAmt = items.reduce((sum, item) => {
    const sel = _aprSelectedItems.get(item.id);
    return sum + (sel?.amount || 0);
  }, 0);
  const acctCodes = [...new Set(items.map(item => _aprSelectedItems.get(item.id)?.account || '').filter(Boolean))];
  const accountCode = acctCodes[0] || '';
  const multiAcct = acctCodes.length > 1;

  const listEl = document.getElementById('apr-modal-items-list');
  if (listEl) {
    listEl.innerHTML = `
      <div style="margin-bottom:10px">
        ${items.map((item, i) => {
          const sel = _aprSelectedItems.get(item.id);
          const amt = sel?.amount || 0;
          return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F3F4F6;font-size:12px">
            <span style="color:#374151;font-weight:700">${i + 1}. ${item.title}</span>
            <span style="color:#002C5F;font-weight:900">${amt.toLocaleString()}??/span>
          </div>`;
        }).join('')}
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;font-weight:900;color:#002C5F">
          <span>?©ê³„</span><span>${totalAmt.toLocaleString()}??/span>
        </div>
      </div>
      ${multiAcct ? `<div style="font-size:11px;color:#EF4444;padding:6px 8px;background:#FEF2F2;border-radius:6px;margin-top:6px">? ï¸ ?œë¡œ ?¤ë¥¸ ?ˆì‚°ê³„ì •??ê±´ì´ ?¬í•¨?˜ì–´ ?ˆìŠµ?ˆë‹¤. ê°™ì? ê³„ì •??ê±´ë§Œ ëª¨ì•„ ?ì‹ ?˜ëŠ” ê²ƒì„ ê¶Œì¥?©ë‹ˆ??</div>` : acctCodes.length ? `<div style="font-size:11px;color:#6B7280">?ˆì‚°ê³„ì •: <strong>${acctCodes[0]}</strong></div>` : ''}`;
  }

  // ê²°ì¬???œê°??
  let stage = 'apply';
  if (items.length > 0 && items[0]._type === 'plan') {
    const planType = items[0].item?.plan_type;
    if (planType === 'business') {
      stage = 'business';
    } else {
      stage = 'operation';
    }
  }
  const approvalNodes = _calculateApprovalLine(accountCode, totalAmt, stage);
  const lineEl = document.getElementById('apr-modal-approval-line');
  if (lineEl) {
    lineEl.innerHTML = `
      <div style="margin-top:14px;background:#F9FAFB;padding:12px;border-radius:10px;border:1px solid #E5E7EB">
        <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">ê²°ì¬???•ë³´</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:700;color:#059669;background:#ECFDF5;padding:4px 8px;border-radius:6px;border:1px solid #A7F3D0">ê¸°ì•ˆ??/span>
          ${approvalNodes.length > 0 ? approvalNodes.map(n => `
            <span style="color:#9CA3AF;font-size:10px">??/span>
            <span style="font-size:11px;font-weight:700;color:#1D4ED8;background:#EFF6FF;padding:4px 8px;border-radius:6px;border:1px solid #BFDBFE">${n.label}</span>
          `).join('') : `
            <span style="color:#9CA3AF;font-size:10px">??/span>
            <span style="font-size:11px;font-weight:700;color:#8B5CF6;background:#EDE9FE;padding:4px 8px;border-radius:6px;border:1px solid #C4B5FD">?ë™ ?¹ì¸ (?„ê²°)</span>
          `}
        </div>
      </div>
    `;
  }

  // [S-7] ?µí•©ê²°ì¬ ?¬ë? ê°ì? ???‘ì¡°ì²?ì°¸ì¡°ì²??¹ì…˜ ?™ì  ?½ì…
  let isIntegrated = false;
  if (accountCode && typeof SERVICE_POLICIES !== 'undefined' && SERVICE_POLICIES.length > 0) {
    const matchedPol = SERVICE_POLICIES.find(pol =>
      (pol.accountCodes || []).some(c => accountCode.includes(c))
    );
    const cfg = matchedPol?.approvalConfig?.[stage];
    if (cfg && (cfg.approvalType === 'hmg' || cfg.approvalType === 'integrated')) {
      isIntegrated = true;
    }
  }
  const intgWrapper = document.getElementById('apr-integrated-wrapper');
  if (intgWrapper) {
    intgWrapper.innerHTML = '';
    if (isIntegrated) {
      intgWrapper.innerHTML = `
      <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;padding:14px 16px;margin-top:14px">
        <div style="font-size:11px;font-weight:900;color:#1D4ED8;margin-bottom:10px">?”— ?µí•©ê²°ì¬ ???‘ì¡°ì²?ì°¸ì¡°ì²?/div>
        <div style="margin-bottom:10px">
          <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:5px">?‘ì¡°ì²?<span style="color:#6B7280;font-weight:400">(?¼í‘œ êµ¬ë¶„)</span></label>
          <input id="apr-coop-input" type="text" placeholder="?? êµìœ¡?‘ì¡°ì²? ?¸ì‚¬?€"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:600;color:#374151"
            onfocus="this.style.borderColor='#1D4ED8'" onblur="this.style.borderColor='#BFDBFE'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:5px">ì°¸ì¡°ì²?<span style="color:#6B7280;font-weight:400">(?¼í‘œ êµ¬ë¶„)</span></label>
          <input id="apr-ref-input" type="text" placeholder="?? ?¬ê²½?€, ?„ëµê¸°íš?€"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:600;color:#374151"
            onfocus="this.style.borderColor='#1D4ED8'" onblur="this.style.borderColor='#BFDBFE'">
        </div>
      </div>`;
    }
  }

  modal.style.display = 'flex';
}

// ëª¨ë‹¬ ?«ê¸°
function _aprCloseModal() {
  const modal = document.getElementById('apr-submit-modal');
  if (modal) modal.style.display = 'none';
}

// ?ì‹  ?•ì • ??submission_documents + submission_items ?ì„± + status ??submitted
async function _aprConfirmSubmit() {
  const titleEl = document.getElementById('apr-doc-title');
  const contentEl = document.getElementById('apr-doc-content');
  const docTitle = titleEl?.value?.trim();
  const docContent = contentEl?.value?.trim() || '';

  if (!docTitle) {
    alert('?ì‹  ?œëª©???…ë ¥?´ì£¼?¸ìš”.');
    titleEl?.focus();
    return;
  }
  if (_aprSelectedItems.size === 0) {
    alert('?ì‹ ????ª©???†ìŠµ?ˆë‹¤.');
    return;
  }
  
  if (!confirm('?ì‹ ?˜ì‹œê² ìŠµ?ˆê¹Œ?')) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  try {
    const selectedArr = [..._aprSelectedItems.values()];
    const now = new Date().toISOString();

    // ?€?€ ê³„ì •ì½”ë“œÂ·ì´ì•¡ ì§‘ê³„ (_aprSelectedItems ê¸°ì?)
    const totalAmount = selectedArr.reduce((sum, sel) => sum + (sel.amount || 0), 0);
    const acctCodes = [...new Set(selectedArr.map(sel => sel.account || '').filter(Boolean))];
    const accountCode = acctCodes[0] || null;

    // [S-7] ?µí•©ê²°ì¬ ?¬ë? + ?‘ì¡°ì²?ì°¸ì¡°ì²??˜ì§‘
    const acct = accountCode || '';
    let approvalSystem = 'platform';
    let coopTeams = [];
    let referenceTeams = [];
    
    const firstItem = Array.from(_aprSelectedItems.values())[0];
    let stage = 'apply';
    if (firstItem && firstItem.type === 'plan') {
      stage = firstItem.plan_type === 'business' ? 'business' : 'operation';
    }
    
    if (acct && typeof SERVICE_POLICIES !== 'undefined') {
      const matchedPol = SERVICE_POLICIES.find(pol =>
        (pol.accountCodes || []).some(c => acct.includes(c))
      );
      const cfg = matchedPol?.approvalConfig?.[stage];
      if (cfg && (cfg.approvalType === 'hmg' || cfg.approvalType === 'integrated')) {
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

    // [S-8] approval_nodes ?ë™ êµ¬ì„±
    let approvalNodes = _calculateApprovalLine(accountCode, totalAmount, stage);
    const isAutoApprove = approvalNodes.length === 0;

    // doc_type ?Œìƒ: item ? í˜•?ì„œ ?ë™ ê²°ì •
    const itemTypes = [...new Set(selectedArr.map(sel =>
      sel.table === 'plans' ? 'plan' : 'application'
    ))];
    const docType = itemTypes.length === 1 ? itemTypes[0] : 'plan';

    // 1. submission_documents ???ì„± (S-1 ?Œì´ë¸??œìš©, id??DB auto UUID)
    const docRow = {
      tenant_id: currentPersona.tenantId,
      submission_type: stage === 'business' ? 'team_business' : 'fo_user',
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
      current_node_order: isAutoApprove ? 99 : 0,
      doc_type: docType,
      coop_teams: coopTeams.length > 0 ? coopTeams : [],
      reference_teams: referenceTeams.length > 0 ? referenceTeams : [],
      status: isAutoApprove ? 'approved' : 'submitted',
      submitted_at: now,
    };

    try {
      const { data: insertedDoc, error: insertErr } = await sb.from('submission_documents').insert(docRow).select('id').single();
      if (insertErr) throw insertErr;
      const docId = insertedDoc?.id;
      if (!docId) throw new Error('submission_documents insert ??id ë¯¸ë°˜??);
      console.log('[_aprConfirmSubmit] ?ì‹  ë¬¸ì„œ ?ì„±:', docId);

      // 2. submission_items ??ê±´ë³„ ?°ê²° ???½ì… (?¤ì œ DB ì»¬ëŸ¼??ë§ê²Œ)
      const itemRows = selectedArr.map((sel, idx) => {
        const item = _aprSavedData.find(d => String(d.id) === String(sel.id));
        return {
          submission_id: docId,
          item_type: sel.table === 'plans' ? 'plan' : 'application',
          item_id: String(sel.id),
          item_title: item?.title || String(sel.id),
          item_amount: item?.amount || 0,
          item_status_at_submit: item?.status || 'saved',
          final_status: isAutoApprove ? 'approved' : 'pending',
          sort_order: idx,
        };
      });
      await sb.from('submission_items').insert(itemRows);
      console.log('[_aprConfirmSubmit] ?ì‹  ??ª© ?°ê²°:', itemRows.length, 'ê±?);

      // [S-9] ?ˆì‚° ?ˆì•½ ???ì‹  ??frozen_amount ì¦ê?
      if (totalAmount > 0 && accountCode) {
        _s9ReserveBudget(sb, {
          submissionId: docId,
          submitterId: currentPersona.id,
          submitterName: currentPersona.name,
          tenantId: currentPersona.tenantId,
          accountCode,
          amount: totalAmount,
        }).catch(e => console.warn('[S-9] ?ˆì‚° ?ˆì•½ ?¤íŒ¨:', e.message));
      }
    } catch (e) {
      console.warn('[_aprConfirmSubmit] submission ?Œì´ë¸??½ì… ?¤íŒ¨ (ë¬´ì‹œ):', e.message);
    }

    // 3. ê°???ª© status ??'pending' or 'approved' (saved ??pending/approved, ?™ê???? ê¸ˆ)
    const targetStatus = isAutoApprove ? 'approved' : 'pending';
    const errors = [];
    for (const sel of selectedArr) {
      try {
        const { error } = await sb
          .from(sel.table)
          .update({ status: targetStatus, updated_at: now })
          .eq('id', sel.id)
          .in('status', ['saved', 'pending']); // pending ?ˆê±°?œë„ ?ˆìš©
        if (error) errors.push(error.message);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      alert('? ï¸ ?¼ë? ??ª© ?ì‹  ?¤íŒ¨:\n' + errors.join('\n'));
    } else {
      if (isAutoApprove) {
        alert(`???„ê²°(?ë™ ?¹ì¸) ì²˜ë¦¬?˜ì—ˆ?µë‹ˆ??\n\n?œëª©: ${docTitle}\n??ª© ?? ${selectedArr.length}ê±????©ê³„: ${totalAmount.toLocaleString()}??);
      } else {
        alert(`???ì‹  ?„ë£Œ!\n\n?œëª©: ${docTitle}\n??ª© ?? ${selectedArr.length}ê±????©ê³„: ${totalAmount.toLocaleString()}??n\n?´ë‹¹??ê²€????ê²°ì¬? ì´ ?ë™ êµ¬ì„±?©ë‹ˆ??`);
      }
    }

    _aprCloseModal();
    _aprSelectedItems.clear();

    // 4. ?ì‹  ?„ë£Œ ??UI ì²˜ë¦¬
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
    
    // ê²°ì¬?¨ìœ¼ë¡??´ë™ (?¬ìš©???”ì²­)
    if (typeof navigate === 'function') {
      navigate('approval-member');
    } else if (typeof navigateTo === 'function') {
      navigateTo('approval-member');
    } else {
      window.location.hash = 'approval-member';
      window.location.reload();
    }
  } catch (err) {
    alert('?ì‹  ì²˜ë¦¬ ?¤íŒ¨: ' + err.message);
    console.error('[_aprConfirmSubmit]', err.message);
  }
}


// ?€?€?€ E-5 / A-3: ?ì‹  ?Œìˆ˜ (submitted ??saved) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// [A-3] current_node_order === 0 + docStatus ê¸°ë°˜ ?„ê²©???Œìˆ˜ ê²€ì¦?
async function _aprRecallSubmit(id, table) {
  if (!confirm('????ª©???ì‹ ???Œìˆ˜?˜ì‹œê² ìŠµ?ˆê¹Œ?\n\n???€?¥ì™„ë£??íƒœë¡?ë³µê??©ë‹ˆ??\n???˜ì • ???¤ì‹œ ?ì‹ ?????ˆìŠµ?ˆë‹¤.')) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  try {
    // [A-3] 1?¨ê³„: submission_documents ì¡°íšŒ ??current_node_order ê²€ì¦?
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
            alert('? ï¸ ê²°ì¬ê°€ ?„ë£Œ????ª©?€ ?Œìˆ˜?????†ìŠµ?ˆë‹¤.');
            return;
          }
          if (subDoc.status === 'in_review') {
            alert('? ï¸ ?´ë‹¹?ê? ê²€??ì¤‘ì…?ˆë‹¤.\nê²€???„ë£Œ ??ë°˜ë ¤?????ˆìŠµ?ˆë‹¤. (PRD Q2)');
            return;
          }
          if (curOrder > 0) {
            alert(`? ï¸ ê²°ì¬ê°€ ${curOrder + 1}?¨ê³„ê¹Œì? ì§„í–‰?˜ì—ˆ?µë‹ˆ??\n?´ë‹¹?ì—ê²?ë°˜ë ¤ë¥??”ì²­?˜ì„¸??`);
            return;
          }
          // curOrder === 0 && status in [submitted, pending] ???Œìˆ˜ ê°€??
        }
      }
    } catch(e) {
      // submission_doc ?†ìŒ (?ˆê±°?? ??DB status ê¸°ë°˜ ?´ë°± ê²€??
      const { data: cur } = await sb.from(table).select('status').eq('id', id).single();
      if (['approved','in_review'].includes(cur?.status)) {
        alert('? ï¸ ê²°ì¬ê°€ ?´ë? ì§„í–‰ ì¤‘ì´ê±°ë‚˜ ?„ë£Œ????ª©?€ ?Œìˆ˜?????†ìŠµ?ˆë‹¤.');
        return;
      }
    }

    // [A-3] 2?¨ê³„: ?™ê???? ê¸ˆ?¼ë¡œ savedë¡??…ë°?´íŠ¸
    const { error: recallErr } = await sb.from(table).update({
      status: 'saved',
      updated_at: new Date().toISOString(),
    }).eq('id', id).in('status', ['pending', 'submitted']);
    if (recallErr) throw recallErr;

    // [S-9] ?°ê²°??submission_documents ì°¾ì•„ ?ˆì‚° ?ˆì•½ ?´ì œ
    sb.from('submission_items').select('submission_id').eq('item_id', id)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data: si }) => {
        if (!si?.submission_id) return;
        _s9ReleaseBudget(sb, { submissionId: si.submission_id, reason: 'recalled' }).catch(() => {});
        sb.from('submission_documents').update({ status: 'recalled', recalled_at: new Date().toISOString() })
          .eq('id', si.submission_id).catch(() => {});
      }).catch(() => {});

    alert('???ì‹ ???Œìˆ˜?˜ì—ˆ?µë‹ˆ??\n\n?€?¥ì™„ë£??íƒœë¡?ë³µê??©ë‹ˆ?? ?˜ì • ???¤ì‹œ ?ì‹ ?????ˆìŠµ?ˆë‹¤.');

    // ëª©ë¡ ?ˆë¡œê³ ì¹¨
    _aprMemberLoaded = false;
    _aprMemberData = [];
    _aprSavedData = [];
    renderApprovalMember();
  } catch (err) {
    alert('?Œìˆ˜ ?¤íŒ¨: ' + err.message);
    console.error('[_aprRecallSubmit]', err.message);
  }
}

// ?€?€?€ S-5: plans.js ì¹´ë“œ ?ì‹  ë²„íŠ¼ ??ê²°ì¬???ì‹  ëª¨ë‹¬ ?°ê²° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function _aprSingleSubmitFromPlan(planId, planTitle) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  try {
    const { data: p, error } = await sb.from('plans')
      .select('id, edu_name, account_code, amount, status, applicant_name, plan_type')
      .eq('id', planId)
      .single();
    if (error) throw error;
    if (!p) return;

    if (typeof _aprSelectedItems !== 'undefined') _aprSelectedItems.clear();
    const item = {
      id: p.id,
      title: planTitle || `${p.applicant_name || '?€??} ??${p.edu_name || p.id}`,
      account: p.account_code || '',
      amount: p.amount || 0,
      _type: 'plan',
      item: p
    };

    if (typeof _aprSelectedItems !== 'undefined') {
      _aprSelectedItems.set(item.id, {
        id: item.id,
        table: 'plans',
        type: 'plan',
        account: item.account,
        amount: item.amount,
        plan_type: p.plan_type
      });
    }

    if (typeof _aprOpenModal === 'function') {
      _aprOpenModal([item]);
    }
  } catch (err) {
    alert('ê³„íš ?ì„¸ ì¡°íšŒ ?¤íŒ¨: ' + err.message);
  }
}


// ?€?€?€ #4: ?€???˜ìš”?ˆì¸¡ ê³„íš ?€???ì‹  (?€ë·????¼ê´„ ?ì‹  ëª¨ë‹¬) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// plans.js ?€ë·°ì—??teamSavedBar??"?¼ê´„ ?ì‹ " ë²„íŠ¼?????¨ìˆ˜ë¥??¸ì¶œ
// planIds: saved ?íƒœ???€??ê³„íš ID ë°°ì—´
async function _aprBulkSubmitFromTeam(planIds) {
  if (!planIds || planIds.length === 0) {
    alert('?ì‹ ??ê³„íš???†ìŠµ?ˆë‹¤.');
    return;
  }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  try {
    // DB?ì„œ ?´ë‹¹ ê³„íš ?ì„¸ ì¡°íšŒ (ê³„ì • ?™ì¼??ê²€ì¦?
    const { data: plans, error } = await sb.from('plans')
      .select('id, edu_name, account_code, amount, status, applicant_name, plan_type')
      .in('id', planIds)
      .eq('status', 'saved');
    if (error) throw error;
    if (!plans || plans.length === 0) {
      alert('?ì‹  ê°€?¥í•œ ê³„íš???†ìŠµ?ˆë‹¤. (?´ë? ?ì‹ ?ê±°???íƒœê°€ ë³€ê²½ë?????ˆìŠµ?ˆë‹¤)');
      return;
    }

    // ê³„ì • ?™ì¼??ê²€??
    const accounts = [...new Set(plans.map(p => p.account_code).filter(Boolean))];
    if (accounts.length > 1) {
      alert(`? ï¸ ?¼ê´„ ?ì‹ ?€ ê°™ì? ?ˆì‚° ê³„ì •ë§?ê°€?¥í•©?ˆë‹¤.\n\në°œê²¬??ê³„ì •: ${accounts.join(', ')}\n\n?™ì¼ ê³„ì •??ê³„íšë§?? íƒ??ì£¼ì„¸??`);
      return;
    }

    // _aprSelectedItems???±ë¡ ??ëª¨ë‹¬ ?¤í”ˆ
    if (typeof _aprSelectedItems !== 'undefined') _aprSelectedItems.clear();
    const items = plans.map(p => ({
      id: p.id,
      title: `${p.applicant_name || '?€??} ??${p.edu_name || p.id}`,
      account: p.account_code || '',
      amount: p.amount || 0,
      _type: 'plan',
      item: p
    }));

    // _aprSelectedItems??ì¶”ê?
    if (typeof _aprSelectedItems !== 'undefined') {
      items.forEach(item => {
        _aprSelectedItems.set(item.id, {
          id: item.id,
          table: 'plans',
          type: 'plan',
          account: item.account,
          amount: item.amount,
          plan_type: item.item.plan_type
        });
      });
    }

    // ëª¨ë‹¬ ?¤í”ˆ
    if (typeof _aprOpenModal === 'function') {
      _aprOpenModal(items);
    }

  } catch (err) {
    alert('?€??ê³„íš ì¡°íšŒ ?¤íŒ¨: ' + err.message);
    console.error('[_aprBulkSubmitFromTeam]', err.message);
  }
}

// ?€?€?€ Phase 3: ?€??BO ?„ë‹¬ / ë²ˆë“¤ ë°˜ë ¤ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

/**
 * ?€?¥ì´ team_forecast ë²ˆë“¤??BO ?´ì˜?´ë‹¹?ì—ê²??„ë‹¬
 * submission_documents.status = 'team_approved'
 */
async function _teamForecastBoTransfer(docId) {
  if (!confirm('?“¤ ???€ ?¬ì—…ê³„íš ë²ˆë“¤??BO ?´ì˜?´ë‹¹?ì—ê²??„ë‹¬?˜ì‹œê² ìŠµ?ˆê¹Œ?')) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }
  try {
    const { error } = await sb.from('submission_documents')
      .update({ status: 'team_approved', updated_at: new Date().toISOString() })
      .eq('id', docId);
    if (error) throw error;
    alert('??BO ?„ë‹¬ ?„ë£Œ! BO ?´ì˜?´ë‹¹???€?œë³´?œì—???•ì¸?????ˆìŠµ?ˆë‹¤.');
    _aprLeaderLoaded = false; _aprLeaderData = []; _aprSubDocData = [];
    renderApprovalLeader();
  } catch (err) {
    alert('???„ë‹¬ ?¤íŒ¨: ' + err.message);
    console.error('[_teamForecastBoTransfer]', err.message);
  }
}
window._teamForecastBoTransfer = _teamForecastBoTransfer;

/**
 * ?€?¥ì´ team_forecast ë²ˆë“¤??ë°˜ë ¤
 * - submission_documents.status = 'rejected'
 * - ?¬í•¨??plans.status = 'saved' (ë³µê?)
 */
async function _teamForecastReject(docId) {
  const reason = prompt('ë°˜ë ¤ ?¬ìœ ë¥??…ë ¥?´ì£¼?¸ìš” (?€?ë“¤?ê²Œ ?„ë‹¬?©ë‹ˆ??:');
  if (reason === null) return; // ì·¨ì†Œ
  if (!reason.trim()) { alert('ë°˜ë ¤ ?¬ìœ ë¥??…ë ¥?´ì£¼?¸ìš”.'); return; }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  try {
    const now = new Date().toISOString();

    // 1. ë²ˆë“¤ ë°˜ë ¤ ì²˜ë¦¬
    const { error: docErr } = await sb.from('submission_documents')
      .update({ status: 'rejected', reject_reason: reason, rejected_at: now, updated_at: now })
      .eq('id', docId);
    if (docErr) throw docErr;

    // 2. ?¬í•¨??plansë¥?savedë¡?ë³µê?
    const { data: sItems } = await sb.from('submission_items')
      .select('item_id, item_type')
      .eq('submission_id', docId);
    if (sItems && sItems.length > 0) {
      for (const si of sItems) {
        if (si.item_type === 'plan') {
          await sb.from('plans')
            .update({ status: 'saved', reject_reason: reason, updated_at: now })
            .eq('id', si.item_id);
        }
      }
    }

    alert(`??ë²ˆë“¤ ë°˜ë ¤ ?„ë£Œ\n?¬ìœ : ${reason}\n\n?¬í•¨??ê³„íš??ëª¨ë‘ '?€?¥ì™„ë£? ?íƒœë¡?ë³µê??˜ì—ˆ?µë‹ˆ??\n?€?ë“¤???¬í™•?•í•  ???ˆìŠµ?ˆë‹¤.`);
    _aprLeaderLoaded = false; _aprLeaderData = []; _aprSubDocData = [];
    renderApprovalLeader();
  } catch (err) {
    alert('??ë°˜ë ¤ ì²˜ë¦¬ ?¤íŒ¨: ' + err.message);
    console.error('[_teamForecastReject]', err.message);
  }
}
window._teamForecastReject = _teamForecastReject;
