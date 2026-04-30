# 🚧 예산 배정 화면 개편 v3 — 작업 진행 상황

> 시작 시각: 2026-04-30 22:56

## Phase 0-A: DB 기반 스키마 ✅ 완료
- [x] Step 1: pre_dev_check 실행 완료 (master 154KB REFACTOR 필요, allocation 84KB 주의)
- [x] Step 2: PRD 작성 완료 — `budget_allocation_redesign.md` + README 갱신
- [x] Step 3: DB 마이그레이션 완료 — `bankbook_fiscal_periods` 테이블 생성 ✅
- [x] Step 4: DB 마이그레이션 완료 — `org_budget_bankbooks` + `budget_accounts` 확장 ✅
- [x] Step 5: DB 마이그레이션 완료 — `sap_budget_interface_log` 테이블 생성 ✅

## Phase 0-B: integration_mode 코드 마이그레이션 ✅ 완료
- [x] Step 6: `bo_budget_account.js` — integration_mode 읽기/저장 변경 ✅
- [x] Step 7: `bo_budget_account_mgmt.js` — integration_mode 읽기/저장/UI 변경 ✅
- [x] Step 8: DB 데이터 마이그레이션 — account_type → integration_mode 값 동기화 ✅

## Phase 1: BO UI 개편 ✅ 완료
- [x] `bo_allocation.js` — 대시보드 소진율 모니터링 패널 추가 ✅
- [x] `bo_allocation.js` — 계정 선택 카드 SAP/자체 뱃지 추가 ✅
- [x] `bo_allocation.js` — _syncAllocFromDB에 integration_mode 조회 추가 ✅

## 다음 작업
- [ ] Phase 2: 통장 정책별 배정 UI 분기
- [ ] Phase 3: FO 운영계획 재배분 UI
