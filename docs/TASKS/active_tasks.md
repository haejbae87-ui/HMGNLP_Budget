# HMGNLP_Budget 전체 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-05-08

---

## ✅ 완료된 작업 이력

### 2026-05-12 — 백오피스 결재 및 결과관리 검색/필터 버그 수정

- [x] **백오피스 결재/결과관리 조회 조건 (vorgId, year) 필터 연동 수정**
  - `bo_approval.js`: 결재함 `renderMyOperations()`의 프론트엔드 필터 로직에 누락되었던 `_boAdvFilter.vorgId`(교육제도그룹) 및 `_boAdvFilter.year`(년도) 조회 조건 처리 코드 추가.
  - `bo_result_mgmt.js`: 교육결과관리 `renderResultMgmt()`의 프론트엔드 필터 로직에 누락되었던 `_boAdvFilter.year`(년도) 조회 조건 처리 코드 추가.
  - VOrg(교육제도그룹) 선택 시 캐싱된 `accountsCache`를 순회하여 해당 그룹에 속한 유효 `account_code` 배열을 추출한 뒤, `submission_documents` 및 `applications`를 정확히 교차 필터링 하도록 개선.

### 2026-05-12 — 예산계정 단위 FO 노출 설정(개인/팀 목록) 추가 연동

- [x] **백오피스 예산계정 관리 화면 FO 탭 노출 설정 UI 추가 및 DB 연동**
  - `bo_budget_account.js`: 기본정보 탭(`_bamRenderBasicTab`)에 프론트오피스 노출 설정(개인 전용, 팀 전용, 모두 노출) 선택 라디오 버튼 마크업 추가.
  - `bo_budget_account.js`: `_bamSaveAccount` 실행 시 `budget_accounts` 테이블의 `list_view_mode` 필드에 설정값(personal, team, both)이 반영되도록 Payload 연동 로직 업데이트 완료. FO 목록에서 해당 값을 기반으로 '내 신청', '팀 신청' 탭을 제어함.

### 2026-05-12 — 예산 계정 단위 금액별 결재자 설정 및 FO 상신 연동 작업

- [x] **계정 단위 금액별 결재자(Thresholds) 설정 UI 연동 및 DB 반영**
  - `bo_budget_account_tabs.js`: Tab 3 영역의 금액별 결재자 설정 폼(Thresholds) 마크업 주석 해제 및 UI 렌더링 활성화 완료.
  - `bo_budget_account.js`: `_bamDetailData.approval_config` 데이터가 `account_budgets` 테이블의 `detail`이 아닌 자체 `approval_config` JSON 컬럼으로 올바르게 저장되도록 맵핑 및 저장 로직 확인 완료.
- [x] **FO 결재 상신 시 예산 계정별 `approval_config` 우선 적용**
  - `fo_persona_loader.js`: `_initCurrentPersona` 및 `_fetchAccount` 실행 시 `budget_accounts` 테이블에서 `approval_config` 데이터를 추가로 Select하여 `currentPersona.budgets` 배열에 매핑.
  - `approval.js` 및 `fo_plans_actions.js`: FO 결재선 생성 로직(`_calculateApprovalLine`, `_aprConfirmSubmit`, `_aprOpenModal`, `_isAutoApproveOperationPlan`)에서 기존 `SERVICE_POLICIES`보다 `currentPersona.budgets`의 `approvalConfig`를 최우선으로 참조하도록 우선순위 로직 전면 리팩토링 및 폴백 지원.

### 2026-05-11 — 예산/사업계획 관리 및 데이터 필터링 오류 수정

- [x] **Bug Fix: 프론트오피스 "팀 배정예산(가용 총액)" 동기화 오류 해결**
  - `fo_plans_list.js`, `plans.js`: `_foRenderTeamOperationDashboard` 및 계획 카드의 예산 뱃지(`_updateBudgetBadges`) 렌더링 시, 전체 회사 계정 예산(`account_budgets`)을 잘못 조회하던 로직을 팀별 배정 예산(`currentPersona.budgets`)을 직접 참조하도록 수정하여 백오피스(1,000,000원)와 프론트오피스가 일치하도록 연동 완료.
- [x] **Bug Fix: 예산 배분 드릴다운 UI 렌더링 오류 및 용어 표시 버그 수정**
  - `bo_alloc_drilldown.js`: 예산 배분 현황판(Level 0)에서 미배분 상태(`currentAlloc <= 0`)일 경우 하위 팀 드릴다운 버튼이 노출되지 않아 초기 배분을 진행할 수 없던 논리적 버그를 해결(조건문 제거).
  - 조직별 운영담당자 목록 표시 시, 단일 문자열(`vg.manager`)을 참조하던 기존 코드를 배열 형태인 `vg.managers` 맵핑으로 수정하여 정상적으로 담당자 이름 목록이 표시되도록 패치.
  - 마스터 통장 대시보드의 오타 및 깨진 라벨 수정 ("계정 이명" → "계정 코드", "총 배산" → "총 배정예산", "가능할 수 비정" → "배분 가능 예산", "특시 배정 비보" → "이미 배분된 금액").
- [x] **운영계획 관리(Level 1, 2, 3) 화면 조회 필터 UI 및 비즈니스 로직 적용**
  - `bo_operation_plan.js`: 사업계획 관리와 동일한 UX의 `_opFilterBar` 렌더링 함수 구현 (회사, VOrg, 계정, 연도 필터링 지원).
  - 필터 상태(`_opTenant`, `_opTplId`, `_opAccountId`, `_opYear`) 변경 시 Supabase 쿼리를 재실행하여 선택된 데이터 조건에 맞게 운영계획 데이터를 동적으로 필터링하도록 비즈니스 로직 연동 완료.
  - 관련 PRD 문서화(`operation_plan.md`) 및 Domain Council 분석 검토 반영 완료.
- [x] **Bug Fix: 예산 동기화 시 `org_budget_bankbooks` 400 Bad Request 스키마 에러 수정**
  - `bo_allocation.js`: `_syncBudgetAllocations` 함수에서 `org_budget_bankbooks` 테이블에 존재하지 않는 `allocated_amount` 컬럼을 SELECT 하려다 발생하는 HTTP 400 에러를 제거하고 단순 `id` 조회로 로직 안전화 처리.
- [x] **Bug Fix: 사업계획 관리 메뉴(Level 2/3)에서 상위 조직(HQ) 클릭 시 하위 조직 필터링 누락 버그 수정**
  - `bo_budget_demand.js`: `_renderBdCombined` 및 `_renderBdLevel3`에서 `_bdDrillOrg`가 선택되지 않은 경우, 전체 회사 계획(`allPlans`)이 노출되는 현상을 수정하여 현재 선택된 `hq`에 소속된 팀들의 계획만 노출되도록 필터링 로직 강화.
- [x] **Bug Fix: 사업계획 관리 화면에서 사업계획 명 클릭 시 모달이 뜨지 않는 문제 수정**
  - `bo_budget_demand.js`: `_renderBdCombined` 함수 렌더링 결과에 상세 보기 모달(`<div id="bd-plan-detail-modal">`) 마크업이 누락되어 있어 `_bdShowPlanDetail` 함수가 모달 요소를 찾지 못하고 종료되던 문제 수정.
- [x] **Bug Fix: 총괄 승인 시 운영계획 자동 복사 실패(Schema Error) 수정**
  - `bo_budget_demand.js`, `fo_plans_actions.js`: `_autoCreateOperationPlan` 함수에서 Supabase `plans` 테이블 스키마에 존재하지 않는 `dept` 및 `frozen_amount` 컬럼을 직접 INSERT 하려다 발생한 에러 수정 (해당 컬럼들은 `detail` JSON 내부에 저장되거나 `bankbooks` 테이블 소관이므로 `plans` 테이블 스키마에 맞춰 INSERT Payload에서 제거).
- [x] **Bug Fix: 상위 조직(HQ) 선택 시 하위 사업계획 목록 헤더에 특정 팀명이 표시되는 버그 수정**
  - `bo_budget_demand.js`: `_renderBdCombined` 함수에서 하위 팀 필터가 적용되지 않았을 때(`_bdDrillOrg` = null), 단일 팀만 사업계획이 제출되어 있으면 해당 팀명으로 헤더가 강제 치환되던 로직을 제거하고 항상 선택된 HQ 명칭(예: `연구개발&AVP본부 전체 — 2027년`)이 표시되도록 수정.
- [x] **FO 운영계획 금액 인라인 수정 (배정 재배분 UI 폐지)**
  - `fo_plans_list.js`: 운영계획 카드의 '운영계획금액'을 `<input type="number">`로 교체하여 인라인 편집 기능 추가.
  - `fo_plans_list.js`, `fo_plans_actions.js`: 인라인 수정 시 `_checkOperationBudgetLimit`를 통한 팀 통장 가용예산 초과 여부 실시간 검증 및 DB 자동 갱신 반영.
  - `fo_plans_actions.js`, `plans.js`: 기존 불필요해진 모달 기반의 배정 재배분 UI 관련 코드(`_foToggleRealloc`, `_foRenderReallocUI` 등) 완전 폐기.
  - 관련 PRD 문서화(`business_operation_plans.md`) 갱신 완료.

### 2026-05-10 — 문서 상태값(Status) 표준화 및 예산 계정 필터링 논리 오류 수정

- [x] **Bug Fix: 결재함 로드 시 `org_budget_bankbooks`의 `bb_status` 컬럼 불일치 버그 수정**
  - `approval.js`: 기존 `status` 컬럼을 `bb_status`로 조회하도록 수정하여 400 Bad Request 에러 방지.
- [x] **Bug Fix: 교육신청 회수/상신 시 `updated_at` 스키마 에러(400 Bad Request) 수정**
  - `approval.js`: `applications` 테이블에는 `updated_at` 컬럼이 없음에도 불구하고 `_aprRecallSubmit`, `_aprSingleSubmit` 실행 시 해당 컬럼 업데이트를 시도하여 발생하던 오류 해결 (`table !== 'applications'` 조건부 처리 추가).
- [x] **Bug Fix: 예산 계정 필터링(제도권한) 강제 우회 및 누락 버그 수정**
  - `fo_plans_wizard.js`: `contextAccountCode`로 접근 시 `availBudgets` 필터링을 우회하여 권한 없는 예산이 강제로 선택되던 버그를 `availBudgets.find()` 기반 폴백으로 수정.
  - `fo_plans_wizard.js`: 패턴 A(계획 필수) 체크 로직에서 `account_codes`가 비어있는(모든 계정 대상) 정책의 경우 `acc.includes()` 검증에 실패하여 무조건 누락되던 버그 해결.
  - `utils.js`: `getPersonaBudgets` 함수 내에서 `account_codes`가 빈 배열인(전체 허용) 정책이 매칭될 경우, 모든 예산 계정을 허용하도록 `hasAllAccountsPolicy` 폴백 로직 추가.
- [x] **결재 문서 상태값(Status) 표준화 PRD 작성**
  - `docs/PRD/status_standardization.md` 생성 완료.
  - Domain Council 전문가 관점의 문서 결재 상태(State Machine) 5단계(`saved`, `submitted`, `approved`, `rejected`, `recalled`) 표준 규격 정의.

### 2026-05-10 — FO 교육신청·교육결과 저장 후 프로세스 통합 (Post-Save Flow)

  - [x] **Bug Fix: 제도그룹(VOrg) 선택 시 예산계정 노출 버그 수정**
    - `fo_apply_list.js`, `fo_plans_list.js`, `result.js`: 선택한 제도그룹에 배정된 계정이 없을 경우, 전체 허용 계정으로 폴백되던 현상을 수정하여 정상적으로 "배정된 예산계정이 없습니다."로 표시되도록 수정.

- [x] **교육신청/결과등록 저장 직후 상세 뷰어 화면 진입 처리**
  - `fo_apply_actions.js`: `saveApplyAsReady()` 로직 수정. 하드코딩된 `history` 목록으로 강제 튕기는 UX를 사업계획/운영계획처럼 `confirmMode` 기반의 요약 확인 화면으로 이동하도록 통일.
  - `apply.js`, `fo_apply_actions.js`: 작성 완료 시 보여지는 모달 하단 버튼을 `✅ 확정 제출`에서 결재 행위를 암시하는 `📤 상신하기`로 일괄 변경 (상위 승인자 워크플로우 통일).
  - `result.js`: 교육결과 저장 완료 시 `renderResult` 호출 전 `confirmMode = true`를 세팅하여 제출된 내용을 확인(`_renderResultConfirm`)할 수 있도록 설계 통합.

### 2026-05-09 — 프론트오피스 폼 UI/UX 프리미엄 개선 및 데이터 호환성 강화

- [x] **FO-BO 폼 레이아웃 완전 동기화 (Phase C)**
  - `fo_form_loader.js`: `wrapSection` 디자인을 백오피스 Premium UI 스타일(그라디언트, 그림자, 여백 개선)로 고도화
  - `fo_form_loader.js`: `_field` 인풋 박스(textarea, boolean, default)에 포커스 링 애니메이션 및 hover/active 효과 적용
  - `fo_form_loader.js`: 읽기 전용 폼(ReadOnly)의 `wrapSection`을 프리미엄 테이블 스타일로 업그레이드
- [x] **데이터 보존 안정화 및 마이그레이션 적용**
  - `fo_apply_actions.js`: `resumeApplyDraft` 시 과거 `detail` JSON에 하드코딩된 레거시 필드명을 신규 필드명(`learning_objective`, `expected_benefit` 등)으로 자동 매핑하는 하위 호환성 폴백 로직 완비
  - `fo_plans_actions.js`: `savePlanDraft`, `savePlanSaved`, `confirmPlan` 시 `applyState` 전체를 복제 보존하여 데이터 누락 원천 차단
  - `fo_plans_actions.js`: `resumePlanDraft` 호출 시 레거시 필드명을 신규 필드명으로 하위 호환 매핑

### 2026-05-08 — 교육결과 등록 UX 개선 및 FO 양식 로딩(Fallback) 버그 수정

- [x] **FO 교육 양식 로딩 (Fallback) 버그 수정**
  - `bo_form_management.js` — `_formSave()`에서 상위 `eduTypes` 대신 `_formGroupEduTypes`로 수집된 실제 세부 유형(Leaf Nodes) 기준으로 폼 설정을 저장하도록 변경하여 세부 유형(이러닝 등) 양식 설정 누락 문제 해결
  - `fo_apply_actions.js`, `fo_plans_actions.js` — `loadFormConfigTemplate` 호출 시 상위 `applyState.eduType` 대신 더 구체적인 세부 유형 `eduType` (예: `1_elearning`)를 우선 전달하도록 파라미터 매핑 개선
  - 백오피스에서 '이러닝' 전용 양식 저장 시, 프론트 오피스에서도 올바른 DB `form_config` 기반 양식이 매칭되도록 동기화 로직 안정화
- [x] **교육신청 화면 '교육결과 등록' 버튼 제거** — 간헐적 노출 버그 해결
  - `apply.js`, `fo_apply_list.js` — `_applySmartButtons()`에서 패턴 C/D 기반 결과등록 버튼 완전 제거
  - 결과 등록은 독립 메뉴(GNB '교육결과')로 진입하도록 일원화
- [x] **교육결과 등록 화면 Pre-Wizard(제도그룹/예산계정 사전 선택) 제거**
  - `result.js` — `renderResult()`에서 VOrg/Account Pre-Wizard 분기 로직 제거
  - `result.js` — 위저드 내부 `_resultSelectedAccountCode` 의존 코드 정리 (목적 필터, 예산 자동세팅, Step 라벨, 계정 배지)
  - PRD(`edu_result.md`) 정의에 맞게 바로 목록→위저드 진입 플로우로 단순화

### 2026-05-07 — 교육 예산 관리 시스템 고도화 (Phase 16)

- [x] **공통 계층형 필터(5단계) 구현**
  - `bo_filter_utils.js` 추가 및 `backoffice.html`에 연동
  - Tenant > Group > Account > Org > [Team] > Year 지원
- [x] **교육신청 관리 (`bo_approval.js`) 전면 개편**
  - 기존 카드형 레이아웃을 표준 테이블(Tabular)형 목록 뷰로 전환
  - 사업계획 묶음(Bundle) 기능 제거 및 운영 업무 일원화
  - '운영계획 보기' 컨텍스트 버튼 추가
- [x] **교육결과 관리 (`bo_result_mgmt.js`) 전면 개편**
  - 검토 대기 / 정산 완료 분리 테이블형 뷰 적용
  - 공통 고급 필터 연동
  - '교육신청 보기' 컨텍스트 버튼 추가

### 2026-05-07 — 예산 배분 드릴다운 UI 버그 및 DB 중복 데이터 처리 로직 개선

- [x] **Bug Fix 4: 드릴다운 UI(L0/L1)에서 DB 중복 통장 데이터 합산 표기 로직 추가**
  - 기존 `.find()` 방식으로 인한 단일 0원짜리 쓰레기 통장 노출 버그(잔액 `—` 표기 현상) 수정
  - `bo_alloc_drilldown.js`의 `_renderDDLevel0`, `_renderDDLevel1` 내부 로직을 대시보드와 동일하게 `.filter().reduce()`로 전면 교체하여 동일 조직의 모든 통장 잔액을 정상 합산 처리

### 2026-05-07 — 예산 배분 드릴다운 버그 수정 (Audit Trail, F-151, 회수 UX)

- [x] **Bug Fix 1: `_submitDDDist` lines 배열 구조 불일치 수정** — Audit Trail 데이터 오염 해결
  - `bo_alloc_drilldown.js` — `lines.push(문자열)` → `lines.push({ name, v, after, dbMatched })` 객체화
  - Audit Trail `account_budget_adjustments` insert 시 `amount: l.v`, `reason: ... ${boFmt(l.v)}원` 올바른 값 저장
  - alert 메시지도 `lines.map(l => ...)` 방식으로 수정
- [x] **Bug Fix 2: F-151 Δ=0 제약 강화 (해석 B)** — Level 1에서 orgAlloc 초과 배분 차단 추가
  - `_showDistConfirmModal`: 운영담당자 + Level 1 조건에서 `teamsAllocated + inputTotal > orgAlloc` 시 차단 alert
  - 초과 금액 상세 메시지(교육조직 배분 총액, 이미 배분된 금액, 초과분) 표시
- [x] **Bug Fix 3: 회수 완료 후 Level 1 복귀 처리** — Level 0 리셋 대신 Level 1 유지
  - `_submitDDRecall` 완료 시 `showAllocTabByIdx(2)` → `_ddLevel = 1; renderBudgetDistribution()` 교체
  - `_ddOrgId`, `_ddOrgName` 상태 유지로 회수 후 같은 교육조직 화면으로 자연스럽게 복귀
- [x] **Audit Trail type 표준화** — `type: '배분'` → `isL1 ? '팀 배분' : '조직 배분'` 분리 저장

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

### 2026-05-06 — VOrg DB 연동 및 드릴다운 데이터 분리 필터 구현

- [x] **VOrg DB Fallback 제거 및 테이블 매핑 교체**
  - `supabase_client.js`: `virtual_edu_orgs` (미존재) 테이블 참조를 `virtual_org_templates` 테이블로 수정
  - `bo_alloc_drilldown.js`, `bo_allocation.js`: 예산 계정의 하드코딩된 R&D 여부(`isRnd`) 대신 `template_id`를 기반으로 가상조직(VOrg)을 우선 동적 참조하도록 리팩토링
  - `virtual_org_templates`의 `tree_data` 스키마를 프론트엔드의 `tree` 객체로 매핑
- [x] **예산 배분 탭 UI/UX 고도화 및 버그 수정**
  - 데이터 범위 필터 연동(`_allocFilterTenant`, `_allocYear`, `_allocFilterAccountCode`) 적용으로 선택된 데이터만 정확히 스코핑
- [x] **UI 렌더링 및 통신 에러 핫픽스**
  - `bo_budget_master.js`: 탭 UI 스위칭 함수(`setbmTab`) ReferenceError 미정의 버그 수정 (`window.setbmTab` 전역 등록)
  - `bo_allocation.js`: 파서 충돌을 유발했던 `try-catch` 블록 문법 에러(SyntaxError) 수정으로 "예산 배정 및 관리" 메뉴 진입 불가 장애 해결

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
- [x] F-151: 운영담당자 Δ=0 제약 (관할 교육조직 총액 내 팀간 재배분, 총액 변경 불가)
- [x] Audit Trail: _submitDDDist 및 _submitDDRecall에 account_budget_adjustments 기록 추가 (budget_usage_log 대신 마스터 일원화)
- [x] 예산 배정 현황 Mock 데이터(ACCOUNT_BUDGETS, TEAM_DIST) 완전 제거

### 중기
- [x] P10: applications 연동 실사용액 자동 집계 (완료)
- [ ] F-156: 운영담당자 전용 대시보드

### 장기
- [ ] P8~P9: 조직이관, 6단계 추적 레포트
- [ ] P11~P15: 수요예측 묶음 상신 (FO) + 다단계 배정 (BO)
- [x] 예산계정 마스터 4-Tab UI 구조 개편 및 변경이력 DB 적재 자동화
- [x] 예산계정 마스터 UI: 데이터 범위 조회 필터를 타이틀 영역 하단으로 이동
- [x] bo_allocation.js: 예산 변경 이력(Audit Trail) 저장 실패 시 사용자에게 명시적인 에러 Alert 노출 처리 추가
- [x] bo_budget_master.js 및 bo_allocation.js: 파일 비대화 및 리팩토링 진행 (미사용 데드코드 약 4,000줄 삭제로 파일 크기 최적화)

- [x] FO 렌더링 파이프라인 단일화 (SSOT 구축) 및 fo_apply_actions.js 레거시 중복 코드 완전 제거
- [x] fo_plans_actions.js 레거시 템플릿 폴백 로직 제거
- [x] fo_apply_form.js, fo_plans_wizard.js 구형 renderDynamicFormFields 브랜치 완전 차단
- [x] FO 렌더링 동기화 버그 해결 (form_config 변환기 블랙리스트 로직 수정, 화이트리스트 지원)
- [x] FO 렌더링에 교육목적 및 교육유형 읽기전용 필드 추가 (BO 화면과 100% 동기화)
- [x] FO 고도화 로직(세부산출근거 등) 유지 및 BO 필드 통제 강화 (하이브리드 표준화 옵션 C 적용)
- [x] 백오피스 기준 FO 폼 레이아웃 완전 일치화 (Phase C 렌더러 리팩토링)
- [x] FO 정책 로드 시 폐기된 virtual_edu_orgs 테이블 호출 오류 (404) 제거 (ig.id 직접 사용)