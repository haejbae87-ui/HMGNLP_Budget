# 서비스 정책 → FO 화면 노출 통합 PRD

> **도메인**: 서비스 정책 (Service Policy) → FO 위저드 노출
> **관련 파일**: `utils.js`, `fo_persona_loader.js`, `fo_form_loader.js`, `plans.js`, `apply.js`
> **최초 작성**: 2026-04-08
> **최종 갱신**: 2026-04-14 (2차)
> **상태**: ✅ 핵심 구현 완료 (edu_type 영문 표준화, 변환 레이어 제거, 폴백 안전장치)

---

## 1. 문서 목적

이 PRD는 **BO 서비스 정책(service_policies) → FO 위저드 화면 노출**까지의 전체 데이터 흐름 규칙을 정의한다.
단순히 "교육유형 필터링"만이 아니라, 다음 3가지를 모두 포괄한다:

| 영역 | 설명 | 관련 스텝 |
|------|------|----------|
| **1. 교육유형 필터링** | 사용자에게 허용된 교육유형만 노출 | Step3 |
| **2. 양식(Form) 매칭** | 정책+교육유형에 맞는 양식 자동 선택 | Step4 |
| **3. 결재라인 구성** | 정책 패턴에 따른 승인 프로세스 자동 구성 | Step4 → 제출 후 (향후) |

---

## 2. 핵심 원칙

> ⚠️ 아래 원칙은 Mock 데이터 개발 시 혼입된 잘못된 조건을 제거하기 위한 것.

| 원칙 | 내용 | 현재 구현 |
|------|------|----------|
| **역할 무관** | 학습자/교육담당자 여부로 교육유형을 제한하지 않는다 | ✅ 제거 완료 |
| **직종 무관** | 일반직/연구직 여부로 교육유형을 제한하지 않는다 | ✅ 제거 완료 |
| **VOrg 정책 우선** | 사용자 조직→VOrg→서비스 정책이 primary key | ✅ 구현 |
| **통장 비의존** | 통장이 없는 VOrg도 정책 매칭 가능 | ✅ tree_data 기반 구현 |
| **코드 일관성** | 동일 데이터는 **단일 코드 체계**로 관리 (영문/한글 혼용 금지) | ✅ 2026-04-14 표준화 완료 |

---

## 3. 데이터 파이프라인 (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BO 설정 (관리자)                              │
│  service_policies                  form_templates                   │
│  ├ purpose (영문코드)              ├ edu_type (영문코드 ✅ 표준화)    │
│  ├ edu_types[] (영문코드)          ├ type (plan/apply/result)       │
│  ├ account_codes[]                 ├ virtual_org_template_id        │
│  ├ vorg_template_id                ├ account_code                   │
│  ├ stage_form_ids {}               └ fields[]                      │
│  ├ process_pattern (A~E)                                            │
│  └ target_type (learner/operator) ← UI 스타일 결정용                │
└────────────────────┬────────────────────────────┬───────────────────┘
                     │                            │
                     ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FO 위저드 (학습자)                            │
│                                                                     │
│  Step1: 목적 선택 ← getPersonaPurposes()                            │
│    └ purpose 코드 매핑: _BO_TO_FO_PURPOSE / _FO_TO_BO_PURPOSE       │
│                                                                     │
│  Step2: 예산 선택 ← getPersonaBudgets()                             │
│    └ accountCodes 필터 + ACCOUNT_TYPE_MAP 변환                      │
│                                                                     │
│  Step3: 교육유형 ← getPolicyEduTree()                               │
│    └ edu_types (영문코드) → EDU_TYPE_LABELS (한글라벨) 변환         │
│    └ EDU_TYPE_SUBTYPES (상위→세부 트리 확장)                        │
│                                                                     │
│  Step4: 양식 로드 ← getFoFormTemplate()                             │
│    └ eduType 영문코드 직접 전달 (변환 불필요 ✅)                     │
│    └ stage_form_ids 1순위 → context 매칭 2순위 (복수 시 null ✅)     │
│                                                                     │
│  제출 후: (향후) 결재라인 자동 구성                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 코드 일관성 매트릭스 (✅ 해결 완료)

> ✅ **2026-04-14 해결**: DB 마이그레이션(`b3af506`)으로 `form_templates.edu_type`을 영문 코드로 표준화. 변환 레이어 완전 제거.

| 위치 | 필드 | 저장 형식 | 예시 | 상태 |
|------|------|----------|------|------|
| `service_policies.edu_types` | 영문 코드 | `elearning`, `seminar`, `class` | ✅ |
| `form_templates.edu_type` | **영문 코드** | `elearning`, `seminar`, `class` | ✅ 표준화 완료 |
| `service_policies.selected_edu_item` | 영문 코드 | `{ typeId: "regular", subId: "elearning" }` | ✅ |
| FO `planState.eduType` | 영문 코드 | `elearning`, `seminar` | ✅ |
| FO `EDU_TYPE_LABELS[key]` | 한글 라벨 | `이러닝`, `세미나` | ✅ UI 표시용 |

### 변환 지점 — 불필요 (제거 완료)

| 호출 위치 | 보내는 값 | 받는 쪽 기대값 | 변환 필요 | 상태 |
|-----------|----------|--------------|----------|------|
| `plans.js` → `getFoFormTemplate(policy, 'plan', eduType)` | `elearning` (영문) | `elearning` (영문) | ❌ 불필요 | ✅ 직접 전달 |
| `apply.js` → `getFoFormTemplate(policy, 'apply', eduType)` | `elearning` (영문) | `elearning` (영문) | ❌ 불필요 | ✅ 직접 전달 |
| `fo_form_loader.js` L95 `tpl.edu_type === eduType` | 영문 vs 영문 | - | ❌ 불필요 | ✅ 정상 |
| `fo_form_loader.js` L62 `.eq('edu_type', eduType)` | 영문 → DB 쿼리 | 영문 | ❌ 불필요 | ✅ 정상 |

> 💡 `EDU_TYPE_LABELS`는 UI 표시 전용으로만 사용. 데이터 매칭에는 관여하지 않음.

---

## 5. 정책 매칭 흐름 (VOrg 기반)

### 5.1 VOrg 멤버십 해석

```
사용자 소속 조직(org_id)
    │
    ├─① tree_data 검색 (통장 유무 무관)
    │   virtual_org_templates.tree_data JSONB에서 org_id 포함 여부 확인
    │   → fo_persona_loader.js _orgIdInTreeData()
    │
    ├─② bankbook template_id (하위 호환)
    │   org_budget_bankbooks.template_id에서 VOrg ID 수집
    │
    └─③ 병합 → persona.vorgIds[] (중복 제거)
```

### 5.2 정책 필터링

```
_getActivePolicies(persona)
    │
    ├─① tenant_id 일치  
    ├─② status = 'active'
    ├─③ vorg_template_id ∈ persona.vorgIds  ← primary key
    └─④ (vorgId 없으면) account_codes 퍼지 매칭 ← fallback
```

### 5.3 Step별 필터링

| Step | 함수 | 입력 | 출력 | 필터 기준 |
|------|------|------|------|----------|
| 1 | `getPersonaPurposes()` | persona | 목적 목록 | VOrg 매칭 정책의 purpose |
| 2 | `getPersonaBudgets()` | persona, purposeId | 예산 목록 | purpose → account_codes → budgets |
| 3 | `getPolicyEduTree()` | persona, purposeId, accountType | 교육유형 트리 | purpose + account → edu_types |
| 4 | `getFoFormTemplate()` | policy, stage, eduType | 양식 템플릿 | stage_form_ids → context 폴백 |

---

## 6. 양식(Form) 매칭 규칙

### 6.1 양식 매칭 우선순위

```
getFoFormTemplate(policy, stage, eduType)
    │
    ├─ 1순위: stage_form_ids[stage]에서 직접 ID로 로드
    │  ├─ 복수 양식 → edu_type 매칭 (영문 코드 비교 ✅)
    │  └─ 단일 양식 또는 매칭 실패 → 첫 번째 양식 사용
    │
    ├─ 2순위: _loadFormTemplateByContext(vorgId, accCode, stage, eduType)
    │  ├─ 2-a: vorg + account + stage + edu_type 정확 매칭 (DB 쿼리)
    │  └─ 2-b: vorg + account + stage (edu_type 없이)
    │       └─ ✅ 복수 양식 존재 시 null 반환 (랜덤 방지, P1-2)
    │
    └─ null: 양식 없음 → Fallback UI 렌더링
```

### 6.2 양식 매칭 엣지 케이스

| # | 시나리오 | 현재 동작 | 위험 | 상태 |
|---|---------|----------|------|------|
| F1 | `stage_form_ids.plan = []` (빈 배열) | 2순위 context 매칭으로 폴백 | ⚠️ 복수 양식 시 null 반환 | ✅ P1-2 수정 완료 |
| F2 | 정책 edu_type과 양식 edu_type 코드 불일치 | 영문 코드 직접 비교 | - | ✅ DB 표준화 완료 |
| F3 | 2순위에서 같은 vorg+account에 양식 2개 | 복수 양식 존재 시 null 반환 | - | ✅ P1-2 수정 완료 |
| F4 | R&D 양식: edu_type=`regular` 정확 매칭 | 영문 코드 직접 비교 | - | ✅ DB 표준화 완료 |
| F5 | 양식이 unpublished로 변경 | `_loadFormTemplate` null → 첫 양식 폴백 | ⚠️ | 미수정 (저위험) |
| F6 | VOrg 없는 양식 (`virtual_org_template_id = null`) | context 매칭 시 VOrg 필터 우회 | ⚠️ | 미수정 (저위험) |

### 6.3 현재 양식-정책 연결 현황 (2026-04-14)

**정책 → 양식 직접 연결 (`stage_form_ids`)**

| 정책 | purpose | 계정 | plan 양식 | apply 양식 | result 양식 |
|------|---------|------|----------|-----------|------------|
| 현대차-일반-운영-이러닝 | elearning_class | HMC-OPS | ✅ FM-이러닝 | ✅ FM-이러닝 | ✅ FM-이러닝 |
| 현대-일반-운영-세미나 | conf_seminar | HMC-OPS | ✅ FM-세미나 | ✅ FM-세미나 | ✅ FM-세미나 |
| 현대차-일반-참가-이러닝 | external_personal | HMC-PART | ❌ **빈 배열** | ✅ R&D양식 공유 | ❌ **빈 배열** |
| R&D 학습자 이러닝 | external_personal | HMC-RND | ✅ R&D-이러닝 | ✅ R&D-이러닝 | ✅ R&D-이러닝 |
| R&D 담당자 집합 | elearning_class | HMC-RND | ✅ R&D-집합 | ✅ R&D-집합 | ✅ R&D-집합 |
| 현대차_기타_연수원 | misc_ops | HMC-ETC | ✅ 기타-시설 | ✅ 기타-시설 | ✅ 기타-시설 |
| HMC-무예산-이러닝 | external_personal | HMC-1987 | ❌ **빈 배열** | ❌ **빈 배열** | ❌ **빈 배열** |

> ⚠️ **빈 배열 문제**: HMC-PART 계획/결과, HMC-1987 전체에 양식이 미연결 → context 폴백 발동 → 잘못된 양식 위험

---

## 7. Purpose 코드 매핑

### 7.1 BO → FO 매핑 테이블

| BO purpose (정책) | FO purpose (위저드) | 비고 |
|-------------------|--------------------|----|
| `elearning_class` | `internal_edu` | 이러닝/집합 교육운영 |
| `internal_edu` | `internal_edu` | 동일 |
| `conf_seminar` | `conf_seminar` | 세미나/컨퍼런스 |
| `workshop` | `conf_seminar` | 구버전 호환 |
| `external_personal` | `external_personal` | 개인직무 사외학습 |
| `external_group` | `external_personal` | 그룹→개인으로 합류 |
| `misc_ops` | `misc_ops` | 기타 운영 |
| `etc` | `misc_ops` | 구버전 호환 |

### 7.2 역매핑 (FO → BO)

```js
_FO_TO_BO_PURPOSE = {
  'internal_edu':      ['elearning_class', 'internal_edu'],
  'conf_seminar':      ['conf_seminar', 'workshop'],
  'external_personal': ['external_personal', 'external_group'],
  'misc_ops':          ['misc_ops', 'etc'],
}
```

> 역매핑은 **정책 검색 시** 사용: FO에서 `internal_edu`를 선택하면 BO의 `elearning_class`와 `internal_edu` 정책 **모두** 검색.

---

## 8. 교육유형 코드 체계

### 8.1 edu_type 영문 코드 → 한글 라벨

| 영문 코드 | 한글 라벨 | 비고 |
|-----------|----------|------|
| `elearning` | 이러닝 | 운영 단독 |
| `class` | 집합 | 운영 단독 |
| `live` | 라이브 | 운영 단독 |
| `seminar` | 세미나 | 운영 단독 |
| `regular` | 정규교육 | 직접학습 상위, subs: [elearning, class, live] |
| `academic` | 학술 및 연구활동 | 직접학습 상위 |
| `knowledge` | 지식자원 학습 | 직접학습 상위 |
| `competency` | 역량개발지원 | 직접학습 상위 |
| `facility` | 교육시설운영 | 기타운영용 |

### 8.2 세부유형 트리 (상위 코드 → 세부 코드)

| 상위 코드 | 세부 코드 | 라벨 |
|-----------|----------|------|
| `regular` | `elearning` | 이러닝 |
| `regular` | `class` | 집합 |
| `regular` | `live` | 라이브 |
| `academic` | `conf` | 학회/세미나/컨퍼런스 |
| `knowledge` | `book` | 도서 |
| `competency` | `lang` | 어학학습비 지원 |
| `competency` | `cert` | 자격증 취득지원 |

---

## 9. 엣지 케이스 분석

### 9.1 VOrg 매칭 엣지 케이스

| # | 시나리오 | 현재 동작 | 예상 결과 | 위험도 |
|---|---------|----------|----------|-------|
| V1 | 신규 팀이 아직 VOrg tree_data에 없음 | vorgIds=[] → 정책 매칭 0건 | 모든 교육유형 차단 | ⚠️ 중 |
| V2 | 사용자가 복수 VOrg에 소속 (일반+R&D) | 양쪽 VOrg 정책 모두 매칭 | 두 VOrg의 교육유형이 합산 표시 | ✅ 정상 |
| V3 | VOrg에 소속되지만 통장이 없음 (무예산 계정) | tree_data 기반으로 VOrg 매칭 | 반영함 | ✅ 정상 |
| V4 | tree_data JSON 구조에 `divisions` 중간 계층 | `_orgIdInTreeData`가 divisions 탐색 | 정상 처리 | ✅ |
| V5 | 겸직(두 팀 동시 소속) | org_id 하나만 저장 → 한 VOrg만 매칭 | 나머지 VOrg 정책 누락 | ⚠️ 중 |

### 9.2 정책 매칭 엣지 케이스

| # | 시나리오 | 현재 동작 | 위험도 |
|---|---------|----------|-------|
| P1 | 같은 VOrg+계정에 복수 정책 | `policies.find()` → 첫 번째 반환 | ⚠️ 순서 의존 |
| P2 | purpose 없이 정책 생성 | purpose 필터 스킵 | ⚠️ 전체 노출 |
| P3 | 정책 status 변경(active→inactive) | 페르소나 새로고침 시 반영 | ✅ |
| P4 | BO에서 새 purpose 코드 추가 | `_BO_TO_FO_PURPOSE`에 없으면 매핑 실패 | ❌ 고 |

### 9.3 양식 매칭 엣지 케이스

| # | 시나리오 | 현재 동작 | 위험도 |
|---|---------|----------|-------|
| F1 | 정책에 plan 양식 미지정 (빈 배열) | context 폴백 → 잘못된 양식 가능 | ❌ **고** |
| F2 | 양식 edu_type이 한글, 코드가 영문 | **변환 레이어로 대응** (수정 완료) | ✅ 해결 |
| F3 | 같은 VOrg+계정에 edu_type별 양식 2개 존재 | 2순위 `.limit(1)` → 첫 번째만 반환 | ⚠️ 중 |
| F4 | 양식이 삭제/비공개로 변경 | `_loadFormTemplate` null → 첫 양식 폴백 | ⚠️ |
| F5 | `field_definitions`에 해당 key 없음 | `_renderOneField` 빈 문자열 반환 | ⚠️ 필드 누락 |

---

## 10. 구체적 시나리오

### 시나리오 A: 역량혁신팀 최O영 — 이러닝 교육계획 (✅ 정상 플로우)

```
사용자: 최O영 (역량혁신팀, HMC, 일반직)
    │
    ├─ 페르소나 초기화
    │  orgId = "역량혁신팀UUID"
    │  → tree_data 검색: VOrg TPL_1774867919831(일반), TPL_1774870843727(R&D)
    │  → persona.vorgIds = [TPL_1774867919831, TPL_1774870843727]
    │
    ├─ Step1: 목적 선택
    │  _getActivePolicies → 4개 정책 매칭 (세미나, 이러닝, 참가, R&D 2개)
    │  getPersonaPurposes → [이러닝운영(internal_edu), 세미나(conf_seminar), 개인직무(external_personal)]
    │  → "이러닝/집합(비대면) 운영" 선택 (internal_edu)
    │
    ├─ Step2: 예산 선택
    │  _FO_TO_BO_PURPOSE['internal_edu'] = ['elearning_class', 'internal_edu']
    │  → 매칭 정책: 이러닝(HMC-OPS), R&D 집합(HMC-RND)
    │  → 예산 목록: [역량혁신팀 운영계정(HMC-OPS), 역량혁신팀 R&D계정(HMC-RND)]
    │  → "역량혁신팀 일반-운영계정(HMC-OPS)" 선택
    │
    ├─ Step3: 교육유형
    │  getPolicyEduTypes(persona, 'internal_edu', '운영')
    │  → purpose='elearning_class' + account='HMC-OPS' → edu_types=['elearning']
    │  → "이러닝" 버튼 1개만 표시 → 선택
    │
    └─ Step4: 양식 로드
       planNext() → policies.find(매칭)
       → matched = POL-1774517571936 (이러닝, elearning_class)
       → eduType = 'elearning' → EDU_TYPE_LABELS['elearning'] = '이러닝'
       → getFoFormTemplate(matched, 'plan', '이러닝')
         → stage_form_ids.plan = ['FM1774517300244']
         → _loadFormTemplate('FM1774517300244') → 현대차-운영-계획-이러닝 ✅
       → 양식 렌더링 완료
```

### 시나리오 B: 이O봉(내구기술팀) — 참가 계정 이러닝 신청 (⚠️ 양식 폴백 위험)

```
사용자: 이O봉 (내구기술팀, HMC, 연구직)
    │
    ├─ Step1: "개인직무 사외학습" 선택 (external_personal)
    ├─ Step2: "일반-참가계정(HMC-PART)" 선택
    ├─ Step3: edu_types=['regular'] → regular은 상위 코드
    │  → EDU_TYPE_SUBTYPES['regular'] = [이러닝, 집합, 라이브]
    │  → "정규교육" 펼침 → "이러닝" 세부 선택
    │
    └─ Step4: 양식 로드
       matched = POL-HMC-GEN-001 (참가 이러닝)
       → stage_form_ids.plan = [] ← ❌ 빈 배열!
       → 1순위 실패 → 2순위 _loadFormTemplateByContext 진입
       → vorgId=TPL_1774867919831, accCode=HMC-PART, stage='plan', eduType='이러닝'
       → DB 쿼리: vorg=TPL_1774867919831 + account=HMC-PART + type=plan + edu_type='이러닝'
       → 결과 없음 (HMC-PART용 계획양식 미존재)
       → 2-b 폴백: vorg + account + type만 → 결과 없음 (HMC-PART용 양식 자체 없음)
       → null → Fallback UI  ← 현재는 이 경우 문제 없음 (기본 양식 렌더링)
```

### 시나리오 C: 새로 입사한 신입사원 — VOrg 미할당 (❌ 차단)

```
사용자: 김O새 (신규팀, HMC, 일반직)
    │
    ├─ 페르소나 초기화
    │  orgId = "신규팀UUID"
    │  → tree_data에 신규팀UUID 없음
    │  → bankbook도 없음
    │  → persona.vorgIds = [] ← 빈 배열
    │
    ├─ Step1: _getActivePolicies → 정책 매칭 0건
    │  → SERVICE_POLICIES 존재 + 매칭 0건
    │  → getPersonaPurposes → [] (빈 배열)
    │  → "교육계획 수립이 필요한 정책이 없습니다" 안내 표시
    │
    └─ ★ 관리자 조치 필요: VOrg tree_data에 신규팀 추가
```

### 시나리오 D: 기타계정 담당자 — 교육시설 운영 (✅ 정상)

```
사용자: 역량혁신팀 담당자 (HMC)
    │
    ├─ Step1: "기타 운영" 선택 (misc_ops)
    ├─ Step2: "기타계정(HMC-ETC)" 선택
    ├─ Step3: edu_types=['facility'] → "교육시설운영" 선택
    └─ Step4: stage_form_ids.plan = ['FM1775442038623'] → 정확 매칭 ✅
```

### 시나리오 E: 무예산 계정 교육이력 등록 (⚠️ 양식 없음)

```
사용자: 내구기술팀 연구원 (HMC-1987 계정)
    │
    ├─ 페르소나 초기화
    │  tree_data 기반 → vorgIds 포함 TPL-1775559170063(무예산)
    │  HMC-1987: uses_budget=false → allowedAccounts에만 추가, budgets는 비어있음
    │
    ├─ Step1: external_personal 선택 가능
    ├─ Step2: 예산 표시할 budgets 없음 → "예산 계정이 없습니다" 안내
    │  ★ uses_budget=false 계정은 예산 없이 교육이력만 등록하는 패턴C 프로세스
    │
    └─ process_pattern='C': 신청 → 결과 (계획 불필요, 별도 UI)
```

---

## 11. DB 구조

### 11.1 service_policies

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 정책 ID |
| `tenant_id` | TEXT | 테넌트 |
| `name` | TEXT | 정책 이름 |
| `vorg_template_id` | TEXT FK | VOrg 템플릿 ID |
| `purpose` | TEXT | 교육 목적 (**영문 코드**) |
| `account_codes` | TEXT[] | 적용 계정 코드 배열 |
| `edu_types` | TEXT[] | 허용 교육유형 (**영문 코드**) |
| `selected_edu_item` | JSONB | 세부 선택 `{ typeId, subId }` |
| `stage_form_ids` | JSONB | 단계별 양식 ID `{ plan: [], apply: [], result: [] }` |
| `process_pattern` | TEXT | 프로세스 패턴 (A~E) |
| `target_type` | TEXT | UI 스타일 (`learner`/`operator`) |
| `status` | TEXT | `active`/`inactive` |

### 11.2 form_templates

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 양식 ID |
| `name` | TEXT | 양식 이름 |
| `type` | TEXT | `plan`/`apply`/`result` |
| `edu_type` | TEXT | 교육유형 (**⚠️ 한글 라벨**) |
| `virtual_org_template_id` | TEXT FK | VOrg 연결 |
| `account_code` | TEXT | 계정 코드 |
| `status` | TEXT | `published`/`draft` |
| `fields` | JSONB | 필드 배열 `[{ key, scope, required }]` |

### 11.3 virtual_org_templates

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | VOrg ID |
| `name` | TEXT | VOrg 이름 |
| `tenant_id` | TEXT | 테넌트 |
| `tree_data` | JSONB | 조직 트리 `{ hqs: [{ teams: [{id, name}] }] }` |

---

## 12. Fallback 정책 (빈 데이터 처리)

| 상황 | Step | 처리 | 안내 메시지 |
|------|------|------|-----------|
| `SERVICE_POLICIES` 미로드 | 1 | 전체 목적 허용 (개발 모드) | - |
| 정책 로드됨 + VOrg 매칭 0건 | 1 | 빈 목적 목록 | "설정된 서비스 정책이 없습니다" |
| purpose 매칭 + 예산 0건 | 2 | 빈 예산 목록 | "사용 가능한 예산 계정이 없습니다" |
| edu_types 매칭 0건 | 3 | 빈 교육유형 | "허용된 교육유형이 없습니다" |
| 양식 매칭 실패 (null) | 4 | Fallback UI (기본 입력 필드) | - |
| 양식 로딩 중 | 4 | 스피너 표시 | "양식 로딩 중..." |

---

## 13. FO 화면별 구현 현황

| 화면 | 함수 | 현황 | 비고 |
|------|------|------|------|
| 교육계획 Step1 | `renderPlanWizard()` | ✅ purpose 매핑 정상 | |
| 교육계획 Step2 | `renderPlanWizard()` | ✅ 예산+VOrg 라벨 표시 | |
| 교육계획 Step3 | `renderPlanWizard()` | ✅ edu_types 기반 트리 | |
| 교육계획 Step4 | `planNext()` | ✅ eduType 영문 코드 직접 전달 | 변환 레이어 제거 완료 |
| 교육계획 임시저장 | `resumePlanDraft()` | ✅ eduType 전달 | P1-1 수정 완료 |
| 교육신청 Step1~3 | `renderApplyWizard()` | ✅ | |
| 교육신청 Step4 | `applyNext()` | ✅ eduType 영문 코드 직접 전달 | 변환 레이어 제거 완료 |
| 교육결과 등록 | `renderResultForm()` | ✅ 확인 완료 | `getFoFormTemplate` 미호출 (영향 없음) |

---

## 14. 결재라인 구성 (향후 확장)

> 📝 이 섹션은 향후 구현 시 갱신 예정

### 14.1 프로세스 패턴별 결재 흐름

| 패턴 | 흐름 | 결재 시점 | 비고 |
|------|------|----------|------|
| **A** | 계획 → 신청 → 결과 | 계획 제출 시 결재 | 계획 승인 후 신청 가능 |
| **B** | 신청 → 결과 | 신청 제출 시 결재 | 계획 불필요 |
| **C** | 신청 → 결과 (무예산) | 자동 승인 또는 간편 결재 | 예산 동결 없음 |
| **D** | 결과만 | 결과 제출 시 결재 | 사후 보고형 |
| **E** | 계획 → 결과 | 계획 제출 시 결재 | 신청 단계 스킵 |

### 14.2 결재선 자동 구성 규칙 (계획)

```
1. 정책의 process_pattern 확인
2. 예산 금액 기반 결재 단계 결정
   - soft_limit 이하: 팀장 결재
   - soft_limit 초과~hard_limit 이하: 팀장+실장 결재
   - hard_limit 초과: 분기표 결재위원회
3. VOrg 협력부서 지정 시 협의 결재 추가
4. 결재 요청 → DB approval_requests 테이블 저장
```

### 14.3 결재 관련 TODO

- [ ] approval_requests 테이블 설계
- [ ] 결재선 자동 구성 함수 (`_buildApprovalRoute`)
- [ ] 결재 상태 실시간 업데이트
- [ ] VOrg 협력부서 결재 연동
- [ ] 금액 기반 결재 단계 분기 로직

---

## 15. 개선 로드맵

| 우선순위 | 항목 | 현황 | 영향도 |
|---------|------|------|-------|
| ~~🔴 P0~~ | ~~edu_type 코드 불일치 해소~~ | ✅ **완료** (DB 표준화 `b3af506`) | ~~양식 매칭 실패 방지~~ |
| ~~🟠 P1-1~~ | ~~임시저장 이어쓰기 eduType 누락~~ | ✅ **완료** (`plans.js` `b3af506`) | ~~이어쓰기 양식 불일치~~ |
| ~~🟠 P1-2~~ | ~~context 폴백 복수 양식 랜덤 반환~~ | ✅ **완료** (`fo_form_loader.js` `b3af506`) | ~~잘못된 양식 방지~~ |
| ~~🟡 P2-1~~ | ~~`form_templates.edu_type` 영문 표준화~~ | ✅ **완료** (DB 마이그레이션 `b3af506`) | ~~변환 레이어 제거~~ |
| 🟡 P2-2 | 신규 purpose 코드 등록 시 `_BO_TO_FO_PURPOSE` 자동 갱신 | 미착수 | 확장성 |
| 🟢 P3 | 결재라인 자동 구성 | 미착수 | 사용자 경험 |
| 🟢 P3 | 겸직(복수 org_id) 지원 | 미착수 | 소수 케이스 |

---

## 16. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|-------|
| 2026-04-08 | 최초 작성 (VOrg 기반 교육유형 필터링 설계) | AI |
| 2026-04-14 | 전면 갱신: 양식 매칭 규칙 추가, 코드 불일치 매트릭스, 엣지 케이스 24건, 시나리오 5건, 결재라인 확장 섹션 | AI |
| 2026-04-14 | eduType 영문→한글 변환 누락 버그 수정 (`plans.js`, `apply.js`) | AI |
| 2026-04-14 | **edu_type 영문 표준화 완료**: DB 마이그레이션(form_templates), 변환 레이어 제거, P1-1/P1-2 수정, §4·§6·§13·§15 갱신 | AI |
