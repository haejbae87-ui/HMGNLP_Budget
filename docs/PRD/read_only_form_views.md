# 읽기 전용 폼 뷰 (작성확인 및 BO 상세조회) 요구사항 정의서 (PRD)

> **도메인**: 폼 렌더링 / 읽기 전용 뷰
> **관련 파일**: `fo_plans_actions.js`, `fo_apply_actions.js`, `bo_plan_detail_renderer.js`
> **최초 작성**: 2026-04-26
> **최종 갱신**: 2026-04-26
> **상태**: 🟡 구현 갭 있음 (플랫 테이블에서 7단계 카테고리로 전환 필요)

## 1. 기능 개요
프론트오피스(FO)에서 교육계획/신청서를 최종 제출하기 전에 보여주는 '작성 확인' 모달 화면과, 백오피스(BO)에서 결재자 및 관리자가 문서를 열람하는 '상세 조회' 화면의 렌더링 아키텍처입니다.

## 2. 사용자 스토리
> "FO 사용자는 제출 전 자신이 입력한 모든 데이터를 Phase B 입력폼과 동일한 카테고리 구조로 확인하여 제출 실수를 줄일 수 있다."
> "BO 관리자는 결재 대기 중인 교육계획 상세 정보를 볼 때, FO와 동일한 7단계 카테고리 뷰로 일관성 있게 데이터를 열람할 수 있다."

## 3. DB 테이블 및 데이터 구조
*   **plans / applications 테이블**: `status`, `amount`, `edu_name`, `edu_type`, 정규화된 필드들(`is_overseas`, `venue_type`, `planned_rounds`, `planned_days` 등)
*   **detail (JSON)**: `extra_fields`, `calcGrounds` 등

## 4. 화면별 기능 요구사항
| 화면 | 기능 설명 | 현행 상태 | 목표 상태 |
|---|---|---|---|
| **FO 제출 전 확인** | 모달 내에서 입력 데이터 요약 표시 | ❌ 하드코딩된 Flat Table (`fo_plans_actions.js`, `fo_apply_actions.js`) | ✅ Phase B 7단계 Read-Only 렌더러 도입 |
| **BO 계획 상세** | `bo_plan_mgmt.js` 에서 선택 시 우측 슬라이드 뷰 표시 | ❌ `bo_plan_detail_renderer.js` 의 Flat Table | ✅ Phase B 7단계 Read-Only 렌더러 도입 |

## 5. 핵심 비즈니스 로직
*   **정규화 데이터 우선 읽기**: 기존 `plan.detail` JSON 의존도를 낮추고 테이블의 독립적인 정규화 컬럼(`is_overseas` 등)을 우선 렌더링.
*   **커스텀 필드 매핑**: `fo_form_loader.js` 에 도입된 어댑터를 활용하여, "기타 정보"로 분류된 항목들을 상세 뷰에서도 동일하게 표시해야 함.

## 6. 접근 권한
*   FO: 본인이 작성한 문서만 확인 모달 진입 가능
*   BO: `global_admin`, `op_manager` 및 해당 문서를 제출한 팀의 상위 조직장 접근 가능

## 7. [기획자 검토 필요 항목]
*   **UI 재사용성**: FO와 BO 양쪽에서 모두 사용할 수 있는 `renderStandardReadOnlyForm(planState)` 공통 헬퍼 함수를 `fo_form_loader.js` 또는 `bo_plan_detail_renderer.js` 에 분리해야 함.
*   BO 상세 뷰에는 기존의 결재 프로세스(승인/반려 버튼)와 산출근거 요약 테이블이 포함되므로, 7단계 뷰 하단에 결재 상태 바를 이질감 없이 붙일 방법을 고민해야 함.

## 8. 변경 이력
| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-26 | 리버스 엔지니어링을 통한 최초 PRD 작성 | PRD Engineer (AI) |
