// ─── 요구사항정의서(PRD) 모음 뷰어 ─────────────────────────────────────────
// prd_data.js (빌드 생성) → PRD_DATA 배열에서 직접 렌더링

let _prdSelectedId = null;
let _prdStatusFilter = "전체"; // 상태 필터 (전체 / 구현 완료 / 구현 중 / 미구현 / 기획 확정 등)

// ── 상태 분류 매핑 ─────────────────────────────────────────────────────────
const _PRD_STATUS_GROUPS = [
  { label: "전체", icon: "📋", match: () => true },
  { label: "구현 완료", icon: "✅", match: (s) => /완료|완전 구현/i.test(s) },
  { label: "구현 중", icon: "🟡", match: (s) => /구현 중|작성 중|축소 적용|설계 검토/i.test(s) },
  { label: "미구현", icon: "🔴", match: (s) => /미구현|핵심 연동/i.test(s) },
  { label: "기획 확정", icon: "📐", match: (s) => /확정|정책 확정/i.test(s) },
];

function _prdGetStatusColor(status) {
  if (/완료|완전 구현/i.test(status)) return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
  if (/미구현|핵심 연동/i.test(status)) return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
  if (/정책 확정|기획 확정/i.test(status)) return { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" };
  return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }; // 구현 중 / 작성 중 등 기본
}

function renderPrdCollection() {
  const el = document.getElementById("bo-content");
  const rawList = typeof PRD_DATA !== "undefined" ? PRD_DATA : [];

  // 날짜 최신순 정렬
  const sorted = [...rawList].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // 상태 필터 적용
  const group = _PRD_STATUS_GROUPS.find((g) => g.label === _prdStatusFilter) || _PRD_STATUS_GROUPS[0];
  const prdList = sorted.filter((prd) => group.match(prd.status || ""));

  // 필터 버튼 HTML
  const filterBtns = _PRD_STATUS_GROUPS.map((g) => {
    const count = sorted.filter((p) => g.match(p.status || "")).length;
    const isActive = _prdStatusFilter === g.label;
    return `<button onclick="_prdSetFilter('${g.label}')"
      style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:${isActive ? "800" : "600"};
             cursor:pointer;border:1.5px solid ${isActive ? "#3B82F6" : "#E5E7EB"};
             background:${isActive ? "#EFF6FF" : "#fff"};color:${isActive ? "#1D4ED8" : "#6B7280"};
             transition:all .15s"
      onmouseover="if(!${isActive})this.style.background='#F8FAFC'"
      onmouseout="if(!${isActive})this.style.background='#fff'">${g.icon} ${g.label} <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:${isActive ? "#BFDBFE" : "#F3F4F6"};color:${isActive ? "#1E40AF" : "#9CA3AF"}">${count}</span></button>`;
  }).join("");

  const cardsHtml = prdList
    .map((prd) => {
      const sc = _prdGetStatusColor(prd.status);
      const tagsHtml = (prd.tags || [])
        .map(
          (t) =>
            `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#F3F4F6;color:#6B7280;font-weight:600">${t}</span>`,
        )
        .join(" ");
      return `
    <div onclick="_prdSelectDoc('${prd.id}')" class="bo-card"
         style="padding:16px 20px;margin-bottom:10px;cursor:pointer;border-left:4px solid ${sc.border};
                transition:all .15s;${_prdSelectedId === prd.id ? "background:#F0F9FF;border-color:#3B82F6" : ""}"
         onmouseover="if(_prdSelectedId!=='${prd.id}')this.style.background='#F8FAFC'"
         onmouseout="if(_prdSelectedId!=='${prd.id}')this.style.background='#fff'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;min-width:0">
          <span style="font-size:13px;font-weight:900;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px" title="${prd.title}">${prd.title}</span>
        </div>
        <span style="font-size:10px;color:#9CA3AF;white-space:nowrap;margin-left:8px">${prd.date}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:9px;padding:2px 8px;border-radius:6px;font-weight:700;
                     background:${sc.bg};color:${sc.text};border:1px solid ${sc.border}">${prd.status}</span>
        <code style="font-size:9px;background:#F3F4F6;padding:2px 6px;border-radius:5px;color:#6B7280;font-weight:700">${prd.version}</code>
      </div>
      ${prd.summary ? `<div style="font-size:11px;color:#6B7280;margin-bottom:4px;line-height:1.4">${prd.summary}</div>` : ""}
      <div style="display:flex;gap:4px;flex-wrap:wrap">${tagsHtml}</div>
    </div>`;
    })
    .join("");

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1400px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">기타</span>
        <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">📋 요구사항정의서 모음</h1>
      </div>
      <p style="font-size:12px;color:#64748B;margin:0">시스템에 반영된 모든 PRD(요구사항정의서)를 조회합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;padding:4px 10px;border-radius:6px;background:#F5F3FF;color:#7C3AED;font-weight:700;border:1px solid #DDD6FE">
        총 ${rawList.length}건
      </span>
    </div>
  </div>

  <!-- 상태별 필터 버튼 -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;padding:10px 14px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB">
    ${filterBtns}
  </div>

  <div style="display:flex;gap:20px">
    <div style="width:380px;flex-shrink:0;overflow-y:auto;max-height:calc(100vh - 260px)">
      ${prdList.length === 0
        ? '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">해당 상태의 요구사항정의서가 없습니다.</div>'
        : cardsHtml}
      <div style="padding:8px;text-align:center;font-size:10px;color:#9CA3AF">
        ${_prdStatusFilter === "전체" ? "" : `필터: ${_prdStatusFilter} · `}${prdList.length}건 표시 (날짜순 ↓)
      </div>
    </div>
    <div id="prd-viewer" style="flex:1;min-width:0">
      ${
        _prdSelectedId
          ? ""
          : `
      <div style="padding:60px;text-align:center;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#9CA3AF">
        <div style="font-size:36px;margin-bottom:10px">📄</div>
        <div style="font-size:13px;font-weight:700;color:#64748B">좌측 목록에서 요구사항정의서를 선택하세요</div>
        <div style="font-size:11px;margin-top:4px">마크다운 형태로 본문을 렌더링합니다</div>
      </div>`
      }
    </div>
  </div>
</div>`;

  if (_prdSelectedId) _prdLoadDoc(_prdSelectedId);
}

function _prdSetFilter(label) {
  _prdStatusFilter = label;
  renderPrdCollection();
}

function _prdSelectDoc(id) {
  _prdSelectedId = id;
  renderPrdCollection();
}

function _prdLoadDoc(id) {
  const prdList = typeof PRD_DATA !== "undefined" ? PRD_DATA : [];
  const prd = prdList.find((p) => p.id === id);
  if (!prd) return;
  const viewer = document.getElementById("prd-viewer");

  if (!prd.content) {
    viewer.innerHTML = `<div class="bo-card" style="padding:30px;text-align:center;color:#EF4444">
      <div style="font-size:24px;margin-bottom:8px">⚠️</div>
      <div style="font-size:13px;font-weight:700">문서 내용 없음</div>
    </div>`;
    return;
  }

  const html = _prdMd2Html(prd.content);
  const sc = _prdGetStatusColor(prd.status);

  viewer.innerHTML = `
  <div class="bo-card" style="padding:24px 28px;overflow-y:auto;max-height:calc(100vh - 260px)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #E5E7EB">
      <div>
        <h2 style="font-size:18px;font-weight:900;margin:0;color:#111827">${prd.title}</h2>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${sc.bg};color:${sc.text};border:1px solid ${sc.border}">${prd.status}</span>
          <code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:5px;color:#6B7280;font-weight:700">${prd.version}</code>
          <span style="font-size:11px;color:#9CA3AF">${prd.file} · ${prd.date}</span>
        </div>
      </div>
    </div>
    <div class="prd-content" style="font-size:13px;line-height:1.8;color:#374151">${html}</div>
  </div>`;
}

// ── 간이 마크다운 → HTML 변환 ──────────────────────────────────────────
function _prdMd2Html(md) {
  // 1. Protect code blocks by temporarily replacing them
  const codeBlocks = [];
  let html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(code.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const lines = html.split("\n");
  const processedLines = [];
  let tableRows = [];
  let inBlockquote = false;
  let bqType = null;
  const alertColors = {
    NOTE: "#3B82F6",
    TIP: "#10B981",
    IMPORTANT: "#7C3AED",
    WARNING: "#F59E0B",
    CAUTION: "#EF4444",
  };
  const alertIcons = {
    NOTE: "ℹ️",
    TIP: "💡",
    IMPORTANT: "🔥",
    WARNING: "⚠️",
    CAUTION: "🚨",
  };

  const processTable = () => {
    if (tableRows.length === 0) return;
    let tableHtml =
      '<div style="overflow-x:auto;margin:20px 0;border-radius:10px;border:1px solid #E2E8F0;box-shadow:0 1px 4px rgba(0,0,0,0.04)">' +
      '<table style="width:100%;border-collapse:collapse;margin:0;font-size:12.5px;line-height:1.5">';
    let inTbody = false;
    let tbodyRowIdx = 0;

    tableRows.forEach((row, i) => {
      const parts = row.split("|");
      const cells = parts
        .slice(1, parts.length - 1)
        .map((c) => c.trim() || "&nbsp;");

      const isSeparator = cells.every((c) =>
        /^[-:\s]+$/.test(c.replace(/&nbsp;/g, "")),
      );

      if (isSeparator) {
        if (!inTbody) {
          inTbody = true;
          tableHtml += "<tbody>";
        }
      } else if (
        i === 0 &&
        tableRows.length > 1 &&
        tableRows[1]
          .split("|")
          .slice(1, -1)
          .every((c) => /^[-:\s]+$/.test(c.trim()))
      ) {
        tableHtml +=
          "<thead><tr>" +
          cells
            .map(
              (c) =>
                `<th style="padding:10px 14px;background:#F1F5F9;color:#1E293B;font-weight:800;font-size:12px;text-align:left;border-bottom:2px solid #CBD5E1;white-space:nowrap">${c}</th>`,
            )
            .join("") +
          "</tr></thead>";
      } else {
        if (!inTbody && i === 0) {
          inTbody = true;
          tableHtml += "<tbody>";
        }
        const rowBg = tbodyRowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        tableHtml +=
          `<tr style="background:${rowBg};transition:background .1s" onmouseover="this.style.background='#EFF6FF'" onmouseout="this.style.background='${rowBg}'">` +
          cells
            .map(
              (c) =>
                `<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;color:#374151;font-size:12.5px">${c}</td>`,
            )
            .join("") +
          "</tr>";
        tbodyRowIdx++;
      }
    });
    if (inTbody) tableHtml += "</tbody>";
    tableHtml += "</table></div>";
    processedLines.push(tableHtml);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      if (inBlockquote) {
        inBlockquote = false;
        processedLines.push(
          bqType === "default" ? `</blockquote>` : `</div></div>`,
        );
        bqType = null;
      }
      tableRows.push(trimmedLine);
    } else {
      processTable();

      if (trimmedLine.startsWith(">")) {
        let content = trimmedLine.substring(1).trim();
        const alertMatch = content.match(
          /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/,
        );

        if (!inBlockquote) {
          inBlockquote = true;
          if (alertMatch) {
            bqType = alertMatch[1];
            content = content.replace(
              /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/,
              "",
            );
            processedLines.push(
              `<div style="border-left:4px solid ${alertColors[bqType]};background:${alertColors[bqType]}10;padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0">`,
            );
            processedLines.push(
              `<div style="font-weight:800;font-size:13px;color:${alertColors[bqType]};margin-bottom:6px">${alertIcons[bqType]} ${bqType}</div>`,
            );
            processedLines.push(
              `<div style="font-size:13px;color:#374151;line-height:1.6">`,
            );
          } else {
            bqType = "default";
            processedLines.push(
              `<blockquote style="border-left:4px solid #E5E7EB;color:#6B7280;padding-left:16px;margin:16px 0;font-style:italic">`,
            );
          }
        }

        if (content) {
          processedLines.push(content + "<br>");
        }
      } else {
        if (inBlockquote) {
          inBlockquote = false;
          processedLines.push(
            bqType === "default" ? `</blockquote>` : `</div></div>`,
          );
          bqType = null;
        }
        processedLines.push(line);
      }
    }
  }
  processTable();
  if (inBlockquote) {
    processedLines.push(
      bqType === "default" ? `</blockquote>` : `</div></div>`,
    );
  }

  html = processedLines.join("\n");

  // 3. Inline formatting
  html = html
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#F1F5F9;color:#1E40AF;padding:2px 6px;border-radius:4px;font-size:12.5px;font-weight:600">$1</code>',
    )
    .replace(
      /^######\s+(.+)$/gm,
      '<h6 style="font-size:13px;font-weight:800;color:#6B7280;margin:16px 0 8px">$1</h6>',
    )
    .replace(
      /^#####\s+(.+)$/gm,
      '<h5 style="font-size:14px;font-weight:800;color:#4B5563;margin:16px 0 8px">$1</h5>',
    )
    .replace(
      /^####\s+(.+)$/gm,
      '<h4 style="font-size:15px;font-weight:800;color:#374151;margin:20px 0 10px">$1</h4>',
    )
    .replace(
      /^###\s+(.+)$/gm,
      '<h3 style="font-size:17px;font-weight:900;color:#1E293B;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #E5E7EB">$1</h3>',
    )
    .replace(
      /^##\s+(.+)$/gm,
      '<h2 style="font-size:19px;font-weight:900;color:#0F172A;margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid #3B82F6">$1</h2>',
    )
    .replace(
      /^#\s+(.+)$/gm,
      '<h1 style="font-size:24px;font-weight:900;color:#0F172A;margin:0 0 20px">$1</h1>',
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" style="color:#3B82F6;text-decoration:underline;font-weight:500">$1</a>',
    )
    .replace(
      /^\s*-\s+(.+)$/gm,
      '<li style="margin:6px 0;font-size:13px;margin-left:20px">$1</li>',
    )
    .replace(
      /^\s*\d+\.\s+(.+)$/gm,
      '<li style="margin:6px 0;font-size:13px;margin-left:20px;list-style-type:decimal">$1</li>',
    )
    .replace(
      /^---$/gm,
      '<hr style="border:none;border-top:1px solid #E5E7EB;margin:30px 0">',
    );

  html = html.replace(/\n\n/g, '<div style="margin-bottom:12px"></div>');
  html = html.replace(/\n/g, " ");

  // 4. Restore code blocks
  html = html.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_, i) =>
      `<pre style="background:#1E293B;color:#E2E8F0;padding:16px 20px;border-radius:10px;overflow-x:auto;font-size:13px;line-height:1.6;margin:16px 0"><code>${codeBlocks[i]}</code></pre>`,
  );

  return `<div>${html}</div>`;
}

console.log("[bo_prd_viewer] 요구사항정의서 뷰어 로드됨 (PRD_DATA 기반, v3 — 날짜정렬+상태필터)");
