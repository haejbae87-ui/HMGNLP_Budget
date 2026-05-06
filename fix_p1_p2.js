const fs = require('fs');

let bm = fs.readFileSync('public/js/bo_budget_master.js', 'utf8');
let bmRegex = /if \(_bmFilterAcctCode && myAcctData\.length > 0\) \{[\s\S]*?const d = myAcctData\[0\];[\s\S]*?if \(!d\.abRef\) \{[\s\S]*?const newId = 'AB_BM_' \+ d\.acct\.code;[\s\S]*?if \(!\(typeof ACCOUNT_BUDGETS !== 'undefined' && ACCOUNT_BUDGETS\.find\(x => x\.id === newId\)\)\) \{[\s\S]*?\(typeof ACCOUNT_BUDGETS !== 'undefined' \? ACCOUNT_BUDGETS : \[\]\)\.push\(\{[\s\S]*?id: newId,[\s\S]*?tenantId: _bmFilterTenant,[\s\S]*?accountCode: d\.acct\.code,[\s\S]*?dbAccountId: d\.acct\.id,[\s\S]*?sourceType: d\.acct\.integration_mode === 'sap' \? 'sap_if' : 'platform',[\s\S]*?fiscalYear: allocYear,[\s\S]*?baseAmount: d\.baseAmount,[\s\S]*?totalAdded: d\.totalAdded,[\s\S]*?status: 'confirmed',[\s\S]*?_fromDb: true,[\s\S]*?\}\);[\s\S]*?console\.log\('\[renderBudgetMaster\] ACCOUNT_BUDGETS 임시 항목 생성:', d\.acct\.code, newId\);[\s\S]*?\} else \{[\s\S]*?const existing = ACCOUNT_BUDGETS\.find\(x => x\.id === newId\);[\s\S]*?if \(existing\) \{ existing\.baseAmount = d\.baseAmount; existing\.totalAdded = d\.totalAdded; \}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/;

const replaceBM = \  // myAcctData 중 ACCOUNT_BUDGETS에 없는 항목 자동 생성 (전체 계정 대상)
  myAcctData.forEach(d => {
    if (!d.abRef) {
      const newId = 'AB_BM_' + d.acct.code;
      if (!(typeof ACCOUNT_BUDGETS !== 'undefined' && ACCOUNT_BUDGETS.find(x => x.id === newId))) {
        (typeof ACCOUNT_BUDGETS !== 'undefined' ? ACCOUNT_BUDGETS : []).push({
          id: newId,
          tenantId: _bmFilterTenant,
          accountCode: d.acct.code,
          dbAccountId: d.acct.id,
          sourceType: d.acct.integration_mode === 'sap' ? 'sap_if' : 'platform',
          fiscalYear: allocYear,
          baseAmount: d.baseAmount,
          totalAdded: d.totalAdded,
          status: 'confirmed',
          _fromDb: true,
        });
      } else {
        const existing = ACCOUNT_BUDGETS.find(x => x.id === newId);
        if (existing) { existing.baseAmount = d.baseAmount; existing.totalAdded = d.totalAdded; }
      }
    }
  });\;

if (bmRegex.test(bm)) {
    bm = bm.replace(bmRegex, replaceBM);
    fs.writeFileSync('public/js/bo_budget_master.js', bm, 'utf8');
    console.log('bo_budget_master.js updated for P1.');
} else {
    console.error('Target code not found in bo_budget_master.js');
}

let alloc = fs.readFileSync('public/js/bo_allocation.js', 'utf8');
let allocRegex = /const _acctFixedLabel = _filterAcctName[\s\S]*?\? '<input type="hidden" id="add-ab" value="' \+ _fixedAbId \+ '"\/>/;

if (allocRegex.test(alloc)) {
    alloc = alloc.replace(allocRegex, \const _acctFixedLabel = _filterAcctName
    ? '<input type="hidden" id="add-ab" value="' + _fixedAbId + '"/><input type="hidden" id="init-ab" value="' + _fixedAbId + '"/>\);
    fs.writeFileSync('public/js/bo_allocation.js', alloc, 'utf8');
    console.log('bo_allocation.js updated for P2.');
} else {
    console.error('Target code not found in bo_allocation.js');
}

