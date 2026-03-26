-- ================================================================
-- HMGNLP Budget System - calc_grounds 계층형 스키마
-- 세부산출근거: 테넌트 → 격리그룹 → 예산계정 계층별 독립 관리
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ================================================================

-- 13. 세부산출근거 마스터 (항목 정의)
create table if not exists calc_grounds (
  id           text primary key,           -- 'CG001' 등
  tenant_id    text references tenants(id) not null,
  -- 격리그룹 NULL이면 테넌트 전체 공유 항목
  isolation_group_id text references isolation_groups(id),
  -- 예산계정 NULL이면 격리그룹/테넌트 내 전체 계정 공유
  account_code text,                        -- references account_master(code)
  name         text not null,
  desc         text,
  unit_price   bigint default 0,
  limit_type   text default 'none',         -- 'none'|'soft'|'hard'
  soft_limit   bigint default 0,
  hard_limit   bigint default 0,
  usage_scope  text[] default '{plan,apply,settle}', -- 허용 단계
  visible_for  text default 'both',         -- 'both'|'domestic'|'overseas'
  active       boolean default true,
  sort_order   integer default 99,
  created_at   timestamptz default now()
);

-- 인덱스: 계층 조회 최적화
create index if not exists idx_calc_grounds_tenant on calc_grounds(tenant_id);
create index if not exists idx_calc_grounds_group  on calc_grounds(isolation_group_id);
create index if not exists idx_calc_grounds_acct   on calc_grounds(account_code);

-- RLS
alter table calc_grounds enable row level security;
create policy "anon_read_calc_grounds"    on calc_grounds for select using (true);
create policy "secret_write_calc_grounds" on calc_grounds for all using (true);

-- ================================================================
-- SEED DATA: HMC 현대차 기본 항목 (기존 CALC_GROUNDS_MASTER 이전)
-- tenant_id='HMC', isolation_group_id=NULL, account_code=NULL → HMC 전체 공유
-- ================================================================
insert into calc_grounds (id, tenant_id, isolation_group_id, account_code, name, desc, unit_price, limit_type, soft_limit, hard_limit, usage_scope, visible_for, sort_order) values
  -- 운영계정 항목 (HMC 전체 공유)
  ('CG001', 'HMC', null, null, '식비 (조식)',           '교육 당일 조식 제공 비용. 1인 1식 기준.',       8000,    'none', 0,        0,        '{plan,apply,settle}', 'both',     1),
  ('CG002', 'HMC', null, null, '식비 (중식)',           '교육 당일 중식 제공 비용. 1인 1식 기준.',       12000,   'none', 0,        0,        '{plan,apply,settle}', 'both',     2),
  ('CG003', 'HMC', null, null, '식비 (석식)',           '교육 당일 석식 제공 비용. 1인 1식 기준.',       15000,   'none', 0,        0,        '{plan,apply,settle}', 'both',     3),
  ('CG004', 'HMC', null, null, '숙박비',               '외부 교육 숙박비. 1인 1박 기준.',               120000,  'soft', 150000,   200000,   '{plan,apply,settle}', 'both',     4),
  ('CG005', 'HMC', null, null, '다과비',               '교육 중 간식/음료 제공 비용. 1인 기준.',        5000,    'none', 0,        0,        '{plan,apply,settle}', 'domestic', 5),
  ('CG006', 'HMC', null, null, '강의장 사용료 (사내)', '사내 강의장 대관료. 하루 기준.',                0,       'hard', 0,        500000,   '{plan,apply,settle}', 'domestic', 6),
  ('CG007', 'HMC', null, null, '강의장 사용료 (사외)', '사외 강의장 대관료. 하루 기준.',                300000,  'soft', 500000,   1000000,  '{plan,apply,settle}', 'both',     7),
  ('CG008', 'HMC', null, null, '사외강사료',           '외부 강사 초청 강의료. 1시간 기준.',            500000,  'soft', 2000000,  5000000,  '{plan,apply,settle}', 'both',     8),
  ('CG009', 'HMC', null, null, '기타 인건비',          '퍼실리테이터, 보조강사 등 기타 인건비.',        300000,  'soft', 1000000,  0,        '{plan,apply,settle}', 'both',     9),
  ('CG010', 'HMC', null, null, '사내강사/운영자 교통비','사내 강사 및 운영자 교통비. 1회 기준.',        20000,   'soft', 50000,    100000,   '{plan,apply,settle}', 'domestic', 10),
  ('CG011', 'HMC', null, null, '용차료',               '교육 운영을 위한 차량 임차료.',                 100000,  'soft', 300000,   0,        '{plan,apply,settle}', 'domestic', 11),
  ('CG012', 'HMC', null, null, '교육당직비',           '교육 행사 당직 운영비.',                        50000,   'none', 0,        0,        '{plan,apply,settle}', 'both',     12),
  ('CG013', 'HMC', null, null, '문구비',               '교육 자료 제작을 위한 문구류 구매비.',          10000,   'hard', 0,        200000,   '{plan,apply,settle}', 'both',     13),
  ('CG014', 'HMC', null, null, '교보재비',             '교육 교재, 워크북 등 교육보조재 구매비.',       30000,   'none', 0,        0,        '{plan,apply,settle}', 'both',     14),
  ('CG015', 'HMC', null, null, '업체 지급비',          '교육 운영 위탁 업체 지급 비용.',                0,       'soft', 3000000,  10000000, '{plan,apply,settle}', 'both',     15),
  ('CG016', 'HMC', null, null, '진단비',               '역량 진단, 설문조사 등 진단 도구 비용.',        50000,   'soft', 500000,   0,        '{plan,apply}',        'both',     16),
  ('CG017', 'HMC', null, null, '교육참가비',           '외부 교육 프로그램 참가비. 1인 기준.',          200000,  'soft', 1000000,  3000000,  '{plan,apply,settle}', 'both',     17),
  ('CG018', 'HMC', null, null, '과정개발비',           '교육과정 기획 및 콘텐츠 개발비.',               0,       'soft', 5000000,  0,        '{plan,apply}',        'both',     18),
  ('CG019', 'HMC', null, null, '그룹사간 정산',        '그룹사 간 교육 비용 상호 정산액.',              0,       'none', 0,        0,        '{settle}',            'both',     19),
  ('CG020', 'HMC', null, null, '러닝랩 활동비',        '러닝랩/학습동아리 운영 활동비.',                30000,   'soft', 500000,   0,        '{plan,apply,settle}', 'domestic', 20),
  ('CG021', 'HMC', null, null, '기타 (운영)',          '위 항목에 해당하지 않는 기타 운영 비용.',       0,       'none', 0,        0,        '{plan,apply,settle}', 'both',     21),
  -- 기타계정 항목 (HMC 전체 공유)
  ('CG101', 'HMC', null, null, '교보재비 (기타계정)',  '교육 교재, 워크북, E-book 구매비.',             30000,   'none', 0,        0,        '{plan,apply,settle}', 'both',     51),
  ('CG102', 'HMC', null, null, '과정개발비 (기타계정)','콘텐츠 기획·개발, 영상제작 등 개발 비용.',    0,       'soft', 5000000,  20000000, '{plan,apply}',        'both',     52),
  ('CG103', 'HMC', null, null, '콘텐츠사용비',        '외부 콘텐츠 라이선스 및 플랫폼 구독료.',        0,       'soft', 1000000,  5000000,  '{plan,apply}',        'both',     53),
  ('CG104', 'HMC', null, null, '가입비 (협회/간행물)','학·협회 가입비, 간행물 구독비.',                0,       'soft', 500000,   2000000,  '{plan,apply,settle}', 'both',     54),
  ('CG105', 'HMC', null, null, '도서구입비',          '직무·교양 도서 구매비. 1권 기준.',              20000,   'hard', 0,        500000,   '{plan,apply,settle}', 'both',     55),
  ('CG106', 'HMC', null, null, '그룹사간 정산 (기타)','그룹사 간 콘텐츠·개발비 정산액.',              0,       'none', 0,        0,        '{settle}',            'both',     56),
  ('CG107', 'HMC', null, null, '기타 (기타계정)',     '위 항목에 해당하지 않는 기타 비용.',            0,       'none', 0,        0,        '{plan,apply,settle}', 'both',     57)
on conflict (id) do nothing;
