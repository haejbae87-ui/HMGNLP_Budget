// bo_badge_operation.js
// 뱃지 심사 및 학습자 현황 (운영자 전용)
// 필터: 회사(tenant) + 교육조직(vorg) + 뱃지그룹 + 오류 수정

let requestsData = [];
let progressData = [];
let _opBadgeGroups = [];
let _opVorgTemplates = [];
let _opAllBadges = [];
let _opFilterTenantId = "";
let _opFilterVorgId = "";
let _opFilterGroupId = "";

async function renderBadgeOperation() {
  const container = document.getElementById("bo-content");
  const isSuperAdmin = boCurrentPersona?.role === "platform_admin";
  const myTenantId = boCurrentPersona?.tenantId || "HMC";
  _opFilterTenantId = myTenantId;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="font-size:22px;font-weight:900;color:var(--text-main);margin:0;letter-spacing:-0.5px">
        🤝 뱃지 심사 및 현황
      </h2>
      <div style="display:flex;gap:8px">
        <button onclick="forceAwardBadge()"
          style="padding:8px 16px;background:#1e293b;color:#fff;border:none;border-radius:8px;
                 font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
          직권 임의 발급
        </button>
      </div>
    </div>

    <!-- 필터 바 -->
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:700;color:var(--text-sub);white-space:nowrap">🔍 조회 조건</span>
      ${
        isSuperAdmin
          ? `
      <select id="op-filter-tenant" onchange="onOpTenantChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:130px">
        <option value="">전체 회사</option>
      </select>`
          : `<span style="font-size:13px;font-weight:700;color:var(--text-main);padding:7px 12px;background:#f1f5f9;border-radius:7px">${myTenantId}</span>`
      }
      <select id="op-filter-vorg" onchange="onOpVorgChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:180px">
        <option value="">전체 교육조직</option>
      </select>
      <select id="op-filter-group" onchange="_opFilterGroupId=this.value;_reloadOpData()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:150px">
        <option value="">전체 뱃지그룹</option>
      </select>
      <button onclick="_reloadOpData()"
        style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer">
        조회
      </button>
    </div>

    <!-- 탭 UI -->
    <div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:24px">
      <button id="tab-requests" onclick="switchOpTab('requests')"
        style="padding:12px 20px;background:#fff;border:1px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;font-size:14px;font-weight:800;color:var(--brand);margin-bottom:-1px;position:relative;z-index:2">
        수동 심사 요청
      </button>
      <button id="tab-tracker" onclick="switchOpTab('tracker')"
        style="padding:12px 20px;background:#f8fafc;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;font-size:14px;font-weight:700;color:var(--text-sub)">
        학습자 현황 트래커
      </button>
    </div>

    <!-- 심사 요청 탭 -->
    <div id="op-content-requests">
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px">
        <h4 style="margin:0 0 16px;font-size:15px;color:#334155">교육조직 내 수동 증빙 요청 건</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
          <thead>
            <tr style="border-bottom:2px solid var(--border);color:var(--text-sub)">
              <th style="padding:12px">요청 일자</th>
              <th style="padding:12px">사용자 ID</th>
              <th style="padding:12px">요청 뱃지명</th>
              <th style="padding:12px">증빙 자료</th>
              <th style="padding:12px">상태</th>
              <th style="padding:12px;text-align:right">심사</th>
            </tr>
          </thead>
          <tbody id="req-body">
            <tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 현황 트래커 탭 -->
    <div id="op-content-tracker" style="display:none">
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h4 style="margin:0;font-size:15px;color:#334155">뱃지별 진행 현황</h4>
          <div style="display:flex;gap:8px">
            <select id="filter-status" onchange="loadProgressData()"
              style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:12px">
              <option value="">모든 상태</option>
              <option value="IN_PROGRESS">과정 이수중</option>
              <option value="COURSE_COMPLETED">시험 자격 요건 충족 (시험 대기자)</option>
              <option value="ACTIVE">발급 완료</option>
              <option value="EXPIRED_SOON">강등/만료 임박 (30일내)</option>
              <option value="EXPIRED">기한 만료 / 강등됨</option>
            </select>
          </div>
        </div>
        
        <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
          <thead>
            <tr style="border-bottom:2px solid var(--border);color:var(--text-sub)">
              <th style="padding:12px">뱃지명</th>
              <th style="padding:12px">사용자 ID</th>
              <th style="padding:12px">상태</th>
              <th style="padding:12px">취득일</th>
              <th style="padding:12px">만료 예정일</th>
              <th style="padding:12px;text-align:right">액션</th>
            </tr>
          </thead>
          <tbody id="prog-body">
            <tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">현황 데이터를 불러오는 중...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await _opLoadTenants(isSuperAdmin, myTenantId);
  await _opLoadVorgs(_opFilterTenantId);
  await _reloadOpData();
}

// ─── 필터 데이터 로더 ────────────────────────────────────────────

async function _opLoadTenants(isSuperAdmin, myTenantId) {
  if (!isSuperAdmin) return;
  try {
    const { data } = await _sb()
      .from("tenants")
      .select("id, name")
      .order("name");
    const sel = document.getElementById("op-filter-tenant");
    if (!sel) return;
    sel.innerHTML =
      `<option value="">전체 회사</option>` +
      (data || [])
        .map(
          (t) =>
            `<option value="${t.id}"${t.id === myTenantId ? " selected" : ""}>${t.name}(${t.id})</option>`,
        )
        .join("");
    _opFilterTenantId = myTenantId;
    sel.value = myTenantId;
  } catch (e) {
    console.warn("[_opLoadTenants]", e.message);
  }
}

async function _opLoadVorgs(tenantId) {
  try {
    let q = _sb()
      .from("virtual_org_templates")
      .select("id, name")
      .eq("service_type", "badge")
      .order("name");
    if (tenantId) q = q.eq("tenant_id", tenantId);
    const { data } = await q;
    _opVorgTemplates = data || [];
    const sel = document.getElementById("op-filter-vorg");
    if (!sel) return;
    sel.innerHTML =
      `<option value="">전체 교육조직</option>` +
      _opVorgTemplates
        .map((v) => `<option value="${v.id}">${v.name}</option>`)
        .join("");
    _opFilterVorgId = "";
    const gsel = document.getElementById("op-filter-group");
    if (gsel) {
      gsel.innerHTML = `<option value="">전체 뱃지그룹</option>`;
    }
    _opFilterGroupId = "";
  } catch (e) {
    console.warn("[_opLoadVorgs]", e.message);
  }
}

async function _opLoadGroups(vorgId) {
  try {
    const tenantId = _opFilterTenantId || boCurrentPersona?.tenantId || "HMC";
    let q = _sb()
      .from("badge_groups")
      .select("id, name")
      .eq("tenant_id", tenantId);
    if (vorgId) q = q.eq("vorg_template_id", vorgId);
    const { data } = await q.order("name");
    _opBadgeGroups = data || [];
    const gsel = document.getElementById("op-filter-group");
    if (!gsel) return;
    gsel.innerHTML =
      `<option value="">전체 뱃지그룹</option>` +
      _opBadgeGroups
        .map((g) => `<option value="${g.id}">${g.name}</option>`)
        .join("");
    _opFilterGroupId = "";
  } catch (e) {
    console.warn("[_opLoadGroups]", e.message);
  }
}

async function onOpTenantChange() {
  const sel = document.getElementById("op-filter-tenant");
  _opFilterTenantId = sel ? sel.value : "";
  _opFilterVorgId = "";
  _opFilterGroupId = "";
  await _opLoadVorgs(_opFilterTenantId);
  await _reloadOpData();
}

async function onOpVorgChange() {
  const sel = document.getElementById("op-filter-vorg");
  _opFilterVorgId = sel ? sel.value : "";
  _opFilterGroupId = "";
  await _opLoadGroups(_opFilterVorgId);
  await _reloadOpData();
}

async function _reloadOpData() {
  await loadRequestsData();
  await loadProgressData();
}

// ─── 뱃지 ID 목록 수집 (그룹 필터 적용) ─────────────────────────

async function _getFilteredBadgeIds() {
  const tenantId = _opFilterTenantId || boCurrentPersona?.tenantId || "HMC";
  try {
    // 그룹 필터가 있으면 해당 그룹만, 없으면 vorg 기반 그룹만
    let groupIds = [];
    if (_opFilterGroupId) {
      groupIds = [_opFilterGroupId];
    } else {
      let gq = _sb()
        .from("badge_groups")
        .select("id")
        .eq("tenant_id", tenantId);
      if (_opFilterVorgId) gq = gq.eq("vorg_template_id", _opFilterVorgId);
      const { data: gData } = await gq;
      groupIds = (gData || []).map((g) => g.id);
    }

    if (groupIds.length === 0) return null; // 필터 없이 전체 조회

    const { data: bData } = await _sb()
      .from("badges")
      .select("id")
      .in("group_id", groupIds);
    _opAllBadges = bData || [];
    return _opAllBadges.map((b) => b.id);
  } catch (e) {
    console.warn("[_getFilteredBadgeIds]", e.message);
    return null;
  }
}

// ─── 심사 요청 데이터 ────────────────────────────────────────────

async function loadRequestsData() {
  const tbody = document.getElementById("req-body");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>`;

  try {
    const badgeIds = await _getFilteredBadgeIds();

    // badge_award_requests + badge 이름 별도 조회 (조인 오류 방어)
    let q = _sb()
      .from("badge_award_requests")
      .select(
        "id, user_id, badge_id, status, proof_file_url, admin_comment, requested_at, reviewed_at",
      )
      .order("requested_at", { ascending: false })
      .limit(200);

    if (badgeIds !== null && badgeIds.length > 0) {
      q = q.in("badge_id", badgeIds);
    }

    const { data: reqs, error } = await q;
    if (error) throw error;
    requestsData = reqs || [];

    // 뱃지명 일괄 조회 (별도 쿼리로 조인 오류 우회)
    const uniqueBadgeIds = [
      ...new Set(requestsData.map((r) => r.badge_id).filter(Boolean)),
    ];
    let badgeNameMap = {};
    if (uniqueBadgeIds.length > 0) {
      const { data: badgesInfo } = await _sb()
        .from("badges")
        .select("id, name")
        .in("id", uniqueBadgeIds);
      (badgesInfo || []).forEach((b) => {
        badgeNameMap[b.id] = b.name;
      });
    }
    requestsData = requestsData.map((r) => ({
      ...r,
      _badgeName: badgeNameMap[r.badge_id] || "Unknown",
    }));

    renderReqs();
  } catch (e) {
    console.error("[loadRequestsData]", e);
    const tb = document.getElementById("req-body");
    if (tb)
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444">⚠️ 조회 실패: ${e.message}</td></tr>`;
  }
}

function renderReqs() {
  const tbody = document.getElementById("req-body");
  if (!tbody) return;
  if (!requestsData.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af">대기 중인 요청이 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = requestsData
    .map((r) => {
      let stat = `<span style="color:#f59e0b;font-weight:700">심사 대기</span>`;
      if (r.status === "APPROVED")
        stat = `<span style="color:#10b981;font-weight:700">승인됨</span>`;
      if (r.status === "REJECTED")
        stat = `<span style="color:#ef4444;font-weight:700">반려됨</span>`;

      return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:14px;color:var(--text-sub)">${r.requested_at ? r.requested_at.substring(0, 10) : "-"}</td>
        <td style="padding:14px;font-weight:700">${r.user_id}</td>
        <td style="padding:14px;color:var(--brand);font-weight:700">${r._badgeName}</td>
        <td style="padding:14px">${r.proof_file_url ? `<a href="${r.proof_file_url}" target="_blank" style="color:#3b82f6;text-decoration:none">📎 첨부파일</a>` : "-"}</td>
        <td style="padding:14px">${stat}</td>
        <td style="padding:14px;text-align:right">
          ${
            r.status === "PENDING"
              ? `
            <button onclick="approveRequest('${r.id}','${r.user_id}','${r.badge_id}')" style="padding:4px 8px;background:#10b981;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;margin-right:4px">승인</button>
            <button onclick="rejectRequest('${r.id}')" style="padding:4px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer">반려</button>
          `
              : "-"
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

async function approveRequest(reqId, userId, badgeId) {
  if (!confirm("해당 사용자의 뱃지를 승인(발급) 처리하시겠습니까?")) return;
  try {
    const { data: badgeArr } = await _sb()
      .from("badges")
      .select("valid_months")
      .eq("id", badgeId);
    const valid_months = badgeArr?.[0]?.valid_months || null;
    let expiresAt = null;
    if (valid_months) {
      const d = new Date();
      d.setMonth(d.getMonth() + valid_months);
      expiresAt = d.toISOString();
    }

    const { error: e1 } = await _sb()
      .from("user_badges")
      .upsert({
        user_id: userId,
        badge_id: badgeId,
        tenant_id: _opFilterTenantId || boCurrentPersona?.tenantId || "HMC",
        status: "ACTIVE",
        acquired_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    if (e1) throw e1;

    const { error: e2 } = await _sb()
      .from("badge_award_requests")
      .update({
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reqId);
    if (e2) throw e2;

    alert("승인 처리되었습니다.");
    await _reloadOpData();
  } catch (err) {
    alert("에러: " + err.message);
  }
}

async function rejectRequest(reqId) {
  const comment = prompt("반려 사유를 입력하세요:");
  if (comment === null) return;
  const { error } = await _sb()
    .from("badge_award_requests")
    .update({
      status: "REJECTED",
      admin_comment: comment,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reqId);
  if (!error) loadRequestsData();
}

// ─── 현황 트래커 ─────────────────────────────────────────────────

async function loadProgressData() {
  const flt = document.getElementById("filter-status")?.value || "";
  const tbody = document.getElementById("prog-body");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>`;

  try {
    const badgeIds = await _getFilteredBadgeIds();

    let q = _sb()
      .from("user_badges")
      .select("user_id, badge_id, status, acquired_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (badgeIds !== null && badgeIds.length > 0) {
      q = q.in("badge_id", badgeIds);
    }

    if (flt === "EXPIRED_SOON") {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      q = q.eq("status", "ACTIVE").lte("expires_at", nextMonth.toISOString());
    } else if (flt) {
      q = q.eq("status", flt);
    }

    const { data: progs, error } = await q;
    if (error) throw error;
    progressData = progs || [];

    // 뱃지명 일괄 조회
    const uniqueBadgeIds = [
      ...new Set(progressData.map((p) => p.badge_id).filter(Boolean)),
    ];
    let badgeNameMap = {};
    if (uniqueBadgeIds.length > 0) {
      const { data: badgesInfo } = await _sb()
        .from("badges")
        .select("id, name")
        .in("id", uniqueBadgeIds);
      (badgesInfo || []).forEach((b) => {
        badgeNameMap[b.id] = b.name;
      });
    }
    progressData = progressData.map((p) => ({
      ...p,
      _badgeName: badgeNameMap[p.badge_id] || "Unknown",
    }));

    renderProgs();
  } catch (e) {
    console.error("[loadProgressData]", e);
    const tb = document.getElementById("prog-body");
    if (tb)
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444">⚠️ 조회 실패: ${e.message}</td></tr>`;
  }
}

function renderProgs() {
  const tbody = document.getElementById("prog-body");
  if (!tbody) return;
  if (!progressData.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af">조건에 맞는 데이터가 없습니다.</td></tr>`;
    return;
  }
  const flt = document.getElementById("filter-status")?.value || "";
  tbody.innerHTML = progressData
    .map((p) => {
      let statStyle = "color:#64748b",
        statText = p.status;
      if (p.status === "COURSE_COMPLETED") {
        statStyle = "color:#3b82f6;font-weight:700";
        statText = "시험 대기자";
      }
      if (p.status === "ACTIVE") {
        statStyle = "color:#10b981;font-weight:700";
        statText = "보유 중";
      }
      if (p.status === "EXPIRED") {
        statStyle = "color:#ef4444;font-weight:700";
        statText = "강등/만료됨";
      }
      if (p.status === "IN_PROGRESS") {
        statStyle = "color:#f59e0b;font-weight:700";
        statText = "이수 중";
      }

      return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:14px;color:var(--brand);font-weight:800">${p._badgeName}</td>
        <td style="padding:14px;font-weight:700">${p.user_id}</td>
        <td style="padding:14px"><span style="${statStyle}">${statText}</span></td>
        <td style="padding:14px;color:var(--text-sub)">${p.acquired_at ? p.acquired_at.substring(0, 10) : "-"}</td>
        <td style="padding:14px;color:var(--text-sub)">${p.expires_at ? p.expires_at.substring(0, 10) : "영구"}</td>
        <td style="padding:14px;text-align:right">
          ${p.status === "COURSE_COMPLETED" ? `<button style="padding:4px 8px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer">시험 안내 메일</button>` : ""}
          ${flt === "EXPIRED_SOON" ? `<button style="padding:4px 8px;background:#f59e0b;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer">갱신 독려 발송</button>` : ""}
          ${p.status === "IN_PROGRESS" || p.status === "COURSE_COMPLETED" ? `<button onclick="testForceActivate('${p.user_id}','${p.badge_id}')" style="padding:4px 8px;background:#1e293b;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer">수동 패스 처리</button>` : ""}
        </td>
      </tr>
    `;
    })
    .join("");
}

// ─── 탭 전환 ─────────────────────────────────────────────────────

function switchOpTab(tabId) {
  const tabs = { requests: "tab-requests", tracker: "tab-tracker" };
  const contents = {
    requests: "op-content-requests",
    tracker: "op-content-tracker",
  };
  Object.keys(tabs).forEach((k) => {
    const tab = document.getElementById(tabs[k]);
    const cont = document.getElementById(contents[k]);
    if (!tab || !cont) return;
    const isActive = k === tabId;
    tab.style.cssText = isActive
      ? "padding:12px 20px;background:#fff;border:1px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;font-size:14px;font-weight:800;color:var(--brand);margin-bottom:-1px;position:relative;z-index:2"
      : "padding:12px 20px;background:#f8fafc;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;font-size:14px;font-weight:700;color:var(--text-sub)";
    cont.style.display = isActive ? "block" : "none";
  });
}

// ─── 직권 발급 ────────────────────────────────────────────────────

async function testForceActivate(uid, bid) {
  if (
    !confirm(
      "이 사용자를 시험/과정 이수와 무관하게 수동으로 패스/뱃지 발급하시겠습니까?",
    )
  )
    return;
  alert(
    "직권 강제 발급 기능이 데모용으로 설정되었습니다. 실제 발급로직 구현 필요.",
  );
}

async function forceAwardBadge() {
  const uid = prompt(
    "뱃지를 직권으로 부여할 사용자 (글로벌 user_id) 를 입력하세요:",
  );
  if (!uid) return;
  alert(
    "해당 기능은 뱃지 목록을 보여주는 모달로 구현되어야 합니다. (아키텍처 상 지원 가능하도록 DB 스키마 완비)",
  );
}
