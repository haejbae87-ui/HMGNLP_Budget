# HMGNLP_Budget 전체 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-05-06

---

## ✅ 완료된 작업 이력

### 2026-05-06 — 예산계정 마스터 3단필터 개편 + 예산배정현황 근본수정

- [x] **예산배정현황 조회 버그 근본수정** — 초기렌더에서 DB로드 완료 전 renderAllocOverview 호출 제거
  - bo_allocation.js — 동기 `${renderAllocOverview()}` → 로딩 placeholder + 비동기 완료 후 재렌더
  - bo_allocation.js — 비동기 재렌더 조건부(`_allocTab===0`) → 모든 탭 대응
- [x] **PRD F-B01: 최초 예산 할당 탭 → 예산계정 마스터 바로가기 통합**
  - bo_alloc_drilldown.js — `renderInitialAlloc()` → 예산계정 마스터 이동 안내 화면으로 교체
- [x] **예산계정 마스터 3단 캐스케이드 필터** — 회사→제도그룹→예산계정 (교육양식관리 패턴 적용)
  - bo_budget_master.js — `_bmFilterBarHtml()`, `_bmLoadFilterData()`, `_bmOnTplChange()`, `_bmApplyFilter()` 신규
  - bo_budget_master.js — 기존 `boRenderGroupContextBar()` 의존 제거, DB 실시간 캐스케이드 전환
- [x] **상단 필터 → 배정 드롭다운 자동 연동**
  - bo_allocation.js — `renderAllocEntry()` 필터 `_bmFilterAcctCode` 연동: 계정 자동 선택 + 안내 메시지

### 2026-05-06 — P10 실사용액 자동 집계 + Q-MP5 결과 분리 등록

- [x] **P10: 실사용액 자동 집계 (application_plan_items 기반 정밀 업그레이드)**
  - bo_budget_history.js — `_bhSyncActualAmounts()` → application_plan_items.subtotal 기반 plan_id별 정밀 집계, applications 폴백 유지
  - bo_budget_history.js — 미사용 plan의 actual_amount=0 자동 리셋 (50건 청크 업데이트)
  - bo_approval.js — `boApproveSubDoc()` 최종 승인 시 P10 자동 동기화 트리거 (application_plan_items → plans.actual_amount 실시간 갱신)
- [x] **Q-MP5: 교육결과 분리 등록 (Line Item별 결과 입력 UI)**
  - result.js — `_renderLineItemResultSection()` 신규: application_plan_items 비동기 로드 + 아코디언 UI
  - result.js — 각 Line Item별 수료여부/만족도(1~5)/실참석시간/비고 개별 입력 폼
  - result.js — `_submitResultRegistration()` 확장: Line Item별 result_status, result_detail DB 저장
  - result.js — `_updateLineItemResult()` 실시간 상태 반영 + 신청 변경 시 캐시 리셋

### 2026-05-06 — BO 결재문서 N-Line Items 렌더링 + 교육유형 불일치 경고

- [x] **bo_approval.js** — `_boShowSubDocDetail()` 교육신청 상세 모달에 `application_plan_items` 조회 및 과정-차수 카드 렌더링 추가
  - 교육신청(`doc_type === "application"`) 문서 → `submission_items.item_id`로 application ID 추출
  - `application_plan_items` 테이블에서 과정명, 교육유형, LMS 차수, 소계 금액 등 조회
  - 카드형 UI: 과정별 그라디언트 헤더 + 메타정보(교육기관, 기간, 예산구분, 정산방식) 그리드 + LMS 차수 태그
  - 첨부 건 목록 상단에 계층적 Line Items 섹션 삽입
- [x] **EC-07: 교육유형 불일치 경고** — 복수 교육계획 선택 시 edu_type 불일치 검증
  - fo_apply_actions.js — `_showPlanPickerPopup()` 확인 시 edu_type 불일치 차단 (alert)
  - apply.js — `_togglePlanPickerItem()` 선택 시 차단 (기존 코드, 이미 구현됨)
  - apply.js — `submitApply()` 제출 전 최종 검증 (방어 로직)
  - apply.js — `_renderPlanPickerSection()` 빨간색 경고 배너 실시간 표시
  - fo_form_loader.js — `multiPlanSection` 빨간색 경고 배너 실시간 표시
- [x] **BO 승인/반려 → `application_plan_items` 상태 동기화**
  - `boApproveSubDoc()` — 최종 승인 시 `application_plan_items.result_status = 'approved'`
  - `boRejectSubDoc()` — 반려 시 `application_plan_items.result_status = 'pending'` (재상신 대비)

### 2026-05-06 — 교육신청 위저드 4단계 구조 통일 (Phase 1~4 완료)

- [x] **Phase 1: 위저드 구조 통일**
  - [x] apply.js — Stepper 라벨 통일: 패턴A "세부산출근거" → 항상 "교육유형 선택"
  - [x] apply.js — Step 2에서 운영계획 선택 영역(`_renderPlanPickerSection`) 제거
  - [x] apply.js — Step 2 다음 버튼: 패턴A 운영계획 필수체크 제거 (예산 계정 선택만 확인)
  - [x] apply.js — Step 3: `_isPatternA` 분기 제거 → 항상 교육유형 선택 렌더링
  - [x] apply.js — Step 4: 패턴A 전용 운영계획 연결 + 과정-차수 맵핑 독립 섹션 추가
  - [x] fo_apply_form.js — Step 2/4 동기화
  - [x] 설계 확정: 1 운영계획 → N 과정, 프로세스 패턴 자동 제어
- [x] **Phase 2: 과정-차수 피커 UI**
  - [x] apply.js — `_renderLineItemsStep()` 리팩토링: 1 Plan → N Courses UI
  - [x] apply.js — 핸들러 5종 구현 (`_addCourseLink`, `_removeCourseLink`, `_onChannelChange`, `_onCourseChange`, `_toggleCourseSession`)
  - [x] apply.js — 실제 교육과정운영 데이터 적용 (프라임 채널, 리더십 집합교육)
- [x] **Phase 3+4: DB 연동 + 제출 로직**
  - [x] apply.js — `_buildPlanItems()` 공유 빌더: linkedCourses → application_plan_items 변환
  - [x] apply.js — submit/saveDraft에 linkedCourses, planIds, budgetChoice 저장
  - [x] apply.js — Edge Function/Fallback 양쪽 detail 동기화
- [x] **핫픽스**
  - [x] fo_apply_actions.js — 패턴A 운영계획 필수체크 제거 (Step 2→3 정상 흐름 복원)
  - [x] apply.js, fo_apply_form.js — 템플릿 리터럴 내 주석 텍스트 UI 노출 수정
  - [x] fo_form_loader.js — `multiPlanSection` 하드코딩 → `applyState.planIds` 기반 동적 렌더링
  - [x] fo_apply_actions.js — `_showPlanPickerPopup()` 팝업 구현 + `_removePlanFromSelection()` 연결
  - [x] fo_apply_actions.js — `resumeApplyDraft`에 planIds/linkedCourses/budgetChoice 복원 추가

### 2026-05-05 — FO 교육신청·교육결과 BO 양식 동기화

- [x] **fo_apply_actions.js** — `applyNext()` Step 3→4 전환 시 `loadFormConfigTemplate(accCode, tenantId, eduType, 'apply')` 비동기 로드 추가
- [x] **result.js** — `_resultNext()` Step 4 진입 시 `loadFormConfigTemplate(accCode, tenantId, eduType, 'result')` 비동기 로드 추가
- [x] **result.js** — `_resetResultWizardState()`에 `formTemplate`, `formTemplateLoading` 필드 추가
- [x] **result.js** — `_renderStep4DirectInfo()`, `_renderStep4ResultForm()`에 `_shouldShow` 조건부 렌더링 적용
- [x] **결과**: BO 양식관리에서 설정한 필드 ON/OFF가 FO 교육신청 Step 4, 교육결과 Step 4에 반영됨

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
