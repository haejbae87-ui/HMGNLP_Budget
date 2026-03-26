-- ================================================================
-- HMGNLP Budget System - Field Definitions
-- 플랫폼 총괄 관리자가 양식 마법사에서 사용할 입력 필드를 관리하는 테이블
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ================================================================

-- 12. 입력 필드 정의 마스터
create table if not exists field_definitions (
  id          text primary key,           -- 'FD001' 등
  key         text not null,              -- 화면 표시 필드명 (한글)
  field_type  text not null default 'text', -- text|textarea|date|daterange|number|user-search|file|rating|select|calc-grounds|budget-linked|system
  category    text not null,              -- 기본정보|비용정보|인원정보|첨부서류|결과정보|관리(승인자)|시스템
  icon        text,                       -- 이모지
  scope       text not null default 'front', -- front|back|system
  required    boolean not null default false,
  hint        text,                       -- 사용자에게 표시되는 입력 도움말
  options     jsonb,                      -- select 타입 선택지 배열 (예: ["선택1","선택2"])
  trigger_field text,                     -- 조건부 활성화 연동 필드 key
  budget      boolean default false,      -- 예산 연동 여부
  sort_order  integer default 99,         -- 카테고리 내 정렬 순서
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- RLS 활성화
alter table field_definitions enable row level security;
create policy "anon_read_field_definitions"  on field_definitions for select using (true);
create policy "secret_write_field_definitions" on field_definitions for all using (true);

-- ================================================================
-- SEED DATA: 기존 ADVANCED_FIELDS 항목 초기 삽입
-- ================================================================
insert into field_definitions (id, key, field_type, category, icon, scope, required, hint, sort_order) values
  ('FD001', '교육목적',     'textarea',      '기본정보',     '🎯', 'front',  true,  '학습 목표 및 기대효과', 1),
  ('FD002', '교육기간',     'daterange',     '기본정보',     '📅', 'front',  true,  '시작일~종료일', 2),
  ('FD003', '교육기관',     'text',          '기본정보',     '🏫', 'front',  true,  '교육 제공 기관명', 3),
  ('FD004', '과정명',       'text',          '기본정보',     '📚', 'front',  true,  '교육과정/행사명', 4),
  ('FD005', '장소',         'text',          '기본정보',     '📍', 'front',  false, '교육 장소', 5),
  ('FD006', '기대효과',     'textarea',      '기본정보',     '✨', 'front',  false, '참가 후 기대되는 효과', 6),
  ('FD007', '예상비용',     'budget-linked', '비용정보',     '💰', 'front',  true,  '예상 총 비용 — 조직 예산 잔액 연동', 1),
  ('FD008', '교육비',       'number',        '비용정보',     '💳', 'front',  true,  '수강료/등록비 (원 단위)', 2),
  ('FD009', '참가비',       'number',        '비용정보',     '💲', 'front',  false, '행사 참가비 (원 단위)', 3),
  ('FD010', '강사료',       'number',        '비용정보',     '👨‍🏫', 'front', false, '외부 강사 강의료', 4),
  ('FD011', '대관비',       'number',        '비용정보',     '🏛️', 'front', false, '장소 대관 비용', 5),
  ('FD012', '식대/용차',    'number',        '비용정보',     '🍽️', 'front', false, '식비 및 운송비', 6),
  ('FD013', '실지출액',     'number',        '비용정보',     '🧾', 'back',   false, '승인자 확정 실지출 인정액', 7),
  ('FD014', '세부산출근거', 'calc-grounds',  '비용정보',     '📐', 'front',  false, '세부산출근거 항목 선택 (테넌트별 자동 로드)', 8),
  ('FD015', '수강인원',     'number',        '인원정보',     '👥', 'front',  false, '예상 수강 인원 (명)', 1),
  ('FD016', '정원',         'number',        '인원정보',     '🪑', 'front',  false, '최대 정원 (명)', 2),
  ('FD017', '참여자명단',   'user-search',   '인원정보',     '📋', 'front',  false, '참여자 검색 및 명단 구성', 3),
  ('FD018', '강사정보',     'user-search',   '인원정보',     '🎤', 'front',  false, '강사 검색 — 내부 사용자 조회', 4),
  ('FD019', '첨부파일',     'file',          '첨부서류',     '📎', 'front',  false, '관련 서류 첨부', 1),
  ('FD020', '강사이력서',   'file',          '첨부서류',     '📄', 'front',  false, '외부강사 이력서 (강사료 선택 시 자동 활성화)', 2),
  ('FD021', '보안서약서',   'file',          '첨부서류',     '🔒', 'front',  false, '보안 서약서 서명', 3),
  ('FD022', '영수증',       'file',          '첨부서류',     '🧾', 'front',  false, '결제 영수증/증빙', 4),
  ('FD023', '수료증',       'file',          '첨부서류',     '🎓', 'front',  false, '수료증 업로드', 5),
  ('FD024', '대관확정서',   'file',          '첨부서류',     '📜', 'front',  false, '장소 대관 확정서', 6),
  ('FD025', '납품확인서',   'file',          '첨부서류',     '✅', 'front',  false, '물품 납품 확인서', 7),
  ('FD026', '수료생명단',   'user-search',   '결과정보',     '📝', 'front',  false, '최종 수료자 명단', 1),
  ('FD027', '학습만족도',   'rating',        '결과정보',     '⭐', 'front',  false, '만족도 조사 (5점 척도)', 2),
  ('FD028', '교육결과요약', 'textarea',      '결과정보',     '📊', 'front',  false, '교육 결과 요약 보고', 3),
  ('FD029', 'ERP코드',      'text',          '관리(승인자)', '🔗', 'back',   false, 'ERP 연동 비용 코드', 1),
  ('FD030', '검토의견',     'textarea',      '관리(승인자)', '💬', 'back',   false, '승인자 검토 및 의견', 2),
  ('FD031', '관리자비고',   'textarea',      '관리(승인자)', '📌', 'back',   false, '관리자 내부 메모', 3),
  ('FD032', '계획서연결',   'system',        '시스템',       '🔗', 'system', false, '연결된 교육계획 양식 자동 불러오기', 1),
  ('FD033', '예산계정',     'budget-linked', '시스템',       '💼', 'system', false, '예산 계정 잔액 실시간 연동', 2)
on conflict (id) do nothing;
