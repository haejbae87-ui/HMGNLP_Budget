# 교육양식 간소화 및 조건부 산출근거 연동 PRD

> **도메인**: 교육양식 아키텍처 재설계 (Form Simplification)
> **관련 파일**: `bo_fb_library.js`, `bo_fb_core.js`, `bo_fb_editor.js`, `fo_form_loader.js`, `plans.js`, `apply.js`, `bo_calc_grounds.js`
> **최초 작성**: 2026-04-17
> **최종 갱신**: 2026-04-21
> **상태**: 🟡 구현 중 (Phase A/B/C/D 완료 / Phase E 미완)
> **선행 PRD**: `form_builder.md`, `form_field_governance.md`, `form_deploy_workflow.md`, `calc_grounds_ux_redesign.md`

---

## 1. 기능 개요

기존 폼빌더(Form Builder) 기반의 동적 양식 시스템을 **정규화된 표준 폼 + 조건부 산출근거 태깅**으로 간소화한다.
프로토타입 및 실 운영 시스템의 개발 속도를 높이고, 필드 간 종속성 관리 복잡도를 제거하며,
데이터 집계·리포팅을 SQL 기반으로 직접 가능하게 한다.

### 핵심 전환

```
AS-IS (폼빌더 방식)                        TO-BE (정규화 하이브리드 방식)
─────────────────────                      ─────────────────────────────
폼빌더로 자유 필드 조합                     공통 필드 → DB 컬럼 정규화
필드 종속성을 폼 레벨에서 관리               산출근거 항목에 조건 태그 부착
교육유형별 양식 N개 × 버전 관리             표준 템플릿 5~6개 (버전 관리 최소화)
제출마다 form_template_id + snapshot 필요   공통 필드는 직접 컬럼, 추가 필드만 JSON
JSON 파싱으로 리포팅                        SQL 쿼리로 바로 집계
```

---

## 2. 배경: 왜 간소화가 필요한가

### 2.1 현행 시스템의 부담 분석

| 부담 포인트 | 상세 | 영향 |
|------------|------|------|
| **양식 수 폭증** | 교육유형 10개 × 계획/신청/결과 3종 = 30개 양식 + 버전 관리 | 기획 공수 ↑ |
| **버전 추적 오버헤드** | 제출마다 `form_template_id`, `form_version`, `_form_snapshot` 저장 | 데이터 비대화 |
| **필드 종속성 관리** | 폼 레벨에서 "국내/해외 → 산출근거 필터" 같은 비즈니스 로직 관리 | 복잡도 ↑↑ |
| **리포팅 난이도** | 모든 입력이 JSON `detail` 안에 있어 SQL 집계 불가 | BI 연동 지연 |
| **개발자 학습 비용** | 폼빌더 + 거버넌스 3계층 + 의존성 엔진 이해 필요 | 온보딩 ↑ |

### 2.2 현재 구현 상태 (기존 PRD 4건 크로스 참조)

| 기존 PRD | 핵심 내용 | 상태 | 간소화 시 영향 |
|----------|---------|:---:|------------|
| `form_builder.md` | DnD 빌더, 미리보기, 보관/복원 | ✅ 구현됨 | 🟡 축소 사용 |
| `form_field_governance.md` | L1/L2/L3 거버넌스, 의존성 규칙 | ✅ 구현됨 | 🔴 대폭 축소 |
| `form_deploy_workflow.md` | Draft→Published→Archived, 버전 관리 | ✅ 구현됨 | 🟡 단순화 |
| `calc_grounds_ux_redesign.md` | is_overseas 태깅, usage_type 분리, 3중 승산 | 🔴 미구현 | ✅ 확장 적용 |

---

## 3. 설계 방향: 하이브리드 모델 (B안 확정)

### 3.1 관심사 분리 원칙

```
┌─────────────────────────────────────────────┐
│ Layer 1: 정규화된 입력 폼 (간단)               │
│                                             │
│  공통 필드 → DB 컬럼 (교육명, 일시, 인원 등)   │
│  교육유형별 조건부 필드 → 코드 분기             │
│    if (해외) → 국가 필드 표시                  │
│    if (위탁) → 위탁기관 필드 표시              │
│  소수 커스텀 필드 → JSON extra_fields          │
│                                             │
│  ※ 폼빌더 의존도 최소화. 조건 분기는 유한함.    │
├─────────────────────────────────────────────┤
│ Layer 2: 조건부 산출근거 엔진 (기존 확장)       │
│                                             │
│  calc_grounds 항목에 apply_conditions 태그    │
│  입력: { is_overseas, venue_type, edu_type } │
│  출력: 적용 가능한 산출근거 항목 목록           │
│                                             │
│  ※ 별도 룰 엔진 불필요. 항목 자체에 조건 부착  │
├─────────────────────────────────────────────┤
│ Layer 3: 세부산출근거 입력 화면                 │
│                                             │
│  Layer 2가 필터링한 항목만 표시                 │
│  사용자는 수량/단가만 입력                     │
└─────────────────────────────────────────────┘
```

### 3.2 폼 필드 종속성 → 2가지 유형 분리

| 종류 | 예시 | 관리 방법 | 복잡도 |
|------|------|---------|:---:|
| **폼 레벨 (표시/숨김)** | 해외 선택 → 국가 필드 표시 | 코드 조건문 (유한한 경우의 수) | ⭐ |
| **비즈니스 레벨 (산출근거 필터)** | 해외 선택 → 항공료 항목 활성화 | `apply_conditions` 태그 매칭 | ⭐ |

> **핵심**: 폼 필드 간에는 종속성이 없음. 각 산출근거 항목이 "나는 이런 조건일 때만 보인다"라고 자기 조건만 앎.
> Push 모델(종속성) → Pull 모델(조건 매칭)으로 전환.

---

## 4. 상세 기능 요구사항

### 4.1 정규화된 공통 필드 (DB 컬럼)

#### 교육계획 (plans 테이블) — 공통 필드

| 컬럼 | 타입 | 설명 | 현재 상태 |
|------|------|------|:---:|
| `education_name` | TEXT | 교육명 | ✅ detail.name으로 존재 |
| `edu_type` | TEXT | 교육유형 (집합/이러닝/블렌디드) | ✅ detail 내 존재 |
| `edu_sub_type` | TEXT | 세부유형 (사내/사외/위탁 등) | ✅ detail 내 존재 |
| `is_overseas` | BOOLEAN | 국내/해외 여부 | 🔴 신규 |
| `overseas_country` | TEXT | 해외 교육 국가 (is_overseas=true만) | 🔴 신규 |
| `venue_type` | TEXT | 장소유형 (internal/external/online) | 🔴 신규 |
| `locations` | JSONB | 교육장소 (멀티 선택, 배열) | 🔴 신규 (기존 location 단일→배열) |
| `planned_headcount` | INTEGER | 예상 인원 | ✅ detail 내 존재 |
| `planned_days` | INTEGER | 교육일수 | ✅ detail 내 존재 |
| `planned_rounds` | INTEGER | 예상 차수 | 🔴 신규 |
| `start_date` | DATE | 교육 시작일 | ✅ 존재 |
| `end_date` | DATE | 교육 종료일 | ✅ 존재 |
| `requested_budget` | NUMERIC | 요청 예산액 | ✅ 존재 |
| `is_continuing` | BOOLEAN | 전년도 계속 교육 여부 | ✅ 존재 |
| `extra_fields` | JSONB | 소수 테넌트별 추가 필드 (위탁기관명 등) | 🔴 신규 |

#### 교육신청 (applications 테이블) — 공통 필드

| 컬럼 | 타입 | 설명 | 현재 상태 |
|------|------|------|:---:|
| `applicant_name` | TEXT | 신청자 | ✅ 존재 |
| `course_info` | TEXT | 과정명/기관명 | ✅ detail 내 존재 |
| `apply_reason` | TEXT | 신청 사유 | 🟡 detail.reason |
| `is_overseas` | BOOLEAN | 해외 여부 | 🔴 신규 |
| `venue_type` | TEXT | 장소유형 | 🔴 신규 |
| `extra_fields` | JSONB | 추가 필드 | 🔴 신규 |

### 4.2 조건부 필드 표시/숨김 (코드 분기)

| 조건 | 표시 필드 | 적용 대상 | 분기 방법 |
|------|---------|----------|---------|
| `is_overseas = true` | 국가, 해외 숙박 정보 | 계획, 신청 | `if (is_overseas)` |
| `edu_sub_type = '위탁'` | 위탁기관명, 위탁계약서 | 계획 | `if (sub_type === 'consignment')` |
| `edu_type = '이러닝'` | 플랫폼명, URL | 신청 | `if (edu_type === 'elearning')` |
| `venue_type = 'external'` | 대관 장소 상세 | 계획 | `if (venue_type === 'external')` |

> 총 조건부 분기 경우의 수: **~10개 이내** → 코드로 충분히 관리 가능

### 4.3 조건부 산출근거 태깅 (apply_conditions)

#### DB 확장: calc_grounds 항목에 조건 추가

```sql
ALTER TABLE calc_grounds
  ADD COLUMN IF NOT EXISTS apply_conditions JSONB DEFAULT '{}';

-- 예시 데이터:
UPDATE calc_grounds SET apply_conditions = '{"is_overseas": true}'
  WHERE name LIKE '%항공%' OR name LIKE '%해외숙박%';

UPDATE calc_grounds SET apply_conditions = '{"venue_type": ["external", "hotel"]}'
  WHERE name LIKE '%임차%' OR name LIKE '%대관%';

-- 조건 없음 = 항상 표시
UPDATE calc_grounds SET apply_conditions = '{}'
  WHERE apply_conditions IS NULL;
```

#### 필터링 로직 (단일 함수)

```javascript
/**
 * 사용자 선택값과 항목의 apply_conditions를 매칭하여
 * 적용 가능한 산출근거 항목만 필터링
 */
function getApplicableCalcGrounds(allItems, userSelections) {
  // userSelections = { is_overseas: true, venue_type: 'external', ... }
  return allItems.filter(item => {
    const conds = item.apply_conditions || {};
    if (Object.keys(conds).length === 0) return true; // 무조건 표시
    
    return Object.entries(conds).every(([key, val]) => {
      const userVal = userSelections[key];
      if (Array.isArray(val)) return val.includes(userVal);
      if (typeof val === 'boolean') return userVal === val;
      return userVal === val;
    });
  });
}
```

#### BO 관리 화면: 산출근거 상세 페이지에 "적용 조건" 섹션

```
[산출근거 항목: 항공료]
  ├── 유형: 직접학습용
  ├── 단가: 1,200,000원
  └── 📋 적용 조건:
       국내/해외: [해외만 ▼]
       장소유형:  [전체 ▼]
       교육유형:  [전체 ▼]
```

### 4.4 폼빌더 축소 운영 방안

| 기존 기능 | 간소화 후 | 이유 |
|----------|---------|------|
| 자유 필드 조합 (DnD) | ❌ 비활성화 | 공통 필드는 DB 컬럼으로 정규화 |
| L1/L2/L3 거버넌스 | 🟡 L1만 유지 | 표준 필드만 사용, 테넌트 확장은 extra_fields |
| 필드 의존성 엔진 | ❌ 제거 | 산출근거 조건 태깅으로 대체 |
| Draft→Published 워크플로우 | 🟡 단순화 | 표준 템플릿은 코드에 내장, 배포 불필요 |
| form_template_id/version 추적 | 🟡 축소 | 공통 필드는 추적 불필요, extra_fields만 |
| _form_snapshot 저장 | ❌ 제거 | 컬럼 기반이므로 역추적 불필요 |
| provide scope (BO→FO) | ✅ 유지 | 관리자 제공 정보는 여전히 필요 |

### 4.5 표준 템플릿 정의 (양식 수 최소화)

| # | 템플릿 | 적용 교육유형 | 특수 필드 |
|---|--------|------------|---------|
| T1 | 직접학습 계획 | 외부개인(집합/이러닝) | is_overseas, 과정명 |
| T2 | 직접학습 신청 | 외부개인 | 기관명, 수강료 |
| T3 | 교육운영 계획 | 사내/컨퍼런스/기타운영 | locations[], planned_rounds |
| T4 | 교육운영 신청 | 사내/컨퍼런스/기타운영 | 차수, 인원 확정 |
| T5 | 교육결과 등록 | 공통 | 수료율, 만족도, 실비용 |
| T6 | 이러닝 전용 | 이러닝 | 플랫폼, URL, 수강기간 |

> **6개 템플릿으로 모든 교육유형 커버** (기존: 교육유형×단계별 30+개)

---

## 5. 갭 분석: 현재 구현 ↔ 간소화 목표

### 5.1 코드 영향 분석

| 파일 | 현재 폼빌더 의존도 | 간소화 시 변경 | 공수 |
|------|:---:|------|:---:|
| `bo_form_builder.js` | 100% | 표준 템플릿 뷰어로 축소 또는 유지(BO 전용) | 🟡 MED |
| `fo_form_loader.js` | 100% | 표준 렌더러로 교체 (폼빌더 동적 로드 → 정적 렌더) | 🔴 HIGH |
| `plans.js` | 60% | detail JSON → 정규화 컬럼 매핑 + 조건부 필드 분기 추가 | 🔴 HIGH |
| `apply.js` | 60% | 동일하게 정규화 컬럼 매핑 + 조건부 필드 분기 | 🔴 HIGH |
| `bo_plan_mgmt.js` | 30% | form_template_id 참조 로직 수정 | 🟡 MED |
| `bo_approval.js` | 20% | form_template_id 기반 필드 로드 → 직접 컬럼 읽기 | 🟡 MED |
| `bo_calc_grounds.js` | 0% → 신규 | apply_conditions 편집 UI 추가 | 🟡 MED |

### 5.2 DB 마이그레이션 필요 사항

| 테이블 | 변경 | 상세 |
|--------|------|------|
| `plans` | ADD COLUMNS | `is_overseas`, `overseas_country`, `venue_type`, `locations`, `planned_rounds`, `extra_fields` |
| `applications` | ADD COLUMNS | `is_overseas`, `venue_type`, `extra_fields` |
| `calc_grounds` | ADD COLUMN | `apply_conditions JSONB DEFAULT '{}'` |
| `form_templates` | 유지 | 기존 데이터 보존, 신규 생성 시 표준 템플릿 참조 |

### 5.3 데이터 마이그레이션

```sql
-- 기존 detail JSON에서 정규화 컬럼으로 데이터 이관
UPDATE plans SET
  is_overseas = COALESCE((detail->>'isOverseas')::boolean, false),
  venue_type = COALESCE(detail->>'venueType', 'internal'),
  planned_rounds = COALESCE((detail->>'rounds')::int, 1)
WHERE is_overseas IS NULL;
```

---

## 6. 엣지 케이스 분석 (15건)

### 6.1 마이그레이션 관련

| # | 케이스 | 위험도 | 처리 |
|---|--------|:---:|------|
| EC-01 | **기존 제출 데이터 역호환** — detail JSON에 저장된 기존 데이터에 정규화 컬럼이 없음 | 🔴 | 마이그레이션 스크립트로 backfill. NULL은 기본값 처리 |
| EC-02 | **form_template_id 참조 단절** — 기존 plans/applies가 form_template_id를 참조 중 | 🔴 | 기존 데이터의 form_template_id 유지. 신규 데이터부터 선택적 |
| EC-03 | **폼빌더로 만든 기존 양식 처리** — published 상태 양식이 FO에서 사용 중 | 🟡 | 기존 양식 archived 처리 전 연결 정책 확인 필수 |

### 6.2 조건부 산출근거 관련

| # | 케이스 | 위험도 | 처리 |
|---|--------|:---:|------|
| EC-04 | **apply_conditions가 빈 객체인 항목** | LOW | 항상 표시 (무조건 매칭) |
| EC-05 | **apply_conditions의 키가 userSelections에 없음** | 🟡 | 해당 조건 skip (관대한 매칭) 또는 hide (엄격한 매칭) — **정책 결정 필요** |
| EC-06 | **is_overseas 변경 시 이미 입력된 해외 산출근거 행** | 🟡 | 경고 다이얼로그: "해외 항목이 삭제됩니다" + 확인 |
| EC-07 | **venue_type 변경 시 이미 입력된 장소 연동 산출근거 행** | 🟡 | 동일 경고 패턴 적용 |
| EC-08 | **BO에서 항목의 apply_conditions 변경 후 기존 FO 데이터** | 🟡 | 기존 저장 데이터는 변경 없음 (단가 고정 정책과 동일) |

### 6.3 표준 템플릿 관련

| # | 케이스 | 위험도 | 처리 |
|---|--------|:---:|------|
| EC-09 | **표준 템플릿에 없는 필드가 필요한 경우** | 🟡 | extra_fields JSON에 키-값 추가. BO에서 사전 정의 |
| EC-10 | **extra_fields의 스키마가 테넌트마다 다름** | 🟡 | tenant_extra_field_schema 설정 테이블로 관리 |
| EC-11 | **교육유형 신규 추가 시 표준 템플릿 매핑** | LOW | purpose → template 매핑 테이블 또는 서비스 정책에 명시 |

### 6.4 사이드 이펙트

| # | 케이스 | 위험도 | 처리 |
|---|--------|:---:|------|
| EC-12 | **BO 결재 화면에서 폼 필드 렌더** — `bo_approval.js`가 form_template_id로 필드 로드 | 🔴 | 정규화 컬럼 직접 읽기로 전환. 기존 데이터는 폴백 |
| EC-13 | **BO 교육계획 상세뷰** — `bo_plan_mgmt.js`가 폼 스냅샷 기반 렌더 | 🟡 | 정규화 컬럼 기반 렌더러로 교체 |
| EC-14 | **FO 임시저장 후 재진입** — 기존 detail JSON ↔ 신규 컬럼 이중 소스 | 🔴 | 전환기 동안 양쪽 모두 저장(이중 기록), 점진 마이그레이션 |
| EC-15 | **서비스 정책의 양식 연결** — 정책이 form_template_id를 참조 | 🟡 | 표준 템플릿 ID를 정책에 매핑. 기존 연결은 유지 |

---

## 7. 사이드 이펙트 종합 분석

### 7.1 기존 폼빌더 시스템과의 충돌

| 영역 | 현재 | 간소화 후 | 충돌 수준 | 해결 |
|------|------|---------|:---:|------|
| FO 양식 로딩 | fo_form_loader.js로 동적 로드 | 정적 렌더러 사용 | 🔴 HIGH | 점진 전환: 표준 템플릿 매칭 시 정적, 아니면 기존 폴백 |
| 제출 데이터 구조 | detail JSON에 모든 값 | 공통은 컬럼, 나머지는 extra_fields | 🔴 HIGH | 전환기 이중 기록 |
| provide scope | 폼 필드 단위로 scope 지정 | 공통 필드는 컬럼 + BO 전용 필드 구분 | 🟡 MED | provide 필드는 extra_fields에서 별도 관리 |
| 필수 검증 | 폼 필드의 required 속성 | 컬럼의 NOT NULL + 코드 검증 | 🟡 MED | 간단한 validator 함수로 대체 |

### 7.2 안전한 전환 전략 (점진적 마이그레이션)

```
Phase A: 정규화 컬럼 추가 (기존 폼빌더 병행)
  └── plans/applications에 신규 컬럼 추가
  └── 저장 시 detail JSON + 정규화 컬럼 이중 기록
  └── 읽기는 여전히 detail JSON 기반

Phase B: 표준 렌더러 도입
  └── 신규 작성분부터 표준 렌더러 적용
  └── 기존 데이터는 fo_form_loader 폴백

Phase C: 산출근거 조건 태깅
  └── calc_grounds.apply_conditions 추가
  └── BO 관리 화면에 조건 편집 UI
  └── FO에서 조건 매칭 필터링 적용

Phase D: 폼빌더 비활성화
  └── 모든 데이터가 정규화 컬럼 기반으로 전환 확인 후
  └── 폼빌더 메뉴를 표준 템플릿 관리로 전환
```

---

## 8. 기획자 검토 필요 항목

### 정책 결정 필요

| # | 질문 | 제안 | 상태 |
|---|------|------|:---:|
| QF-01 | **기존 폼빌더 데이터 처리 방침** — 이중 기록 기간은 얼마? | Phase A~C 동안(약 2~3 스프린트) | ⏳ |
| QF-02 | **extra_fields 스키마 관리** — 테넌트별 추가 필드를 어떻게 정의? | 서비스 정책에 extra_fields_schema 속성 추가 | ⏳ |
| QF-03 | **apply_conditions 매칭 방식** — 조건 키가 없으면 표시? 숨김? | 관대한 매칭 (키 없으면 표시) 제안 | ⏳ |
| QF-04 | **표준 템플릿 6개로 충분한지** — 실무에서 더 필요한 유형 있는지 | 팀 확인 필요 | ⏳ |
| QF-05 | **폼빌더 완전 제거 시점** — 프로토타입에서만 간소화? 운영에서도? | 프로토타입: 즉시 간소화. 운영: 검증 후 결정 | ⏳ |
| QF-06 | **L2 필드(테넌트 확장)의 처리** — extra_fields로 충분? 별도 관리? | extra_fields + 스키마 정의로 충분 | ⏳ |

---

## 9. 기존 PRD 영향 정리

| 기존 PRD | 간소화 후 상태 | 조치 |
|----------|:---:|------|
| `form_builder.md` | 🟡 축소 적용 | 폼빌더 자체는 보존하되, 표준 템플릿 관리 용도로 역할 축소. PRD에 "간소화 모드" 섹션 추가 |
| `form_field_governance.md` | 🟡 축소 적용 | L1 표준 필드 → DB 컬럼으로 승격. L2는 extra_fields로 대체. 의존성 엔진은 비활성화 |
| `form_deploy_workflow.md` | 🟡 단순화 | 표준 템플릿은 코드 내장이므로 배포 워크플로우 불필요. 기존 양식 유지보수용으로만 보존 |
| `calc_grounds_ux_redesign.md` | ✅ 확장 | is_overseas 태깅 → apply_conditions로 일반화. 기존 설계 방향과 완벽 호환 |

---

## 10. 개발 계획 (Phase별)

| Phase | 범위 | 의존성 | 예상 공수 |
|-------|------|--------|:---:|
| **A** | plans/applications 정규화 컬럼 추가 + 이중 기록 | 없음 | 1일 |
| **B** | 표준 렌더러 작성 (FO 계획/신청 화면) | A | 3일 |
| **C** | calc_grounds apply_conditions 추가 + BO 관리 UI + FO 필터링 | A | 2일 |
| **D** | BO 결재/상세뷰 정규화 컬럼 기반 전환 | A, B | 2일 |
| **E** | 데이터 마이그레이션 + 폼빌더 비활성화 | A~D 완료 | 1일 |

---

## 11. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-17 | 최초 작성 — 폼 간소화 B안(하이브리드) 확정. 관심사 분리(폼/비즈니스), 정규화 필드 정의, apply_conditions 태깅 설계, 갭 분석 5건, 엣지케이스 15건, 사이드이펙트 4건, 전환 전략 4단계, 기존 PRD 4건 영향 분석 | AI |
| 2026-04-21 | BO 에디터 UI 전환 — DnD 필드빌더를 카테고리별 토글 on/off로 교체, 개별 비용 필드 제거 후 세부산출근거 통합 연동 안내 섹션 추가, _fbPreviewHTML 간소화 | AI |
| 2026-04-21 | **Phase D 완료** — `bo_plan_detail_renderer.js` 신규 파일 작성: `boRenderPlanDetailInfo()`, `boRenderAppDetailRows()` 구현. BO 교육계획 상세뷰(`_renderBoPlanDetail`)의 detail JSON 직접 읽기 → 정규화 컬럼(`is_overseas`, `venue_type`, `planned_rounds`, `overseas_country`, `extra_fields` 등) 우선 읽기로 전환. `_buildAppDetailRows()` 동일하게 정규화 컬럼 우선 적용. `backoffice.html`에 스크립트 태그 추가(v=1). | AI |

