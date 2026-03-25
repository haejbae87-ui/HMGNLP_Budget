// role_menu_permissions 테이블 생성 + 시드
const https = require('https');

const SUPA_HOST = 'wihsojhucgmcdfpufonf.supabase.co';
const KEY = process.env.SUPABASE_SECRET_KEY;

// REST API로 upsert
async function upsertRows(rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows);
    const opt = {
      hostname: SUPA_HOST,
      path: '/rest/v1/role_menu_permissions',
      method: 'POST',
      headers: {
        'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 200) }));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

// 테이블이 없으면 생성 (SQL endpoint)
async function createTable() {
  return new Promise((resolve, reject) => {
    const sql = `CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
      role_code  TEXT NOT NULL,
      menu_id    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (role_code, menu_id)
    )`;
    const body = JSON.stringify({ query: sql });
    // Supabase SQL API (service role only)
    const opt = {
      hostname: SUPA_HOST,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

const PERMS = [
  // platform_admin
  ...['dashboard','platform-monitor','platform-roles','tenant-mgmt','org-mgmt',
      'user-mgmt','role-mgmt','role-menu-perms','isolation-groups','budget-account',
      'virtual-org','form-builder','calc-grounds','approval-routing',
      'service-policy','reports','manual']
    .map(m => ({ role_code: 'platform_admin', menu_id: m })),
  // tenant_admin
  ...['dashboard','isolation-groups','budget-account','virtual-org',
      'form-builder','service-policy','reports','manual']
    .map(m => ({ role_code: 'tenant_admin', menu_id: m })),
  // budget_admin
  ...['dashboard','isolation-groups','budget-account','virtual-org',
      'form-builder','calc-grounds','approval-routing','service-policy','reports','manual']
    .map(m => ({ role_code: 'budget_admin', menu_id: m })),
  // budget_ops
  ...['dashboard','plan-mgmt','allocation','my-operations','org-budget','reports','manual']
    .map(m => ({ role_code: 'budget_ops', menu_id: m })),
  // learner
  ...['dashboard','my-operations','reports','manual']
    .map(m => ({ role_code: 'learner', menu_id: m })),
];

(async () => {
  console.log(`\n🚀 role_menu_permissions 테이블 시드 시작 (총 ${PERMS.length}건)\n`);

  // 테이블 생성 시도 (이미 있으면 skip)
  const ct = await createTable();
  console.log(`[테이블 생성] ${ct.status} ${ct.body.slice(0, 80) || 'OK (이미 존재할 수 있음)'}`);

  // 데이터 삽입
  const result = await upsertRows(PERMS);
  if ([200, 201, 204].includes(result.status)) {
    console.log(`✅ ${PERMS.length}건 INSERT 완료 (${result.status})`);
  } else {
    console.log(`❌ INSERT 실패: ${result.status} ${result.body}`);
    process.exit(1);
  }

  // role별 카운트 출력
  const counts = {};
  PERMS.forEach(p => { counts[p.role_code] = (counts[p.role_code] || 0) + 1; });
  console.log('\n역할별 권한 수:');
  Object.entries(counts).forEach(([r, n]) => console.log(`  ${r}: ${n}개 메뉴`));
  console.log('\n🎉 완료!');
})();
