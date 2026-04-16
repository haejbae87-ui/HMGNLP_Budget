// ─── [메뉴5] 신청 양식 공지 관리 ─────────────────────────────────────────────

// LNB 독립 진입점 래퍼
function renderFormNoticeMenu() {
  renderAnnouncementMgmt();
}

let _annTenant = "HMG";
let _annSelForm = null; // 현재 선택된 양식
let _annEditId = null; // 편집 중인 공지 ID

function _annGetForms() {
  return FORM_MASTER.filter((f) => f.tenantId === _annTenant);
}

// 파일 아이콘 색상
function _annFileIcon(type) {
  const m = { pdf: "🔴", docx: "🔵", xlsx: "🟢", pptx: "🟠" };
  return m[type] || "📄";
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderAnnouncementMgmt() {
  const persona = boCurrentPersona;
  _annTenant = persona.tenantId || "HMG";
  const tenantName =
    TENANTS.find((t) => t.id === _annTenant)?.name || _annTenant;
  const forms = _annGetForms();
  if (!_annSelForm && forms.length > 0) _annSelForm = forms[0].id;

  document.getElementById("bo-content").innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#1D4ED8;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">TENANT ADMIN</span>
      <h1 class="bo-page-title" style="margin:0">양식별 공지 관리</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">학습자가 신청 양식 진입 시 표시되는 공지사항, 가이드라인, 첨부파일을 관리합니다.</p>
  </div>

  <!-- 유저플로우 다이어그램 -->
  <div class="bo-card" style="padding:16px 20px;margin-bottom:20px;background:linear-gradient(135deg,#F0FDF4,#EFF6FF);border-color:#A7F3D0">
    <div style="font-size:11px;font-weight:800;color:#065F46;margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em">📌 Front 화면 작동 로직 (학습자 뷰)</div>
    <div style="display:flex;align-items:center;gap:0;flex-wrap:wrap">
      ${[
        ["🖱️", "신청 버튼 클릭", "#374151", "#F9FAFB", "#E5E7EB"],
        ["📣", "공지 팝업 표시", "#B45309", "#FFF7ED", "#FED7AA"],
        ["📥", "첨부파일 다운로드", "#1D4ED8", "#EFF6FF", "#BFDBFE"],
        ["✅", "닫기 / 오늘 하루 보지 않기", "#059669", "#F0FDF4", "#A7F3D0"],
        ["📝", "신청서 작성", "#6D28D9", "#F5F3FF", "#DDD6FE"],
      ]
        .map(
          ([icon, label, color, bg, border], i, arr) => `
        <div style="display:flex;align-items:center;flex-wrap:nowrap">
          <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;
                      background:${bg};border:1.5px solid ${border}">
            <span style="font-size:16px">${icon}</span>
            <span style="font-size:11px;font-weight:700;color:${color};white-space:nowrap">${label}</span>
          </div>
          ${i < arr.length - 1 ? '<span style="color:#D1D5DB;font-size:16px;margin:0 6px">→</span>' : ""}
        </div>`,
        )
        .join("")}
    </div>
  </div>

  <div style="display:flex;gap:20px">
    <!-- 좌: 양식 선택 패널 -->
    <div style="width:220px;flex-shrink:0">
      <div class="bo-card" style="overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid #F3F4F6">
          <span class="bo-section-title">대상 양식</span>
        </div>
        ${_annGetForms()
          .map((f) => {
            const cnt = FORM_ANNOUNCEMENTS.filter(
              (a) => a.tenantId === _annTenant && a.formId === f.id && a.active,
            ).length;
            const isActive = _annSelForm === f.id;
            const fi = f.icon || (f.type === "plan" ? "📋" : "📄");
            return `
          <div class="bo-split-item ${isActive ? "active" : ""}" onclick="annSelForm('${f.id}')">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">${fi}</span>
              <span style="font-weight:700">${f.name}</span>
            </div>
            <div style="font-size:11px;margin-top:3px;opacity:.7">
              ${cnt > 0 ? `활성 공지 ${cnt}건` : "공지 없음"}
            </div>
          </div>`;
          })
          .join("")}
      </div>
    </div>

    <!-- 우: 공지 목록 + 관리 -->
    <div style="flex:1" id="ann-right-panel">
      ${_renderAnnList()}
    </div>
  </div>
</div>

<!-- 공지 작성/편집 모달 -->
<div id="ann-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:600px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
      <h3 id="ann-modal-title" style="font-size:15px;font-weight:800;margin:0">공지 작성</h3>
      <button onclick="annCloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="ann-modal-body" style="flex:1;overflow-y:auto;padding:20px 24px"></div>
    <div style="padding:14px 24px;border-top:1px solid #F3F4F6;background:#F9FAFB;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
      <button class="bo-btn-secondary bo-btn-sm" onclick="annCloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="annSave()">저장</button>
    </div>
  </div>
</div>

<!-- 공지 미리보기 모달 (학습자 뷰 시뮬레이션) -->
<div id="ann-preview-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9100;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;box-shadow:0 24px 80px rgba(0,0,0,.3)">
    <div style="background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:16px 16px 0 0;padding:18px 24px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="color:#fff;font-size:13px;font-weight:800">📣 필독 공지사항</div>
        <button onclick="document.getElementById('ann-preview-modal').style.display='none'"
          style="border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px">✕ 닫기</button>
      </div>
    </div>
    <div id="ann-preview-body" style="padding:20px 24px;min-height:120px;max-height:300px;overflow-y:auto;font-size:13px;line-height:1.7;color:#374151;white-space:pre-wrap"></div>
    <div id="ann-preview-files" style="padding:0 24px 16px"></div>
    <div style="padding:12px 24px;border-top:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center;background:#F9FAFB;border-radius:0 0 16px 16px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6B7280;cursor:pointer">
        <input type="checkbox"> 오늘 하루 보지 않기
      </label>
      <button onclick="document.getElementById('ann-preview-modal').style.display='none'"
        class="bo-btn-primary bo-btn-sm">확인 후 신청서로 이동 →</button>
    </div>
  </div>
</div>`;
}

// ─── 공지 목록 렌더 ───────────────────────────────────────────────────────────
function _renderAnnList() {
  const formType = _annGetForms().find((f) => f.id === _annSelForm);
  const anns = FORM_ANNOUNCEMENTS.filter(
    (a) => a.tenantId === _annTenant && a.formId === _annSelForm,
  );
  const fi = formType?.icon || (formType?.type === "plan" ? "📋" : "📄");

  return `
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">${fi}</span>
      <span style="font-weight:800;font-size:14px;color:#111827">${formType?.name || ""}</span>
      <span class="bo-badge bo-badge-gray">${anns.length}건</span>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="annOpenCreate()">+ 공지 추가</button>
  </div>

  ${
    anns.length === 0
      ? `
  <div class="bo-card" style="padding:40px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">📭</div>
    <div style="font-size:13px;color:#9CA3AF">이 양식에 등록된 공지가 없습니다</div>
    <button class="bo-btn-primary bo-btn-sm" style="margin-top:12px" onclick="annOpenCreate()">+ 첫 공지 작성</button>
  </div>`
      : anns
          .map(
            (a) => `
  <div class="bo-card" style="padding:0;margin-bottom:12px;overflow:hidden">
    <!-- 헤더 -->
    <div style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;
                border-bottom:1px solid ${a.active ? "#DBEAFE" : "#F3F4F6"};
                background:${a.active ? "#EFF6FF" : "#F9FAFB"}">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="bo-badge ${a.active ? "bo-badge-green" : "bo-badge-gray"}">${a.active ? "● 활성" : "○ 비활성"}</span>
        <span style="font-weight:800;font-size:13px;color:#111827">${a.title}</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="annOpenPreview('${a.id}')">👁️ 미리보기</button>
        <button class="bo-btn-secondary bo-btn-sm" onclick="annOpenEdit('${a.id}')">수정</button>
        <button class="bo-btn-secondary bo-btn-sm" onclick="annToggleActive('${a.id}')"
          style="${a.active ? "color:#F59E0B;border-color:#F59E0B" : "color:#059669;border-color:#059669"}">
          ${a.active ? "비활성화" : "활성화"}
        </button>
        <button class="bo-btn-secondary bo-btn-sm" onclick="annDelete('${a.id}')"
          style="color:#EF4444;border-color:#EF4444">삭제</button>
      </div>
    </div>
    <!-- 본문 -->
    <div style="padding:14px 18px">
      <div style="font-size:12px;color:#374151;white-space:pre-wrap;max-height:80px;overflow:hidden;
                  mask-image:linear-gradient(to bottom,#000 60%,transparent)">${a.content}</div>
    </div>
    <!-- 첨부파일 -->
    ${
      a.attachments.length > 0
        ? `
    <div style="padding:10px 18px;border-top:1px solid #F3F4F6;background:#FAFAFA;display:flex;gap:8px;flex-wrap:wrap">
      ${a.attachments
        .map(
          (f) => `
      <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;
                  background:#fff;border:1px solid #E5E7EB;font-size:12px">
        <span>${_annFileIcon(f.type)}</span>
        <span style="font-weight:600;color:#374151">${f.name}</span>
        <span style="color:#9CA3AF">${f.size}</span>
        <span style="color:#1D4ED8;cursor:pointer;font-size:11px">⬇ 다운로드</span>
      </div>`,
        )
        .join("")}
    </div>`
        : ""
    }
    <!-- 노출 기간 -->
    <div style="padding:10px 18px;border-top:1px solid #F3F4F6;display:flex;align-items:center;gap:16px">
      <span style="font-size:11px;color:#9CA3AF;font-weight:600">노출 기간</span>
      <span style="font-size:11px;color:#374151">${a.startDate} ~ ${a.endDate}</span>
    </div>
  </div>`,
          )
          .join("")
  }
</div>`;
}

// ─── 양식 전환 ───────────────────────────────────────────────────────────────
function annSelForm(formId) {
  _annSelForm = formId;
  document.getElementById("ann-right-panel").innerHTML = _renderAnnList();
  // 좌측 탭 강조 갱신
  document.querySelectorAll(".bo-split-item").forEach((el) => {
    const isActive = el.getAttribute("onclick")?.includes(`'${formId}'`);
    el.classList.toggle("active", !!isActive);
  });
}

// ─── 공지 모달 바디 ──────────────────────────────────────────────────────────
function _annModalBody(ann) {
  const formType = _annGetForms().find((f) => f.id === _annSelForm);
  const fi = formType?.icon || (formType?.type === "plan" ? "📋" : "📄");
  const inp = (id, ph, val = "", lines = 1) =>
    lines > 1
      ? `<textarea id="${id}" placeholder="${ph}" rows="${lines}" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;resize:vertical;line-height:1.6">${val}</textarea>`
      : `<input id="${id}" type="text" placeholder="${ph}" value="${val}" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">`;

  const files = ann?.attachments || [];
  return `
  <div style="background:#F0FDF4;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#065F46">
    <strong>${fi} ${formType?.name}</strong>에 표시될 공지를 작성합니다.
  </div>
  <div style="margin-bottom:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">공지 제목 *</label>
    ${inp("ann-title", "예) 사외교육 신청 전 필독 사항", ann?.title || "")}
  </div>
  <div style="margin-bottom:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">공지 내용 (WYSIWYG 작성 — 실제 연동 시 에디터 삽입)</label>
    ${inp("ann-content", "공지 내용을 입력하세요...", ann?.content || "", 6)}
  </div>
  <div style="margin-bottom:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">첨부파일</label>
    <div id="ann-files-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
      ${files
        .map(
          (f, i) => `
      <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;
                  background:#F3F4F6;border:1px solid #E5E7EB;font-size:12px" data-idx="${i}">
        <span>${_annFileIcon(f.type)}</span>
        <span style="font-weight:600">${f.name}</span>
        <span style="color:#9CA3AF">${f.size}</span>
        <button onclick="this.parentElement.remove()"
          style="border:none;background:none;cursor:pointer;color:#EF4444;font-size:12px">✕</button>
      </div>`,
        )
        .join("")}
    </div>
    <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px dashed #E5E7EB;
                  border-radius:8px;cursor:pointer;color:#9CA3AF;font-size:12px;font-weight:600;
                  transition:border-color .15s" onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='#E5E7EB'">
      <span style="font-size:18px">📎</span> 첨부파일 추가 (클릭 또는 드래그 — 실제 연동 시 활성화)
      <input type="file" multiple style="display:none">
    </label>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">노출 시작일</label>
      <input id="ann-start" type="date" value="${ann?.startDate || "2026-01-01"}"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">노출 종료일</label>
      <input id="ann-end" type="date" value="${ann?.endDate || "2026-12-31"}"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <label class="bo-toggle-wrap" style="gap:10px">
      <label class="bo-toggle green">
        <input type="checkbox" id="ann-active" ${ann?.active !== false ? "checked" : ""}>
        <span class="bo-toggle-slider"></span>
      </label>
      <span style="font-size:13px;font-weight:700;color:#374151">즉시 활성화 (노출 기간 내 자동 노출)</span>
    </label>
  </div>`;
}

// ─── CRUD 함수 ────────────────────────────────────────────────────────────────
function annOpenCreate() {
  _annEditId = null;
  document.getElementById("ann-modal-title").textContent = "공지 작성";
  document.getElementById("ann-modal-body").innerHTML = _annModalBody(null);
  document.getElementById("ann-modal").style.display = "flex";
}

function annOpenEdit(id) {
  _annEditId = id;
  const ann = FORM_ANNOUNCEMENTS.find((a) => a.id === id);
  document.getElementById("ann-modal-title").textContent = "공지 수정";
  document.getElementById("ann-modal-body").innerHTML = _annModalBody(ann);
  document.getElementById("ann-modal").style.display = "flex";
}

function annSave() {
  const title = document.getElementById("ann-title").value.trim();
  const content = document.getElementById("ann-content").value.trim();
  if (!title) {
    alert("공지 제목을 입력해주세요.");
    return;
  }

  // 첨부파일: 남아있는 항목만 파싱 (mock — 실제 업로드 미구현)
  const fileEls = document.querySelectorAll("#ann-files-list [data-idx]");
  const keepIdxs = [...fileEls].map((el) => parseInt(el.dataset.idx));
  const orig = _annEditId
    ? FORM_ANNOUNCEMENTS.find((a) => a.id === _annEditId)?.attachments || []
    : [];
  const attachments = orig.filter((_, i) => keepIdxs.includes(i));

  const obj = {
    id: _annEditId || "AN" + Date.now(),
    tenantId: _annTenant,
    formId: _annSelForm,
    title,
    content,
    attachments,
    active: document.getElementById("ann-active").checked,
    startDate: document.getElementById("ann-start").value,
    endDate: document.getElementById("ann-end").value,
  };

  if (_annEditId) {
    const idx = FORM_ANNOUNCEMENTS.findIndex((a) => a.id === _annEditId);
    if (idx > -1) FORM_ANNOUNCEMENTS[idx] = obj;
  } else {
    FORM_ANNOUNCEMENTS.push(obj);
  }
  annCloseModal();
  document.getElementById("ann-right-panel").innerHTML = _renderAnnList();
}

function annToggleActive(id) {
  const a = FORM_ANNOUNCEMENTS.find((x) => x.id === id);
  if (a) a.active = !a.active;
  document.getElementById("ann-right-panel").innerHTML = _renderAnnList();
}

function annDelete(id) {
  if (!confirm("이 공지를 삭제하시겠습니까?")) return;
  const idx = FORM_ANNOUNCEMENTS.findIndex((x) => x.id === id);
  if (idx > -1) FORM_ANNOUNCEMENTS.splice(idx, 1);
  document.getElementById("ann-right-panel").innerHTML = _renderAnnList();
}

function annCloseModal() {
  document.getElementById("ann-modal").style.display = "none";
}

// ─── 학습자 뷰 미리보기 ──────────────────────────────────────────────────────
function annOpenPreview(id) {
  const a = FORM_ANNOUNCEMENTS.find((x) => x.id === id);
  if (!a) return;
  document.getElementById("ann-preview-body").textContent = a.content;
  const formType = _annGetForms().find((f) => f.id === a.formId);
  document.getElementById("ann-preview-files").innerHTML = a.attachments.length
    ? `
  <div style="border-top:1px solid #F3F4F6;padding:12px 0 0;display:flex;gap:8px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:700;color:#9CA3AF;width:100%;margin-bottom:4px">첨부파일 다운로드</span>
    ${a.attachments
      .map(
        (f) => `
    <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;
                background:#F0FDF4;border:1px solid #A7F3D0;font-size:12px;cursor:pointer">
      <span>${_annFileIcon(f.type)}</span>
      <span style="font-weight:600;color:#059669">${f.name}</span>
      <span style="color:#9CA3AF">${f.size}</span>
    </div>`,
      )
      .join("")}
  </div>`
    : "";
  document.getElementById("ann-preview-modal").style.display = "flex";
}
