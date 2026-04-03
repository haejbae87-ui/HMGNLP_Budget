// ─── 📊 교육예산 수요분석 ──────────────────────────────────────────────────
let _bdDemandData = null;   // plans 캐시
let _bdVorgData = null;     // vorg templates 캐시
let _bdYear = new Date().getFullYear();
let _bdDrillOrg = null;     // 드릴다운 조직명

async function renderBudgetDemand() {
    const el = document.getElementById('bo-content');
    const sb = typeof getSB === 'function' ? getSB() : null;
    const tenantId = boCurrentPersona?.tenantId || 'HMC';

    // DB 로드
    if (!_bdDemandData && sb) {
        try {
            const [plansRes, vorgRes] = await Promise.all([
                sb.from('plans').select('*').eq('tenant_id', tenantId).neq('status', 'draft'),
                sb.from('virtual_org_templates').select('*').eq('tenant_id', tenantId),
            ]);
            _bdDemandData = plansRes.data || [];
            _bdVorgData = vorgRes.data || [];
        } catch (err) {
            console.error('[renderBudgetDemand] DB 조회 실패:', err.message);
            _bdDemandData = [];
            _bdVorgData = [];
        }
    }
    if (!_bdDemandData) _bdDemandData = [];
    if (!_bdVorgData) _bdVorgData = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];

    // 드릴다운 모드
    if (_bdDrillOrg) {
        _renderBdDrillDown(el);
        return;
    }

    try {
        // 연도 필터
        const plans = _bdDemandData.filter(p => {
            const yr = (p.created_at || '').slice(0, 4);
            return yr === String(_bdYear);
        });

        // ── 전체 집계 ──
        const totalCount = plans.length;
        const demandTotal = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
        const confirmedTotal = plans.filter(p => p.status === 'approved' || p.status === 'completed')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
        const pendingTotal = plans.filter(p => p.status === 'pending')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
        const rejectedTotal = plans.filter(p => p.status === 'rejected')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
        const confirmedPct = demandTotal > 0 ? Math.round(confirmedTotal / demandTotal * 100) : 0;

        // ── VOrg별 집계 ──
        const vorgSections = _bdVorgData.map(vorg => {
            const vPlans = plans.filter(p => p.isolation_group_id === vorg.isolation_group_id);
            if (vPlans.length === 0) return null;

            // 조직(팀)별 집계: applicant_name 기준 (tree_data 있으면 팀 소속 매핑)
            const orgMap = {};
            vPlans.forEach(p => {
                const org = p.applicant_name || '미분류';
                if (!orgMap[org]) orgMap[org] = { name: org, count: 0, demand: 0, confirmed: 0, pending: 0, rejected: 0, plans: [] };
                orgMap[org].count++;
                orgMap[org].demand += Number(p.amount || 0);
                if (p.status === 'approved' || p.status === 'completed') orgMap[org].confirmed += Number(p.amount || 0);
                if (p.status === 'pending') orgMap[org].pending += Number(p.amount || 0);
                if (p.status === 'rejected') orgMap[org].rejected += Number(p.amount || 0);
                orgMap[org].plans.push(p);
            });
            const orgs = Object.values(orgMap).sort((a, b) => b.demand - a.demand);
            const vDemand = orgs.reduce((s, o) => s + o.demand, 0);
            const vConfirmed = orgs.reduce((s, o) => s + o.confirmed, 0);
            const vPending = orgs.reduce((s, o) => s + o.pending, 0);
            const vPct = vDemand > 0 ? Math.round(vConfirmed / vDemand * 100) : 0;

            return { vorg, orgs, vDemand, vConfirmed, vPending, vPct, planCount: vPlans.length };
        }).filter(Boolean);

        // ── 연도 선택 ──
        const yearSel = `<select onchange="_bdYear=Number(this.value);_bdDemandData=null;renderBudgetDemand()"
      style="padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer">
      ${[_bdYear + 1, _bdYear, _bdYear - 1, _bdYear - 2].map(y =>
            `<option value="${y}" ${_bdYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
    </select>`;

        // ── 요약 카드 ──
        const cards = [
            { icon: '📋', label: '전체 계획', val: `${totalCount}건`, color: '#002C5F', bg: '#EFF6FF' },
            { icon: '📊', label: '수요 예산', val: _bdFmt(demandTotal), color: '#0369A1', bg: '#F0F9FF' },
            { icon: '✅', label: '확정 예산', val: _bdFmt(confirmedTotal), color: '#059669', bg: '#F0FDF4' },
            { icon: '⏳', label: '미결 예산', val: _bdFmt(pendingTotal), color: '#D97706', bg: '#FFFBEB' },
        ];

        // ── VOrg 테이블 ──
        const vorgHtml = vorgSections.map(vs => `
    <div class="bo-card" style="margin-top:16px;overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#002C5F08,#0369A108);border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:14px;font-weight:900;color:#002C5F">${vs.vorg.name}</span>
          <span style="font-size:11px;color:#6B7280;margin-left:8px">${vs.planCount}건</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:11px;color:#059669;font-weight:800">확정 ${vs.vPct}%</span>
          <div style="width:80px;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden">
            <div style="width:${vs.vPct}%;height:100%;background:${vs.vPct >= 80 ? '#059669' : vs.vPct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px;transition:width .3s"></div>
          </div>
        </div>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>상신자</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요 예산</th><th style="text-align:right">확정 예산</th>
          <th style="text-align:right">미결</th><th style="text-align:center">확정률</th>
        </tr></thead>
        <tbody>
          ${vs.orgs.map(o => {
            const pct = o.demand > 0 ? Math.round(o.confirmed / o.demand * 100) : 0;
            const safeOrg = o.name.replace(/'/g, "\\'");
            return `
          <tr onclick="_bdDrillOrg='${safeOrg}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:700">${o.name}</td>
            <td style="text-align:center">${o.count}건</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(o.demand)}</td>
            <td style="text-align:right;font-weight:800;color:#059669">${_bdFmt(o.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(o.pending)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626'}">${pct}%</span>
              </div>
            </td>
          </tr>`;
        }).join('')}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td>소계</td>
            <td style="text-align:center">${vs.planCount}건</td>
            <td style="text-align:right">${_bdFmt(vs.vDemand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(vs.vConfirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(vs.vPending)}</td>
            <td style="text-align:center;color:${vs.vPct >= 80 ? '#059669' : vs.vPct >= 50 ? '#D97706' : '#DC2626'}">${vs.vPct}%</td>
          </tr>
        </tbody>
      </table>
    </div>`).join('');

        el.innerHTML = `
    <div class="bo-fade">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
          <p class="bo-page-sub">교육계획 기반 조직별 예산 수요·확정 현황</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${yearSel}
          <button onclick="_bdDemandData=null;renderBudgetDemand()" class="bo-btn-primary">🔄 새로고침</button>
        </div>
      </div>

      <!-- 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px">
        ${cards.map(c => `
        <div style="background:${c.bg};border-radius:14px;padding:16px 18px;border:1.5px solid ${c.color}20">
          <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:6px">${c.icon} ${c.label}</div>
          <div style="font-size:22px;font-weight:900;color:${c.color}">${c.val}</div>
        </div>`).join('')}
      </div>

      <!-- 전체 확정률 바 -->
      <div class="bo-card" style="padding:14px 20px;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:16px">
          <span style="font-size:12px;font-weight:900;color:#374151;white-space:nowrap">전체 확정률</span>
          <div style="flex:1;height:10px;background:#E5E7EB;border-radius:5px;overflow:hidden">
            <div style="width:${confirmedPct}%;height:100%;background:linear-gradient(90deg,#059669,#34D399);border-radius:5px;transition:width .5s"></div>
          </div>
          <span style="font-size:13px;font-weight:900;color:#059669;white-space:nowrap">${confirmedPct}%</span>
          <span style="font-size:11px;color:#9CA3AF">(${_bdFmt(confirmedTotal)} / ${_bdFmt(demandTotal)})</span>
        </div>
      </div>

      <!-- VOrg별 테이블 -->
      ${vorgSections.length > 0 ? vorgHtml : `
      <div class="bo-card" style="padding:60px;text-align:center;margin-top:16px">
        <div style="font-size:48px;margin-bottom:10px">📭</div>
        <div style="font-weight:700;color:#6B7280">${_bdYear}년 교육계획 데이터가 없습니다</div>
        <div style="font-size:12px;color:#9CA3AF;margin-top:6px">프론트오피스에서 교육계획을 수립하면 수요 분석 데이터가 표시됩니다.</div>
      </div>`}

      <!-- 합계 -->
      ${vorgSections.length > 0 ? `
      <div class="bo-card" style="padding:16px 20px;margin-top:16px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white;border-radius:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <span style="font-size:14px;font-weight:900">📈 전체 합계</span>
          <div style="display:flex;gap:24px;font-size:13px">
            <span>수요 <strong style="font-size:16px">${_bdFmt(demandTotal)}</strong></span>
            <span>확정 <strong style="font-size:16px;color:#86EFAC">${_bdFmt(confirmedTotal)}</strong></span>
            <span>미결 <strong style="font-size:16px;color:#FDE68A">${_bdFmt(pendingTotal)}</strong></span>
            <span>반려 <strong style="font-size:16px;color:#FECACA">${_bdFmt(rejectedTotal)}</strong></span>
          </div>
        </div>
      </div>` : ''}
    </div>`;
    } catch (err) {
        console.error('[renderBudgetDemand] 에러:', err);
        el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>교육예산 수요분석 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_bdDemandData=null;renderBudgetDemand()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
    }
}

// ── 드릴다운: 특정 상신자의 계획 목록 ──
function _renderBdDrillDown(el) {
    const plans = (_bdDemandData || []).filter(p => {
        const yr = (p.created_at || '').slice(0, 4);
        return yr === String(_bdYear) && p.applicant_name === _bdDrillOrg && p.status !== 'draft';
    });
    const statusLabel = { pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소', completed: '완료', draft: '임시저장' };
    const statusColor = { pending: '#D97706', approved: '#059669', rejected: '#DC2626', cancelled: '#9CA3AF', completed: '#059669' };

    const rows = plans.map(p => {
        const st = p.status || 'pending';
        return `
    <tr>
      <td><code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${p.id}</code></td>
      <td style="font-weight:700">${p.edu_name || '-'}</td>
      <td>${p.account_code || '-'}</td>
      <td style="text-align:right;font-weight:900">${Number(p.amount || 0).toLocaleString()}원</td>
      <td>
        <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${statusColor[st] || '#6B7280'}15;color:${statusColor[st] || '#6B7280'}">${statusLabel[st] || st}</span>
      </td>
      <td style="font-size:11px;color:#6B7280">${(p.created_at || '').slice(0, 10)}</td>
    </tr>`;
    }).join('');

    const demandSum = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const confirmedSum = plans.filter(p => p.status === 'approved' || p.status === 'completed').reduce((s, p) => s + Number(p.amount || 0), 0);

    el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillOrg=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 수요분석으로
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">📊 상세 계획 목록</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${_bdDrillOrg} — ${_bdYear}년 교육계획</h2>
        <div style="margin-top:8px;display:flex;gap:20px;font-size:12px">
          <span>수요 <strong>${_bdFmt(demandSum)}</strong></span>
          <span>확정 <strong style="color:#86EFAC">${_bdFmt(confirmedSum)}</strong></span>
          <span>${plans.length}건</span>
        </div>
      </div>
      ${plans.length > 0 ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>ID</th><th>계획명</th><th>계정</th>
          <th style="text-align:right">금액</th><th>상태</th><th>제출일</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `
      <div style="padding:40px;text-align:center;color:#9CA3AF">데이터 없음</div>`}
    </div>
  </div>`;
}

// 금액 포맷 헬퍼
function _bdFmt(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
    if (n >= 10000) return (n / 10000).toFixed(0) + '만원';
    return n.toLocaleString() + '원';
}
