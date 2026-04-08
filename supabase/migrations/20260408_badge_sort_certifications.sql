-- Migration: badge_sort_order_and_user_certifications
-- 실행: Supabase Dashboard > SQL Editor

-- 1. badges 테이블에 sort_order 추가
ALTER TABLE badges ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
UPDATE badges SET sort_order = 0 WHERE sort_order IS NULL;

-- 2. user_certifications 테이블 신규 생성
CREATE TABLE IF NOT EXISTS user_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  cert_name TEXT NOT NULL,
  issued_by TEXT,
  acquired_date DATE NOT NULL,
  expiry_date DATE,
  proof_url TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'PENDING_VERIFY')),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_certifications_user ON user_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certifications_tenant ON user_certifications(tenant_id);
