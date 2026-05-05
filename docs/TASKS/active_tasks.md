# HMGNLP_Budget 전체 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-05-05

---

## ✅ 완료된 작업 이력

### 2026-05-05 — 프로세스 패턴 3종 표준화 (A~E → A~C)

- [x] **PRD 전수 갱신** — 5가지 패턴(A~E) → 3가지(A, B, C) 단순화
  - service_policy.md: §3 파이프라인, §11 DB, §14 결재흐름 전면 갱신
  - edu_result.md: 패턴 C/D 통합→C, 패턴 E 제거, uses_budget 전환
  - form_simplification.md: 패턴 D/E 양식 구조 제거, A~C만 유지
  - multi_plan_application.md: 패턴 A/D→A 통합, uses_budget 기반 전환
- [x] **코드 동기화** — bo_form_management.js `_FORM_PATTERN_STAGES`에서 D, E 완전 제거
- [x] **설계 원칙 변경** — 예산 유무를 패턴 기반에서 계정의 `uses_budget` 속성 기반으로 전환

### 2026-05-01 — 예산 배분 드릴다운 엔진 + 프리미엄 UI

- [x] **bo_alloc_drilldown.js 신규 생성** — 예산 배분 통합 드릴다운 엔진
  - renderInitialAlloc() / renderBudgetDistribution() 진입점
  - _renderDDLevel0() — 교육조직별 배분 그리드
  - _renderDDLevel1() — 팀별 배분 그리드
  - calcDDRemain() — 실시간 워터폴 계산
  - _showDistConfirmModal() / _submitDDDist() — 확정 및 DB 저장
  - _showRecallModal() / _submitDDRecall() — 회수 기능
  - ddNavTo() / ddSelectAccount() — 브레드크럼 내비게이션
- [x] **backoffice.html** — bo_alloc_drilldown.js script 태그 추가
- [x] **Bug 1 수정** (bo_allocation.js) — 운영담당자 `_ddAbId` null 버그
- [x] **Bug 2 수정** (bo_alloc_drilldown.js) — 회수 후 `_syncBudgetAllocations` 미호출
- [x] **프리미엄 UI 전면 재작성** (bo_alloc_drilldown.js v2)
  - Level 0: 네이비 그라디언트 Master Bankbook Dashboard 카드
  - Level 0: 교육조직 테이블 소진율 컬럼 + → 드릴다운 버튼
  - Level 0: 하단 마스터 잔액 → 배분 후 잔액 상태바
  - Level 1: 초록 그라디언트 Organization Bankbook 카드
  - Level 1: 약정/집행/가용 컬럼 추가
  - Level 1: 행별 ↩ 회수 버튼 (per-row)
  - Level 1: 3색 세그먼트 워터폴 바
  - 확정 모달: 출금통장 카드 UI + 배분대상 테이블
  - 회수 모달: 프리미엄 카드 UI
- [x] **git push 배포** — SHA `0b2371f` → GitHub `37d188c` 확인

### ~ 2026-04-21 이전 작업

- [x] P16 bo_role_view.js 역할기반 뷰 구현 (F-150~F-156)
- [x] bo_budget_demand.js, bo_budget_history.js, bo_plan_mgmt.js, bo_allocation.js P16 통합
- [x] GitHub Actions sync-docs.yml 설정
- [x] bo_budget_history.js 도넛차트 + 일별 트렌드 바 차트 통합
- [x] FO 교육계획 수요예측 묶음 상신 워크플로우 설계 (PRD)
- [x] budget_distribution_drilldown.md PRD 생성

---

## 🔵 다음 개발 예정

### 단기 (F-151, Audit Trail)
- [ ] F-151: 운영담당자 Δ=0 제약 (관할 교육조직 총액 내 팀간 재배분, 총액 변경 불가)
- [ ] Audit Trail: _submitDDDist에 budget_usage_log 기록 추가

### 중기
- [ ] P10: applications 연동 실사용액 자동 집계
- [ ] F-156: 운영담당자 전용 대시보드

### 장기
- [ ] P8~P9: 조직이관, 6단계 추적 레포트
- [ ] P11~P15: 수요예측 묶음 상신 (FO) + 다단계 배정 (BO)
