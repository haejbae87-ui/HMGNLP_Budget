/**
 * Supabase Seed: 기존 BO_PERSONAS → users + user_roles 테이블
 * 실행: $env:SUPABASE_SECRET_KEY='sb_secret_...'; node supabase/seed_personas.js
 */
const https = require('https');
const KEY = process.env.SUPABASE_SECRET_KEY;
const HOST = 'wihsojhucgmcdfpufonf.supabase.co';

async function post(table, rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows);
    const opt = {
      hostname: HOST,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✅ ${table}: ${rows.length}행 (${res.statusCode})`);
          resolve();
        } else {
          console.error(`  ❌ ${table}: ${res.statusCode}\n${d.slice(0, 300)}`);
          reject(new Error(d));
        }
      });
    });
    r.on('error', reject);
    r.write(body); r.end();
  });
}

// BO_PERSONAS 기반 사용자 목록
// role 매핑: platform_admin, tenant_global_admin→tenant_admin, budget_global_admin→budget_admin, budget_op_manager→budget_ops, learner
const PERSONAS = [
  // ── SYSTEM 플랫폼 총괄 ──
  { id: 'P000', tenant_id: 'SYSTEM', emp_no: 'P000', name: '배O석', dept: 'LX플랫폼추진TFT', pos: '책임', job_type: 'general', roles: ['platform_admin', 'learner'], scope: null },

  // ── HMC 현대자동차 ──
  { id: 'P100', tenant_id: 'HMC',   emp_no: 'P100', name: '최O영', dept: '역량혁신팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P101', tenant_id: 'HMC',   emp_no: 'P101', name: '신O남', dept: '피플육성팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: 'IG-HMC-GEN' },
  { id: 'P102', tenant_id: 'HMC',   emp_no: 'P102', name: '이O현', dept: 'HMG경영연구원', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HMC-GEN' },
  { id: 'P103', tenant_id: 'HMC',   emp_no: 'P103', name: '류O령', dept: '연구개발성장지원팀', pos: '책임', job_type: 'rnd', roles: ['budget_admin', 'learner'], scope: 'IG-HMC-RND' },
  { id: 'P104', tenant_id: 'HMC',   emp_no: 'P104', name: '이O하', dept: '모빌리티기술센터', pos: '책임', job_type: 'rnd', roles: ['budget_ops', 'learner'], scope: 'IG-HMC-RND' },
  { id: 'P401', tenant_id: 'HMC',   emp_no: 'P401', name: '조O성', dept: '역량혁신팀', pos: '책임', job_type: 'general', roles: ['learner'], scope: null },
  { id: 'P402', tenant_id: 'HMC',   emp_no: 'P402', name: '이O봉', dept: '내구기술팀', pos: '책임', job_type: 'general', roles: ['learner'], scope: null },

  // ── KIA 기아 ──
  { id: 'P200', tenant_id: 'KIA',   emp_no: 'P200', name: '고O현', dept: 'HRD솔루션팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P201', tenant_id: 'KIA',   emp_no: 'P201', name: '고O현2', dept: 'HRD솔루션팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: 'IG-KIA-GEN' },
  { id: 'P202', tenant_id: 'KIA',   emp_no: 'P202', name: '장O범', dept: 'Autoland교육팀', pos: '책임', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-KIA-GEN' },
  { id: 'P203', tenant_id: 'KIA',   emp_no: 'P203', name: '강동우', dept: '개인정보보호팀', pos: '책임', job_type: 'general', roles: ['learner'], scope: null },

  // ── HAE 현대오토에버 ──
  { id: 'P300', tenant_id: 'HAE',   emp_no: 'P300', name: '안O기', dept: '인재성장문화팀', pos: '책임', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P301', tenant_id: 'HAE',   emp_no: 'P301', name: '안O기B', dept: '인재성장문화팀', pos: '책임', job_type: 'general', roles: ['budget_admin', 'learner'], scope: 'IG-HAE-ALL' },
  { id: 'P302', tenant_id: 'HAE',   emp_no: 'P302', name: '김O늘', dept: 'PM서비스팀', pos: '책임', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HAE-ALL' },
  { id: 'P303', tenant_id: 'HAE',   emp_no: 'P303', name: '남영우', dept: 'PM서비스팀', pos: '책임', job_type: 'general', roles: ['learner'], scope: null },

  // ── ROTEM 현대로템 ──
  { id: 'P400', tenant_id: 'ROTEM', emp_no: 'P400', name: '담O은', dept: '교육문화팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P401B', tenant_id: 'ROTEM', emp_no: 'P401B', name: '담O은B', dept: '교육문화팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── HEC 현대엔지니어링 ──
  { id: 'P500', tenant_id: 'HEC',   emp_no: 'P500', name: '김O찬', dept: '인사전략팀', pos: '체임매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P501', tenant_id: 'HEC',   emp_no: 'P501', name: '김O찬B', dept: '인사전략팀', pos: '체임매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── HSC 현대제철 ──
  { id: 'P600', tenant_id: 'HSC',   emp_no: 'P600', name: '정O안', dept: '성장디자인팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P601', tenant_id: 'HSC',   emp_no: 'P601', name: '정O안B', dept: '성장디자인팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P602', tenant_id: 'HSC',   emp_no: 'P602', name: '송O연', dept: 'R&D운영팀', pos: '매니저', job_type: 'rnd', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P603', tenant_id: 'HSC',   emp_no: 'P603', name: '박O연', dept: '(당)인사지원팀', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P604', tenant_id: 'HSC',   emp_no: 'P604', name: '박O영', dept: '(인)인사팀', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P605', tenant_id: 'HSC',   emp_no: 'P605', name: '석O영', dept: '(포)인사팀', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P606', tenant_id: 'HSC',   emp_no: 'P606', name: '김O민', dept: '(순)냉연업무지원팀', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P607', tenant_id: 'HSC',   emp_no: 'P607', name: '최O경', dept: '성장디자인팀', pos: '매니저', job_type: 'general', roles: ['budget_ops', 'learner'], scope: 'IG-HSC-ALL' },
  { id: 'P608', tenant_id: 'HSC',   emp_no: 'P608', name: '정O안C', dept: '성장디자인팀', pos: '매니저', job_type: 'general', roles: ['learner'], scope: null },

  // ── HTS 현대트랜시스 ──
  { id: 'P700', tenant_id: 'HTS',   emp_no: 'P700', name: '임O빈', dept: '조직개발팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P701', tenant_id: 'HTS',   emp_no: 'P701', name: '임O빈B', dept: '조직개발팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── GLOVIS 현대글로비스 ──
  { id: 'P800', tenant_id: 'GLOVIS', emp_no: 'P800', name: '임O래', dept: '교육문화팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P801', tenant_id: 'GLOVIS', emp_no: 'P801', name: '임O래B', dept: '교육문화팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── HIS 현대차증권 ──
  { id: 'P900', tenant_id: 'HIS',   emp_no: 'P900', name: '김O형', dept: 'TM팀', pos: '체임매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P901', tenant_id: 'HIS',   emp_no: 'P901', name: '김O형B', dept: 'TM팀', pos: '체임매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── KEFICO 현대케피코 ──
  { id: 'P1000', tenant_id: 'KEFICO', emp_no: 'P1000', name: '이O영', dept: '인사팀', pos: '체임매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P1001', tenant_id: 'KEFICO', emp_no: 'P1001', name: '이O영B', dept: '인사팀', pos: '체임매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },

  // ── HISC 현대ISC ──
  { id: 'P1100', tenant_id: 'HISC',  emp_no: 'P1100', name: '오O성', dept: '인사지원팀', pos: '매니저', job_type: 'general', roles: ['tenant_admin', 'learner'], scope: null },
  { id: 'P1101', tenant_id: 'HISC',  emp_no: 'P1101', name: '오O성B', dept: '인사지원팀', pos: '매니저', job_type: 'general', roles: ['budget_admin', 'learner'], scope: null },
];

async function main() {
  console.log(`\n🚀 페르소나 → Supabase 사용자 등록 시작 (총 ${PERSONAS.length}명)\n`);

  // 1. users 테이블에 등록
  const userRows = PERSONAS.map(p => ({
    id: p.id,
    tenant_id: p.tenant_id,
    emp_no: p.emp_no,
    name: p.name,
    email: `${p.emp_no.toLowerCase()}@hmg.com`,
    job_type: p.job_type,
    status: 'active'
  }));

  console.log(`[1] users 등록 (${userRows.length}행)`);
  await post('users', userRows);

  // 2. user_roles 테이블에 등록
  const roleRows = [];
  for (const p of PERSONAS) {
    for (const rc of p.roles) {
      roleRows.push({
        user_id: p.id,
        role_code: rc,
        tenant_id: p.tenant_id,
        scope_id: (rc === 'budget_admin' || rc === 'budget_ops') ? p.scope : null
      });
    }
  }

  console.log(`[2] user_roles 등록 (${roleRows.length}행)`);
  await post('user_roles', roleRows);

  console.log(`\n🎉 완료! ${PERSONAS.length}명 사용자, ${roleRows.length}개 역할 매핑 등록`);
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
