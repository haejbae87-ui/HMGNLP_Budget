---
name: "Field Manager (양식 필드 관리자)"
description: "BO-FO 양식 필드의 추가·수정·삭제 작업 시 반드시 호출하는 스킬. 필드 레지스트리(_BO_TO_FO_KEY_MAP) 동기화, 렌더러 코드 체크리스트, PRD 갱신까지 자동으로 수행한다."
---

# Field Manager (양식 필드 관리자) 스킬

HMG 교육예산 시스템의 BO-FO 양식 필드를 안전하게 추가·수정·삭제하는 표준 절차를 정의합니다.
**필드 관련 작업 시 이 스킬을 반드시 먼저 호출하십시오.**

---

## 📐 필드 아키텍처 개요

```
BO 관리자 UI (bo_form_management.js)
        │  ON/OFF 토글 저장
        ▼
DB: budget_accounts.form_config (JSONB)
        │  { elearning: { forecast: { edu_period: false, ... } } }
        ▼
FO 로더 (fo_form_loader.js > loadFormConfigTemplate)
        │  _BO_TO_FO_KEY_MAP 으로 키 변환
        ▼
FO inlineFields: { start_end_date: false, ... }
        │  _shouldShow() 로 필드 표시/숨김 결정
        ▼
FO 렌더러 (foRenderStandardPlanForm)
```

### 핵심 파일

| 역할 | 파일 | 주요 요소 |
|---|---|---|
| BO 필드 정의 | `public/js/bo_form_management.js` | `_FORM_FIELDS` 배열 |
| BO→FO 키 매핑 | `public/js/fo_form_loader.js` | `_BO_TO_FO_KEY_MAP` 객체 |
| FO 렌더러 | `public/js/fo_form_loader.js` | `foRenderStandardPlanForm()` |
| FO 휴리스틱 제어 | `public/js/fo_form_loader.js` | `showRegion`, `showVenue` 등 |
| 필드 레지스트리 PRD | `docs/PRD/field_registry.md` | 전체 필드 목록 & 매핑 표 |

---

## ⚙️ 실행 프로세스

### 🔴 STEP 0: 스킬 호출 조건 확인
다음 작업이 발생할 때 반드시 이 스킬을 실행합니다.
- 새 필드를 BO 양식관리에 추가할 때
- 기존 필드를 삭제하거나 키 이름을 변경할 때
- FO 렌더러에 새 필드 블록을 추가/제거할 때
- BO 미리보기와 FO 화면이 불일치할 때

---

### 🟡 STEP 1: 필드 레지스트리 조회
`docs/PRD/field_registry.md`를 열어 현재 필드 목록을 확인합니다.
- 추가하려는 필드가 **이미 존재**하는지 확인 (중복 방지)
- 삭제·수정 대상 필드가 **어느 섹션/단계**에 속하는지 확인
- BO 키 이름(`_FORM_FIELDS`)과 FO 키 이름(`inlineFields`)이 다를 경우 매핑 칸 확인

---

### 🟡 STEP 2: 4-Point 동기화 체크리스트
필드 추가/수정/삭제 시 반드시 아래 4곳을 **모두** 수정합니다.

#### ① BO 필드 정의 (`bo_form_management.js > _FORM_FIELDS`)
```javascript
// 추가 예시
{ key: 'new_field', label: '새 필드명', group: 'basic', stages: ['forecast', 'plan'] }
```
- `key`: DB에 저장되는 스네이크케이스 이름
- `group`: `basic` | `schedule` | `target` | `venue` | `cost` | `result`
- `stages`: 해당 필드가 활성화되는 교육 단계 목록

#### ② BO→FO 키 매핑 (`fo_form_loader.js > _BO_TO_FO_KEY_MAP`)
```javascript
new_field: 'fo_render_key',  // BO key → FO inlineFields key
// FO에 표시하지 않을 BO 전용 필드는 null
new_bo_only_field: null,
```

#### ③ FO 렌더러 (`fo_form_loader.js > foRenderStandardPlanForm`)
- 새 필드 HTML 블록 추가 (적절한 섹션 배열에 삽입)
- `_field('fo_render_key', ...)` 또는 `_shouldShow('fo_render_key')` 패턴 사용
- **`hasFormConfig` 조건 준수**: BO form_config가 있을 때의 숨김 기본값 결정

#### ④ 필드 레지스트리 PRD (`docs/PRD/field_registry.md`)
- 신규 필드 행 추가 또는 변경 행 갱신
- `최종수정일` 컬럼 업데이트

---

### 🟢 STEP 3: 휴리스틱 예외 규칙 검토
아래 필드들은 BO 설정 외에 추가 로직이 있어 **별도 검토가 필요**합니다.

| 필드 | 예외 규칙 | 관련 변수 |
|---|---|---|
| `is_overseas` | 기본적으로 이러닝엔 숨김, BO form_config 있으면 BO 설정 우선 | `showRegion` |
| `venue_type` | 이러닝에서 항상 숨김 | `showVenue` |
| `requested_budget` | 무예산 계정에서 강제 숨김 | `showAmount` |
| `calc_grounds` | 무예산 계정에서 강제 숨김 | `showCalc` |
| `edu_type` | Step2에서 선택하므로 FO 렌더러 대상 외 | `_BO_TO_FO_KEY_MAP: null` |

새 필드가 이러닝/무예산/단계별 조건을 탈 경우, 해당 `show*` 변수 계산 로직을 함께 수정합니다.

---

### 🟢 STEP 4: 검증
1. BO 양식관리에서 새 필드를 **저장**합니다.
2. FO 교육계획 Step3에서 **Ctrl+Shift+R** (강력 새로고침) 후 확인합니다.
3. 콘솔에서 `[foRenderStandardPlanForm] 숨길 필드:` 배열에 새 키가 올바르게 포함되는지 확인합니다.
4. BO 미리보기와 FO 화면을 나란히 열어 **완전 일치** 여부를 검증합니다.

---

## 📋 필드 추가 시 빠른 명령어
AI에게 다음과 같이 요청하면 이 스킬이 자동으로 실행됩니다.

> `@[/field_manager] '강의 언어' 필드를 계획 단계에 추가해줘. BO 키는 course_language, FO도 동일하게 사용.`
> `@[/field_manager] 'instructor_name' 강사명 필드를 삭제해줘.`
> `@[/field_manager] 현재 BO-FO 필드 매핑 전체 목록을 보여줘.`

---

## 🔗 관련 문서
- 전체 필드 레지스트리: `docs/PRD/field_registry.md`
- 양식 필드 거버넌스: `docs/PRD/form_field_governance.md`
- BO UI 표준: `.agents/skills/bo_ui_standard/SKILL.md`
