-- 수요예측 캠페인 다중 계정 지원 및 스키마 업데이트
-- 1. 기존 의미 불분명한 공통(__VORG__) 데이터 일괄 삭제
DELETE FROM forecast_deadlines WHERE account_code = '__VORG__';

-- 2. title(캠페인 제목) 컬럼 추가 (존재하지 않을 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forecast_deadlines' AND column_name='title') THEN
        ALTER TABLE forecast_deadlines ADD COLUMN title text;
    END IF;
END $$;

-- 3. target_accounts(다중 대상 계정 JSONB 배열) 컬럼 추가 (존재하지 않을 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forecast_deadlines' AND column_name='target_accounts') THEN
        ALTER TABLE forecast_deadlines ADD COLUMN target_accounts jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;
