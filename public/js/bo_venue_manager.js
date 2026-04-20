
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ 교육장소 관리 탭 (Phase 3)
//    DB: edu_venues (tenant_id, venue_type, name, address, capacity, daily_rate)
//    사내(internal) / 사외(external) 탭 구분
//    calc_grounds 대관비 단가 연동 (daily_rate)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

var _fbVenueCache = [];          // 로드된 교육장소 목록
var _fbVenueSubTab = "internal"; // "internal" | "external"

async function _fbLoadVenues() {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const tenantId = _fbTenantId || boCurrentPersona.tenantId || "HMC";
    const { data, error } = await sb
      .from("edu_venues")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("venue_type")
      .order("sort_order");
    if (error) throw error;
    _fbVenueCache = data || [];
  } catch (e) {
    console.warn("[edu_venues] 로드 실패:", e.message);
    _fbVenueCache = [];
  }
}

function _fbVenueSwitchSub(sub) {
  _fbVenueSubTab = sub;
  document.getElementById("fb-venue-content").innerHTML =
    _fbRenderVenueList(_fbVenueSubTab === "internal" ? "internal" : "external");
}

function _fbRenderVenueManager() {
  const tenantName =
    (typeof TENANTS !== "undefined" ? TENANTS : []).find(
      (t) => t.id === (_fbTenantId || "HMC")
    )?.name || _fbTenantId || "HMC";

  const inActive = _fbVenueSubTab === "internal";
  const exActive = _fbVenueSubTab === "external";

  return `
<div class="bo-fade">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div style="font-size:13px;font-weight:900;color:#111827">🏢 교육장소 관리</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">FO 신청서의 교육장소 드롭다운 항목을 관리합니다 — ${tenantName}</div>
    </div>
    <button class="bo-btn-primary" onclick="fbOpenVenueModal(null)"
      style="padding:9px 18px;font-size:13px">
      ＋ 교육장소 추가
    </button>
  </div>

  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:20px">
    <button onclick="_fbVenueSwitchSub('internal')"
      style="padding:9px 20px;border:none;background:none;cursor:pointer;font-size:13px;
             font-weight:${inActive ? "900" : "600"};
             color:${inActive ? "#2563EB" : "#6B7280"};
             border-bottom:${inActive ? "3px solid #2563EB" : "3px solid transparent"};
             margin-bottom:-2px">
      🏛️ 사내 교육장소
    </button>
    <button onclick="_fbVenueSwitchSub('external')"
      style="padding:9px 20px;border:none;background:none;cursor:pointer;font-size:13px;
             font-weight:${exActive ? "900" : "600"};
             color:${exActive ? "#059669" : "#6B7280"};
             border-bottom:${exActive ? "3px solid #059669" : "3px solid transparent"};
             margin-bottom:-2px">
      🌍 사외 교육기관
    </button>
  </div>

  <div id="fb-venue-content">
    ${_fbRenderVenueList(_fbVenueSubTab)}
  </div>
</div>

<div id="fb-venue-modal"
  style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;padding:28px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h3 id="venue-modal-title" style="margin:0;font-size:16px;font-weight:900;color:#111827">교육장소 추가</h3>
      <button onclick="document.getElementById('fb-venue-modal').style.display='none'"
        style="border:none;background:none;font-size:22px;cursor:pointer;color:#6B7280">×</button>
    </div>
    <div id="venue-modal-body"></div>
  </div>
</div>`;
}

function _fbRenderVenueList(type) {
  const venues = _fbVenueCache.filter((v) => v.venue_type === type);
  const isInternal = type === "internal";
  const hs = "padding:10px 12px;font-size:11px;font-weight:800;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB;white-space:nowrap";

  if (venues.length === 0) {
    return `<div style="padding:48px;text-align:center;background:#F9FAFB;border-radius:16px;border:1px dashed #D1D5DB">
      <div style="font-size:32px;margin-bottom:8px">${isInternal ? "🏛️" : "🌍"}</div>
      <div style="font-size:14px;font-weight:700;color:#374151">등록된 ${isInternal ? "사내 교육장소" : "사외 교육기관"}이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:4px">상단 "교육장소 추가" 버튼으로 추가하세요</div>
    </div>`;
  }

  const rows = venues.map((v, idx) => {
    const activeBg = v.active ? "#D1FAE5" : "#F3F4F6";
    const activeColor = v.active ? "#065F46" : "#9CA3AF";
    const safeId = String(v.id).replace(/'/g, "\\'");
    return `<tr style="border-bottom:1px solid #F3F4F6;transition:background .1s"
      onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''">
  <td style="padding:10px 12px;text-align:center;color:#9CA3AF;font-size:12px">${idx + 1}</td>
  <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111827">${v.name}</td>
  <td style="padding:10px 12px;font-size:11px;color:#6B7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.address || "—"}</td>
  <td style="padding:10px 12px;text-align:center;font-size:12px;color:#374151">${v.capacity ? v.capacity.toLocaleString() + "명" : "—"}</td>
  ${isInternal ? `<td style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:${v.daily_rate > 0 ? "#1D4ED8" : "#9CA3AF"}">
    ${v.daily_rate > 0 ? "₩" + Number(v.daily_rate).toLocaleString() + "/일" : "무료"}
  </td>` : ""}
  <td style="padding:10px 12px;text-align:center">
    <span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;background:${activeBg};color:${activeColor}">
      ${v.active ? "✅ 활성" : "⏸ 비활성"}
    </span>
  </td>
  <td style="padding:8px 10px;text-align:center">
    <div style="display:flex;gap:4px;justify-content:center">
      <button onclick="fbOpenVenueModal('${safeId}')"
        style="font-size:10px;padding:4px 8px;border-radius:6px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151">✏️ 수정</button>
      <button onclick="fbToggleVenueActive('${safeId}',${v.active})"
        style="font-size:10px;padding:4px 8px;border-radius:6px;border:1.5px solid ${v.active ? "#F59E0B" : "#059669"};background:white;cursor:pointer;font-weight:700;color:${v.active ? "#F59E0B" : "#059669"}">
        ${v.active ? "⏸ 비활성" : "▶ 활성"}
      </button>
      <button onclick="fbDeleteVenue('${safeId}')"
        style="font-size:10px;padding:4px 8px;border-radius:6px;border:1.5px solid #FECACA;background:#FEF2F2;cursor:pointer;font-weight:700;color:#DC2626">🗑️</button>
    </div>
  </td>
</tr>`;
  }).join("");

  return `<div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:8px">
  ${isInternal ? "사내 교육장소" : "사외 교육기관"} (${venues.length}개)
  ${isInternal ? '<span style="font-size:10px;color:#1D4ED8;font-weight:400;margin-left:8px">💡 대관비/일 → 세부산출근거 자동 연동</span>' : ""}
</div>
<div style="overflow-x:auto;border:1px solid #E5E7EB;border-radius:12px;background:#fff">
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr>
        <th style="${hs};text-align:center;width:40px">NO.</th>
        <th style="${hs}">장소명</th>
        <th style="${hs}">주소</th>
        <th style="${hs};width:70px;text-align:center">수용인원</th>
        ${isInternal ? `<th style="${hs};width:110px;text-align:right">대관비/일</th>` : ""}
        <th style="${hs};width:70px;text-align:center">상태</th>
        <th style="${hs};width:200px;text-align:center">관리</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function fbOpenVenueModal(venueId) {
  const v = venueId ? _fbVenueCache.find((x) => x.id === venueId) : null;
  const modal = document.getElementById("fb-venue-modal");
  document.getElementById("venue-modal-title").textContent = v ? `"${v.name}" 수정` : "교육장소 추가";
  const isInternal = v ? v.venue_type === "internal" : _fbVenueSubTab === "internal";

  document.getElementById("venue-modal-body").innerHTML = `
<div style="display:grid;gap:12px">
  <div>
    <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">구분 *</label>
    <div style="display:flex;gap:8px">
      <label id="vl-int" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 14px;border-radius:8px;border:2px solid ${isInternal ? "#2563EB" : "#E5E7EB"};background:${isInternal ? "#EFF6FF" : "#F9FAFB"}">
        <input type="radio" name="v-type" value="internal" ${isInternal ? "checked" : ""}
          onchange="document.getElementById('vr-row').style.display='';document.getElementById('vl-int').style.borderColor='#2563EB';document.getElementById('vl-int').style.background='#EFF6FF';document.getElementById('vl-ext').style.borderColor='#E5E7EB';document.getElementById('vl-ext').style.background='#F9FAFB'">
        <span style="font-size:12px;font-weight:800;color:#1D4ED8">🏛️ 사내</span>
      </label>
      <label id="vl-ext" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 14px;border-radius:8px;border:2px solid ${!isInternal ? "#059669" : "#E5E7EB"};background:${!isInternal ? "#ECFDF5" : "#F9FAFB"}">
        <input type="radio" name="v-type" value="external" ${!isInternal ? "checked" : ""}
          onchange="document.getElementById('vr-row').style.display='none';document.getElementById('vl-ext').style.borderColor='#059669';document.getElementById('vl-ext').style.background='#ECFDF5';document.getElementById('vl-int').style.borderColor='#E5E7EB';document.getElementById('vl-int').style.background='#F9FAFB'">
        <span style="font-size:12px;font-weight:800;color:#059669">🌍 사외</span>
      </label>
    </div>
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">장소명 *</label>
    <input id="v-name" value="${v?.name || ""}" type="text" placeholder="예) 인재개발원 (마북)"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">주소</label>
    <input id="v-address" value="${v?.address || ""}" type="text" placeholder="경기도 용인시 기흥구 마북로 162"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div>
      <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">수용인원 (명)</label>
      <input id="v-capacity" value="${v?.capacity || ""}" type="number" min="0" placeholder="300"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div id="vr-row" style="${isInternal ? "" : "display:none"}">
      <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">대관비 (원/일)</label>
      <input id="v-daily-rate" value="${v?.daily_rate || 0}" type="number" min="0" placeholder="500000"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
  </div>
  ${isInternal ? '<div style="font-size:10px;color:#1D4ED8;background:#EFF6FF;padding:8px 12px;border-radius:6px">💡 대관비 단가 설정 시, 이 장소 선택 → 세부산출근거 대관비 자동 적용</div>' : ""}
  <div>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="v-active" ${!v || v.active ? "checked" : ""} style="width:15px;height:15px;accent-color:#059669">
      <span style="font-size:12px;font-weight:700;color:#374151">활성 상태 (FO 드롭다운에 노출)</span>
    </label>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;padding-top:16px;border-top:1px solid #F3F4F6">
    <button onclick="document.getElementById('fb-venue-modal').style.display='none'"
      class="bo-btn-secondary" style="padding:9px 18px">취소</button>
    <button onclick="fbSaveVenue('${venueId || ""}')" class="bo-btn-primary" style="padding:9px 22px">💾 저장</button>
  </div>
</div>`;

  modal.style.display = "flex";
}

async function fbSaveVenue(venueId) {
  const name = document.getElementById("v-name").value.trim();
  if (!name) { alert("장소명을 입력해 주세요."); return; }
  const venueType = document.querySelector('input[name="v-type"]:checked')?.value || "internal";
  const address = document.getElementById("v-address").value.trim() || null;
  const capacity = parseInt(document.getElementById("v-capacity").value) || null;
  const dailyRate = parseFloat(document.getElementById("v-daily-rate")?.value) || 0;
  const active = document.getElementById("v-active").checked;
  const tenantId = _fbTenantId || boCurrentPersona.tenantId || "HMC";
  const payload = { tenant_id: tenantId, venue_type: venueType, name, address, capacity, daily_rate: dailyRate, active };
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) throw new Error("Supabase 연결 실패");
    if (venueId) {
      const { error } = await sb.from("edu_venues").update(payload).eq("id", venueId);
      if (error) throw error;
    } else {
      payload.sort_order = _fbVenueCache.filter((v) => v.venue_type === venueType).length + 1;
      const { error } = await sb.from("edu_venues").insert(payload);
      if (error) throw error;
    }
    document.getElementById("fb-venue-modal").style.display = "none";
    await _fbLoadVenues();
    document.getElementById("fb-venue-content").innerHTML = _fbRenderVenueList(_fbVenueSubTab);
    _fbShowToast(`✅ "${name}" ${venueId ? "수정" : "등록"} 완료`);
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

async function fbToggleVenueActive(venueId, currentActive) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) throw new Error("Supabase 연결 실패");
    const { error } = await sb.from("edu_venues").update({ active: !currentActive }).eq("id", venueId);
    if (error) throw error;
    await _fbLoadVenues();
    document.getElementById("fb-venue-content").innerHTML = _fbRenderVenueList(_fbVenueSubTab);
    _fbShowToast(currentActive ? "⏸ 비활성화했습니다" : "✅ 활성화했습니다");
  } catch (e) {
    alert("변경 실패: " + e.message);
  }
}

async function fbDeleteVenue(venueId) {
  const v = _fbVenueCache.find((x) => x.id === venueId);
  if (!confirm(`"${v?.name || "이 교육장소"}"를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) throw new Error("Supabase 연결 실패");
    const { error } = await sb.from("edu_venues").delete().eq("id", venueId);
    if (error) throw error;
    await _fbLoadVenues();
    document.getElementById("fb-venue-content").innerHTML = _fbRenderVenueList(_fbVenueSubTab);
    _fbShowToast(`🗑️ "${v?.name}" 삭제 완료`);
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
}
