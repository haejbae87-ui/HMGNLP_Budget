// ─── 6 Depth: 통계 및 리포트 ─────────────────────────────────────────────────

function renderBoReports() {
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">통계 및 리포트</h1>
      <p class="bo-page-sub">조직별 · 계정별 예산 집행 현황 분석 · 연말 마감</p>
    </div>
    <button class="bo-btn-secondary" onclick="alert('엑셀 전체 다운로드')">⬇ 전체 엑셀 다운로드</button>
  </div>

  <!-- Section 1: 조직별 집행 -->
  <div class="bo-card" style="overflow:hidden;margin-bottom:20px">
    <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <span class="bo-section-title">조직별 예산 집행 현황 (일반 교육예산)</span>
      <button class="bo-btn-secondary bo-btn-sm">엑셀 다운로드</button>
    </div>
    <table class="bo-table">
      <thead><tr>
        <th>본부</th><th>팀</th>
        <th style="text-align:right">배분액</th>
        <th style="text-align:right">실차감</th>
        <th style="text-align:right">가점유</th>
        <th style="text-align:right">가용 잔액</th>
        <th style="min-width:120px">소진률</th>
      </tr></thead>
      <tbody>
        ${VIRTUAL_ORG.general.hqs.flatMap(h=>h.teams.map(t=>{
          const spent = t.budget.deducted + t.budget.holding;
          const pct = (spent/t.budget.allocated*100).toFixed(1);
          const avail = t.budget.allocated - spent;
          const barColor = pct>80?'#EF4444':pct>50?'#F59E0B':'#007AFF';
          return `<tr>
            <td style="color:#9CA3AF;font-size:12px">${h.name}</td>
            <td style="font-weight:700">${t.name}</td>
            <td style="text-align:right;font-weight:900">${boFmt(t.budget.allocated)}원</td>
            <td style="text-align:right;color:#002C5F;font-weight:700">${boFmt(t.budget.deducted)}원</td>
            <td style="text-align:right;color:#B45309;font-weight:700">${boFmt(t.budget.holding)}원</td>
            <td style="text-align:right;font-weight:900;color:${avail<5000000?'#EF4444':'#059669'}">${boFmt(avail)}원</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:8px;background:#E5E7EB;border-radius:9999px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${barColor};border-radius:9999px;transition:width .4s"></div>
                </div>
                <span style="font-size:11px;font-weight:900;color:${pct>80?'#EF4444':'#374151'};width:36px">${pct}%</span>
              </div>
            </td>
          </tr>`;
        })).join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 2: 계정별 소진 비율 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <div class="bo-card" style="padding:20px">
      <div class="bo-section-title" style="margin-bottom:16px">계정별 예산 소진 비율</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${[
          { label:'운영계정', deducted:62000000, total:140000000, color:'#002C5F' },
          { label:'기타계정', deducted:18000000, total:50000000,  color:'#7C3AED' },
          { label:'참가계정', deducted:28000000, total:90000000,  color:'#059669' },
          { label:'R&D 통합계정', deducted:85000000, total:350000000, color:'#D97706' },
        ].map(a=>{
          const pct = (a.deducted/a.total*100).toFixed(1);
          return `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px;font-weight:700">
              <span style="color:#374151">${a.label}</span>
              <span style="color:${a.color}">${pct}% 소진</span>
            </div>
            <div style="height:10px;background:#E5E7EB;border-radius:9999px;overflow:hidden;margin-bottom:3px">
              <div style="width:${pct}%;height:100%;background:${a.color};border-radius:9999px;transition:width .4s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF">
              <span>실차감 ${boFmt(a.deducted)}원</span>
              <span>총 ${boFmt(a.total)}원</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- 연말 마감 -->
    <div class="bo-card" style="padding:20px">
      <div class="bo-section-title" style="margin-bottom:16px">연말 예산 마감 처리</div>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:900;color:#B91C1C;margin-bottom:4px">⚠️ 주의: 마감 처리 후 복구 불가</div>
        <div style="font-size:11px;color:#6B7280">당해 연도 예산을 최종 마감합니다. 미집행 가점유 예산은 자동 환원됩니다.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">마감 대상 연도</label>
          <select style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700">
            <option>2025년</option><option selected>2026년</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">잔액 이월 처리</label>
          <div style="display:flex;gap:8px">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;cursor:pointer">
              <input type="radio" name="carryover" value="yes"/> 이월 허용
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;cursor:pointer">
              <input type="radio" name="carryover" value="no" checked/> 소멸 처리
            </label>
          </div>
        </div>
        <button class="bo-btn-danger" style="width:100%;padding:11px" onclick="alert('관리자 최종 확인 절차가 필요합니다. (실제 구현 시 2-factor 인증 추가 예정)')">
          🔒 2026년 예산 마감 실행
        </button>
      </div>
    </div>
  </div>
</div>`;
}
