-- 다중 계획 합산 신청 (Multi-Plan Application)을 위한 N:1 매핑 테이블 생성
-- applications 테이블과 plans 테이블의 다대다 관계를 관리하며, 각 과정별 예산 및 차수 정보를 저장합니다.

CREATE TABLE IF NOT EXISTS application_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  
  -- 과정 기본 정보 (계획에서 복사 — 스냅샷)
  course_name TEXT,                   
  institution_name TEXT,              
  start_date DATE,                    
  end_date DATE,                      
  edu_type TEXT,                      
  
  -- 인원
  headcount_breakdown JSONB,          
  
  -- 과정별 예산/정산 설정 (Line Item 단위로 관리)
  budget_usage_type TEXT,              
  settlement_method TEXT,              
  
  -- 채널-과정-차수 연결 (교육운영 집합/이러닝에만 해당)
  channel_id UUID,                     
  course_id UUID,                      
  linked_sessions JSONB DEFAULT '[]',  
  
  -- 비용
  calc_grounds_snapshot JSONB,        
  subtotal BIGINT DEFAULT 0,          
  
  -- 결과 연결 준비 (향후 Q-MP5 대비)
  result_status TEXT DEFAULT 'pending',  
  
  -- 정렬 & 메타
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블과의 참조 제약조건 추가
CREATE INDEX IF NOT EXISTS idx_api_application ON application_plan_items(application_id);
CREATE INDEX IF NOT EXISTS idx_api_plan ON application_plan_items(plan_id);

-- 동일 신청서에서 동일한 LMS 과정(course_id) 중복 추가 방지용 인덱스
-- (하지만 과정 선택 없는 항목도 있으므로, plan_id와 course_id 조합 활용. 단, NULL 허용을 고려해야 하므로 필수 조건은 애플리케이션 로직에서 처리 권장)
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_app_plan_course 
  ON application_plan_items(application_id, plan_id, coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid));
