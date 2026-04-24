# 복수 교육계획 통합 신청 (N:1 연동) 구현 계획

사용자님의 요청에 따라, **[교육계획 N:1 교육신청 (복수 계획 연동 신청)]** 기능에 대한 도메인 전문가 위원회의 검증 결과를 반영한 최종 구현 계획서입니다. 

---

## 🏛️ Domain Council (도메인 전문가 교차 검증) 요약

### 🚨 기존 PRD와의 핵심 상충(Conflict) 및 분석

사용자님의 추가 요구사항을 분석한 결과, **기존 v1.4 PRD 설계와 정면으로 상충되는 핵심 개념**을 발견했습니다.

1. **차수(Round/Session) 개념의 주체 불일치**
   - **기존 설계**: 교육계획(Plan)을 수립할 때부터 "몇 차수 할 거냐"를 정하고, 신청 시에는 **계획의 차수**를 선택한다고 보았습니다. 그래서 '개인직무'나 '워크숍' 등 모든 유형에 차수 선택 UI가 있었습니다.
   - **사용자 요구사항**: 차수는 철저히 **백오피스(LMS)에 개설된 교육과정의 차수(Session)**를 의미합니다.
   - **조치**: "차수"라는 개념을 계획에서 분리하여 LMS 연동 전용으로 격상시킵니다. LMS 연동이 없는 개인직무/워크숍은 차수 선택 없이 '산출근거'만 입력하도록 폼을 대대적으로 분리합니다.

2. **차수 중복 방지(Disable)의 기준**
   - **기존 설계**: 동일 신청서 내에서 같은 계획 차수를 중복 선택하는 것을 막았습니다.
   - **사용자 요구사항**: **이미 예산 집행이 상신된 LMS 차수**라면, 다른 교육신청서에서도 중복해서 사용할 수 없도록 전역적으로 Disable 처리해야 합니다 (예산 이중 집행 방지).

3. **1 Line Item = N LMS Sessions (과정 단위 통합 매핑)**
   - **사용자 피드백 수용**: "차수별로 세부산출근거를 쪼개지 말고, 한 과정에 대해 여러 차수를 선택한 뒤 통합된 산출근거를 작성하는 것이 편리하다"는 의견을 반영했습니다.
   - **조치**: 1개의 Line Item(과정 항목) 안에서 **복수의 LMS 차수(Session)**를 다중 선택(체크박스)할 수 있도록 구조를 확정합니다. DB 구조는 `linked_sessions JSONB` 배열을 사용하며, 예산 사용 추적은 "이 과정 전체에 얼마를 썼다"는 과정 단위로 이루어집니다.

---

## User Review Required

> [!IMPORTANT]
> **예산 사용 추적의 기준 (과정 단위 통합 및 계획 대비 추적)**
> 다중 차수를 선택하고 과정 단위로 통합 산출근거를 적게 되면, 차수별 세부 비용 추적은 불가능하지만 **"이 과정 운영에 비용이 얼마 들었다"**는 파악할 수 있습니다. 
> 
> **특히, 사용자님께서 짚어주신 핵심 기대효과가 완벽히 지원됩니다:**
> - 계획 시 작성한 산출근거(Planned)와 신청 시 작성한 산출근거(Applied)가 DB상 분리되어 저장됩니다 (`application_plan_items` 테이블).
> - 한 교육계획을 여러 번 나누어 신청(여러 차수로 분할 신청)하더라도, 각 신청서의 Line Item(과정)들이 동일한 `plan_id`를 바라보므로, **나중에 해당 `plan_id`로 신청된 모든 세부산출근거와 총액을 합산하여 원본 계획 예산과 완벽히 비교/추적**할 수 있습니다.

> [!WARNING]
> **LMS 차수 Disable 시점**
> "이미 다른 교육신청에서 사용한 차수"의 기준을 `결재진행중` 및 `승인완료` 상태인 신청서로 정의하겠습니다. (반려되거나 작성 중인 경우는 선택 가능)

> [!NOTE]
> **반려/임시저장 시 이어쓰기 (Draft) 재편집 정책 확정**
> 결재가 반려되거나 임시저장(작성 중)인 신청서를 이어쓰기 할 경우, **특정 교육계획, 특정 교육과정(Line Item), 특정 교육과정의 차수까지 모두 자유롭게 추가/수정/삭제**가 가능합니다. 문제가 된 부분만 유연하게 수정하여 바로 다시 상신할 수 있도록 지원합니다.

---

## Proposed Changes

### 1. Database Schema
#### [NEW] `application_plan_items` 테이블 신설
- 신청서(Header)에 속하는 개별 과정(Line Item) 관리.
- **필드**: `application_id`, `plan_id`, `budget_usage_type`, `settlement_method`, `calc_grounds_snapshot`, `subtotal`
- **추가**: `result_status` (개별 수료/결과 상태 트리)
- **[LMS 매핑용 신설]**: `channel_id`, `course_id`, `linked_sessions` (JSONB: 다중 차수 정보 배열)
  - 집합/이러닝이 아닐 경우(개인직무, 워크숍 등)는 NULL 저장.
- **[삭제됨]**: `selected_rounds` (계획의 차수 개념 삭제에 따라 제거)

### 2. UI Simplification for Budget Inputs (Back Office Policy Builder)
- In `bo_policy_builder.js`, move the "Company", "Institutional Group" (Virtual Org), and "Budget Account" selections to the very top of Step 0.
- Simplify the Institutional Group and Budget Account selectors into basic dropdown menus, mirroring the Company selector.

### 3. Process-Level Calc Grounds & Budget Tracking
- Budget breakdown (`calc_grounds`) is managed at the **Course (Line Item)** level (`application_plan_items` table), not the round (session) level.
- When users select multiple rounds, they write a single `calc_grounds` table representing the total budget for the course in that specific application.
- **Aggregation Tracking**: Since each `application_plan_items` row contains `plan_id`, the system can aggregate all applied budgets across multiple applications/rounds and compare them against the original `edu_plans` budget.

### 4. Re-edit Policy for Drafts & Rejections
- The application allows full flexibility when in "Draft" or "Saved" (rejected) status.
- Users can freely add or delete specific **Education Plans**, add or delete **Courses (Line Items)**, and add or delete **Rounds (Sessions)** without constraint, up until the point of final submission.

### 5. Front Office (`apply.js`)
#### [MODIFY] 폼 구조 (Header + Line Items) 분기 처리 (핵심)
- 교육유형이 **[집합/이러닝]** 인 경우:
  - 접속자의 채널 담당자 권한(`_ch_mgr_`)을 조회하여 운영 중인 **LMS 과정-차수 피커(Picker)** 필수 노출.
  - 선택된 차수가 기 결재진행/승인 건이면 **Disable** 처리.
  - 해당 차수 운영에 필요한 **세부산출근거** 재입력 폼 노출.
- 교육유형이 **[워크숍/개인직무/기타 등]** 인 경우:
  - LMS 과정-차수 선택 UI 아예 없음.
  - **세부산출근거** 재입력 폼만 단독 노출 ("이번에 이 계획으로 얼마 쓸 것인지").

### 3. Back Office (`bo_approval.js` 등)
#### [MODIFY] 결재 문서 뷰
- 결재 문서 로딩 시 `application_plan_items` 데이터를 함께 조인하여 불러옴.
- 신청 합계 금액 아래에 묶여 있는 각 교육과정(Line Item) 리스트 및 소계를 반복 렌더링.

---

## Verification Plan

### Automated/Manual Tests
- **제약 조건 검증**: 서로 다른 목적이나 예산 계정의 계획을 묶으려 시도할 때 정확히 차단되는지 브라우저에서 테스트.
- **이어쓰기 검증**: 결재 반려 후 이어쓰기 시 과정 삭제/추가가 자유롭게 가능하며, 금액 소계가 자동 재계산되는지 확인.
- **결재문서 검증**: 결재 상신 후, 관리자(BO) 및 결재권자 화면에서 묶음 내역 전체가 정확히 렌더링되는지 확인.

---

구현 계획이 괜찮으시다면 승인 부탁드립니다. 승인 직후 바로 코딩 작업에 착수하겠습니다!
