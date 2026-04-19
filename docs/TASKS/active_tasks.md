# HMGNLP_Budget — 활성 작업 목록
> 최종 업데이트: 2026-04-19

## ✅ 완료 목록 (이번 세션까지)
- [x] REFACTOR-1~4: 대형 JS 파일 분할 (bo_budget_master, bo_form_builder, apply, plans, bo_data, prd_data 등)
- [x] P11/P12: bo_plan_mgmt, bo_approval 검토 UI 고도화
- [x] S-12/S-13: BO 역할 분기 결재 + Realtime 상신 알림
- [x] GAP-3: FO 계획 상세뷰 배정액(allocated_amount) 표시
- [x] **GAP-1**: 교육신청 취소/환불 라이프사이클 (fo_cancel.js + bo_cancel_handler.js)
  - DB: cancelled_at, cancel_reason, refund_status, used_amount 컬럼 추가
  - FO: 취소 요청 모달 + 철회 + 상태별 버튼
  - BO: 취소 요청 목록 + 승인(frozen_amount 환원) + 거부
- [x] **GAP-2**: used_amount 집행 확정 (boFinalizeUsedAmount + _confirmResult 연동)
  - 정산완료 시: frozen_amount 전액 해제 + used_amount 확정 + 잔액 복원
- [x] **GAP-4**: 계획 간 예산 이전 F-007 (bo_budget_transfer.js)
  - BO 계획 목록 approved 행에 💸 이전 버튼 추가
  - 이전 모달: 대상 계획 선택 + 금액 입력 + 미리보기 + 이전 이력 기록

## 📌 환경 정보
- **Supabase Project ID**: `wihsojhucgmcdfpufonf`
- **GitHub Repo**: `haejbae87-ui/HMGNLP_Budget`
- **pre_dev_check**: `node scripts/pre_dev_check.js [파일명들]`
- **배포**: git add -A → commit → pull --rebase → push origin main
- **최신 커밋**: `24f36d8`

## 🔧 주요 패턴/규칙
- 결재 상태 흐름: `pending` → `in_review` (운영담당자 1차) → `approved` (총괄 최종)
- 취소 흐름: `approved` → `refund_status:requested` → BO 승인 → `cancelled` + bankbook 환원
- 정산 확정: `result_pending` → BO 확인 → `completed` + `used_amount` 확정
- 예산 이전: BO approved 계획 행 💸 버튼 → boOpenBudgetTransfer()
- 100KB 이상 파일은 반드시 별도 모듈로 분리 후 작업

## ⏳ 향후 개선 과제 (낮은 우선순위)
- PRD 데이터 DB 이관 (현재 JS 파일로 관리 중)
- bo_form_builder.js(151KB) 추가 분할
- bo_budget_master.js(154KB) 추가 분할
- 성능 모니터링 자동화
