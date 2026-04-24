const fs = require('fs');
let content = fs.readFileSync('public/js/apply.js', 'utf8');

// 1. Add Helpers
if (!content.includes('function _isPatternA')) {
  const helpers = `
function _isPatternA(s) {
  if (!s) return false;
  if (s.budgetChoice === "rnd") return true;
  if (s.purpose?.id !== "external_personal" && s.budgetId) {
    const avail = typeof getPersonaBudgets !== "undefined" ? getPersonaBudgets(currentPersona, s.purpose?.id) : [];
    const cb = avail.find(b => b.id === s.budgetId);
    const pi = cb && typeof getProcessPatternInfo !== "undefined" ? getProcessPatternInfo(currentPersona, s.purpose?.id, cb.accountCode) : null;
    return pi?.pattern === "A";
  }
  return false;
}

function _renderLineItemsStep(s) {
  if (!s.lineItems || s.lineItems.length === 0) return \`<div class="text-gray-500 text-sm font-bold">선택된 교육계획이 없습니다.</div>\`;
  
  return s.lineItems.map((li, index) => {
    const fields = typeof getLineItemFieldConfig === 'function' ? getLineItemFieldConfig(li.eduType) : [];
    const dynamicHtml = typeof renderDynamicFormFields === 'function' 
      ? renderDynamicFormFields(fields, li, \`applyState.lineItems[\${index}]\`)
      : '';
      
    return \`
      <div class="mb-6 p-6 rounded-2xl border-2 border-violet-200 bg-white shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div>
            <div class="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">연동된 교육계획</div>
            <div class="font-black text-gray-900 text-base">\${li.title}</div>
            <div class="text-xs text-gray-500 mt-1">교육유형: \${li.eduType || '-'}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">계획 예산</div>
            <div class="font-black text-violet-600 text-lg">\${(li.subtotal||0).toLocaleString()}원</div>
          </div>
        </div>
        \${dynamicHtml}
      </div>
    \`;
  }).join('');
}
`;
  content = content.replace('function _renderApplyForm() {', helpers + '\nfunction _renderApplyForm() {');
}

// 2. Update Stepper text
content = content.replace(
  /\${\["목적 선택", "예산 선택", "교육유형 선택", "세부 정보"\]\[n - 1\]}/,
  `\${["목적 선택", "예산 선택", _isPatternA(s) ? "세부산출근거" : "교육유형 선택", "신청 정보"][n - 1]}`
);

// 3. Replace Step 3 Block
const step3Regex = /<!--Step 3: 교육유형 선택-->[\s\S]*?<!--Step 4: Detail-->/;
const newStep3 = `<!--Step 3: 교육유형 선택 OR Line Items-->
  <div class="card p-8 \${s.step === 3 ? "" : "hidden"}">
    \${_isPatternA(s) ? \`
      \${_applySelectionBanner(s, 3)}
      <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육계획 구성 (세부산출근거)</h2>
      <div class="mb-4 text-sm text-gray-500 font-bold">과정을 운영할 상세 내역을 입력해주세요. 집합/이러닝의 경우 차수를 지정해야 합니다.</div>
      \${_renderLineItemsStep(s)}
      <div class="flex justify-between mt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
        <button onclick="applyNext()" class="px-8 py-3 rounded-xl font-black text-sm transition bg-brand text-white hover:bg-blue-900 shadow-lg">다음 →</button>
      </div>
    \` : \`
      \${_applySelectionBanner(s, 3)}
      <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육유형 선택</h2>
      \${(() => {
        const tree = typeof getPolicyEduTree !== "undefined" ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget ? curBudget.account : null) : [];
        if (tree.length > 0) {
          return tree.map((node) => {
            const isLeaf = !node.subs || node.subs.length === 0;
            const isSelected = s.eduType === node.id;
            if (isLeaf) {
              const leafSelected = isSelected && !s.subType;
              return \\\`
        <div class="mb-3">
          <button onclick="applyState.eduType='\${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                   \${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">\${node.label}</button>
        </div>\\\`;
            } else {
              return \\\`
        <div class="mb-3 rounded-xl border-2 overflow-hidden \${isSelected ? "border-gray-900" : "border-gray-200"}">
          <button onclick="applyState.eduType='\${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 text-sm font-bold text-left transition flex items-center justify-between
                   \${isSelected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}">
            <span>\${node.label}</span>
            <span class="text-xs \${isSelected ? "text-gray-300" : "text-gray-400"}">\${isSelected ? "▼" : "▶"} \${node.subs.length}개 세부유형</span>
          </button>
          \${isSelected ? \\\`
          <div class="p-4 bg-gray-50 border-t border-gray-200">
            <div class="text-xs font-black text-blue-500 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
              세부 교육유형을 선택하세요
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              \${node.subs.map(st => \\\`
              <button onclick="applyState.subType='\${st.key}';renderApply()"
                class="p-3 rounded-xl border-2 text-sm font-bold text-left transition
                       \${s.subType === st.key ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"}">\${st.label}</button>
              \\\`).join("")}
            </div>
          </div>\\\` : ""}
        </div>\\\`;
            }
          }).join("");
        }
        const hasPolicies = typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0;
        if (hasPolicies) {
          return \\\`<div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
            <div class="font-black text-yellow-700 text-sm">⚠️ 허용된 교육유형 정보가 없습니다</div>
            <div class="text-xs text-yellow-600 mt-1">관리자에게 교육지원 운영 규칙 설정을 요청해 주세요.</div>
          </div>\\\`;
        }
        const subtypes = s.purpose?.subtypes || null;
        if (!subtypes) return '<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3"><span class="text-accent text-xl">✓</span> 표준 프로세스가 자동 적용됩니다.</div>';
        return subtypes.map(g => \\\`
    <div class="mb-7">
      <div class="mb-3">
        <div class="text-xs font-black text-gray-700 flex items-center gap-2 mb-0.5"><span class="w-1.5 h-1.5 bg-accent rounded-full inline-block"></span>\${g.group}</div>
        \${g.desc ? \\\`<div class="text-[11px] text-gray-400 pl-3.5">\${g.desc}</div>\\\` : ""}
      </div>
      <div class="grid \${g.items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-3">
        \${g.items.map(i => \\\`
        <button onclick="applyState.subType='\${i.id}';renderApply()" class="p-4 rounded-xl border-2 text-sm font-bold text-left leading-snug transition \${s.subType === i.id ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">\${i.label}</button>\\\`).join("")}
      </div>
    </div>\\\`).join("");
      })()}
      <div class="flex justify-between mt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
        \${(() => {
          const tree2 = typeof getPolicyEduTree !== "undefined" ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget ? curBudget.account : null) : [];
          if (tree2.length > 0) {
            const selNode = tree2.find((n) => n.id === s.eduType);
            const isLeaf = selNode && (!selNode.subs || selNode.subs.length === 0);
            const canNext = s.eduType && (isLeaf || s.subType);
            return \\\`<button onclick="applyNext()" \${!canNext ? "disabled" : ""}
              class="px-8 py-3 rounded-xl font-black text-sm transition \${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">다음 →</button>\\\`;
          }
          const dis = s.purpose?.subtypes && !s.subType;
          return \\\`<button onclick="applyNext()" \${dis ? "disabled" : ""}
            class="px-8 py-3 rounded-xl font-black text-sm transition \${dis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">다음 →</button>\\\`;
        })()}
      </div>
    \`}
  </div>

  <!--Step 4: Detail-->`;
content = content.replace(step3Regex, newStep3);

// 4. Update applyNext
const applyNextRegex = /if \(s\.step === 2 && \(isRndPatA \|\| isOperPatA\) && hasPlanSelected\) \{[\s\S]*?s\.step = Math\.min\(s\.step \+ 1, 4\);\n  \}/;
const newApplyNext = `if (s.step === 2 && (isRndPatA || isOperPatA) && hasPlanSelected) {
    s.step = 3; // 패턴A: 교육계획 구성 (Line Items)
    
    const planIds = s.planIds && s.planIds.length > 0 ? s.planIds : (s.planId ? [s.planId] : []);
    if (!s.lineItems) s.lineItems = [];
    s.lineItems = s.lineItems.filter(li => planIds.includes(li.planId));
    
    planIds.forEach(pid => {
      if (!s.lineItems.find(li => li.planId === pid)) {
        const linkedPlan = _dbApprovedPlans.find(p => p.id === pid);
        const rawPlan = (typeof _plansDbCache !== "undefined" ? _plansDbCache : []).find(p => p.id === pid);
        s.lineItems.push({
          planId: pid,
          title: linkedPlan ? linkedPlan.title : pid,
          eduType: linkedPlan ? linkedPlan.edu_type : '',
          subtotal: linkedPlan ? linkedPlan.amount : 0,
          calcGrounds_render: linkedPlan ? JSON.parse(JSON.stringify(linkedPlan.calc_grounds_snapshot || [])) : [],
          courseSessionLinks: []
        });
        
        if (s.lineItems.length === 1 && rawPlan) {
          const d = rawPlan.detail || {};
          if (!s.eduType && linkedPlan?.edu_type) s.eduType = linkedPlan.edu_type;
          if (!s.subType && linkedPlan?.edu_type) s.subType = linkedPlan.edu_type;
          if (!s.title && (rawPlan.edu_name || d.title)) s.title = rawPlan.edu_name || d.title || "";
          if (!s.startDate && d.startDate) s.startDate = d.startDate;
          if (!s.endDate && d.endDate) s.endDate = d.endDate;
          if (!s.institution && d.institution) s.institution = d.institution;
          if (!s.content && d.content) s.content = d.content;
          if (!s.amount && rawPlan.amount) s.amount = Number(rawPlan.amount);
          if (!s.purpose_text && d.purpose_text) s.purpose_text = d.purpose_text;
        }
      }
    });
  } else {
    s.step = Math.min(s.step + 1, 4);
  }`;
content = content.replace(applyNextRegex, newApplyNext);

fs.writeFileSync('public/js/apply.js', content, 'utf8');
console.log('Updated apply.js Step 3 & applyNext');
