# 도메인: 제도 정책 위저드 (Policy Wizard Domain)

## 1. 개요
백오피스 내 "제도 설정" 메뉴는 복잡한 교육/예산 규칙들을 하나의 정책 덩어리(`service_policies` 행 하나)로 매듭짓기 위한 **5단계(5-Step) 마법사 형태의 UI** 기반으로 설계되어 있습니다. 과거 7~8단계였던 스텝을 데이터 연관성에 따라 압축하여 업무 효율을 높였습니다.

## 2. 5단계 마법사 비즈니스 흐름 (Business Flow)

### Step 1: 기본 정보 정의 (Policy Definition)
*   제도의 대상과 큰 목적, 교육유형 필터, 기본 명칭 등을 규정합니다.
*   "격리그룹(Isolation Group)" 및 "제도 분류 목적(Purpose)" 등은 뒤의 단계(특히 양식 선택)에서 참조되는 **조회 필터의 Root Key**로 사용됩니다.

### Step 2: 범위 설정 (Scope & Targets)
*   **어떤 회계단위/조직(VOrg)** 범위에 적용할지 결정합니다.
*   예산 항목(Account)을 복수로 연결할 수 있으며, 이 정책과 연계할 가상교육조직(`virtual_org_templates` ID)를 결합하여 "A본부는 R&D 예산만 쓴다"를 확정합니다.

### Step 3: 수료 및 운영 패턴 (Pattern)
*   사내/사외/온라인/집합교육 등 실행 채널의 형태.
*   수료 조건, 영수증 증빙 필수(필수 첨부) 형태 등을 결합합니다.

### Step 4: 양식 설정 (Form Association)
*   이 제도를 통해 교육을 신청할 때 사용할 서식(`form_templates`)을 지정합니다.
*   **중요 필터 제약 규칙:**
    *   현재 테넌트(`tenant_id`)와 1단계에서 지정한 `isolation_group_id`에 할당된 템플릿만 노출됩니다.
    *   2단계에서 설정된 예산 계정(`account_code`)과 매핑된 폼 샌드박스 내부에서만 조회되도록 강한 제한이 걸려있습니다.

### Step 5: 결재선 구성 (Approval Configuration)
*   조직도 기준(FO 상신자의 팀장→실장→결재담당자)의 결재 트리를 확정합니다.
*   제출 시 상태를 Draft 처리하고, 최종적으로 승인되었을 때 정책이 Active 됩니다.

---

## 3. UI 및 상태 관리
- 프론트엔드의 `bo_policy_builder.js` 에서 메모리상 전역 `_pwContext` 객체에 데이터를 중첩하여 모으고, 최종 저장 시 Supabase DB 규격에 맞게 매핑하여 Insert 합니다.
