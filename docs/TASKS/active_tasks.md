# 🔒 활성 작업 및 홀딩 목록 (Active Tasks)

> **상태**: 🔴 홀딩 중
> **최종 갱신**: 2026-04-18
> **안내**: 이 문서는 휘발되지 않는 영구적인 작업 관리 문서입니다. 개발 중 중단된 사항, 다음 우선순위, 미결정 정책 등을 보관합니다.

---

## 🚀 다음 우선순위 (To-Do)

### 예산 라이프사이클 고도화 (budget_lifecycle.md 기반)

- **[x] S-1: DB 테이블 생성** — `submission_documents`, `submission_items`, `approval_history` ✅ 2026-04-18
- **[ ] S-2: plans.js 3단계 버튼 분리** — 임시저장/저장/저장+상신 + `saved` 상태 추가
- **[ ] S-3: 상신 문서 작성 화면** — 단건/다건 공통 UI + 결재선 자동 구성
- **[ ] S-4: 팀원용 결재함 개편** — 상신 문서 기반 목록 + 회수 기능
- **[ ] S-5: 팀장용 결재함 개편** — 상신 문서 기반 승인/반려
- **[ ] P16. 역할 기반 뷰 모드 (Role-Aware View) 구현** (🔴 1순위)
  - `bo_plan_mgmt.js` 등에 운영담당자 관할 필터 적용 및 배정 권한 분기
- **[ ] P02. 교육계획 리스트 인라인 편집 UX** (🔴 2순위)
  - 엑셀형 편집기, 셀 수정 및 하이라이트, 일괄 저장
- **[ ] P11. plan_type 자동분류 → submission_documents 연동** (🔴 3순위)
  - DB 연동, 자동분류 속성 (plan_bundles 대신 submission_documents 사용)
- **[ ] P12. FO 팀 묶음 상신 기능**
- **[ ] P13-14. BO 1차/최종 다단계 예산 배정 모듈**

### 교육양식 간소화 (form_simplification.md 기반) 🆕

- **[ ] Phase A. plans/applications 정규화 컬럼 추가 + 이중 기록**
  - is_overseas, venue_type, locations, extra_fields 등 DB 컬럼 추가
- **[ ] Phase B. FO 표준 렌더러 작성**
  - 폼빌더 동적 로드 → 표준 템플릿 6개 기반 정적 렌더
- **[ ] Phase C. calc_grounds apply_conditions 태깅 + BO UI + FO 필터링**
  - 산출근거 항목에 조건 태그 부착, 필터 함수 1개로 종속성 대체
- **[ ] Phase D. BO 결재/상세뷰 정규화 컬럼 기반 전환**
- **[ ] Phase E. 데이터 마이그레이션 + 폼빌더 비활성화**

### 복수 계획 연동 (multi_plan_application.md 기반) 🆕

- **[ ] DB: application_plan_items 조인 테이블 생성**
  - 조인 테이블 (application_id, plan_id, selected_rounds, headcount_breakdown, budget_usage_type, settlement_method, calc_grounds_snapshot, subtotal, result_status)
- ~~**[ ] DB: applications.application_mode 컬럼 추가**~~ ✅ **불필요** (v1.2: 패턴 A/D로 판별)
- **[ ] FO: 패턴 A/D일 때 위저드 Step 3 "교육계획 구성" 구현**
  - 승인된 계획 선택 → Line Item 카드 (적응형 필드) → 인원/산출근거
- **[ ] FO: 적응형 Line Item 카드**
  - 개인직무 → 인원=본인, 예산구분/정산 숨김(패턴D시)
  - 교육운영 → 구분별 인원, 예산구분/정산 노출
- **[ ] FO: 차수 사용 현황 조회 (getUsedRounds)**
  - 기 신청 차수 비활성 처리
- **[ ] BO: 결재 문서에서 Line Items 렌더링**

### 역할별 운영관리 설계 (edu_support_operations_role_design.md 기반) 🆕

- **[x] E-1: 공통 유틸 (`isGlobalAdmin`, `isOpManager`, `applyRoleFilter`, `getRoleLabel`) 추가** ✅ 2026-04-18 — utils.js
- **[ ] E-2: 예산 배정 탭 역할 분기 (운영: 읽기전용 2탭)** — bo_allocation.js
- **[ ] E-3: 예산 사용이력/수요분석 관할 필터 적용** — bo_budget_history.js, bo_budget_demand.js
- **[ ] E-4: 교육계획 1차검토/최종승인 분기 + `reviewed` 상태 추가** — bo_plan_mgmt.js
- **[ ] E-5: 교육신청 2단계 결재 + Line Items 카드 렌더** — bo_approval.js
- **[ ] E-6: 묶음 상신 UI 및 DB (`submission_bundles`)** — [신규] bo_submission.js
- **[ ] E-7: 교육결과 정산 권한 분기** — bo_result_mgmt.js

### FO 상신·결재 프로세스 (fo_submission_approval.md 기반) 🆕

- **[x] S-1: DB 테이블 생성** — `submission_documents`, `submission_items`, `approval_history` ✅ 2026-04-18
- **[ ] S-2: plans.js 3단계 버튼 분리** — 임시저장/저장/저장+상신 + `saved` 상태 추가
- **[ ] S-3: 상신 문서 작성 화면** — 단건/다건 공통 UI + 결재선 자동 구성
- **[ ] S-4: 팀원용 결재함 개편** — 상신 문서 기반 목록 + 회수 기능
- **[ ] S-5: 팀장용 결재함 개편** — 상신 문서 기반 승인/반려
- **[ ] S-6: apply.js, result.js 동일 패턴 적용**
- **[ ] S-7: 통합결재 표시 (협조처/참조처)** — HMC/KIA 전용
- **[ ] S-8: BO 결재 화면 상신 문서 기반 전환** — bo_approval.js
- **[ ] S-9: 예산 예약/확정 차감 로직**
- **[ ] S-10: 레거시 마이그레이션** — `pending` → `submitted` 변환

### 예산 연동 (budget_allocation_sync + budget_allocation_linkage) 🆕

- **[x] #13-P1: BO `submitInitBudget/submitAddBudget` → account_budgets DB upsert 연동** ✅ 2026-04-18 — bo_allocation.js
- **[ ] #16-A: FO 배정+통장 표시** — plans.js, dashboard.js
- **[ ] #16-C: application↔plan 연결 (plan_id 세팅)**  — apply.js
- **[ ] #16-D: 교육신청 통장 검증 + 차감/환불** — apply.js, bo_approval.js

### 산출근거·양식 (calc_grounds_ux_redesign) 🆕

- **[x] #14-P1: DB 마이그레이션** — calc_grounds(usage_type, has_rounds, has_qty2, qty2_type, is_overseas) 추가 ✅ 2026-04-18
- **[ ] #14-P2: BO UI 개선** — 유형 라디오, 탭 필터 — bo_calc_grounds.js
- **[ ] #14-P3: FO 공통 유틸** — `_getCalcGroundsType`, `_getCalcGroundsForType` — bo_calc_grounds.js
- **[ ] #14-P4A: 직접학습형 2중 승산 (apply.js 하드코딩 제거)**
- **[ ] #14-P4B: 교육운영형 3중 승산 + 장소/프리셋 (plans.js + apply.js)**

## 🚧 미결정 정책 (Blockers)

### 예산 라이프사이클 관련
- **Q-07**: 묶음 대표 지정 방식
- **Q-08**: 운영담당자 1차 조정 스텝 가이드 (필수 vs 선택)
- **Q-09**: 결재문서 양식 포맷
- **Q-12**: 운영담당자의 배정액 조회 허용 범위 제한
- **Q-13/14**: 대시보드 위젯 및 확정결과 열람 권한 범위

### 교육양식 간소화 관련 🆕
- **QF-01**: 기존 폼빌더 데이터 이중 기록 기간
- **QF-02**: extra_fields 스키마 관리 방식
- **QF-03**: apply_conditions 매칭 방식 (관대 vs 엄격)
- **QF-04**: 표준 템플릿 6개 충분한지 (팀 확인 필요)
- **QF-05**: 폼빌더 완전 제거 시점 (프로토타입만? 운영도?)

### 복수 계획 연동 관련 🆕
- ~~**Q-MP1**: 개인직무도 multi_plan을 쓸 가능성?~~ ✅ **해결** (v1.2: 모드 개념 삭제. 동일 양식)
- **Q-MP2**: 차수가 없는 계획도 Line Item으로 관리?
- **Q-MP3**: 결재 반려 시 Line Items 수정 범위 (추가/삭제 허용?)
- ~~**Q-MP4**: 이캠퍼스 계열사에 multi_plan 노출 여부~~ ✅ **해결** (v1.2: 패턴 A/D 정책 있으면 자동 적용)
- **⏳ Q-MP5**: **결과 분리 등록** — 신청서의 결과를 과정별로 분리해서 각각 결과 보고서 올리기 (보류 — DB에 result_status 선제 배치)
- **Q-MP6**: **부분 취소** — 3개 과정 신청 중 1개만 취소 가능?
- **Q-MP7**: **과정별 결재 분기** — 리더가 과정②만 반려, ①은 승인 가능?

### 역할별 운영관리 관련 🆕
- **Q-OP1**: `reviewed` 팀장 결재 추적 방식 (내부 vs 그룹웨어)
- **Q-OP2**: 팀장 결재를 내부 처리 vs 현대차 전자결재 연동?
- **Q-OP3**: 운영담당자 "긴급 상신" (검토 없이 bypass) 가능 여부?
- **Q-OP4**: 묶음 상신 시 첨부파일 지원?
- **Q-OP5**: 운영담당자의 확정 시뮬레이션 결과 조회 범위?

### FO 상신·결재 프로세스 관련 🆕
- ~~**Q-SUB1**: 다건 상신 시 서로 다른 계정의 건 포함 가능?~~ ✅ **해결** (v1.1: 동일 계정만 허용)
- **Q-SUB2**: 상신 문서에 계획+신청+결과 혼합 허용?
- **Q-SUB3**: 회수 가능 시점 — `submitted`에서만? `in_review` 1단계까지?
- **Q-SUB4**: 반려 후 재상신 시 새 상신 문서 생성? 기존 문서 재활용?
- ~~**Q-SUB5**: `plan_bundles`/`submission_bundles`를 `submission_documents`로 통합?~~ ✅ **해결** (v1.1 D안: `plan_bundles` → `submission_documents` 통합, `submission_bundles` 분리 유지)
- **Q-SUB6**: 예산 예약(hold) 메커니즘 — 상신 시 잔액 임시 차감?
- **Q-SUB7**: 외부결재 계정의 상신 문서 — 내부 기록만?

---

## 📝 최근 완료된 작업 이력 (History)
- **2026-04-18**: **Foundation 4개 동시 착수** (2시간)
  - ✅ S-1: submission_documents + submission_items + approval_history DB 생성 (RLS 포함)
  - ✅ E-1: isGlobalAdmin / isOpManager / applyRoleFilter / getRoleLabel — utils.js
  - ✅ #13-P1: submitInitBudget/submitAddBudget account_budgets DB upsert 연동 — bo_allocation.js
  - ✅ #14-P1: calc_grounds usage_type/has_rounds/has_qty2/qty2_type/is_overseas 추가 + calc_ground_unit_prices preset 컬럼 추가 + 직접학습형 초기 항목 5개 INSERT
- **2026-04-18**: **fo_submission_approval.md v1.0** — FO 상신·결재 프로세스 설계. 3단계 상태(draft→saved→submitted), 상신 문서 엔티티, 단건/다건 상신, 결재함(팀원/팀장), 회수, 엣지케이스 20건, 구현 Phase 10단계.
- **2026-04-18**: **edu_support_operations_role_design.md v1.0** — 교육지원제도 운영관리 6개 메뉴의 총괄/운영 역할별 업무 범위 설계. 2단계 결재 프로세스, 묶음 상신, 예산 탭 권한 분기 기획 확정.
- **2026-04-18**: **multi_plan_application.md v1.3** — 채널-과정-차수 디커플링 설계. Line Item 내 과정-차수 피커 연동. 엣지케이스 18건 정리.
- **2026-04-18**: 교육양식 필드 표준화 1차 통합 완료 (HMC R&D + HMC/Kia 반영). 라이프사이클 4단계 확장.
- **2026-04-18**: 복수 계획 연동 PRD 작성 완료 (multi_plan_application.md v1.0→v1.1). Header+LineItems, 예산구분/정산→Line Item 이동.
- **2026-04-17**: 교육양식 간소화 PRD 작성 완료 (form_simplification.md v1.0). 하이브리드 B안 확정.
- **2026-04-17**: PRD 역추적 분석 완료. 역할별 화면 분리(Phase 16) 스펙 확정.
- **2026-04-16**: 수요예측 묶음 상신(Phase 11~15) 로직 기획 완료.

