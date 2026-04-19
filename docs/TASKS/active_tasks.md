# HMGNLP_Budget — 활성 작업 목록
> 최종 업데이트: 2026-04-19

## ✅ 이번 세션 완료 목록
- [x] REFACTOR-1: bo_budget_master.js(154KB) → 3분할
- [x] REFACTOR-2: apply.js(142KB), plans.js(141KB) → 각 3분할
- [x] REFACTOR-3: bo_data.js(132KB), bo_virtual_org_unified.js(127KB) → 분할
- [x] REFACTOR-4: prd_data.js(384KB) → part1(123KB)+part2(164KB)+part3(98KB) 3분할
- [x] P11: bo_plan_mgmt.js — 운영담당자 1차 검토 UI + boPlanOpReview 함수
- [x] P12: bo_approval.js — 문서타입 필터탭 (전체/교육계획/신청/결과) + _boApprovalDocFilter
- [x] S-12: bo_approval.js — boRoleModeBadge / boGetApproveAction 역할 분기
- [x] S-13: bo_realtime.js 신규 — submission_documents Realtime 구독 + BO 토스트 알림
- [x] GAP-3: plans.js — FO 계획 상세뷰에 BO 배정액(allocated_amount) 표시
- [x] pre_dev_check.js — Windows ASCII 전용 출력으로 한글 깨짐 수정

## ⏳ 다음 우선순위 작업

### 🔴 GAP-1 (최우선) — approved 이후 환불/반납 로직
**파일**: `plans.js`, `apply.js`, `bo_plan_mgmt.js`
**내용**:
- `approved` 상태 이후 종단 처리 (`completed`, `cancelled_after_approval`)
- 교육신청 취소 시 `frozen_amount` 환원 → `bankbooks.current_balance` 복구
- BO에서 결과보고 확정 후 `used_amount` 확정 반영
- FO에서 취소 요청 → BO 승인 후 환원되는 2-step 취소 플로우

**관련 PRD**: `fo_submission_approval.md`, `budget_lifecycle.md`
**관련 DB 테이블**: `applications`, `bankbooks`, `submission_documents`

### 🟠 GAP-2 — used_amount 감소 로직 (취소 시 예산 환원)
- `applications.status` → `cancelled` 시 `bankbooks.frozen_amount` 감소
- Edge Function `cancel-application` 구현 또는 직접 DB upsert 처리

### 🟡 GAP-4 — 계획 간 예산 이전 F-007
- 계획 A 배정액 → 계획 B로 일부 이전
- BO `bo_plan_mgmt.js`에 "예산 이전" 버튼 추가

## 📌 환경 정보
- **Supabase Project ID**: `wihsojhucgmcdfpufonf`
- **GitHub Repo**: `haejbae87-ui/HMGNLP_Budget`
- **pre_dev_check**: `node scripts/pre_dev_check.js [파일명들]`
- **배포**: git add -A → commit → pull --rebase → push origin main

## 🔧 주요 패턴/규칙
- 결재 상태 흐름: `pending` → `in_review` (운영담당자 1차) → `approved` (총괄 최종)
- 운영담당자 판별: `isOpManager(persona)` / 총괄: `isGlobalAdmin(persona)`
- 토스트: `_boShowToast(msg, 'success'|'error'|'info')` (bo_plan_mgmt.js 정의)
- 100KB 이상 파일은 개발 전 반드시 `pre_dev_check` 실행
