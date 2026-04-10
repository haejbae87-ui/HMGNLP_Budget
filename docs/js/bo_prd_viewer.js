// ─── 요구사항정의서(PRD) 모음 뷰어 ─────────────────────────────────────────
// docs/PRD/ 폴더의 .md 파일들을 GitHub Pages에서 fetch하여 BO에서 렌더링

// PRD 인덱스 (자동 생성됨 — prd_manager 스킬에서 업데이트)
const PRD_INDEX = [
  {
    id: 'personal_bankbook',
    title: '개인별 분리 통장',
    file: 'personal_bankbook.md',
    version: 'v1.1',
    status: '정책 확정',
    date: '2026-04-10',
    tags: ['예산', '통장', '개인별'],
    summary: '팀 통장 외에 개인별 분리 통장(성장지원금) 정책 추가. 자동 생성, 퇴사자 처리, 인사이동 정책 포함.',
  },
  {
    id: 'cross_tenant_linked_teams',
    title: '크로스 테넌트 총괄부서 연동',
    file: 'cross_tenant_linked_teams.md',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-10',
    tags: ['크로스테넌트', '총괄부서', '결재'],
    summary: 'HMC↔KIA 총괄부서 간 교육계획/신청/결재 크로스 테넌트 연동 아키텍처.',
  },
];

let _prdSelectedId = null;

async function renderPrdCollection() {
  const el = document.getElementById('bo-content');

  // 목록 뷰 (카드 형태)
  const cardsHtml = PRD_INDEX.map(prd => {
    const statusColor = prd.status === '구현 완료' ? { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' }
      : prd.status === '정책 확정' ? { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' }
        : { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    const tagsHtml = (prd.tags || []).map(t =>
      `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#F3F4F6;color:#6B7280;font-weight:600">${t}</span>`
    ).join(' ');
    return `
    <div onclick="_prdSelectDoc('${prd.id}')" class="bo-card" 
         style="padding:18px 22px;margin-bottom:12px;cursor:pointer;border-left:4px solid ${statusColor.border};
                transition:all .15s;${_prdSelectedId === prd.id ? 'background:#F0F9FF;border-color:#3B82F6' : ''}"
         onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='${_prdSelectedId === prd.id ? '#F0F9FF' : '#fff'}'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:15px;font-weight:900;color:#111827">${prd.title}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;
                       background:${statusColor.bg};color:${statusColor.text};border:1px solid ${statusColor.border}">${prd.status}</span>
          <code style="font-size:10px;background:#F3F4F6;padding:2px 7px;border-radius:5px;color:#6B7280;font-weight:700">${prd.version}</code>
        </div>
        <span style="font-size:11px;color:#9CA3AF">${prd.date}</span>
      </div>
      <div style="font-size:12px;color:#6B7280;margin-bottom:6px">${prd.summary}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${tagsHtml}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1200px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">기타</span>
        <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">📋 요구사항정의서 모음</h1>
      </div>
      <p style="font-size:12px;color:#64748B;margin:0">시스템에 반영된 모든 PRD(요구사항정의서)를 조회합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;padding:4px 10px;border-radius:6px;background:#F5F3FF;color:#7C3AED;font-weight:700;border:1px solid #DDD6FE">
        총 ${PRD_INDEX.length}건
      </span>
    </div>
  </div>

  <div style="display:flex;gap:20px">
    <!-- 좌: PRD 목록 -->
    <div style="width:340px;flex-shrink:0">
      ${cardsHtml}
      ${PRD_INDEX.length === 0 ? '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">등록된 요구사항정의서가 없습니다.</div>' : ''}
    </div>
    <!-- 우: PRD 본문 뷰어 -->
    <div id="prd-viewer" style="flex:1;min-width:0">
      ${_prdSelectedId ? '' : `
      <div style="padding:60px;text-align:center;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#9CA3AF">
        <div style="font-size:36px;margin-bottom:10px">📄</div>
        <div style="font-size:13px;font-weight:700;color:#64748B">좌측 목록에서 요구사항정의서를 선택하세요</div>
        <div style="font-size:11px;margin-top:4px">마크다운 형태로 본문을 렌더링합니다</div>
      </div>`}
    </div>
  </div>
</div>`;

  // 선택된 PRD가 있으면 바로 로드
  if (_prdSelectedId) _prdLoadDoc(_prdSelectedId);
}

async function _prdSelectDoc(id) {
  _prdSelectedId = id;
  renderPrdCollection();
}

async function _prdLoadDoc(id) {
  const prd = PRD_INDEX.find(p => p.id === id);
  if (!prd) return;
  const viewer = document.getElementById('prd-viewer');
  viewer.innerHTML = `<div style="padding:30px;text-align:center;color:#9CA3AF;font-size:12px">🔄 문서 로딩 중...</div>`;

  try {
    // GitHub Pages에서 md 파일 fetch
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const mdUrl = `${baseUrl}/PRD/${prd.file}?t=${Date.now()}`;
    const resp = await fetch(mdUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const mdText = await resp.text();

    // 간이 마크다운 → HTML 변환
    const html = _prdMd2Html(mdText);

    viewer.innerHTML = `
    <div class="bo-card" style="padding:24px 28px;overflow-y:auto;max-height:calc(100vh - 200px)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #E5E7EB">
        <div>
          <h2 style="font-size:18px;font-weight:900;margin:0;color:#111827">${prd.title}</h2>
          <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${prd.file} · ${prd.version} · ${prd.date}</div>
        </div>
      </div>
      <div class="prd-content" style="font-size:13px;line-height:1.8;color:#374151">${html}</div>
    </div>`;
  } catch (err) {
    viewer.innerHTML = `
    <div class="bo-card" style="padding:30px;text-align:center;color:#EF4444">
      <div style="font-size:24px;margin-bottom:8px">⚠️</div>
      <div style="font-size:13px;font-weight:700">문서 로드 실패</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">${err.message}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:8px">파일 경로: PRD/${prd.file}</div>
    </div>`;
  }
}

// ── 간이 마크다운 → HTML 변환 ──────────────────────────────────────────
function _prdMd2Html(md) {
  let html = md
    // 코드블록 (```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:#1E293B;color:#E2E8F0;padding:14px 18px;border-radius:10px;overflow-x:auto;font-size:12px;line-height:1.6;margin:12px 0"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    // 인라인 코드
    .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#1E40AF;padding:1px 6px;border-radius:4px;font-size:12px;font-weight:600">$1</code>')
    // 헤딩
    .replace(/^######\s+(.+)$/gm, '<h6 style="font-size:12px;font-weight:800;color:#6B7280;margin:14px 0 6px">$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5 style="font-size:13px;font-weight:800;color:#4B5563;margin:14px 0 6px">$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4 style="font-size:14px;font-weight:800;color:#374151;margin:16px 0 8px">$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3 style="font-size:15px;font-weight:900;color:#1E293B;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #E5E7EB">$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2 style="font-size:17px;font-weight:900;color:#0F172A;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #3B82F6">$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1 style="font-size:20px;font-weight:900;color:#0F172A;margin:0 0 16px">$1</h1>')
    // 볼드/이탤릭
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 테이블
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c.trim()))) return '<!--sep-->';
      return '<tr>' + cells.map(c => `<td style="padding:6px 10px;border:1px solid #E5E7EB;font-size:12px">${c.trim()}</td>`).join('') + '</tr>';
    })
    // blockquote (> ...)
    .replace(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gm, (_, type) => {
      const colors = { NOTE: '#3B82F6', TIP: '#10B981', IMPORTANT: '#7C3AED', WARNING: '#F59E0B', CAUTION: '#EF4444' };
      return `<div style="border-left:4px solid ${colors[type] || '#6B7280'};background:${colors[type] || '#6B7280'}08;padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0;font-size:12px;color:${colors[type] || '#374151'};font-weight:700">[${type}]`;
    })
    .replace(/^>\s+(.+)$/gm, '$1<br>')
    // 링크
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#3B82F6;text-decoration:underline">$1</a>')
    // 리스트
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;font-size:12px">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:3px 0;font-size:12px">$1</li>')
    // 수평선
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #E5E7EB;margin:16px 0">')
    // 줄바꿈
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>');

  // 테이블 래핑
  html = html.replace(/((?:<tr>.*?<\/tr>\s*(?:<!--sep-->)?\s*)+)/g,
    '<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">$1</table></div>');
  html = html.replace(/<!--sep-->/g, '');

  return `<div>${html}</div>`;
}

console.log('[bo_prd_viewer] 요구사항정의서 뷰어 로드됨');
