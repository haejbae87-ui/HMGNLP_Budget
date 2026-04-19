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
  
  -- 차수 & 인원
  selected_rounds JSONB DEFAULT '[]', 
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

-- 기존 테이블과의 참조 제약조건 추가 (테이블이 존재한다는 가정 하에, 보통 text로 저장되므로 명시적 FK는 생략하거나 TEXT 매칭용 인덱스만 생성할 수 있습니다. 
-- 기존 스키마 확인 결과 applications와 plans의 id가 TEXT 타입이라면)
CREATE INDEX IF NOT EXISTS idx_api_application ON application_plan_items(application_id);
CREATE INDEX IF NOT EXISTS idx_api_plan ON application_plan_items(plan_id);

-- 동일 신청서에서 같은 계획의 같은 차수 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_app_plan_round 
  ON application_plan_items(application_id, plan_id, selected_rounds);
