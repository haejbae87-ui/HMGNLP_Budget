const fs = require('fs');

const utilsCode = fs.readFileSync('./public/js/utils.js', 'utf8');

const mockEnv = `
const ACCOUNT_TYPE_MAP = { 'HMC-PART': '참가', 'HMC-OPS': '운영' };
const _BO_TO_FO_PURPOSE = { 'external_group': 'external_personal', 'external_personal': 'external_personal' };
const _FO_TO_BO_PURPOSE = {};
Object.entries(_BO_TO_FO_PURPOSE).forEach(([bo, fo]) => {
  if (!_FO_TO_BO_PURPOSE[fo]) _FO_TO_BO_PURPOSE[fo] = [];
  _FO_TO_BO_PURPOSE[fo].push(bo);
});

const SERVICE_POLICIES = [
  {
    id: 'POL-HMC-GEN-001',
    name: '현대차 - 일반 - 참가 - 이러닝',
    tenant_id: 'HMC',
    purpose: 'external_group',
    account_codes: ['HMC-PART'],
    vorg_template_id: 'TPL_1774867919831',
    status: 'active',
    selected_edu_item: { subId: 'elearning', typeId: 'regular' },
    edu_types: ['regular']
  }
];

function _resolveVorgId(persona) {
  return persona.vorgId;
}

function _accountMatch(pAcctCodes, allowedSet) {
  return pAcctCodes.some(pc => {
    if (allowedSet.has(pc)) return true;
    for (const ac of allowedSet) {
      if (ac.includes(pc) || pc.includes(ac)) return true;
    }
    return false;
  });
}
`;

const getActivePoliciesMatch = utilsCode.match(/function _getActivePolicies[\s\S]*?\n\}/);
const getPolicyEduTypesMatch = utilsCode.match(/function getPolicyEduTypes[\s\S]*?\n\}/);

const testScript = mockEnv + '\n\n' + getActivePoliciesMatch[0] + '\n\n' + getPolicyEduTypesMatch[0] + `
const persona = {
  name: '이O봉',
  tenantId: 'HMC',
  vorgId: 'TPL_1774867919831',
  vorgIds: ['TPL_1774867919831'],
  allowedAccounts: ['HMC-PART'],
  budgets: [{ id: 'b1', account: '참가', accountCode: 'HMC-PART' }]
};

console.log('Result:', getPolicyEduTypes(persona, 'external_personal', '참가'));
`;

try {
  eval(testScript);
} catch(e) {
  console.error(e);
}
