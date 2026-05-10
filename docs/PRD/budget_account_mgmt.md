# 예산계정 관리 도메인 요구사항 정의서 (PRD)

> **도메인**: 예산계정 관리 (Budget Account Mgmt)
> **관련 파일**: `bo_budget_account.js`, `bo_budget_account_mgmt.js`, `bo_budget_org_mgmt.js`
> **최초 작성**: 2026-05-10
> **최종 갱신**: 2026-05-10
> **상태**: ✅ 완전 구현 (데이터 동기화 및 결재라인 연동 포함)

## 1. 기능 개요
제도그룹(VOrg)별로 운영되는 예산계정을 생성하고 관리하는 핵심 백오피스 기능입니다. 예산의 사용 여부, SAP 연동 여부, 통장 생성 정책(팀별/개인별/공동), 그리고 결재라인(수요예측 등)을 계정 단위로 통합 설정하여 프론트오피스(FO)의 동작을 중앙에서 제어합니다.

## 2. 사용자 스토리
> "플랫폼 관리자는 예산계정 관리 화면에서 신규 예산계정을 생성하고, 해당 계정이 특정 제도그룹에서 개인별 분리 통장으로 동작하도록 기본 한도를 설정할 수 있다."
> "테넌트 담당자는 자신이 권한을 가진 제도그룹에 한하여 예산계정의 결재라인(자체결재/통합결재) 및 승인 구간을 수정할 수 있다."

## 3. DB 테이블 구조
| 테이블명 | 주요 컬럼 | 타입 | 설명 |
|---|---|---|---|
| `budget_accounts` | `id`, `code`, `name`, `uses_budget`, `integration_mode`, `sap_code`, `approval_config` | Table | 예산계정의 기본 마스터 데이터 및 자체/통합 결재 설정 보관 |
| `budget_account_org_policy` | `budget_account_id`, `vorg_template_id`, `bankbook_mode`, `bankbook_level`, `individual_limit` | Table | 특정 제도그룹(VOrg)과 계정의 교차 정책. 통장 분리 모드(팀/개인/일괄) 및 한도 |
| `forecast_approval_lines` | `tenant_id`, `account_code`, `approval_type`, `thresholds`, `review_mode` | Table | 수요예측 전용 결재라인 설정 동기화 저장소 |
| `virtual_org_templates` | `id`, `name`, `tenant_id`, `purpose` | Table | 계정이 소속될 제도그룹 목록 (edu_support 필터링) |

## 4. 화면별 기능 요구사항
- **예산계정 목록 뷰 (List View)** ✅
  - 제도그룹 선택 시 해당 그룹에 매핑된 계정 목록 렌더링
  - 계정코드, 계정명, 통장 생성 방식(예산 방식), 결재 방식 표기
- **예산계정 상세/편집 뷰 (Detail View)** ✅
  - **기본정보 탭**: 계정명, 용도 설명, 예산 사용 여부, 연동 방식(SAP/자체)
  - **통장 생성 정책**: 팀별 통장 / 상위 조직 공유 통장 / 개인별 분리 통장(기본 한도 입력)
  - **결재라인 탭 (수요예측)**: 구간별 결재자 지정, 총괄/운영담당자 검토 모드 설정
- **안전한 데이터 갱신 (Upsert 방어 로직)** ✅
  - `budget_account_org_policy` 저장 시 `onConflict` 대신 `select` 후 `insert`/`update`로 분기하여 400 Bad Request 에러 방지

## 5. 핵심 비즈니스 로직
- **통장 분리 모드(bankbook_mode)**: 
  - `individual`: 개인별 통장 (individual_limit 렌더링)
  - `team` (isolated): 하위 팀별 개별 통장
  - `bulk` (shared): 최상위 조직 단위 공유 통장
- **결재라인 동기화 (Approval Hook)**:
  - 계정 저장 시 `approval_config.forecast` 객체가 존재할 경우, 즉시 `forecast_approval_lines` 테이블에 `upsert`하여 결재 엔진과 동기화.
- **다중 탭 렌더링**: '기본정보', '서비스 정책', '결재라인' 탭을 전환하며 `_bamDetailData` 메모리 객체에 양방향 바인딩(oninput).

## 6. 접근 권한
| 역할 (Role) | 접근 수준 | 필터링 기준 |
|---|---|---|
| `platform_admin` | 전체 권한 | 모든 테넌트 선택 가능, 모든 제도그룹 열람 및 수정 가능 |
| `tenant_global_admin` | 테넌트 한정 | 소속 테넌트 고정, 테넌트 내 모든 제도그룹 열람 및 수정 가능 |
| `기타 담당자` | 제한적 | 자신이 소유자(owner)이거나 총괄책임자인 제도그룹만 필터링되어 열람 가능 |

## 7. 예외 처리 및 엣지 케이스
- **저장 충돌 방어**: `budget_account_org_policy` 갱신 시 복합키 명시 오류로 인한 저장이 실패하지 않도록 기존 ID를 선 조회 후 덮어쓰기 처리함.
- **제도그룹 미선택 방어**: 제도그룹이 선택되지 않은 상태에서는 UI에서 '계정 신규 등록' 및 저장을 물리적으로 차단함.
- **결재라인 동기화 실패 무시**: `forecast_approval_lines` 저장이 실패하더라도 메인 계정 저장은 정상적으로 Commit되도록 `try-catch` 분리.

## 8. [기획자 검토 필요 항목]
- 🟡 `service_type`, `purpose_types` 등의 필드가 `budget_accounts` 테이블에 존재하나, 현재 FO 허브 구조 변경으로 인해 사용 빈도가 낮아짐. 필드 정리가 필요한지 검토 요망.

## 9. 변경 이력
| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-05-10 | 역설계 기반 PRD 최초 작성 (Hub 통합 및 안전 저장 로직 반영) | AI (PRD Engineer) |
