# 시스템 아키텍처 및 코어 구조 (Architecture Overview)

## 1. 개요 (Overview)
본 시스템은 다중 테넌트(Multi-Tenant) 환경에서 HMG 브랜드(HMC, KIA, HAE 등)별로 특화된 예산 및 교육 정책을 관리하는 사내 교육 예산 플랫폼입니다.
엔드 유저(학습자)를 위한 프론트오피스(FO)와 관리자(총괄/운영담당자)를 위한 백오피스(BO)로 철저히 역할과 권한이 분리되어 운영됩니다.

## 2. 주요 아키텍처 원칙 (Core Architecture Principles)

### 2.1 Multi-Tenant (다중 테넌트) 모델
시스템의 모든 자원(예산, 사용자, 역할, 조직도, 정책)은 **`tenant_id` 단위로 엄격하게 분리**됩니다.
- 한 테넌트의 데이터는 다른 테넌트에서 결코 접근할 수 없습니다. (예: HMC 데이터는 KIA에서 조회 불가)
- 시스템 플랫폼 관리자는 화면에서 테넌트 조회를 스위칭할 수 있습니다.

### 2.2 Data Isolation (데이터 격리 규칙)
테넌트 내에서도 사업부, 공장 권역별로 예산과 양식이 분리될 필요가 있습니다.
- **`isolation_group_id`**: 부문/본부 등 독립된 예산 풀을 사용하는 대규모 조직 집단을 구분.
- **`account_code`**: R&D, 일반, 자격증, 필수교육 등 재원이 분리되는 예산 항목 코드 단위 격리.

### 2.3 프론트-백 아키텍처 (FO / BO Separation)
*   **FO (Front Office):** 일반 직원(학습자) 대상.
    *   학습자가 자신에게 배정된 서비스 정책(제도)을 열람하고 양식에 맞춰 교육/지원을 신청하는 포털.
    *   조직 트리 기반의 부서장 결재 및 잔여 예산(`org_budget_bankbooks`) 체크 기능 수행.
*   **BO (Back Office):** 교육/예산 담당자 전용 시스템.
    *   마스터 데이터 기획: 플랫폼 관리자, 테넌트 어드민, 제도 운영자가 시스템 전반의 뼈대(통장, 템플릿, 결재선)를 구축.
    *   Service Policy Wizard를 통해 맞춤형 정책을 설정하고, FO에 배포.

## 3. 기술 스택 (Tech Stack)
*   **Frontend**: Vanilla JavaScript (의존성 없는 순수 JS 베이스, 컴포넌트형 렌더링 함수 기반).
*   **Backend & DB**: Supabase (PostgreSQL).
    *   모든 보안 설정은 Row Level Security (RLS)에 의해 1차적으로 강제됩니다.
    *   프론트엔드에서 `supabase-js` 클라이언트를 통해 직접 CRUD를 제어하는 서버리스(Serverless) 구조를 차용.
