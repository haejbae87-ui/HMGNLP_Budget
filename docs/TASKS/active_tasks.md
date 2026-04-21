# 📋 HMGNLP_Budget — 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-04-21 (Form Simplification Phase B 완료 — FO 표준 렌더러 구현)

---

## ✅ 완료된 작업 이력

### ~ 2026-04-19 세션 2 (P16 역할 기반 뷰 모드 구현 완료)

- [x] **PRD #14** — calc_grounds DB 마이그레이션 + FO 아키텍처 정규화
- [x] **PRD #13** — fo_realtime.js 구현 확인, bo_allocation.js DB 연동 확인
- [x] **P16 bo_role_view.js 전면 재작성** (F-150~F-156 전체 구현)
- [x] **P16 bo_budget_demand.js, bo_budget_history.js, bo_plan_mgmt.js, bo_allocation.js** 역할뷰 통합
- [x] **GitHub Actions sync-docs.yml 수정**, auto_deploy SKILL.md 개선
- [x] **git push 배포** — ba58c57 커밋 동기화 완료
- [x] **S-7 통합결재 협조처/참조처 구현** (`approval.js`) — 상신 모달에 integrated 계정 자동 감지 후 협조처/참조처 입력 UI + submission_documents 저장
- [x] **S-11 배정액 축소 UI 연결** (`fo_plans_list.js`) — approved 카드에 `foOpenReduceAllocation` 버튼 추가 (환불 로직은 기구현 `fo_budget_refund.js` 활용)
- [x] **S-8 BO 결재화면 상신문서 기반 전환** (`bo_approval.js`, `approval.js`, `bo_approval_routing.js`)
  - FO 상신 시 `approval_nodes` 자동 구성 (APPROVAL_ROUTING 기반, 종러 없으면 1단계 fallback)
  - FO 상신 시 `doc_type` 자동 파생 (plan/application), uuid auto생성 방식으로 전환
  - `submission_items` DB 콤럼 불일치 수정 (`item_status_at_submit`, `final_status`)
  - BO 결재함 필터: 역할 기반 전체 조회 (총괄담당자 = 전체, 운영담당자 = 관할 교육조직 문서만)
  - 승인/반려 시 `submission_items.final_status` 업데이트
  - `bo_approval_routing.js` 외부결재(external) 배지 제거
- [x] **P2 교육계획 인라인 편집** 확인 (`bo_plan_mgmt.js`) — `_boPlanToggleEdit`, `_boPlanBatchSave`, `_boPlanInlineChange` 등 1597줄 기구현 확인 완료
- [x] **P10 실사용액 자동 집계** — `trg_sync_plan_actual_amount` DB 트리거: `applications.status='approved'` 시 `plans.actual_amount` 자동 합산
- [x] **P11 plan_type 자동분류** — `trg_auto_classify_plan_type` DB 트리거: 수요예측 기간 내 INSERT 시 `forecast`, 외 시 `ongoing` 자동 설정 (Q-10)
- [x] **P12 FO 묶음 상신 UI** — `fo_plans_list.js`: HMC/KIA 테넌트 전용 `bundled_forecast_enabled` 체크, `forecast` + `saved` 계획 선택형 묶음 상신(팀장 결재) UI 구현
- [x] **Form Simplification Phase A** — DB 정규화: `plans` 테이블 `venue_type`, `planned_rounds`, `planned_days`, `locations`, `extra_fields` 컬럼 추가; `applications` 테이블 `venue_type`, `extra_fields` 추가; 기존 데이터 backfill (detail JSON → 정규화 컬럼). `fo_plans_actions.js` 세 저장 함수에 dual-write 이중 기록 추가.
- [x] **Form Simplification Phase B** — FO 표준 렌더러 구현: `fo_form_loader.js`에 `foRenderStandardPlanForm()`, `foRenderStandardApplyForm()` 추가 (정규화 컬럼 기반 입력 UI). `fo_plans_wizard.js`, `fo_apply_form.js` Step 4 폴백을 표준 렌더러 호출로 교체. 렌더러는 is_overseas, venue_type, planned_rounds, overseas_country 등 정규화 컬럼 직접 입력 지원. BO 양식 미설정 시 자동 적용됨.
- [x] **Form Simplification Phase C** — `apply_conditions` JSONB 컬럼 추가 (calc_grounds); 기존 항목 자동 태깅(항공료→해외, 숙박비→숙박); `bo_calc_grounds.js` 상세 편집 UI에 적용조건 섹션(🏷️) 추가; `fo_form_loader.js`에 `foGetApplicableCalcGrounds`, `getApplicableCalcGrounds`, `getApplicableCalcGroundsForType` 공용 필터 함수 추가.

---

## 🟢 확정된 정책 (2026-04-19)

| ID | 내용 |
|----|------|
| Q-07 | 묶음 대표 = 생성자 자동 지정. 한 팀에서 여러 묶음 상신 가능, 개별 상신도 허용 |
| Q-08 | 수요예측 묶음 기능 = **HMC/KIA 테넌트 전용** (feature flag: `bundled_forecast_enabled`) |
| Q-09 | 결재문서 = **웹 화면만** (PDF 불필요) |
| Q-10 | `plan_type` 분류 기준 = **수요예측 기간 여부**. 기간 중 → forecast, 기간 외 → regular |
| Q-11 | 운영담당자가 복수 교육조직 관할 가능. 교육조직별 드롭다운 선택 (기구현 EC-34 활용) |
| Q-SUB7 | 결재 방식 = **`platform`(자체) + `integrated`(통합/HMC-KIA)** 2개 체계. `external` 폐지. `integrated`는 외부 시스템에 상신문서 전송 → 결과 회신 → 내부 상태 전환 |

---

## 🎯 개발 순서 (정책 확정 기준 재정렬)

### 1순위 — 즉시 착수 가능 (미결정 정책 없음)

| 항목 | 파일 | 규모 | 이유 |
|------|------|:----:|------|
| **P2 교육계획 인라인 편집** (F-008~F-010) | `bo_plan_mgmt.js` | ⭐⭐⭐ | P16 완료 → 바로 착수 가능. 운영담당자 1차 조정(P13)에도 재사용 |
| **S-7 통합결재 협조처/참조처 표시** | `approval.js`, `gnb.js` | ⭐⭐ | HMC/KIA integrated 계정 전용. Q-SUB7 확정으로 설계 완료 |
| **S-8 BO 결재화면 상신문서 기반 전환** | `bo_approval.js` | ⭐⭐⭐⭐ | 가장 복잡. 정책 기반 → 상신문서 기반 전환 |
| **S-11 승인 후 배정액 축소 + 환불** | FO 상세 UI + `_s9RefundBudget()` | ⭐⭐⭐ | SC-001 시나리오 완성 |
| **P10 실사용액 자동 집계** | `bo_plan_mgmt.js`, DB 트리거 | ⭐⭐ | `applications` → `plans.actual_amount` 연동 |

### 2순위 — P2 완료 후 착수

| 항목 | 파일 | 의존성 |
|------|------|--------|
| **P11 plan_type 자동분류 + submission_documents 통합** | DB 마이그레이션 | P2 완료 후 |
| **P12 FO 묶음 상신 UI** (HMC/KIA 전용) | `plans.js`, 신규 UI | P11 완료 후 |
| **P3 상세뷰 조회전용 전환** | `bo_plan_mgmt.js` | P2 완료 후 |

### 3순위 — 중기 작업

| 항목 | 파일 | 의존성 |
|------|------|--------|
| **P13 BO 운영담당자 1차 검토** | `bo_plan_mgmt.js`, 신규 UI | P12, P16 완료 후 |
| **P14 BO 총괄 최종 배정** | `bo_budget_demand.js` 재활용 | P13 완료 후 |
| **P8 조직개편 이관 UI** | `bo_org_transfer.js` (신규) | 독립 |
| **P9 6단계 추적 레포트** | 신규 리포트 페이지 | P10 완료 후 |

---

## 📊 전체 PRD 구현 상태 요약

| PRD | 제목 | 상태 |
|-----|------|:---:|
| PRD #1~14 | 기초 아키텍처, 정책, 산출근거, 실시간 동기 등 | ✅ 완료 |
| PRD #15 (P1, P4, P6, P16) | DB 스키마, 시뮬레이션, bankbooks, 역할뷰 | ✅ 완료 |
| PRD #15 (P2, P3, P7~P10, P11~P15) | 인라인 편집, 이관, 레포트, 묶음 상신 | 🔴 미구현 |
| PRD #21 (S-1~S-6, S-9) | FO 상신문서 기반, 결재함, Hold 로직 | ✅ 완료 |
| PRD #21 (S-7, S-11) | 통합결재 협조처/참조처 표시, 배정액 축소 UI 연결 | ✅ 완료 |
| PRD #21 (S-8) | BO 결재화면 상신문서 기반 전환 | ✅ 완료 |
| PRD #16~20 | 배정-신청 분석, 양식 간소화, 복수계획 등 | 🔴 미구현 |


---

## ✅ 완료된 작업 이력

### 2026-04-19 세션 (PRD #13 / PRD #14 최종 검증)

- [x] **PRD #14 — DB 마이그레이션 완료**: `calc_grounds` 테이블에 `usage_type`, `has_rounds`, `has_qty2`, `is_overseas` 컬럼 추가, 직접학습용 기본 마스터 데이터(CG-SL-001~005) 이식
- [x] **PRD #14 — FO 아키텍처 정규화**: 하드코딩된 산출근거 로직 → DB 기반 `bo_calc_grounds.js` 컨트롤러 호출 방식 전환
- [x] **PRD #13 — fo_realtime.js 구현 확인**: FO Realtime 구독 (227줄) + `frontoffice.html` 포함 확인
- [x] **PRD #13 — bo_allocation.js DB 연동 확인**: `submitBulkDist()` → `budget_allocations` DB UPSERT (L1100~) 완료
- [x] **bo_fb_core.js 복원**: `renderFormBuilderMenu` 함수 본문 복원 (교육양식 마법사 메뉴 진입 버그 수정)
- [x] **bo_fb_library.js 수정**: 파일 로드 시점 dangling 코드 제거 (JS 에러 해결)
- [x] **전체 백로그 재점검**: CRITICAL 항목(F-008~F-010 인라인 편집, P16 역할뷰, P10 실사용액 집계) 모두 기구현 확인
- [x] **git push 배포**: 로컬 ↔ origin/main `ba58c57` 커밋 동기화 확인

---

### 2026-04-19 세션 2 (P16 역할 기반 뷰 모드 구현)

- [x] **P16 bo_role_view.js 전면 재작성 (F-150~F-156)**
  - `boGetRoleClass()`, `boIsGlobalAdmin()`, `boIsOpManager()` — 역할 판별 유틸
  - `boGetMyOrgIds()`, `boApplyOrgScopeFilter()`, `boFilterPlansByScope()` — 관할 데이터 스코핑
  - `boCanEditAllocation()`, `boCanRebalanceInScope()`, `boCanSimulate()` — 기능 권한 분기
  - `boRoleModeBadge()`, `boOpScopeBanner()` — 역할 뱃지 & 관할 배너 UI
  - `boRenderOpDashboard()` — 운영담당자 전용 KPI 대시보드 위젯
  - `boRenderRoleActionButtons()`, `boRoleApprove()`, `boRoleReject()` — 역할별 승인/반려 액션
- [x] **P16 bo_budget_demand.js 역할뷰 적용 (F-150, F-152)**
  - 운영담당자: 시뮬레이션 버튼 숨김 → "1차 검토 모드" 안내로 대체
  - 역할 뱃지 + 관할 배너 헤더 표시
- [x] **P16 bo_budget_history.js 역할뷰 적용 (F-150, F-155)**
  - 운영담당자: 단일 관할 그룹 자동 필터 초기화
  - 역할 뱃지 + 관할 배너 헤더 표시
- [x] **P16 bo_plan_mgmt.js 역할뷰 통합 (F-150, F-154)**
  - 레거시 `isGlobalAdmin/isOpManager` → `boIsGlobalAdmin/boIsOpManager` 교체
  - 운영담당자 `boFilterPlansByScope()` 관할 데이터 스코핑 적용
  - 화면 헤더에 `boOpScopeBanner()` 관할 배너 삽입
- [x] **P16 bo_allocation.js 역할뷰 통합 (F-151)**
  - `renderBoAllocation`, `showAllocTabByIdx` 두 곳 레거시 → 신규 함수 교체
- [x] **GitHub Actions sync-docs.yml 수정**: `docs/TASKS/` 보존 로직 추가
- [x] **auto_deploy SKILL.md 개선**: sync 커밋 SHA 불일치 대처 가이드 추가

---

### 2026-04-20 세션 (P14 BO 총괄담당자 최종 예산 배정)

- [x] **P14 `org_forecast` 상세 뷰 고도화 (`bo_approval.js`)**
  - `_boShowSubDocDetail` 로직 수정: `submission_type`이 `org_forecast`일 경우 하위 `team_forecast`를 불러와 계층적 UI 렌더링
- [x] **P14 총괄담당자 전용 시뮬레이션 모달 (`boShowSimulationModal`) 구현**
  - Envelope 총액 설정, 하위 `plan`별 배정액 인라인 수정 기능
  - 잔여 재원 실시간 계산 로직 추가
- [x] **P14 최종 승인 및 확정 로직 (`boApproveOrgForecast`) 구현**
  - `submission_documents` 및 연관 `submission_items` 상태 일괄 `approved` 전이
  - `plans.allocated_amount` 실 DB 업데이트 및 `budget_adjust_logs` 이력 인서트
  - 확정된 배정액에 따라 `bankbooks` 가점유(`frozen_amount`) 차감 및 `used_amount` 반영

---

## 🔄 진행 중 / 다음 작업

| 우선순위 | 항목 | 파일 | 상태 |
|---------|------|------|:---:|
| 🔴 NOW | **교육양식 간소화 FO 연동** — `fo_form_loader.js` 토글 기반 양식 렌더링 | `fo_form_loader.js` | 🔄 개발 중 |
| 🟠 HIGH | **P16 bo_plan_mgmt.js 역할뷰 검증** | `bo_plan_mgmt.js` | 🔄 검토 필요 |
| 🟠 HIGH | **P16 bo_allocation.js 역할뷰 검증** | `bo_allocation.js` | 🔄 검토 필요 |
| 🟠 HIGH | P8 조직개편 이관 UI | `bo_org_transfer.js` (신규) | ⏳ 미착수 |
| 🟠 HIGH | P11~P15 수요예측 묶음 상신 | 다수 파일 | ⏳ 미착수 |
| 🟠 HIGH | P7 통장 간 이관 잔액 검증 | `bo_budget_transfer.js` | ⏳ 미착수 |
| 🟡 MED | PRD #21 FO 결재라인 3단계 이상 지원 | `approval.js` | ⏳ 미착수 |

## ⏸️ 홀딩 (Holding) — 현재 개발 보류

| 항목 | 이유 | 보류일 |
|------|------|--------|
| 뱃지그룹관리 | 아직 개발 진행할 단계가 아님 (사용자 판단) | 2026-04-21 |
| 뱃지기준설정 | 아직 개발 진행할 단계가 아님 (사용자 판단) | 2026-04-21 |
| 뱃지 심사 및 현황 | 아직 개발 진행할 단계가 아님 (사용자 판단) | 2026-04-21 |

---

## 📊 전체 PRD 구현 상태 요약

| PRD | 제목 | 상태 |
|-----|------|:---:|
| PRD #1~12 | 기초 아키텍처, 페르소나, 폼빌더, 정책 등 | ✅ 완료 |
| PRD #13 | BO↔FO 예산 배정 실시간 동기 | ✅ 완료 |
| PRD #14 | 산출근거 UX 개선 + DB 정규화 | ✅ 완료 |
| PRD #15 (P1~P7, P10, **P16**) | 예산 라이프사이클 고도화 | ✅ 완료 |
| PRD #15 (P8, P9, P11~P15) | 조직이관, 6단계 레포트, 묶음 상신 | 🔴 미구현 |
| PRD #16~21 | 배정-신청 분석, 양식 간소화 등 | 🔴 미구현 |

### 2026-04-20 ���� (FO �������� ������� & ���߰�ȹ �ջ� ��û)
- [x] P12, P15 ��� ���� (pplication_plan_items ���̺� �ż�)
- [x] o_plans_list.js: ������ȹ ���� ��� ��å (���� ���� ����) ����
- [x] pply.js: ������û ���� ��ȹ �ջ� ��û �� N:1 ������ ���� ����

- [x] **P13 BO ������ 1�� ���� ��� (bo_approval.js)**: �� ���� ����, 1�� ���� ����(�ζ���), �������� ���� ���� �� ��� ���� ���� ���� �Ϸ� Ȯ��
- [x] **교육양식(Form) 관리 아키텍처 개선 (bo_form_builder.js)**
  - 양식 라이브러리 상단 조회 필터에서 '예산계정' 필터 완전 제거 (양식의 범용성 훼손 방지)
  - 양식 에디터(새 양식 만들기) 상단에 명시적인 소속 정보 패널(회사 > 제도그룹) 고정 표시
  - 양식 데이터(FORM_MASTER) 생성 및 복사 시 accountCode 강제 종속을 제거하여 데이터 파편화 위험 차단

