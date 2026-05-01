const fs = require('fs');
let file = 'public/js/bo_budget_demand.js';
let content = fs.readFileSync(file, 'utf8');

// 1. 조직단위 -> 교육조직
content = content.replace(/조직단위/g, '교육조직');

// 2. 전체 계획 -> 전체 사업계획
content = content.replace(/전체 계획/g, '전체 사업계획');

// 3. 1차조정률 제외
// Remove the progress bar section (lines 303-313 approx)
content = content.replace(/<div class="bo-card" style="padding:14px 20px;margin-bottom:16px">\s*<div style="display:flex;align-items:center;gap:16px">\s*<span style="font-size:12px;font-weight:900;color:#374151;white-space:nowrap">1차조정률<\/span>[\s\S]*?<\/div>\s*<\/div>/g, '');

// Remove the column headers and td in Level 1 (교육조직별 수요 현황)
content = content.replace(/<th style="text-align:center">1차조정률<\/th>/g, '');
content = content.replace(/<td style="text-align:center">\s*<div style="display:flex;align-items:center;gap:6px;justify-content:center">\s*<div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">\s*<div style="width:\${g\.pct}%;height:100%;background:\${g\.pct >= 80 \? "#059669" : g\.pct >= 50 \? "#D97706" : "#DC2626"};border-radius:3px"><\/div>\s*<\/div>\s*<span style="font-size:10px;font-weight:800;color:\${g\.pct >= 80 \? "#059669" : g\.pct >= 50 \? "#D97706" : "#DC2626"}">\${g\.pct}%<\/span>\s*<\/div>\s*<\/td>/g, '');

// Aggregate total row pct
content = content.replace(/<td style="text-align:center;font-weight:900;color:\${opPct>=80\?"#0369A1":opPct>=50\?"#D97706":"#DC2626"}">\${opPct}%<\/td>/g, '');


// 4. 미결, 반려 0원 -> 0건
content = content.replace(/\$\{_bdFmt\(g\.pending\)\}/g, '${g.pending === 0 ? "0건" : _bdFmt(g.pending)}');
content = content.replace(/\$\{_bdFmt\(g\.rejected\)\}/g, '${g.rejected === 0 ? "0건" : _bdFmt(g.rejected)}');
content = content.replace(/\$\{_bdFmt\(pendingTotal\)\}/g, '${pendingTotal === 0 ? "0건" : _bdFmt(pendingTotal)}');
content = content.replace(/\$\{_bdFmt\(rejectedTotal\)\}/g, '${rejectedTotal === 0 ? "0건" : _bdFmt(rejectedTotal)}');

fs.writeFileSync(file, content, 'utf8');
console.log('Modified bo_budget_demand.js successfully.');
