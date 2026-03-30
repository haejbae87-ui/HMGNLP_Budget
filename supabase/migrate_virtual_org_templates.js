// virtual_edu_orgs 목 데이터 → Supabase DB 마이그레이션
const https = require('https');
const KEY = process.env.SUPABASE_SECRET_KEY;
const HOST = 'wihsojhucgmcdfpufonf.supabase.co';

const TEMPLATES = [
  {
    id: 'TPL_GEN_01',
    tenant_id: 'HMC',
    service_type: 'budget',
    owner_role_id: 'HMC_budget_admin',
    name: '현대자동차 일반교육예산 템플릿 1',
    tree: {
      label: '일반 교육예산 조직',
      hqs: [
        {
          id: 'HQ01', managerPersonaKey: 'hmc_hq_general', cooperators: [], name: 'HMGOOOO본부', manager: '이O현',
          budget: { total: 180000000, deducted: 42000000, holding: 18000000 },
          teams: [
            { id: 'T01', allowedJobTypes: [], name: '피플OO팀', budget: { allocated: 35000000, deducted: 12000000, holding: 5000000 } },
            { id: 'T02', allowedJobTypes: [], name: '역량OO팀', budget: { allocated: 28000000, deducted: 8000000, holding: 3000000 } },
            { id: 'T03', allowedJobTypes: [], name: '성과OO팀', budget: { allocated: 22000000, deducted: 6000000, holding: 2000000 } }
          ]
        },
        {
          id: 'HQ02', managerPersonaKey: '', cooperators: [], name: 'SDVOOOO본부', manager: 'OO담당자',
          budget: { total: 120000000, deducted: 28000000, holding: 12000000 },
          teams: [
            { id: 'T04', allowedJobTypes: [], name: 'SDV기술팀', budget: { allocated: 40000000, deducted: 15000000, holding: 8000000 } },
            { id: 'T05', allowedJobTypes: [], name: '아키텍처팀', budget: { allocated: 30000000, deducted: 10000000, holding: 2000000 } }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL_RND_01',
    tenant_id: 'HMC',
    service_type: 'budget',
    owner_role_id: 'HMC_budget_admin',
    name: '현대차 R&D교육예산 템플릿 1',
    tree: {
      label: 'R&D 교육예산 조직',
      centers: [
        {
          id: 'C01', managerPersonaKey: 'hmc_center_rnd', cooperators: [], name: '모빌리티OOOO센터', manager: '이O하',
          budget: { total: 200000000, deducted: 55000000, holding: 25000000 },
          teams: [
            { id: 'T11', allowedJobTypes: [], name: '내구OO팀', budget: { allocated: 60000000, deducted: 18000000, holding: 10000000 } },
            { id: 'T12', allowedJobTypes: [], name: '구동OO팀', budget: { allocated: 45000000, deducted: 12000000, holding: 5000000 } },
            { id: 'T13', allowedJobTypes: [], name: '전장OO팀', budget: { allocated: 38000000, deducted: 10000000, holding: 4000000 } }
          ]
        },
        {
          id: 'C02', managerPersonaKey: '', cooperators: [], name: '전동화OOOO센터', manager: 'OO책임',
          budget: { total: 150000000, deducted: 30000000, holding: 15000000 },
          teams: [
            { id: 'T14', allowedJobTypes: [], name: '배터리OO팀', budget: { allocated: 50000000, deducted: 12000000, holding: 8000000 } },
            { id: 'T15', allowedJobTypes: [], name: '인버터OO팀', budget: { allocated: 35000000, deducted: 8000000, holding: 3000000 } }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL_KIA_GEN_01',
    tenant_id: 'KIA',
    service_type: 'budget',
    owner_role_id: 'KIA_budget_admin',
    name: '기아 일반교육예산 템플릿 1',
    tree: {
      label: '기아 일반 교육예산 조직',
      hqs: [
        {
          id: 'KIAHQ01', managerPersonaKey: 'kia_hq_general', cooperators: [], name: 'Autoland사업부', manager: '장성범',
          budget: { total: 120000000, deducted: 30000000, holding: 10000000 },
          teams: [
            { id: 'KT01', allowedJobTypes: [], name: 'Autoland교육팀', budget: { allocated: 40000000, deducted: 12000000, holding: 5000000 } },
            { id: 'KT02', allowedJobTypes: [], name: '생산기술팀', budget: { allocated: 35000000, deducted: 10000000, holding: 3000000 } }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL_HAE_GEN_01',
    tenant_id: 'HAE',
    service_type: 'budget',
    owner_role_id: 'HAE_budget_admin',
    name: '현대오토에버 교육예산 템플릿 1',
    tree: {
      label: '오토에버 교육예산 조직',
      hqs: [
        {
          id: 'HAEHQ01', managerPersonaKey: 'hae_dept', cooperators: [], name: '솔루션사업부', manager: '안슬기',
          budget: { total: 90000000, deducted: 20000000, holding: 8000000 },
          teams: [
            { id: 'HT01', allowedJobTypes: [], name: 'PM서비스팀', budget: { allocated: 30000000, deducted: 8000000, holding: 3000000 } },
            { id: 'HT02', allowedJobTypes: [], name: '클라우드서비스팀', budget: { allocated: 25000000, deducted: 6000000, holding: 2000000 } }
          ]
        },
        {
          id: 'HAEHQ02', managerPersonaKey: '', cooperators: [], name: '인프라사업부', manager: '안슬기',
          budget: { total: 60000000, deducted: 12000000, holding: 5000000 },
          teams: [
            { id: 'HT03', allowedJobTypes: [], name: '네트워크관리팀', budget: { allocated: 20000000, deducted: 5000000, holding: 2000000 } }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL_HSC_ALL_01',
    tenant_id: 'HSC',
    service_type: 'budget',
    owner_role_id: 'HSC_budget_admin',
    name: '현대제철 전사예산 템플릿 1',
    tree: {
      label: '현대제철 전사 교육예산 조직',
      jobTypes: ['일반직', '생산직', '기술직', '연구직', '임원'],
      hqs: [
        {
          id: 'HSCVO01', name: '전사 일반직',
          managerPersonaKey: 'hsc_budget_gen', managerPersonaKeys: ['hsc_budget_gen'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 150000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT01', name: '준법경영실', allowedJobTypes: ['일반직','임원'], budget: { allocated: 20000000, deducted: 0, holding: 0 } },
            { id: 'HSVT02', name: '국제법무팀', allowedJobTypes: ['일반직','임원'], budget: { allocated: 20000000, deducted: 0, holding: 0 } },
            { id: 'HSVT03', name: '(포)전기로기술팀', allowedJobTypes: ['일반직','임원'], budget: { allocated: 25000000, deducted: 0, holding: 0 } },
            { id: 'HSVT04', name: '(당)자재팀', allowedJobTypes: ['일반직','임원'], budget: { allocated: 25000000, deducted: 0, holding: 0 } },
            { id: 'HSVT05', name: '(인)전기로기술팀', allowedJobTypes: ['일반직','임원'], budget: { allocated: 25000000, deducted: 0, holding: 0 } },
            { id: 'HSVT06', name: '(순)전기로기술팀', allowedJobTypes: ['일반직'], budget: { allocated: 35000000, deducted: 0, holding: 0 } }
          ]
        },
        {
          id: 'HSCVO02', name: '전사 연구직',
          managerPersonaKey: 'hsc_budget_rnd', managerPersonaKeys: ['hsc_budget_rnd'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 80000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT11', name: 'R&D전략기획팀', allowedJobTypes: ['연구직'], budget: { allocated: 80000000, deducted: 0, holding: 0 } }
          ]
        },
        {
          id: 'HSCVO03', name: '당진공장(기술직)',
          managerPersonaKey: 'hsc_budget_hr_dang', managerPersonaKeys: ['hsc_budget_hr_dang'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 60000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT21', name: '(당)자재팀', allowedJobTypes: ['기술직'], budget: { allocated: 60000000, deducted: 0, holding: 0 } }
          ]
        },
        {
          id: 'HSCVO04', name: '포항공장(기술직)',
          managerPersonaKey: 'hsc_budget_hr_po', managerPersonaKeys: ['hsc_budget_hr_po'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 70000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT31', name: '(포)전기로기술팀', allowedJobTypes: ['기술직'], budget: { allocated: 70000000, deducted: 0, holding: 0 } }
          ]
        },
        {
          id: 'HSCVO05', name: '인천공장(기술직)',
          managerPersonaKey: 'hsc_budget_hr_in', managerPersonaKeys: ['hsc_budget_hr_in'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 50000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT41', name: '(인)전기로기술팀', allowedJobTypes: ['기술직'], budget: { allocated: 50000000, deducted: 0, holding: 0 } }
          ]
        },
        {
          id: 'HSCVO06', name: '순천공장(기술직)',
          managerPersonaKey: 'hsc_budget_cold', managerPersonaKeys: ['hsc_budget_cold'],
          cooperators: [
            { teamId: 'HSCCOP01', teamName: '재경팀', coopType: '재경협조처', required: false, role: '예산검토' },
            { teamId: 'HSCCOP02', teamName: '투명경영지원팀', coopType: '재경협조처', required: false, role: '예산검토' }
          ],
          budget: { total: 45000000, deducted: 0, holding: 0 },
          teams: [
            { id: 'HSVT51', name: '(순)전기로기술팀', allowedJobTypes: ['기술직'], budget: { allocated: 45000000, deducted: 0, holding: 0 } }
          ]
        }
      ]
    }
  }
];

(async () => {
  console.log(`\n🚀 virtual_edu_orgs 마이그레이션 시작 (${TEMPLATES.length}개 템플릿)\n`);

  const body = JSON.stringify(TEMPLATES);
  const result = await new Promise((resolve, reject) => {
    const opt = {
      hostname: HOST,
      path: '/rest/v1/virtual_edu_orgs',
      method: 'POST',
      headers: {
        'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r = https.request(opt, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 300) }));
    });
    r.on('error', reject);
    r.write(body); r.end();
  });

  if ([200, 201, 204].includes(result.status)) {
    console.log(`✅ INSERT 완료 (HTTP ${result.status})`);
    TEMPLATES.forEach((t, i) => console.log(`  ${i+1}. [${t.tenant_id}] ${t.name} (${t.id})`));
  } else {
    console.log(`❌ 실패: ${result.status} ${result.body}`);
    process.exit(1);
  }
  console.log('\n🎉 마이그레이션 완료!');
})();
