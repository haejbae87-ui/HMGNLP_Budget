- [x] 예산계정 관리(BO) UI 최적화: 레이어 팝업 방식에서 독립 상세 뷰로 전환 (o_budget_account.js 레이아웃 및 폼 로직 개편)\n# 📋 HMGNLP_Budget — 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-04-21 (Phase E 완료 — 데이터 마이그레이션 및 이중 기록 종료)

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
- [x] **Form Simplification Phase D** — BO 결재·상세뷰 정규화 컬럼 기반 전환: 신규 `bo_plan_detail_renderer.js` 작성 (`boRenderPlanDetailInfo`, `boRenderAppDetailRows`). `bo_plan_mgmt.js` 상세뷰(`_renderBoPlanDetail`)에서 detail JSON 직접 읽기 → 정규화 컬럼(`is_overseas`, `venue_type`, `planned_rounds` 등) 우선 읽기로 교체. 레거시 detail은 폴백으로만 사용. `backoffice.html` 스크립트 태그 추가.
- [x] **Phase F-4 교육양식마법사 메뉴 숨김** — `bo_layout.js` 4곳 `form-builder` 메뉴에 `hidden: true` 추가. `renderBoSidebar` 및 GNB 필터에 `!m.hidden` 조건 추가. 기존 코드 보존하여 rollback 가능.
- [x] **Phase F-2 정책 위저드 Step3 인라인 편집기** — `bo_policy_builder.js` Step3를 기존 외부 양식 선택 UI에서 인라인 필드 토글 편집기로 교체. 무예산 시 비용 비활성화.
- [x] **Phase F-3 FO 양식 렌더러 인라인 데이터 연동** — `fo_form_loader.js` (getFoFormTemplate, foRenderStandardPlanForm, foRenderStandardApplyForm)가 `stageFormFields`의 인라인 양식 설정을 1순위로 로드하고, 비용/필수 필드 조건에 맞게 동적으로 숨김/활성화 처리. `fo_plans_wizard.js` 및 `fo_apply_form.js`에서 인라인 설정 전달 확인.
- [x] **Phase F-3 FO/BO 렌더러 매핑 픽스** — `bo_policy_builder.js`의 `stageFormFields` 키 스펙(is_overseas, venue_type 등)과 `fo_form_loader.js`가 검사하는 키(venue, edu_period 등) 불일치로 인한 양식 미적용 버그 해결 완료.
- [x] **Form Simplification Phase E** — DB 마이그레이션 및 이중 기록 종료: `plans` 및 `applications` 테이블의 `detail` JSON 내 정규화 필드(is_overseas, venue_type 등)를 추출하여 빈 컬럼들을 채우는 마이그레이션 SQL 실행. `fo_plans_actions.js`, `fo_apply_actions.js`에서 dual-write 주석 변경 및 `bo_plan_detail_renderer.js`에서 `detail` 폴백 제거(`_boReadField` 삭제 후 정규화 컬럼 직접 참조).

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


- [x] **P17 ���俹�� GNB �޴� �и� (���� ���� ��Ʈ�� ����)**: gnb.js�� ���俹�� �޴� �ż�, plans.js ����� �б�(orecast ��� ��ú��� ����), �Ⱓ ��ȸ ��� �߰�.
- [x] Form Field Governance V2 리팩토링 (stage_form_fields 스키마 정규화 및 FO/BO 매핑 일원화)

- [x] **Remove FO Hardcoding**: Removed FO dynamic overrides, added elearning/consignment/content toggles to BO, strictly bound FO to BO settings.
- [x] **FO/BO Field Standardization Phase B**: fo_form_loader.js�� bo_policy_builder.js�� �������� ī�װ���(�⺻����, ������, �����׸�, ����/÷���׸�, ����׸�) ������� ����ȭ�ϰ� �ű� �ʵ�(learning_objective, expected_benefit ��)�� ������.

- [x] P16 bo_plan_mgmt.js �ζ��� ���� (Phase 2): �������� ����(��=0) �����ϵ��� ���� �� ���� ���� ����

- [x] FO 폼 매칭 로직 오류 (edu_type과 selected_edu_item.subId 불일치) 해결 및 반영
- [x] P17 Multi-Plan to Single Application (N:1) FO/BO workflow integration (apply.js, fo_form_loader.js, bo_approval.js) and removed legacy selected_rounds logic.
- [x] P17 Fix FO Submit Button (modal rendering issue) and remove 'saved' draft state from BO Approval queues (bo_plan_mgmt.js, approval.js, fo_apply_actions.js, apply.js).
-   [ x ]   F O   ٳ�  ����  �T��|�  P h a s e   B   7 �Ĭ  t�L�ବ�\�  �|�T�  ( f o _ f o r m _ l o a d e r . j s   ���0�  ȩ�  �  f o _ p l a n s _ w i z a r d ,   f o _ a p p l y _ f o r m   T�ܴ  ���T�)  
 - [x] FO �ۼ�Ȯ�� �� BO �� �並 7�ܰ� ī�װ����� ����ȭ (foRenderStandardReadOnlyForm)
- [x] Migrate FO batch submission to Plan List using checkboxes, update PRD fo_submission_approval.md
-   [ x ]   F O   ����  ����|�x�( a p p r o v a l   s t a g e )   ��Q�  $�X�  ��  ( ����Ĭ��/ ��!�  ��)  
 
- [x] **FO/BO Business/Operation Plan Split (Architecture Re-engineering)**
  - plans.js: Introduced Business (수요예측/사업계획) vs Operation (상시/운영계획) tabs and state separation.
  - pproval.js: Enforced fixed Top-Down approval line for Business plans and adjusted submission_type to team_business.
  - o_approval.js: Replaced legacy forecast terminology with business, and implemented auto-cloning of approved business plans into operation plans with parent_id linkage.


---

### 2026-04-29 세션 (Phase 3 완성 + Phase 4 운영계획 자동복사)

- [x] **Phase 3 완성 — _teamForecastBoTransfer() / _teamForecastReject() 구현 (approval.js)**
  - BO 전달: submission_documents.status 'submitted' → 'team_approved' + approval_history 기록
  - 반려: 번들 내 모든 plans.status → 'saved' 복귀, submission_documents → 'rejected'
  - 두 함수 모두 window.* 로 전역 노출, 리더 결재함 자동 새로고침

- [x] **Phase 4 — _autoCreateOperationPlan() 공통 함수 구현 (fo_plans_actions.js)**
  - plan_type='forecast'/'business' 한정 (멱등성: source_forecast_plan_id 중복 방지)
  - 복사본: status='saved', frozen_amount=0, allocated_amount=0
  - detail에 source_forecast_plan_id, auto_copied_at, copy_trigger 기록
  - FO 화면 showToast 알림 지원

- [x] **Phase 4 — bo_approval.js 기존 복사 로직 버그 수정 및 공통 함수로 교체**
  - 버그 수정: plan_type 'business'만 → 'forecast'|'business' 확장
  - 버그 수정: 복사본 status 'approved' → 'saved' (사용자 보완 필요 상태)
  - 버그 수정: frozen_amount=0 추가, source_forecast_plan_id 추적 추가

- [x] **Phase 4 — fo_plans_list.js 복사본 뱃지 렌더링**
  - _dbMyPlans / _dbTeamPlans 매핑에 source_forecast_plan_id 포함
  - 운영계획 카드 중 source_forecast_plan_id 있는 카드에 '📋 사업계획 복사본' 뱃지 표시

---

## ⚠️ PRD 상충 / 미결 의사결정 사항 (2026-04-29 기준)

| # | 항목 | 현재 구현 | PRD 원문 | 결정 필요 내용 |
|---|------|-----------|---------|--------------|
| **DEC-01** | **Phase 4 plan_type 조건** | 'forecast' \| 'business' 모두 처리 | implementation_plan.md는 'forecast'만 명시 | 'business' 타입도 운영계획 복사 대상으로 공식 확정할지? |
| **DEC-02** | **복사본 재승인 시 처리** | 기존 복사본 유지 (스킵) | Q-P4-01 미결 | 재승인 시: A) 기존 유지 ← 현재 구현 / B) 삭제 후 재생성 |
| **DEC-03** | **복사본 알림 방식** | showToast 화면 알림만 | Q-P4-02 미결 | A) 토스트만 ← 현재 구현 / B) 알림탭 + 이메일 |
| **DEC-04** | **운영계획 결재 시 frozen_amount** | 복사본은 0, 결재 시 새로 생성 | Q-P4-03 미결 | A) 결재 시 새로 생성 ← 현재 구현 / B) 원본 forecast frozen 이전 |
| **DEC-05** | **팀장 결재함 team_forecast 번들 조회** | 'submitted','in_review','team_approved' 범위 조회 | Phase 3 PRD F-004a | team_approved 건도 계속 팀장 결재함에 보여야 하는지, 아니면 숨길지? |
| **DEC-06** | **결재선 계정 기반 라우팅 (Q-P3-01)** | 현재 training type 기반 로직 사용 | Phase 3 미결 사항 | account_code 기반(HMC-OPS 등) 결재선 라우팅 업그레이드 필요 여부 |



---

## 🚀 다음 세션 시작 가이드 (2026-04-29 기준)

### 📌 현재 완료된 워크플로우 전체 흐름

`
[FO 팀원] saved 사업계획 → 팀 탭에서 '📤 팀 사업계획 확정' 클릭
    ↓ foTeamForecastConfirm() — submission_documents 생성, plans → submitted
[FO 팀장] 결재함 → '📤 BO 전달' 클릭
    ↓ _teamForecastBoTransfer() — status: team_approved 전환 ✅ 완료
[BO 운영담당자] bo_budget_consolidation 대시보드에서 수신 ← ❌ 미구현
    ↓ (미구현) 1차 예산 조정 → 총괄담당자 상신
[총괄담당자] 최종 승인
    ↓ _autoCreateOperationPlan() — 운영계획 자동 생성 ✅ 완료
[FO 팀원] 운영계획 탭에서 '📋 사업계획 복사본' 뱃지 확인 → 상신 ✅ 완료
`

### 🎯 다음 세션 1순위: BO 취합 대시보드 (bo_budget_consolidation)

**목표**: BO 운영담당자가 	eam_approved 상태의 팀 번들을 수신·검토·총괄 상신하는 화면

**관련 파일**:
- docs/PRD/bo_budget_consolidation.md — 설계 문서 (취합 대시보드 PRD)
- public/js/bo_approval.js — BO 결재 로직 (이미 	eam_approved 조회 코드 존재)
- public/js/bo_budget_demand.js — BO 예산 수요 대시보드 (관련 화면)

**시작 전 확인 사항**:
1. o_budget_consolidation.md PRD 내용 먼저 읽기
2. o_approval.js에서 	eam_approved 상태 문서가 현재 어떻게 표시되는지 확인
3. 별도 메뉴 탭으로 구현할지, 기존 'bo_approval' 취합현황 탭을 개선할지 결정

### ⚠️ 결정이 필요한 미결 사항 (DEC 목록)

| # | 질문 | 현재 구현 방향 | 결정 필요 |
|---|------|--------------|---------|
| DEC-01 | plan_type='business'도 자동복사 대상? | ✅ 포함 (현재 구현) | 공식 확정 필요 |
| DEC-02 | 재승인 시 기존 복사본 처리 | 기존 유지(스킵) | 옵션 A/B 확정 |
| DEC-05 | team_approved 번들 팀장 결재함 노출 여부 | 현재 노출 중 | 숨길지 여부 |
| DEC-06 | 결재선 account_code 기반 라우팅 | training type 기반 유지 | 업그레이드 여부 |

