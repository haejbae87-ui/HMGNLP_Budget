// ─── 👥 학습자 관리 ─────────────────────────────────────────────────────
let _enTenant = "";
let _enChannelId = null;
let _enCourseId = null;
let _enSessionId = null;
let _enList = [];
let _enChannels = [];
let _enCourses = [];
let _enSessions = [];
let _enSelectedRows = new Set(); // 일괄 처리를 위한 선택된 학습자 ID 목록

async function renderEnrollmentMgmt() {
  const el = document.getElementById("bo-content");
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>';
    return;
  }

  const role = boCurrentPersona.role;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";
  if (!_enTenant)
    _enTenant = isPlatform ? "HMC" : boCurrentPersona.tenantId || "HMC";

  el.innerHTML =
    '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>로딩 중...</div>';

  _enSelectedRows.clear();

  // 채널 로드
  try {
    const { data } = await sb
      .from("edu_channels")
      .select("id,name")
      .eq("tenant_id", _enTenant)
      .eq("active", true)
      .order("name");
    _enChannels = data || [];
  } catch (e) {
    _enChannels = [];
  }

  // 과정 목록
  try {
    let q = sb
      .from("edu_courses")
      .select("id,title,channel_id,status")
      .eq("tenant_id", _enTenant)
      .order("title");
    if (_enChannelId) q = q.eq("channel_id", _enChannelId);
    const { data } = await q;
    _enCourses = data || [];
  } catch (e) {
    _enCourses = [];
  }
  if (_enCourseId && !_enCourses.find((c) => c.id === _enCourseId))
    _enCourseId = null;
  if (!_enCourseId && _enCourses.length > 0) _enCourseId = _enCourses[0].id;

  // 차수 목록
  try {
    const { data } = await sb
      .from("edu_sessions")
      .select("id,name,session_no,status,capacity")
      .eq("course_id", _enCourseId || "__NONE__")
      .order("session_no");
    _enSessions = data || [];
  } catch (e) {
    _enSessions = [];
  }
  if (!_enSessionId || !_enSessions.find((s) => s.id === _enSessionId))
    _enSessionId = _enSessions[0]?.id || null;

  // 수강생 목록
  try {
    const { data } = await sb
      .from("edu_enrollments")
      .select("*")
      .eq("session_id", _enSessionId || "__NONE__")
      .order("enrolled_at", { ascending: false });
    _enList = data || [];
  } catch (e) {
    _enList = [];
  }

  const selStyle =
    "border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:160px;cursor:pointer";
  const curSession = _enSessions.find((s) => s.id === _enSessionId);
  const canAdd =
    curSession && !["completed", "cancelled"].includes(curSession.status);
  const enrolledCount = _enList.filter((e) => e.status === "enrolled").length;

  const statusLabel = {
    enrolled: "수강중",
    completed: "수료",
    cancelled: "취소",
    no_show: "미출석",
  };
  const statusColor = {
    enrolled: "#059669",
    completed: "#1D4ED8",
    cancelled: "#DC2626",
    no_show: "#D97706",
  };

  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const tenantSel = isPlatform
    ? `<div style="display:flex;align-items:center;gap:8px">
        <span class="bo-filter-label">테넌트</span>
        <select onchange="_enTenant=this.value;_enChannelId=null;_enCourseId=null;_enSessionId=null;renderEnrollmentMgmt()" class="bo-filter-select">
          ${tenants.filter((t) => t.id !== "SYSTEM").map((t) => `<option value="${t.id}" ${t.id === _enTenant ? "selected" : ""}>${t.name}</option>`).join("")}
        </select>
       </div>`
    : `<div style="display:flex;align-items:center;gap:8px">
        <span class="bo-filter-label">테넌트</span>
        <span style="font-size:13px;font-weight:700;color:#374151;padding:8px 12px;background:#F1F5F9;border-radius:10px">${tenants.find((t) => t.id === _enTenant)?.name || _enTenant}</span>
       </div>`;

  const channelSel = `<div class="bo-filter-divider"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="bo-filter-label">채널</span>
        <select onchange="_enChannelId=this.value||null;_enCourseId=null;_enSessionId=null;renderEnrollmentMgmt()" class="bo-filter-select">
          <option value="">전체 채널</option>
          ${_enChannels.map((c) => `<option value="${c.id}" ${c.id === _enChannelId ? "selected" : ""}>${c.name}</option>`).join("")}
        </select>
      </div>`;

  const courseSel = `<div class="bo-filter-divider"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="bo-filter-label">과정</span>
        <select onchange="_enCourseId=this.value;_enSessionId=null;renderEnrollmentMgmt()" class="bo-filter-select">
          ${_enCourses.map((c) => `<option value="${c.id}" ${c.id === _enCourseId ? "selected" : ""}>${c.title}</option>`).join("")}
        </select>
      </div>`;

  const sessionSel = `<div class="bo-filter-divider"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="bo-filter-label">차수</span>
        <select onchange="_enSessionId=this.value;renderEnrollmentMgmt()" class="bo-filter-select">
          ${_enSessions.map((s) => `<option value="${s.id}" ${s.id === _enSessionId ? "selected" : ""}>${s.session_no}차 - ${s.name}</option>`).join("")}
        </select>
      </div>`;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <h1 class="bo-page-title">👥 학습자 관리</h1>
        <p class="bo-page-sub">교육 차수에 학습자를 배정하고 관리합니다</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${canAdd ? '<button class="bo-btn-primary" onclick="_enOpenAdd()" style="display:flex;align-items:center;gap:6px;padding:10px 18px"><span style="font-size:16px">+</span> 학습자 추가</button>' : ""}
      </div>
    </div>

    <div class="bo-filter-bar">
      <span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">🔍 조회</span>
      ${tenantSel}
      ${channelSel}
      ${courseSel}
      ${sessionSel}
      <button onclick="renderEnrollmentMgmt()" class="bo-filter-btn-search">
        ● 조회
      </button>
    </div>

    ${
      curSession
        ? `
    <div class="bo-card" style="padding:14px 20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:900;color:#374151">📊 수강 현황</span>
        <span style="font-size:13px;font-weight:800;color:#1D4ED8">${enrolledCount} / ${curSession.capacity || "-"}명</span>
        ${
          curSession.capacity > 0
            ? `
        <div style="flex:1;max-width:200px;height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden">
          <div style="width:${Math.min(100, (enrolledCount / curSession.capacity) * 100)}%;height:100%;background:${enrolledCount >= curSession.capacity ? "#DC2626" : "#059669"};border-radius:4px;transition:width .3s"></div>
        </div>`
            : ""
        }
        
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="bo-btn-secondary bo-btn-sm" style="font-size:11px;padding:4px 10px;background:#EF4444;color:#fff;border-color:#EF4444" onclick="_enBulkUpdateStatus('no_show')">🚫 시스템 미이수 처리</button>
          <button class="bo-btn-secondary bo-btn-sm" style="font-size:11px;padding:4px 10px;background:#059669;color:#fff;border-color:#059669" onclick="_enBulkUpdateStatus('completed')">☑️ 이수 완료 처리</button>
        </div>
      </div>
    </div>`
        : ""
    }

    ${
      _enList.length > 0
        ? `
    <div>
      <div class="bo-list-count">등록된 수강자 목록 (${_enList.length}건)</div>
      <div class="bo-table-container">
        <table class="bo-table" style="width:100%">
          <thead><tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
            <th style="width:30px;text-align:center;padding:10px 14px"><input type="checkbox" id="en-chk-all" onchange="_enToggleAllRows(this.checked)" style="accent-color:#1D4ED8"></th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">이름</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">부서</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">입과유형</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">상태</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">입과일</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">관리</th>
          </tr></thead>
          <tbody>
          ${_enList
            .map(
              (e, i) => `<tr>
            <td style="text-align:center;padding:12px 14px"><input type="checkbox" class="en-chk-row" value="${e.id}" onchange="_enToggleRow('${e.id}', this.checked)" style="accent-color:#1D4ED8"></td>
            <td style="padding:12px 14px;font-weight:800">${e.user_name || "-"}</td>
            <td style="padding:12px 14px;color:#6B7280">${e.dept_name || "-"}</td>
            <td style="text-align:center;padding:12px 14px"><span style="font-size:10px;background:${e.enroll_type === "self" ? "#D1FAE5" : "#EFF6FF"};color:${e.enroll_type === "self" ? "#065F46" : "#1D4ED8"};padding:2px 8px;border-radius:6px;font-weight:700">${e.enroll_type === "self" ? "자가신청" : "관리자"}</span></td>
            <td style="text-align:center;padding:12px 14px"><span style="font-size:10px;font-weight:800;color:${statusColor[e.status] || "#6B7280"}">${statusLabel[e.status] || e.status}</span></td>
            <td style="text-align:center;font-size:11px;color:#6B7280;padding:12px 14px">${(e.enrolled_at || "").slice(0, 10)}</td>
            <td style="text-align:center;padding:12px 14px">
              <select onchange="_enChangeStatus(${i},this.value)" style="font-size:10px;padding:2px 6px;border:1px solid #E5E7EB;border-radius:4px">
                ${Object.entries(statusLabel)
                  .map(
                    ([k, v]) =>
                      `<option value="${k}" ${k === e.status ? "selected" : ""}>${v}</option>`,
                  )
                  .join("")}
              </select>
              <button onclick="_enRemove(${i})" style="border:none;background:none;cursor:pointer;font-size:12px;color:#DC2626" title="삭제">✕</button>
            </td>
          </tr>`,
            )
            .join("")}
          </tbody>
        </table>
      </div>
    </div>`
        : `
    <div class="bo-table-container" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">👥</div>
      <div style="font-weight:700;color:#6B7280">${_enSessions.length === 0 ? "차수를 먼저 생성해주세요" : "등록된 학습자가 없습니다"}</div>
    </div>`
    }
  </div>

  <!-- 학습자 추가 모달 -->
  <div id="en-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
        <div><h3 style="font-size:15px;font-weight:800;margin:0 0 3px">학습자 추가</h3>
          <p style="font-size:12px;color:#6B7280;margin:0">사용자를 검색하여 차수에 입과합니다</p></div>
        <button onclick="document.getElementById('en-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div style="padding:12px 20px;border-bottom:1px solid #F3F4F6">
        <input id="en-user-search" type="text" placeholder="🔍 이름 검색..." oninput="_enSearchUsers()" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;background:#F9FAFB">
      </div>
      <div id="en-user-results" style="flex:1;overflow-y:auto;padding:8px 20px;max-height:350px"></div>
      <div style="padding:16px 20px;border-top:1px solid #F3F4F6;background:#F9FAFB;display:flex;justify-content:space-between;align-items:center">
        <span id="en-sel-count" style="font-size:13px;font-weight:800">0명 선택</span>
        <div style="display:flex;gap:8px">
          <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('en-modal').style.display='none'">취소</button>
          <button class="bo-btn-primary bo-btn-sm" onclick="_enConfirmAdd()">입과</button>
        </div>
      </div>
    </div>
  </div>`;
}

let _enSelectedUsers = new Map(); // user_id -> {name, dept}

function _enOpenAdd() {
  _enSelectedUsers = new Map();
  document.getElementById("en-user-search").value = "";
  document.getElementById("en-user-results").innerHTML = "";
  document.getElementById("en-sel-count").textContent = "0명 선택";
  document.getElementById("en-modal").style.display = "flex";
  _enLoadInitialUsers();
}

async function _enLoadInitialUsers() {
  const el = document.getElementById("en-user-results");
  if (!el) return;
  const sb = getSB();
  if (!sb) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML =
    '<div style="padding:12px;text-align:center;font-size:11px;color:#9CA3AF">⏳ 사용자 로딩 중...</div>';

  try {
    let data = null;
    try {
      const res = await sb
        .from("users")
        .select("id,name,org_id,job_type,organizations(name)")
        .eq("tenant_id", _enTenant)
        .order("name")
        .limit(50);
      if (res.error) throw res.error;
      data = res.data;
    } catch (joinErr) {
      console.warn(
        "[Enrollment] FK join failed, fallback:",
        joinErr.message || joinErr,
      );
      const res = await sb
        .from("users")
        .select("id,name,org_id,job_type")
        .eq("tenant_id", _enTenant)
        .order("name")
        .limit(50);
      data = (res.data || []).map((u) => ({ ...u, organizations: null }));
    }

    if (!data || data.length === 0) {
      el.innerHTML =
        '<div style="padding:16px;text-align:center;font-size:11px;color:#9CA3AF">등록된 사용자가 없습니다</div>';
      return;
    }

    _enRenderUserList(
      data,
      data.length >= 50
        ? "상위 50명 표시 · 이름으로 검색하여 추가 조회"
        : `총 ${data.length}명`,
    );
  } catch (e) {
    console.error("[Enrollment] user load error:", e);
    el.innerHTML =
      '<div style="padding:12px;text-align:center;font-size:11px;color:#EF4444">사용자 로드 실패</div>';
  }
}

async function _enSearchUsers() {
  const q = document.getElementById("en-user-search")?.value?.trim();
  const el = document.getElementById("en-user-results");
  if (!q || q.length < 1) {
    _enLoadInitialUsers();
    return;
  }
  const sb = getSB();
  if (!sb) return;
  try {
    let data = null;
    try {
      const res = await sb
        .from("users")
        .select("id,name,org_id,job_type,organizations(name)")
        .eq("tenant_id", _enTenant)
        .ilike("name", `%${q}%`)
        .limit(30);
      if (res.error) throw res.error;
      data = res.data;
    } catch (joinErr) {
      const res = await sb
        .from("users")
        .select("id,name,org_id,job_type")
        .eq("tenant_id", _enTenant)
        .ilike("name", `%${q}%`)
        .limit(30);
      data = (res.data || []).map((u) => ({ ...u, organizations: null }));
    }

    if (!data || data.length === 0) {
      el.innerHTML =
        '<div style="padding:16px;text-align:center;font-size:11px;color:#9CA3AF">검색 결과 없음</div>';
      return;
    }
    _enRenderUserList(data, `"${q}" 검색 결과 ${data.length}건`);
  } catch (e) {
    el.innerHTML = "";
  }
}

function _enRenderUserList(users, subtitle) {
  const el = document.getElementById("en-user-results");
  if (!el) return;

  let html = subtitle
    ? `<div style="padding:6px 12px;font-size:10px;color:#9CA3AF;font-weight:700;background:#F9FAFB;border-bottom:1px solid #F3F4F6;margin: -8px -20px 8px -20px;">${subtitle}</div>`
    : "";
  const existIds = new Set(_enList.map((e) => e.user_id));

  html += users
    .map((u) => {
      const already = existIds.has(u.id);
      const selected = _enSelectedUsers.has(u.id);
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
    cursor:${already ? "not-allowed" : "pointer"};background:${already ? "#F9FAFB" : selected ? "#EFF6FF" : "#fff"};
    border:1px solid ${selected ? "#93C5FD" : "#E5E7EB"};margin-bottom:6px;opacity:${already ? ".5" : "1"}">
    <input type="checkbox" value="${u.id}" data-name="${(u.name || "").replace(/'/g, "\\'")}" data-dept="${(u.organizations?.name || "").replace(/'/g, "\\'")}"
      ${already ? "disabled" : ""} ${selected ? "checked" : ""} onchange="_enToggleUser(this)"
      style="width:15px;height:15px;accent-color:#1D4ED8;margin:0">
    <div style="flex:1">
      <span style="font-size:13px;font-weight:700;color:${already ? "#9CA3AF" : "#374151"}">${u.name}</span>
      <span style="font-size:11px;color:#6B7280;margin-left:8px">${u.organizations?.name || ""} ${u.job_type ? "· " + u.job_type : ""}</span>
    </div>
    ${already ? '<span style="font-size:10px;color:#6B7280;background:#E5E7EB;padding:2px 6px;border-radius:12px;font-weight:700">입과됨</span>' : ""}
  </label>`;
    })
    .join("");

  el.innerHTML = html;
}

function _enToggleUser(cb) {
  if (cb.checked) {
    _enSelectedUsers.set(cb.value, {
      name: cb.dataset.name,
      dept: cb.dataset.dept,
    });
  } else {
    _enSelectedUsers.delete(cb.value);
  }
  const sc = document.getElementById("en-sel-count");
  if (sc) sc.textContent = `${_enSelectedUsers.size}명 선택`;
}

async function _enConfirmAdd() {
  if (_enSelectedUsers.size === 0) {
    alert("학습자를 선택해주세요.");
    return;
  }
  const sb = getSB();
  if (!sb) return;

  const rows = [];
  _enSelectedUsers.forEach((info, uid) => {
    rows.push({
      id: "ENR-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      tenant_id: _enTenant,
      session_id: _enSessionId,
      user_id: uid,
      user_name: info.name,
      dept_name: info.dept,
      enroll_type: "admin",
      status: "enrolled",
    });
  });

  try {
    const { error } = await sb
      .from("edu_enrollments")
      .upsert(rows, { onConflict: "session_id,user_id" });
    if (error) {
      alert("입과 중 오류: " + error.message);
      return;
    }
  } catch (e) {
    alert("입과 실패: " + e.message);
    return;
  }

  document.getElementById("en-modal").style.display = "none";
  renderEnrollmentMgmt();
}

async function _enChangeStatus(idx, newStatus) {
  const e = _enList[idx];
  if (!e) return;
  const sb = getSB();
  if (!sb) return;
  await sb.from("edu_enrollments").update({ status: newStatus }).eq("id", e.id);
  renderEnrollmentMgmt();
}

async function _enRemove(idx) {
  const e = _enList[idx];
  if (!e) return;
  if (!confirm(`"${e.user_name}" 학습자를 삭제하시겠습니까?`)) return;
  const sb = getSB();
  if (!sb) return;
  await sb.from("edu_enrollments").delete().eq("id", e.id);
  renderEnrollmentMgmt();
}

// ─── ✨ 일괄 처리 로직 ───
function _enToggleAllRows(checked) {
  const checkboxes = document.querySelectorAll(".en-chk-row");
  checkboxes.forEach((cb) => {
    cb.checked = checked;
    if (checked) _enSelectedRows.add(cb.value);
    else _enSelectedRows.delete(cb.value);
  });
}

function _enToggleRow(id, checked) {
  if (checked) _enSelectedRows.add(id);
  else _enSelectedRows.delete(id);

  const allCb = document.getElementById("en-chk-all");
  if (allCb) {
    const checkboxes = document.querySelectorAll(".en-chk-row");
    allCb.checked = Array.from(checkboxes).every((cb) => cb.checked);
  }
}

async function _enBulkUpdateStatus(status) {
  if (_enSelectedRows.size === 0) {
    alert("처리할 학습자를 왼쪽 체크박스로 선택해주세요.");
    return;
  }

  const statusLabel = { completed: "이수", no_show: "미이수" };
  if (
    !confirm(
      `선택한 ${_enSelectedRows.size}명의 학습자를 일괄 [${statusLabel[status]}] 처리하시겠습니까?`,
    )
  )
    return;

  const sb = getSB();
  if (!sb) return;
  const ids = Array.from(_enSelectedRows);

  try {
    const { error } = await sb
      .from("edu_enrollments")
      .update({ status })
      .in("id", ids);
    if (error) throw error;
    alert(`${ids.length}명 일괄 처리가 완료되었습니다.`);
    _enSelectedRows.clear();
    renderEnrollmentMgmt();
  } catch (e) {
    alert("일괄 업데이트 실패: " + e.message);
  }
}
