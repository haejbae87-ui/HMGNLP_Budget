# 데이터베이스 스키마 맵 (Database Schema Map)

본 문서는 교육 예산 시스템의 핵심 엔티티와 이들 간의 관계를 도메인(Layer)별로 정리합니다. 모든 테이블 컬럼에는 본질적으로 예외 없는 다중 테넌트 관리용 `tenant_id` 가 존재합니다.

## L3/L4: 기본 정보 및 접근 통제 (Users & Roles)

*   **`users`**: 시스템 엔드유저 풀 (직원 전체). FO 로그인 기반.
    *   핵심: `id`, `emp_no`, `name`, `org_id`, `job_type`(일반/생산 등)
*   **`roles`**: 권한 트리 정의 (플랫폼 관리자 → 테넌트 총괄 → 예산 운영담당 등).
    *   핵심: `code`, `parent_role_id`, `role_level_type` (head / ops).
*   **`user_roles`**: 사용자와 역할(권한)의 맵핑 (다대다). VOrg 등 외부 조작의 역방향 연동(Reverse Sync) 대상.
    *   핵심: `user_id`, `role_code`, `scope_id`(적용 범위 제한), **`start_date`**, **`end_date`**(권한 기한 관리).

## L5: 예산/가상 조직 설정 (Budget & VOrg Setup)

*   **`virtual_org_templates`**: 제도 운영을 위한 커스텀 가상 트리 구조(본부/센터 단위).
    *   핵심: `tenant_id`, `isolation_group_id`, `tree` (jsonb 기반 계층화 및 담당자 매핑 정보 보관).
*   **`budget_accounts`**: 계정 과목 (일반교육, R&D예산, 어학예산 등).
    *   핵심: `code`, `virtual_org_template_id`(해당 계정이 작동하는 VOrg 참조).
*   **`budget_account_org_policy`**: 예산 금고(통장) 배분 방식(고정/하이브리드 등) 설정.
*   **`org_budget_bankbooks`**: 실제 사용자/부서가 소모하는 통장 인스턴스 (잔여 금액 기록).

## L6: 서비스 구성 (Service Config Layer)

*   **`form_templates`**: 신청서/결과보고서 양식 폼 렌더링 데이터 (`fields` jsonb 등).
    *   격리 데이터: `isolation_group_id` 와 `account_code` 가 일치해야만 특정 정책(Policy)과 결합 가능.
*   **`service_policies`**: 가장 중요한 **'제도(Policy)' 단위 허브** 데이터. 정책 위저드에서 생산.
    *   관계: 위 L5와 L6의 모든 요소를 묶음. 
    *   핵심 속성: `vorg_template_id`(대상범위), `account_codes`(재원), `approval_config`(결재선), `form_id`(폼 연결 등).

## L7: 실행 데이터 (Transaction Layer)

*   **`plans`**: 학습자가 FO에서 정책을 베이스로 수립한 연간/개별 교육 계획.
*   **`applications`**: 구체적인 단위 학습 실행 신청서 (결재 진행용).
*   **`budget_ledger`**: 예산 변동 로그 기록표 (입금/예약/결제차감 등 장부 기록).
