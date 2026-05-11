# 운영계획 관리 요구사항 정의서 (PRD)

> **도메인**: 운영계획 관리
> **관련 파일**: `public/js/bo_operation_plan.js`, `public/js/bo_filter_utils.js`
> **최초 작성**: 2026-05-11
> **최종 갱신**: 2026-05-11
> **상태**: 🟡 구현 갭 있음 (조회 필터 UI 연동 필요)

## 1. 기능 개요
운영계획 관리는 사업계획(Forecast) 단계에서 총괄담당자의 승인을 받아 실제 집행(Operation) 단계로 넘어온 예산 계획과 상시 입력된 운영계획을 조회하고 집행률을 추적하는 기능이다. 조직단위(HQ)별 요약 현황과 상세 계획 목록을 제공한다.

## 2. 사용자 스토리
> "예산 운영담당자 및 총괄담당자는 운영계획 관리 화면에서 자신이 관할하는 교육조직(VOrg/HQ/Team)별로 확정된 배정 예산과 실제 집행액, 그리고 계획 목록을 조회할 수 있다."

## 3. DB 테이블 구조
| 테이블명 | 컬럼 | 타입 | 설명 |
|---|---|---|---|
| `plans` | `id` | uuid | 운영계획 고유 ID |
| `plans` | `plan_type` | string | 'operation', 'ongoing' 등 계획 유형 |
| `plans` | `source_forecast_plan_id` | uuid | 사업계획에서 복사된 경우 원본 사업계획 ID |
| `plans` | `allocated_amount` | number | 확정/배정 예산 |
| `plans` | `actual_amount` | number | 실제 집행액 |
| `budget_accounts` | `code`, `virtual_org_template_id` | string | 예산계정 및 제도그룹 매핑 |
| `virtual_org_templates` | `tree_data` | json | VOrg 계층 구조 (HQ, Team) |

## 4. 화면별 기능 요구사항
- **Level 1 (조직단위별 요약)**: 🟡
  - 전체 운영계획 수, 사업계획 복사 수, 상시 입력 수, 전체 집행률 대시보드 표시 (✅)
  - 관할 교육조직(HQ) 목록 및 하위 팀수, 승인 건수, 배정 예산, 집행액 표시 (✅)
  - 조회 필터(데이터 범위, 테넌트, VOrg, 계정, 연도) 적용 (❌ 미구현 - 빈 컨테이너만 존재)
- **Level 2 (조직단위 상세 및 목록 통합)**: 🟡
  - 선택한 교육조직(HQ)의 하위 팀별 요약 리스트 (✅)
  - 개별 팀 클릭 시(팀 필터) 해당 팀의 운영계획 목록만 필터링 (✅)
  - 운영계획별 상세 상태 배지 표시 (✅)
  - 컬럼 구성: 사업계획 유무(Y/N), 최초배정액, 운영계획금액, 집행액(품의확정금액), 품의가용예산 (✅)
  - 상단 통합 조회 필터 적용 (❌ 미구현)

## 5. 핵심 비즈니스 로직
- **운영계획 대상 추출 조건**:
  - `status !== "draft"` (작성 중 제외)
  - `fiscal_year === 선택된 연도`
  - `plan_type === "operation" || plan_type === "ongoing"` 이거나 `source_forecast_plan_id` 값이 존재하는(사업계획에서 복사된) 계획
- **계정 필터링**: 선택된 VOrg(`virtual_org_template_id`)에 매핑된 예산계정(`account_code`)에 속한 계획만 조회
- **집행률 산식**: `Math.round((실제 집행액 / 확정 배정예산) * 100)`

## 6. 접근 권한
- `platform_admin`, `tenant_global_admin`, `budget_global_admin`: 모든 테넌트/전사 조회 가능.
- `budget_op_manager`: `boGetMyGroups` 헬퍼 함수를 통해 자신의 관할(스코프)에 포함된 교육조직(HQ)의 데이터만 조회되도록 자동 격리됨.

## 7. 예외 처리 및 엣지 케이스
- `source_forecast_plan_id`가 1차 컬럼에 없고 `detail` JSON 내부에 존재하는 구버전 데이터를 고려하여 데이터 파싱 시 보정(`p.detail?.source_forecast_plan_id`) 수행.
- 확정 배정예산(`allocated_amount` 또는 `amount`)이 0원일 경우 집행률 계산 시 `0 / 0 = NaN`을 방지하기 위해 분모가 0보다 클 때만 계산.

## 8. [기획자 검토 필요 항목]
- **필터 UI 연동 누락**: `bo_filter_utils.js`의 `renderAdvancedEduFilterBar` 함수를 호출하여 필터 UI를 렌더링하고, 변경 이벤트를 통해 `renderBoOperationPlan()`을 재실행하도록 연결해야 함.

## 9. 변경 이력
| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-05-11 | 역추적을 통한 최초 작성 | AI PRD Engineer |
