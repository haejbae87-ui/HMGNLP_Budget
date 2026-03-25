const https = require('https');
const PAT = process.env.SUPABASE_PAT;
const REF = 'wihsojhucgmcdfpufonf';

async function runSQL(sql, label) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opt = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + REF + '/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅', label);
          resolve();
        } else {
          console.error('❌', label, res.statusCode, d.slice(0, 200));
          reject(new Error(d));
        }
      });
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

async function main() {
  console.log('🚀 DB 테이블 생성 시작...\n');

  await runSQL(`
    create table if not exists roles (
      code text primary key,
      name text not null,
      descr text,
      level integer default 99,
      created_at timestamptz default now()
    );
    alter table roles enable row level security;
    do $pol$ begin
      if not exists(select from pg_policies where tablename='roles' and policyname='allow_all_roles') then
        create policy "allow_all_roles" on roles for all using (true) with check (true);
      end if;
    end $pol$;
  `, 'roles 테이블');

  await runSQL(`
    create table if not exists organizations (
      id uuid primary key default gen_random_uuid(),
      tenant_id text not null,
      parent_id uuid,
      name text not null,
      type text default 'team',
      order_seq integer default 0,
      created_at timestamptz default now()
    );
    alter table organizations enable row level security;
    do $pol$ begin
      if not exists(select from pg_policies where tablename='organizations' and policyname='allow_all_orgs') then
        create policy "allow_all_orgs" on organizations for all using (true) with check (true);
      end if;
    end $pol$;
  `, 'organizations 테이블');

  await runSQL(`
    create table if not exists users (
      id text primary key,
      tenant_id text not null,
      emp_no text,
      name text not null,
      email text,
      org_id uuid,
      job_type text default 'general',
      status text default 'active',
      created_at timestamptz default now()
    );
    alter table users enable row level security;
    do $pol$ begin
      if not exists(select from pg_policies where tablename='users' and policyname='allow_all_users') then
        create policy "allow_all_users" on users for all using (true) with check (true);
      end if;
    end $pol$;
  `, 'users 테이블');

  await runSQL(`
    create table if not exists user_roles (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      role_code text not null,
      tenant_id text,
      scope_id text,
      created_at timestamptz default now(),
      unique(user_id, role_code, scope_id)
    );
    alter table user_roles enable row level security;
    do $pol$ begin
      if not exists(select from pg_policies where tablename='user_roles' and policyname='allow_all_user_roles') then
        create policy "allow_all_user_roles" on user_roles for all using (true) with check (true);
      end if;
    end $pol$;
  `, 'user_roles 테이블');

  // roles seed
  const body2 = JSON.stringify([
    { code: 'learner',        name: '학습자',          descr: '기본 역할. 모든 사용자에게 자동 부여',       level: 99 },
    { code: 'platform_admin', name: '플랫폼총괄관리자', descr: '전체 플랫폼 설정·권한 관리',               level: 1  },
    { code: 'tenant_admin',   name: '테넌트총괄관리자', descr: '소속 회사 전체 관리',                       level: 2  },
    { code: 'budget_admin',   name: '예산총괄관리자',   descr: '격리그룹·예산계정 총괄',                   level: 3  },
    { code: 'budget_ops',     name: '예산운영담당자',   descr: '특정 격리그룹 내 예산 운영',               level: 4  },
  ]);
  await new Promise((resolve, reject) => {
    const opt2 = {
      hostname: 'wihsojhucgmcdfpufonf.supabase.co',
      path: '/rest/v1/roles',
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body2),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r2 = https.request(opt2, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { console.log('✅ roles seed 완료'); resolve(); }
        else { console.error('❌ roles seed', res.statusCode, d); reject(new Error(d)); }
      });
    });
    r2.on('error', reject); r2.write(body2); r2.end();
  });

  // users seed (배진석 책임)
  const body3 = JSON.stringify([
    { id: 'USR-BAE-001', tenant_id: 'HMC', emp_no: '20001', name: '배진석', email: 'bae.jinsuk@hmg.com', job_type: 'general', status: 'active' },
    { id: 'USR-KIM-001', tenant_id: 'HMC', emp_no: '20002', name: '김철수', email: 'kim.cs@hmg.com',     job_type: 'general', status: 'active' },
    { id: 'USR-LEE-001', tenant_id: 'HAE', emp_no: '30001', name: '이영희', email: 'lee.yh@hae.com',     job_type: 'general', status: 'active' },
  ]);
  await new Promise((resolve, reject) => {
    const opt3 = {
      hostname: 'wihsojhucgmcdfpufonf.supabase.co',
      path: '/rest/v1/users',
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body3),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r3 = https.request(opt3, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { console.log('✅ users seed 완료'); resolve(); }
        else { console.error('❌ users seed', res.statusCode, d); reject(new Error(d)); }
      });
    });
    r3.on('error', reject); r3.write(body3); r3.end();
  });

  // user_roles seed (배진석 → platform_admin, 나머지 → learner)
  const body4 = JSON.stringify([
    { user_id: 'USR-BAE-001', role_code: 'learner',        tenant_id: 'HMC', scope_id: null },
    { user_id: 'USR-BAE-001', role_code: 'platform_admin', tenant_id: null,  scope_id: null },
    { user_id: 'USR-KIM-001', role_code: 'learner',        tenant_id: 'HMC', scope_id: null },
    { user_id: 'USR-LEE-001', role_code: 'learner',        tenant_id: 'HAE', scope_id: null },
    { user_id: 'USR-LEE-001', role_code: 'budget_ops',     tenant_id: 'HAE', scope_id: 'IG-HAE-ALL' },
  ]);
  await new Promise((resolve, reject) => {
    const opt4 = {
      hostname: 'wihsojhucgmcdfpufonf.supabase.co',
      path: '/rest/v1/user_roles',
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body4),
        'Prefer': 'return=minimal,resolution=ignore-duplicates'
      }
    };
    const r4 = https.request(opt4, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { console.log('✅ user_roles seed 완료'); resolve(); }
        else { console.error('❌ user_roles seed', res.statusCode, d); reject(new Error(d)); }
      });
    });
    r4.on('error', reject); r4.write(body4); r4.end();
  });

  console.log('\n🎉 완료!');
}
main().catch(e => { console.error('💥', e.message); process.exit(1); });
