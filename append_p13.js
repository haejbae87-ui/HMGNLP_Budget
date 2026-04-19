
// ── P13: 수요예측 묶음 상신(교육조직 묶음) 처리 로직 ──────────────────────────
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
            <input type="text" id="boOrgBundleTitle" value="2026년 교육조직 수요예측 묶음 상신 (${docs.length}개 팀)"
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
    
    // 1) org_forecast 생성
    const { data: newDoc, error: insertErr } = await sb.from("submission_documents").insert({
      tenant_id: tenantId,
      submission_type: "org_forecast",
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
    
    // 2) 팀 묶음(team_forecast) 들의 parent_submission_id 업데이트 및 상태 in_review로 변경
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
