-- ================================================================
-- HMGNLP Budget System - Core Schema
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ================================================================

-- 1. 테넌트 (회사)
create table if not exists tenants (
  id text primary key,
  name text not null,
  short_name text,
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. 교육지원도메인 (구 격리그룹)
create table if not exists edu_support_domains (
  id text primary key,
  tenant_id text references tenants(id),
  name text not null,
  color text default '#6B7280',
  bg text default '#F9FAFB',
  desc text,
  owned_accounts text[],   -- account codes 배열
  global_admin_key text,
  op_manager_keys text[],
  status text default 'active',
  created_at timestamptz default now()
);

-- 3. 예산 계정
create table if not exists account_master (
  code text primary key,
  tenant_id text references tenants(id),
  grp text,                -- '일반' | 'R&D' | '공통'
  name text not null,
  plan_required boolean default false,
  carryover boolean default false,
  desc text,
  active boolean default true,
  is_system boolean default false,
  created_at timestamptz default now()
);

-- 4. 예산 집행 현황
create table if not exists account_budgets (
  id uuid primary key default gen_random_uuid(),
  account_code text references account_master(code),
  fiscal_year integer not null,
  total_budget bigint default 0,
  deducted bigint default 0,
  holding bigint default 0,
  updated_at timestamptz default now()
);

-- 5. 서비스 정책
create table if not exists service_policies (
  id text primary key,
  tenant_id text references tenants(id),
  domain_id text references edu_support_domains(id),
  scope_tenant_id text,
  scope_group_id text,
  name text not null,
  desc text,
  target_type text,        -- 'learner' | 'operator'
  purpose text,
  edu_types text[],
  selected_edu_item jsonb,
  process_pattern text,    -- 'A'|'B'|'C'|'D'|'E'
  flow text,
  budget_linked boolean default true,
  apply_mode text,
  account_codes text[],
  virtual_edu_org_id text,
  stage_form_ids jsonb,    -- {plan:[], apply:[], result:[]}
  approval_config jsonb,
  manager_persona_key text,
  status text default 'active',
  created_at timestamptz default now()
);

-- 6. 가상교육조직 (마스터)
create table if not exists virtual_edu_orgs (
  id text primary key,
  tenant_id text references tenants(id),
  name text not null,
  tree jsonb,              -- 가상조직 트리 전체
  service_type text default 'budget',
  owner_role_id uuid,      -- 소유 동적 역할 ID
  created_at timestamptz default now()
);

-- 7. 양식 마스터
create table if not exists form_master (
  id text primary key,
  tenant_id text,
  category text,           -- 'plan' | 'apply' | 'result'
  name text not null,
  fields jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- 8. 교육 계획 (Plans)
create table if not exists plans (
  id text primary key,
  tenant_id text references tenants(id),
  account_code text references account_master(code),
  domain_id text,
  applicant_id text,
  applicant_name text,
  edu_name text not null,
  edu_type text,
  amount bigint default 0,
  status text default 'pending',  -- 'pending'|'approved'|'rejected'
  policy_id text references service_policies(id),
  detail jsonb,
  created_at timestamptz default now()
);

-- 9. 교육 신청 (Applications)
create table if not exists applications (
  id text primary key,
  tenant_id text references tenants(id),
  plan_id text references plans(id),
  account_code text references account_master(code),
  domain_id text,
  applicant_id text,
  applicant_name text,
  dept text,
  edu_name text not null,
  edu_type text,
  amount bigint default 0,
  status text default 'pending',
  policy_id text references service_policies(id),
  detail jsonb,
  created_at timestamptz default now()
);

-- 10. 원장 (Ledger)
create table if not exists ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references tenants(id),
  account_code text references account_master(code),
  application_id text references applications(id),
  tx_type text,            -- 'deduct'|'hold'|'release'|'adjust'
  amount bigint not null,
  balance_after bigint,
  memo text,
  created_at timestamptz default now()
);

-- 11. 결재 라우팅
create table if not exists approval_routing (
  id uuid primary key default gen_random_uuid(),
  policy_id text references service_policies(id),
  stage text,              -- 'plan'|'apply'|'result'
  step integer,
  approver_persona_key text,
  approver_name text,
  condition_amount bigint, -- 금액 기준
  created_at timestamptz default now()
);

-- ================================================================
-- Row Level Security (RLS) 설정
-- ================================================================
alter table tenants enable row level security;
alter table edu_support_domains enable row level security;
alter table account_master enable row level security;
alter table account_budgets enable row level security;
alter table service_policies enable row level security;
alter table virtual_edu_orgs enable row level security;
alter table form_master enable row level security;
alter table plans enable row level security;
alter table applications enable row level security;
alter table ledger enable row level security;
alter table approval_routing enable row level security;

-- 개발/테스트용: service_role 은 RLS 우회 (기본값)
-- anon key의 경우 읽기 전용 정책 추가 (필요 시)
create policy "anon_read_tenants" on tenants for select using (true);
create policy "anon_read_edu_support_domains" on edu_support_domains for select using (true);
create policy "anon_read_account_master" on account_master for select using (true);
create policy "anon_read_account_budgets" on account_budgets for select using (true);
create policy "anon_read_service_policies" on service_policies for select using (true);
create policy "anon_read_virtual_edu_org" on virtual_edu_orgs for select using (true);
create policy "anon_read_form_master" on form_master for select using (true);
create policy "anon_read_plans" on plans for select using (true);
create policy "anon_read_applications" on applications for select using (true);
create policy "anon_read_ledger" on ledger for select using (true);
create policy "anon_read_approval_routing" on approval_routing for select using (true);

-- service_role 쓰기 정책 (앱에서 secret key 사용 시)
create policy "secret_write_all" on tenants for all using (true);
create policy "secret_write_edu_support_domains" on edu_support_domains for all using (true);
create policy "secret_write_account_master" on account_master for all using (true);
create policy "secret_write_account_budgets" on account_budgets for all using (true);
create policy "secret_write_service_policies" on service_policies for all using (true);
create policy "secret_write_virtual_edu_org" on virtual_edu_orgs for all using (true);
create policy "secret_write_form_master" on form_master for all using (true);
create policy "secret_write_plans" on plans for all using (true);
create policy "secret_write_applications" on applications for all using (true);
create policy "secret_write_ledger" on ledger for all using (true);
create policy "secret_write_approval_routing" on approval_routing for all using (true);
