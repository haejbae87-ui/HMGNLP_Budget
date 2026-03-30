/**
 * Supabase Schema Migration via Management API
 * node supabase/run_migration.js
 */
const https = require('https');

const PROJECT_REF = 'wihsojhucgmcdfpufonf';
const PAT = process.env.SUPABASE_PAT || '';

async function runSQL(sql, label) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const opt = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const r = https.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${label || 'SQL'}: OK (${res.statusCode})`);
          resolve(JSON.parse(d || '[]'));
        } else {
          const err = JSON.parse(d || '{}');
          console.error(`❌ ${label}: ${res.statusCode} - ${err.message || d}`);
          reject(new Error(err.message || d));
        }
      });
    });
    r.on('error', reject);
    r.write(body); r.end();
  });
}

async function migrate() {
  console.log('🚀 Supabase 스키마 마이그레이션 시작...\n');

  await runSQL(`
    create table if not exists tenants (
      id text primary key, name text not null, short_name text,
      active boolean default true, created_at timestamptz default now()
    );
    alter table tenants enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='tenants' and policyname='allow_all_tenants') then
        create policy "allow_all_tenants" on tenants for all using (true) with check (true);
      end if;
    end $$;
  `, 'tenants 테이블');

  await runSQL(`
    create table if not exists account_master (
      code text primary key, tenant_id text, grp text, name text not null,
      plan_required boolean default false, carryover boolean default false,
      descr text, active boolean default true, is_system boolean default false,
      created_at timestamptz default now()
    );
    alter table account_master enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='account_master' and policyname='allow_all_account_master') then
        create policy "allow_all_account_master" on account_master for all using (true) with check (true);
      end if;
    end $$;
  `, 'account_master 테이블');

  await runSQL(`
    create table if not exists edu_support_domains (
      id text primary key, tenant_id text, name text not null,
      color text default '#6B7280', bg text default '#F9FAFB', descr text,
      owned_accounts text[], global_admin_key text, op_manager_keys text[],
      status text default 'active', created_at timestamptz default now()
    );
    alter table edu_support_domains enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='edu_support_domains' and policyname='allow_all_edu_support_domains') then
        create policy "allow_all_edu_support_domains" on edu_support_domains for all using (true) with check (true);
      end if;
    end $$;
  `, 'edu_support_domains 테이블');

  await runSQL(`
    create table if not exists account_budgets (
      id uuid primary key default gen_random_uuid(),
      account_code text, fiscal_year integer not null,
      total_budget bigint default 0, deducted bigint default 0, holding bigint default 0,
      updated_at timestamptz default now()
    );
    alter table account_budgets enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='account_budgets' and policyname='allow_all_account_budgets') then
        create policy "allow_all_account_budgets" on account_budgets for all using (true) with check (true);
      end if;
    end $$;
  `, 'account_budgets 테이블');

  await runSQL(`
    create table if not exists service_policies (
      id text primary key, tenant_id text, domain_id text,
      scope_tenant_id text, scope_group_id text,
      name text not null, descr text, target_type text, purpose text,
      edu_types text[], selected_edu_item jsonb,
      process_pattern text, flow text, budget_linked boolean default true, apply_mode text,
      account_codes text[], virtual_edu_org_id text,
      stage_form_ids jsonb, approval_config jsonb,
      manager_persona_key text, status text default 'active',
      created_at timestamptz default now()
    );
    alter table service_policies enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='service_policies' and policyname='allow_all_service_policies') then
        create policy "allow_all_service_policies" on service_policies for all using (true) with check (true);
      end if;
    end $$;
  `, 'service_policies 테이블');

  await runSQL(`
    create table if not exists virtual_edu_orgs (
      id text primary key, tenant_id text,
      name text not null, tree jsonb,
      service_type text default 'budget', 
      owner_role_id uuid,
      created_at timestamptz default now()
    );
    alter table virtual_edu_orgs enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='virtual_edu_orgs' and policyname='allow_all_virtual_edu_orgs') then
        create policy "allow_all_virtual_edu_orgs" on virtual_edu_orgs for all using (true) with check (true);
      end if;
    end $$;
  `, 'virtual_edu_orgs 테이블');

  await runSQL(`
    create table if not exists virtual_org_templates (
      id text primary key, tenant_id text, name text not null,
      purpose text default 'edu_support', service_type text default 'budget',
      tree_data jsonb, updated_at timestamptz default now(),
      created_at timestamptz default now()
    );
    alter table virtual_org_templates enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='virtual_org_templates' and policyname='allow_all_virtual_org_templates') then
        create policy "allow_all_virtual_org_templates" on virtual_org_templates for all using (true) with check (true);
      end if;
    end $$;
  `, 'virtual_org_templates 테이블');

  await runSQL(`
    create table if not exists plans (
      id text primary key, tenant_id text, account_code text, domain_id text,
      applicant_id text, applicant_name text, edu_name text not null, edu_type text,
      amount bigint default 0, status text default 'pending', policy_id text, detail jsonb,
      created_at timestamptz default now()
    );
    alter table plans enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='plans' and policyname='allow_all_plans') then
        create policy "allow_all_plans" on plans for all using (true) with check (true);
      end if;
    end $$;
  `, 'plans 테이블');

  await runSQL(`
    create table if not exists applications (
      id text primary key, tenant_id text, plan_id text, account_code text, domain_id text,
      applicant_id text, applicant_name text, dept text, edu_name text not null, edu_type text,
      amount bigint default 0, status text default 'pending', policy_id text, detail jsonb,
      created_at timestamptz default now()
    );
    alter table applications enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='applications' and policyname='allow_all_applications') then
        create policy "allow_all_applications" on applications for all using (true) with check (true);
      end if;
    end $$;
  `, 'applications 테이블');

  await runSQL(`
    create table if not exists ledger (
      id uuid primary key default gen_random_uuid(), tenant_id text,
      account_code text, application_id text, tx_type text,
      amount bigint not null, balance_after bigint, memo text,
      created_at timestamptz default now()
    );
    alter table ledger enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='ledger' and policyname='allow_all_ledger') then
        create policy "allow_all_ledger" on ledger for all using (true) with check (true);
      end if;
    end $$;
  `, 'ledger 테이블');

  await runSQL(`
    create table if not exists approval_routing (
      id uuid primary key default gen_random_uuid(), policy_id text, stage text,
      step integer, approver_persona_key text, approver_name text, condition_amount bigint,
      created_at timestamptz default now()
    );
    alter table approval_routing enable row level security;
    do $$ begin
      if not exists (select from pg_policies where tablename='approval_routing' and policyname='allow_all_approval_routing') then
        create policy "allow_all_approval_routing" on approval_routing for all using (true) with check (true);
      end if;
    end $$;
  `, 'approval_routing 테이블');

  console.log('\n🎉 스키마 마이그레이션 완료!');
}

migrate().catch(e => {
  console.error('\n💥 오류:', e.message);
  process.exit(1);
});
