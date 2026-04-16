# 세부산출근거 입력 UX 개선 및 장소별 단가 연동 PRD

> **도메인**: 세부산출근거 (Calculation Grounds) — FO 입력 UX + BO 단가 관리 재설계  
> **관련 파일**: `bo_calc_grounds.js`, `plans.js`, `apply.js`, `fo_form_loader.js`, `bo_form_builder.js`  
> **최초 작성**: 2026-04-16  
> **최종 갱신**: 2026-04-16 (v3 — 5개 결정사항 반영 확정판)  
> **상태**: 🔴 미구현 (설계 확정)

---

## 1. 기능 개요

FO의 세부산출근거 입력 양식을 **직접학습형(2중 승산)**과 **교육운영형(3중 승산)**으로 완전 분리하여, 각 목적에 최적화된 입력 UX를 제공한다. BO에서는 항목 단위로 유형을 명확히 분리하여 관리하고, 장소별 단가 마스터와 FO 입력을 직접 연결하여 단가 수작업 입력을 제거한다.

### 확정된 5개 결정사항

| # | 결정 | 내용 |
|---|------|------|
| ① | 차수 포함 범위 | 교육운영형: **교육계획(plans.js) + 교육신청(apply.js) 모두 차수 포함** |
| ② | 교육장소 처리 | 헤더 장소는 **선택사항 유지 + 멀티 선택** 가능. 세부산출근거 행별 추가 장소 선택 |
| ③ | 단가 소급 적용 | **신규 작성분부터만 적용** — 기존 저장 계획/신청의 단가는 고정 유지 |
| ④ | 하드코딩 제거 | FO 항목 드롭다운 **하드코딩 전면 제거** → DB calc_grounds 마스터에서 동적 로드 |
| ⑤ | 항목 완전 분리 | **같은 이름(교육참가비)이라도 유형별 별도 항목 등록** — `usage_type='both'` 개념 폐기 |

---

## 2. 비판적 기획자 관점 — 현행 문제 진단

### 2.1 현행 구조의 근본적 결함

| 문제 | 내용 | 위험도 |
|------|------|-------|
| **하드코딩 항목 목록** | apply.js에 '교육비/등록비, 교보재비, 시험응시료'가 하드코딩. BO 설정이 무의미 | ❌ 고 |
| **입력 양식 혼용** | 교육운영(3중)에 최적화된 양식을 직접학습 사용자에게도 동일 적용 — UX 혼란 | ❌ 고 |
| **단가 관리-입력 단절** | BO 장소별 단가 마스터와 FO 입력이 연결 안 됨. 전부 수작업 | ❌ 고 |
| **항목 유형 모호** | `usage_type='both'` 개념 — 같은 항목이 직접학습/운영 양쪽에서 다른 계산식을 써야 하는 경우 처리 불가 | ❌ 고 |
| **교육장소 단일 고정** | 계획 전체에 장소 1개 고정, 실제 교육에서 항목별 다른 장소 사용 불가 | ⚠️ 중 |
| **장소-항목 매핑 취약** | `calc_ground_unit_prices.calc_ground_name` TEXT 참조 — 이름 변경 시 매핑 깨짐 | ❌ 고 |

### 2.2 현행 코드 분리 구조 (역추적)

| 구분 | 목적 코드 | 현재 상태 구조 | 컬럼 | 파일 |
|------|----------|-------------|------|------|
| 직접학습형 | `external_personal` | `applyState.expenses[]` | 항목(하드코딩)·단가·수량·소계·비고 | `apply.js:L1630` |
| 교육운영형 | `internal_edu` 등 | `planState.calcGrounds[]` | 항목(마스터)·수량·단가·소계 | `plans.js:L2085` |

이미 구조는 분리되어 있으나, **둘 다 2중 승산만 동작**하며 장소·프리셋 연동 미구현.

---

## 3. 설계 방향 (v3 확정)

### 3.1 유형 분리 원칙

> **"유형은 항목(calc_grounds) 레벨에서 완전 분리 관리된다"**

```
calc_grounds 항목 등록 시:
  usage_type = 'self_learning'  → 직접학습형 전용 (2중 승산)
  usage_type = 'edu_operation'  → 교육운영형 전용 (3중 승산)
  (usage_type = 'both' 개념 폐기)

같은 이름이라도 유형별 별도 항목으로 등록:
  교육참가비 [직접학습용] → usage_type='self_learning', has_rounds=false
  교육참가비 [교육운영용] → usage_type='edu_operation', has_rounds=true
```

**BO 관리자가 항목 등록 시 유형을 명시적으로 선택**하므로, FO에서는 목적(purpose)에 맞는 유형의 항목만 자동 필터링된다.

### 3.2 FO 유형 결정 우선순위

```
1순위: purpose.id 기반
       external_personal → self_learning 항목 목록 로드
       그 외(internal_edu, conf_seminar, misc_ops) → edu_operation 항목 목록 로드

2순위 (폴백): form_template.target_type 기반
       learner  → self_learning
       operator → edu_operation
```

### 3.3 직접학습형 — 입력 구조 (2중 승산)

```
[ 세부산출근거 ]                              (단위: 원)
──────────────────────────────────────────────────────────
 항목(DB로드)          단가       인원(명)    소계       비고
 교육참가비(직접학습)  [200,000]  × [1]명  = 200,000원  [비고]  ✕
 교보재비              [30,000]   × [1]명  =  30,000원  [비고]  ✕
──────────────────────────────────────────────────────────
 합계: 230,000원
```

- 항목 드롭다운: `usage_type='self_learning'` 항목만 로드 (DB 동적)
- 소계 = 단가 × 인원 (qty1)
- 단가: `calc_grounds.unit_price` 기본값 제공, 직접 수정 가능

### 3.4 교육운영형 — 입력 구조 (3중 승산)

```
[ 세부산출근거 내역 ]                                                  (단위: 원)
──────────────────────────────────────────────────────────────────────────────
☐  항목            세부항목(장소+프리셋)      단가     인원  박  차수    소계
☐ 숙박비(운영용)  [3박4일 현대인재개발원 ▼]  [80,000]  [20]명 [3]박 [2]차수 = 9,600,000원
☐ 식비(운영용)   [조식 ▼]                   [8,000]  [20]명 [3]일 [2]차수 =   960,000원
☐ 문구비(운영용) [직접입력]                  [5,000]  [20]명            [2]차수 =   200,000원
──────────────────────────────────────────────────────────────────────────────
  합계: 10,760,000원   |  예상 인당 비용: 538,000원 (20명 기준)
```

- 항목 드롭다운: `usage_type='edu_operation'` 항목만 로드 (DB 동적)
- 소계 = 단가 × qty1(인원) × qty2(박/일/회, has_qty2=true 항목만) × qty3(차수)
- **차수(qty3): 교육계획(plans.js)과 교육신청(apply.js) 모두 포함** ← ① 결정
- 항목에 `has_rounds=false`이면 차수 컬럼 숨김 (qty3=1 고정)

### 3.5 교육장소 처리 방식 (② 결정 반영)

> **"헤더 장소는 선택사항 멀티 선택 + 항목별 행 수준 장소 선택 병행"**

```
교육계획 헤더
└─ 교육장소 [멀티 선택, 선택사항]
   예: [현대인재개발원] [사내강의장] (복수 선택 가능)
   용도: 대표 장소 기록, 필터/검색용. 입력 강제 없음.

세부산출근거 각 행
└─ 항목에 장소별 단가가 있는 경우: 장소 드롭다운 자동 표시
   예: 숙박비(운영) → [현대인재개발원 ▼] → 프리셋 [3박4일, 2박3일, 1박, 직접입력]
   용도: 해당 행의 단가 자동 로드 목적
```

- 헤더와 행별 장소는 **독립적** — 서로 연동 강제 없음
- 헤더 장소 멀티 선택: `planState.locations = []` (문자열 배열)
- 행별 장소: `calcGround.venueName` (단일 문자열, 해당 행의 단가 기준)

### 3.6 단가 소급 적용 정책 (③ 결정 반영)

> **"단가 변경은 변경 이후 신규 작성분에만 적용"**

```
정책:
  - FO에서 세부산출근거 행을 새로 추가할 때 → 최신 단가 로드
  - 이미 unitPrice가 저장된 행 → 저장 당시 값 고정, 변경 없음
  - 재진입(임시저장 이어쓰기) 시 → 저장된 unitPrice 그대로 표시
  - 단가 변경 고지: 재진입 시 "일부 항목의 단가가 업데이트되었습니다. 최신 단가로 갱신하시겠습니까?" 선택 옵션 제공 (선택)
```

### 3.7 하드코딩 항목 전면 제거 (④ 결정 반영)

> **"apply.js 내 모든 하드코딩 항목 옵션 → DB calc_grounds 마스터 동적 로드로 대체"**

현재 하드코딩 → 대체 방안:

| 현재 apply.js 하드코딩 | 대체 방안 |
|----------------------|---------|
| `교육비/등록비` | BO에 직접학습형 항목 `교육참가비` 신규 등록 |
| `교보재비` | BO에 직접학습형 항목 `교보재비` 신규 등록 |
| `시험응시료` | BO에 직접학습형 항목 `시험응시료` 신규 등록 |
| `항공료` (해외) | BO에 직접학습형 항목 `항공료(해외)` 신규 등록, `is_overseas=true` 태깅 |
| `숙박비` (해외) | BO에 직접학습형 항목 `숙박비(해외)` 신규 등록, `is_overseas=true` 태깅 |

해외 전용 항목 처리:
- `calc_grounds`에 `is_overseas BOOLEAN DEFAULT false` 컬럼 추가
- FO에서 `region=overseas` 선택 시 `is_overseas=true` 항목도 목록에 포함

### 3.8 양식 빌더(Form Builder) 연동

- `bo_form_builder.js`의 서비스 유형(`learner`/`operator`)이 FO 세부산출근거 렌더 유형 결정에 활용
- 세부산출근거 필드에 `calc_grounds_type` 속성 추가: `'auto'`(purpose 자동 판별) | `'self_learning'` | `'edu_operation'`
- `auto`가 기본값 — 대부분의 경우 purpose.id로 자동 결정됨

---

## 4. 상세 기능 요구사항

### 4.1 공통 요구사항

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|---------|
| C-001 | 유형 자동 결정 | purpose.id 기반 항목 유형 자동 결정. DB에서 해당 유형 항목만 로드 | 🔴 HIGH |
| C-002 | Hard Limit 차단 | row.total > hard_limit 시 저장 불가, 빨간 테두리 표시 | 🔴 HIGH |
| C-003 | Soft Limit 경고 | row.total > soft_limit 시 사유 입력창 활성화 (저장 가능) | 🔴 HIGH |
| C-004 | 실시간 합계 계산 | 값 변경 시 소계·전체 합계 즉시 재계산 | 🔴 HIGH |
| C-005 | 항목 추가/삭제 | 행 추가, 체크박스 일괄 삭제 | 🔴 HIGH |
| C-006 | DB 동적 로드 | 하드코딩 제거. CALC_GROUNDS_MASTER에서 usage_type 기반 필터 | 🔴 HIGH |
| C-007 | 단가 고정 정책 | 저장된 unitPrice는 고정. 신규 행 추가 시만 최신 단가 로드 | 🔴 HIGH |

### 4.2 직접학습형 전용 요구사항

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|---------|
| S-001 | 2중 승산 입력 | 항목 \| 단가 \| 인원(명) \| 소계 \| 비고. 소계 = 단가 × 인원 | 🔴 HIGH |
| S-002 | 단가 직접 수정 | 기준단가 자동 입력 후 사용자가 수정 가능 | 🔴 HIGH |
| S-003 | DB 항목 동적 로드 | usage_type='self_learning' 항목만 드롭다운 표시 | 🔴 HIGH |
| S-004 | 해외 항목 조건부 표시 | region=overseas 선택 시 is_overseas=true 항목 추가 표시 | 🟠 MEDIUM |
| S-005 | 해외 항목 해제 시 경고 | 해외→국내 전환 시 해외 항목이 있으면 삭제 유도 경고 | 🟠 MEDIUM |

### 4.3 교육운영형 전용 요구사항

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|---------|
| O-001 | 3중 승산 입력 | 단가 × qty1(인원) × qty2(박/일/회) × qty3(차수) = 소계 | 🔴 HIGH |
| O-002 | 차수(qty3) 전면 지원 | plans.js(교육계획)와 apply.js(교육신청) **모두** 차수 컬럼 포함 | 🔴 HIGH |
| O-003 | 동적 컬럼 표시 | has_qty2=false인 항목은 qty2 컬럼 숨김. has_rounds=false면 차수 컬럼 숨김 | 🔴 HIGH |
| O-004 | 장소 드롭다운 연동 | 항목 선택 시 DB에 장소별 단가 있으면 장소 드롭다운 자동 표시 | 🔴 HIGH |
| O-005 | 프리셋 드롭다운 연동 | 장소 선택 후 preset 목록 표시. 선택 시 단가·qty2 자동 입력 | 🔴 HIGH |
| O-006 | 직접입력 폴백 | "직접입력" 선택 시 단가·수량 직접 입력 | 🔴 HIGH |
| O-007 | 예상 인당 비용 표시 | 합계 ÷ max(qty1) 자동 계산 표시 | 🟠 MEDIUM |
| O-008 | DB 항목 동적 로드 | usage_type='edu_operation' 항목만 드롭다운 표시 | 🔴 HIGH |

### 4.4 BO 세부산출근거 관리 개선

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|---------|
| B-001 | 유형 필수 선택 | 항목 등록 시 usage_type 필수 선택: [직접학습용] / [교육운영용] ('both' 불가) | 🔴 HIGH |
| B-002 | has_rounds 설정 | 항목별 차수(qty3) 컬럼 활성화 여부 설정 | 🔴 HIGH |
| B-003 | has_qty2 설정 | 항목별 박/일/회(qty2) 컬럼 활성화 여부 설정 | 🔴 HIGH |
| B-004 | is_overseas 설정 | 항목이 해외 전용인지 여부 설정 | 🟠 MEDIUM |
| B-005 | 단가 calc_ground_id 연결 | 단가 등록 시 항목을 ID 기반 드롭다운으로 선택 (TEXT 참조 폐기) | 🔴 HIGH |
| B-006 | 프리셋 등록 | 장소+항목 조합으로 프리셋(이름·단가·qty2_value) 등록 | 🔴 HIGH |
| B-007 | 유형별 항목 필터 탭 | BO 목록에 [전체 / 직접학습용 / 교육운영용] 탭 필터 추가 | 🟠 MEDIUM |
| B-008 | 헤더 장소 멀티 선택 | 교육계획 헤더 장소 필드 → 멀티 선택 지원 (TAG 형식) | 🟠 MEDIUM |

---

## 5. DB 스키마

### 5.1 calc_grounds (항목 마스터) — 변경

```sql
ALTER TABLE calc_grounds
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'edu_operation',
  -- 'self_learning' | 'edu_operation'  (⚠️ 'both' 사용 불가 — 항목 완전 분리 정책)
  
  ADD COLUMN IF NOT EXISTS has_rounds BOOLEAN DEFAULT false,
  -- true = 차수(qty3) 컬럼 활성화
  
  ADD COLUMN IF NOT EXISTS has_qty2 BOOLEAN DEFAULT false,
  -- true = 박/일/회(qty2) 컬럼 활성화
  -- self_learning 항목은 항상 false
  
  ADD COLUMN IF NOT EXISTS qty2_type TEXT DEFAULT '박',
  -- qty2 활성 시 단위 표시: '박' | '일' | '회'
  
  ADD COLUMN IF NOT EXISTS is_overseas BOOLEAN DEFAULT false;
  -- true = 해외 선택 시에만 직접학습형 드롭다운에 표시
```

**⚠️ 비판적 기획자 노트**: `usage_type` DEFAULT를 'edu_operation'으로 설정. BO에서 신규 항목 등록 시 필수 선택이므로 DEFAULT는 저장 실패 방어용.

### 5.2 calc_ground_unit_prices (장소별 단가) — 변경

```sql
ALTER TABLE calc_ground_unit_prices
  ADD COLUMN IF NOT EXISTS calc_ground_id TEXT,
  -- ID 기반 연결. NULL이면 calc_ground_name 레거시 폴백

  ADD COLUMN IF NOT EXISTS preset_name TEXT,
  -- 세부항목 이름 (예: '3박 4일', '조식')

  ADD COLUMN IF NOT EXISTS qty2_value NUMERIC DEFAULT 1,
  -- preset 선택 시 자동 입력할 qty2 값 (예: 3박4일 → qty2=3)

  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;
  -- 드롭다운 표시 순서
```

### 5.3 plans/apply 상태 구조 변경

#### 직접학습형 (applyState.expenses[]) — itemId 추가

```javascript
{
  itemId: 'CG-SL-001',   // NEW: calc_grounds.id (usage_type='self_learning')
  type: '교육참가비',     // 하드코딩 제거 후 DB name으로 대체
  price: 200000,          // unitPrice (저장 당시 고정)
  qty: 1,                 // qty1: 인원 (명)
  note: '',
  // total = price × qty
}
```

#### 교육운영형 (planState.calcGrounds[] / applyState.calcGrounds[]) — 3중 승산 확장

```javascript
{
  itemId: 'CG-OP-004',        // calc_grounds.id (usage_type='edu_operation')
  venueName: '현대인재개발원', // 선택한 장소 (null = 직접입력)
  presetName: '3박 4일',      // 선택한 preset (null = 직접입력)
  unitPrice: 80000,           // 저장 당시 단가 고정
  qty1: 20,                   // 인원 (명)
  qty2: 3,                    // 박/일/회 (has_qty2=true만, null = 해당 없음)
  qty2Type: '박',             // 항목의 qty2_type
  qty3: 2,                    // 차수 (has_rounds=true만)
  total: 960000,              // = unitPrice × qty1 × (qty2||1) × qty3
  limitOverrideReason: '',
}
```

#### planState.locations — 멀티 장소

```javascript
// AS-IS
planState.location = '현대인재개발원'  // 단일 문자열

// TO-BE
planState.locations = ['현대인재개발원', '사내강의장']  // 배열 (선택사항)
```

---

## 6. 핵심 비즈니스 로직

### 6.1 유형 결정 알고리즘

```javascript
function _getCalcGroundsType(purposeId, formTargetType) {
  // 1순위: purpose.id
  if (purposeId === 'external_personal') return 'self_learning';
  if (['internal_edu','conf_seminar','misc_ops','elearning_class'].includes(purposeId))
    return 'edu_operation';
  // 2순위: form_template.target_type 폴백
  if (formTargetType === 'learner') return 'self_learning';
  return 'edu_operation';
}
```

### 6.2 소계 계산 공식

```
// 직접학습형
total = unitPrice × qty1

// 교육운영형
total = unitPrice × qty1 × (qty2 || 1) × (qty3 || 1)
  - qty2: has_qty2=false 항목은 null → 1로 처리
  - qty3: has_rounds=false 항목은 null → 1로 처리
```

### 6.3 항목 필터링 알고리즘

```javascript
function _getCalcGroundsForType(type, vorgId, isOverseas) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (!g.active) return false;
    if (g.vorg_template_id && g.vorg_template_id !== vorgId) return false;
    if (g.usage_type !== type) return false;  // 엄격한 유형 매칭 (both 없음)
    if (g.is_overseas && !isOverseas) return false;  // 해외 항목: 해외 선택 시만
    return true;
  });
}
```

### 6.4 단가 고정 정책 알고리즘

```javascript
// 신규 행 추가 시: 최신 단가 로드
function _addCalcGroundRow(itemId) {
  const item = CALC_GROUNDS_MASTER.find(g => g.id === itemId);
  return {
    itemId,
    unitPrice: item?.unitPrice || 0,  // 최신 단가
    qty1: 1, qty2: item?.has_qty2 ? 1 : null, qty3: item?.has_rounds ? 1 : null,
    ...
  };
}

// 기존 행 재진입(임시저장 복원): unitPrice 그대로 유지
// → DB에서 불러온 값 그대로 사용, 최신 단가로 덮어쓰지 않음
// → 선택적: "최신 단가로 갱신" 버튼 제공
```

### 6.5 장소별 단가 로드 (교육운영형)

```
항목 선택 (itemId = CG-OP-004, 숙박비)
    │
    ├─ CALC_GROUND_UNIT_PRICES 조회: calc_ground_id='CG-OP-004'
    │  ├─ 결과 있음 → 장소 목록 추출 → 장소 드롭다운 표시
    │  └─ 결과 없음 → 장소 드롭다운 없음, 단가/수량 직접 입력
    │
장소 선택 ('현대인재개발원')
    └─ preset 목록: ['1박', '2박3일', '3박4일', '직접입력']
        → '3박4일' 선택: unitPrice=80,000 / qty2=3 자동 입력
        → '직접입력' 선택: unitPrice·qty2 빈칸 직접 입력
```

---

## 7. 엣지 케이스 분석 (18건)

| # | 유형 | 케이스 | 처리 방식 |
|---|------|--------|----------|
| E1 | 공통 | 목적 변경 시 기입력 산출근거 | 유형이 달라지면 행 초기화 + 확인 다이얼로그 |
| E2 | 공통 | DB 로드 실패(오프라인) | CALC_GROUNDS_MASTER 인메모리 캐시 폴백. 오류 표시 없이 진행 |
| E3 | 공통 | Soft Limit 초과 사유 미입력 | 제출 차단, 해당 행 하이라이트 |
| E4 | 공통 | Hard Limit 초과 | 소계 빨간 표시, 저장/제출 버튼 비활성화 |
| E5 | 공통 | 세부산출근거 0건 제출 | 0원으로 허용 (예산 차감 0원 처리) |
| E6 | 공통 | 단가 재진입 시 최신 단가 알림 | 저장 당시 단가 고정 유지. 선택적 "갱신" 버튼 제공 |
| E7 | 직접학습 | region=overseas 전환 시 | is_overseas=true 항목 드롭다운에 추가 |
| E8 | 직접학습 | overseas → 국내 전환 시 해외 항목 행 존재 | "해외 항목이 포함되어 있습니다. 제거하시겠습니까?" 경고 |
| E9 | 직접학습 | usage_type='self_learning' 항목 0건 (BO 미등록) | "등록된 항목이 없습니다. 관리자에게 문의하세요." 표시 |
| E10 | 교육운영 | qty2=0 입력 | ⚠️ 경고 표시 (소계=0이 되는 의도치 않은 입력) |
| E11 | 교육운영 | qty3=0 입력 | qty3=1로 자동 보정 (차수 0은 논리적 불가) |
| E12 | 교육운영 | 같은 항목 다른 장소 2행 입력 | 허용. 별도 행으로 관리 |
| E13 | 교육운영 | 항목 변경 시 장소/preset 초기화 | venueName, presetName, qty2 초기화. qty1·qty3·unitPrice는 유지 |
| E14 | 교육운영 | has_qty2=false인데 qty2 값이 DB에 존재 | qty2 무시, 컬럼 숨기고 계산에서 제외 |
| E15 | 교육운영 | apply.js에서도 차수 포함 | plans.js와 동일 구조. qty3 컬럼 표시. 기본값=1 |
| E16 | BO | 기존 calc_ground_name TEXT 레거시 데이터 | calc_ground_id 우선, null이면 name 폴백 |
| E17 | BO | usage_type 미지정 항목 (레거시) | 기본값 'edu_operation'으로 처리 |
| E18 | 헤더 장소 | locations=[] (선택 안 함) | 허용. 필수 아님. 저장 시 빈 배열 |

---

## 8. 데이터 흐름 (End-to-End)

```
[BO 관리자]
1. 세부산출근거 항목 등록
   ├─ 교육참가비 [직접학습용]: usage_type='self_learning', has_rounds=false, has_qty2=false
   ├─ 교육참가비 [교육운영용]: usage_type='edu_operation', has_rounds=true, has_qty2=false
   ├─ 숙박비 [교육운영용]: usage_type='edu_operation', has_rounds=true, has_qty2=true, qty2_type='박'
   └─ 시험응시료 [직접학습용]: usage_type='self_learning', has_rounds=false, is_overseas=false

2. 장소별 단가 등록 (교육운영형 전용)
   ├─ 숙박비[운영] + 현대인재개발원 + "1박" → 80,000원, qty2_value=1
   ├─ 숙박비[운영] + 현대인재개발원 + "3박4일" → 80,000원, qty2_value=3
   └─ 숙박비[운영] + 리솜스파캐슬 + "1박" → 150,000원, qty2_value=1

[FO — 직접학습형 (external_personal)]
목적 선택 → _getCalcGroundsType → 'self_learning'
  └─ 항목: [교육참가비(직접학습), 교보재비, 시험응시료, ...]
  └─ 입력: 단가 × 인원 = 소계 (2중)

[FO — 교육운영형 (internal_edu 등)]
목적 선택 → _getCalcGroundsType → 'edu_operation'
  └─ 항목: [교육참가비(운영), 숙박비(운영), 식비(운영), ...]
  └─ 숙박비 선택 → 장소 드롭다운 → 현대인재개발원 선택
     → 3박4일 preset → unitPrice=80,000, qty2=3 자동 입력
     → 인원 20, 차수 2 → 소계 = 80,000 × 20 × 3 × 2 = 9,600,000원
```

---

## 9. 접근 권한

| 역할 | BO 항목 등록 | usage_type 설정 | BO 단가 등록 | FO 입력 |
|------|------------|----------------|------------|--------|
| platform_admin | ✅ 전사 | ✅ | ✅ 전사 | ✅ |
| tenant_global_admin | ✅ 테넌트 | ✅ | ✅ 테넌트 | ✅ |
| budget_global_admin | ✅ 담당 VOrg | ✅ | ✅ 담당 | ✅ |
| budget_op_manager | ❌ | ❌ | ✅ 담당 | ✅ |
| 학습자(일반) | ❌ | ❌ | ❌ | ✅ |

---

## 10. 개발 계획 (Phase별)

### Phase 1: DB 마이그레이션
**calc_grounds 테이블**
```sql
ALTER TABLE calc_grounds
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'edu_operation',
  ADD COLUMN IF NOT EXISTS has_rounds BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_qty2 BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS qty2_type TEXT DEFAULT '박',
  ADD COLUMN IF NOT EXISTS is_overseas BOOLEAN DEFAULT false;

-- 기존 항목 backfill ('edu_operation'으로 일괄)
UPDATE calc_grounds SET usage_type = 'edu_operation'
WHERE usage_type IS NULL OR usage_type = '';

-- 직접학습형 항목 신규 INSERT (기존 하드코딩 대응)
INSERT INTO calc_grounds (id, name, usage_type, has_rounds, has_qty2, vorg_template_id, active)
VALUES
  ('CG-SL-001', '교육참가비', 'self_learning', false, false, NULL, true),
  ('CG-SL-002', '교보재비', 'self_learning', false, false, NULL, true),
  ('CG-SL-003', '시험응시료', 'self_learning', false, false, NULL, true),
  ('CG-SL-004', '항공료', 'self_learning', false, false, NULL, true),  -- is_overseas=true
  ('CG-SL-005', '해외숙박비', 'self_learning', false, false, NULL, true);  -- is_overseas=true

UPDATE calc_grounds SET is_overseas = true WHERE id IN ('CG-SL-004', 'CG-SL-005');
```

**calc_ground_unit_prices 테이블**
```sql
ALTER TABLE calc_ground_unit_prices
  ADD COLUMN IF NOT EXISTS calc_ground_id TEXT,
  ADD COLUMN IF NOT EXISTS preset_name TEXT,
  ADD COLUMN IF NOT EXISTS qty2_value NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;
```

### Phase 2: BO UI 개선 (bo_calc_grounds.js)

- **항목 등록 모달**: `usage_type` 라디오 필수 선택 (직접학습용/교육운영용)
- **항목 등록 모달**: `has_rounds`, `has_qty2`, `qty2_type`, `is_overseas` 토글 추가
- **항목 목록**: [전체/직접학습용/교육운영용] 탭 필터
- **단가 등록 모달**: `calc_ground_id` 드롭다운 + `preset_name` + `qty2_value` 입력

### Phase 3: FO 공통 유틸 (bo_calc_grounds.js 하단 전역 함수)

```javascript
window._getCalcGroundsType = function(purposeId, formTargetType) { ... }
window._getCalcGroundsForType = function(type, vorgId, isOverseas) { ... }
window._loadUnitPricesForItem = async function(itemId) { ... }
window._calcGroundTotal = function(row) {
  return row.unitPrice * row.qty1 * (row.qty2 || 1) * (row.qty3 || 1);
}
```

### Phase 4-A: 직접학습형 개선 (apply.js)

- Step4 세부산출근거 섹션 L1616~1644 교체
- 하드코딩 options 제거 → `_getCalcGroundsForType('self_learning', vorgId, isOverseas)` 동적 로드
- 선택 시 `calc_grounds.unit_price` 기준단가 자동 입력
- `expenses[i].itemId` 추가
- 소계: `unitPrice × qty1`

### Phase 4-B: 교육운영형 재설계 (plans.js + apply.js)

- `_renderCalcGroundsSection()` 전면 재작성
- 컬럼: 체크박스 | 항목 | 세부항목(장소+프리셋) | 단가 | 인원(명) | qty2(박/일) | 차수 | 소계 | 삭제
- 동적 컬럼: has_qty2=false → qty2 열 숨김, has_rounds=false → 차수 열 숨김
- 장소 드롭다운 → preset 드롭다운 → 단가/qty2 자동 입력
- **apply.js도 동일 구조 적용** (차수 포함, ① 결정 반영)
- 예상 인당 비용 = 합계 ÷ max(row.qty1) 표시

### Phase 5: 헤더 장소 멀티 선택 (plans.js)

- `planState.location` (단일) → `planState.locations` (배열) 변경
- 선택 UI: TAG 형식 멀티 선택 (교육장소 마스터 또는 텍스트 입력)
- 선택사항 — 미선택 허용

### Phase 6: 검증

- BO에 직접학습형/교육운영형 항목 각각 등록, 필드 구분 확인
- FO 직접학습: external_personal → DB 항목 로드 → 2중 계산
- FO 교육운영: internal_edu → DB 항목 로드 → 장소/프리셋 → 3중 계산
- apply.js에서 차수 컬럼 정상 표시 및 계산 확인
- 임시저장 후 재진입 시 단가 고정 유지 확인
- 해외 선택 시 is_overseas=true 항목 추가 확인

---

## 11. 기획자 검토 완료 항목 (v3 확정)

| 항목 | 결정 | 비고 |
|------|------|------|
| ~~차수 포함 범위~~ | ✅ plans + apply 모두 포함 | |
| ~~헤더 장소 처리~~ | ✅ 선택사항 + 멀티 선택 | |
| ~~단가 소급 적용~~ | ✅ 신규 작성분만 적용 | |
| ~~하드코딩 제거~~ | ✅ DB 동적 로드 전면 전환 | |
| ~~항목 유형 분리~~ | ✅ 항목 레벨 완전 분리, 'both' 폐기 | |

---

## 12. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|-------|
| 2026-04-16 | v1 최초 작성 | AI |
| 2026-04-16 | v2 직접학습형/교육운영형 2유형 분리 설계, 양식 빌더 연동 섹션 추가 | AI |
| 2026-04-16 | v3 **확정판**: 5개 결정사항 반영. ①차수 plans+apply 모두, ②헤더 장소 멀티 선택, ③단가 신규 작성분만 적용, ④하드코딩 전면 제거 DB 동적 로드, ⑤항목 완전 분리(both 폐기). DB 스키마 has_qty2 추가, 신규 직접학습형 항목 INSERT 스크립트, 엣지케이스 18건 | AI |
