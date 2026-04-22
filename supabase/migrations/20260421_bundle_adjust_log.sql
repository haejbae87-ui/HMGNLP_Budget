-- P13: 운영담당자 1차 검토 예산 조정 이력 테이블
CREATE TABLE IF NOT EXISTS bundle_adjust_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission_documents(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  adjust_stage TEXT NOT NULL, -- 'ops_1st' (운영 1차) / 'total_final' (총괄 최종)
  original_amount BIGINT NOT NULL DEFAULT 0,
  adjusted_amount BIGINT NOT NULL DEFAULT 0,
  reason TEXT,
  adjusted_by TEXT, -- 조정자 이름 또는 ID
  adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_adjust_log_sub ON bundle_adjust_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_bundle_adjust_log_plan ON bundle_adjust_log(plan_id);
