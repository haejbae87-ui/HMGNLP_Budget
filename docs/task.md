# ✅ 작업 완료

**작업**: 수요예측 결재라인 계정 단위 설계 (신규 DB 테이블 + FO 결재 불가 처리)

---

- [x] Step 0: 요구사항 확정 (신규 테이블, 기존 UI 재사용, 미설정 시 결재 불가)
- [x] Step 1: `bo_budget_account_tabs.js`, `bo_budget_account.js` 기존 코드 분석 완료
- [x] Step 2: DB 마이그레이션 — `forecast_approval_lines` 테이블 + 컬럼 추가 + RLS/인덱스 설정
- [x] Step 3: `bo_budget_account.js` — 저장 시 `forecast_approval_lines` 동기화 + `getForecastApprovalLine()` 헬퍼 추가
- [x] Step 4: `fo_plans_list.js` — 묶음 상신 전 결재라인 미설정 시 차단 로직 추가
- [x] Step 5: Git 배포 완료

---

## 구현 요약

### DB
- `forecast_approval_lines` 테이블 (기존 step 기반 테이블에 컬럼 추가)
  - `budget_account_id`, `approval_type`, `thresholds` (JSONB), `review_mode`
  - UNIQUE(tenant_id, account_code), RLS 정책 (authenticated_rw + anon_read)

### BO (`bo_budget_account.js`)
- `_bamSaveAccount()`: 계정 저장 시 `approval_config.forecast` → `forecast_approval_lines` upsert 동기화
- `getForecastApprovalLine(tenantId, accountCode)`: FO에서 결재라인 조회용 헬퍼 함수

### FO (`fo_plans_list.js`)
- `foBundleConfirmSubmit()`: 묶음 상신 실행 전 `forecast_approval_lines` 테이블 조회
  - 미설정 (rows 없음 또는 thresholds 빈 배열) → 명확한 오류 메시지 + 상신 차단
  - DB 조회 실패 → confirm으로 진행 여부 확인
