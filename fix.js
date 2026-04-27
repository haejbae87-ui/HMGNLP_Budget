const fs = require('fs');
const file = 'c:/Users/jbae/OneDrive/바탕 화면/HMGNLP_Budget/public/js/plans.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = 'let _forecastCampaignHtmlStr = "";';
const endStr = '// ─── 계획 상세 보기';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index");
  process.exit(1);
}

const replacement = `let _forecastCampaignHtmlStr = "";
async function _fetchForecastCampaigns() {
  if (_isFetchingForecasts) return;
  _isFetchingForecasts = true;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb.from("forecast_deadlines").select("*").eq("tenant_id", currentPersona.tenantId).eq("is_closed", false);
      const now = new Date(); now.setHours(0,0,0,0);
      const campaigns = (data || []).filter(dl => {
          if (dl.recruit_start && now < new Date(dl.recruit_start)) return false;
          if (dl.recruit_end && now > new Date(dl.recruit_end)) return false;
          return true;
      });
      if (campaigns.length === 0) {
        _forecastCampaignHtmlStr = \`<div style="padding:40px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB;margin-bottom:20px;">
          <div style="font-size:32px;margin-bottom:12px">📢</div>
          <div style="font-size:14px;font-weight:900;color:#374151">현재 진행 중인 전사 사업계획 캠페인이 없습니다.</div>
        </div>\`;
      } else {
        _forecastCampaignHtmlStr = \`<div style="margin-bottom:20px;">
          <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Campaign</div>
          <h2 class="text-2xl font-black text-brand tracking-tight mb-4">전사 사업계획 수립 캠페인</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
          \${campaigns.map(c => \`
            <div onclick="startPlanWizard('forecast', \${c.fiscal_year})" style="padding:24px 20px;border-radius:16px;background:white;border:1.5px solid #BFDBFE;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.04);transition:all 0.15s"
                 onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(37,99,235,0.1)'"
                 onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.04)'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div style="font-size:12px;font-weight:900;color:#1D4ED8;background:#EFF6FF;padding:4px 10px;border-radius:8px;">🎯 \${c.fiscal_year}년도 예산 확정</div>
                <div style="font-size:11px;font-weight:800;color:#DC2626;background:#FEF2F2;padding:4px 8px;border-radius:6px;">⏳ 마감: \${c.recruit_end ? c.recruit_end.substring(0,10) : '상시'}</div>
              </div>
              <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:8px;line-height:1.4">\${c.title || c.fiscal_year + '년도 전사 사업계획 (수요예측)'}</div>
              <div style="font-size:13px;color:#6B7280;line-height:1.5">\${c.description || '차년도(또는 당해) 필요한 교육 예산을 사전에 확보하기 위한 기안입니다.'}</div>
              <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #E5E7EB;font-size:13px;font-weight:800;color:#2563EB;display:flex;align-items:center;justify-content:space-between">
                <span>참여하여 계획 수립하기</span>
                <span style="font-size:16px">→</span>
              </div>
            </div>
          \`).join('')}
          </div>
        </div>\`;
      }
    } catch (e) {
      _forecastCampaignHtmlStr = '';
    }
  }
  _isFetchingForecasts = false;
}

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log("Successfully replaced _fetchForecastCampaigns");
