# 교육예산 전체 라이프사이클 고도화 PRD

> **도메인**: 예산관리 (Budget Lifecycle)
> **관련 파일**: `bo_plan_mgmt.js`, `bo_budget_demand.js`, `bo_allocation.js`, `bo_budget_history.js`, `bo_forecast_period.js`
> **최초 작성**: 2026-04-16
> **최종 갱신**: 2026-04-16
> **상태**: 🔴 미구현 (설계 중)

---

## 1. 기능 개요

교육예산의 **계획 → 수요예측 → 배정 → 사용 → 정산** 전 과정을 하나의 일관된 데이터 흐름으로 연결하는 시스템 고도화.
현재는 각 화면이 독립적으로 동작하여 "계획금액 → 배정금액 → 실사용금액"의 흐름이 끊어져 있으며,
예산 시뮬레이션, 조직개편 이관, 통장 간 이관 등 실무 핵심 기능이 부재.

### 배경

- **현재**: 교육계획 리스트에 `계획액`만 표시. 배정금액·실사용금액 컬럼 없음.
- **문제**: 총괄담당자가 "이 교육에 실제로 얼마를 배정했고, 결과적으로 얼마를 썼는지" 파악 불가.
- **목표**: 계획-배정-사용-잔액의 **4단계 금액 추적** 체계 완성.

---

## 2. 사용자 스토리

| # | 역할 | 스토리 |
|---|------|--------|
| US-01 | 제도그룹 총괄담당자 | 교육계획관리 화면에서 FO에서 상신된 교육계획의 **계획액·배정액·실사용액**을 한눈에 비교할 수 있다. |
| US-02 | 총괄담당자 | 수요예측 화면에서 **예상 예산안(Envelope)** 을 설정하고, 그 안에서 각 교육계획에 예산을 **시뮬레이션 배분** 할 수 있다. |
| US-03 | 총괄담당자 | 시뮬레이션 결과가 만족스러우면 **확정** 버튼으로 각 교육계획에 배정액을 일괄 확정할 수 있다. |
| US-04 | 총괄담당자 | 교육계획관리에서 이미 배정된 금액을 **교육계획 간 재조정**(이관)할 수 있다. |
| US-05 | 총괄담당자 | 리스트에서 **계획/수시** 구분, **전년도 계속/신규** 여부를 확인할 수 있다. |
| US-06 | 총괄담당자 | 계획 상세에서 **예산계정, 과정명, 참석인원** 등 기본정보를 확인할 수 있다. |
| US-07 | 총괄담당자 | 조직개편 시 교육계획을 새 조직에 **이관**하되, 예산 포함 여부를 선택할 수 있다. |
| US-08 | 총괄담당자 | 통장 생성 후 **같은 계정 내 통장 간 예산 이관**을 할 수 있다. |
| US-09 | 관리자 | 조직별로 계획액→배정액→신청액→승인액→실사용액→잔액의 **6단계 추적** 레포트를 볼 수 있다. |
| **US-10** | **총괄담당자** | **리스트 화면에서 상세화면 진입 없이, 엑셀처럼 배정액을 바로 수정하고 일괄 저장** 할 수 있다. **(★ 핵심 UX 요구사항)** |

---

## 3. 현행 시스템 갭 분석 (As-Is vs. To-Be)

### 3.1 교육계획관리 (bo_plan_mgmt.js) — 982행

| 항목 | As-Is | To-Be | 갭 |
|------|-------|-------|------|
| 리스트 컬럼 | 계획액만 | 계획액 + 배정액 + 실사용액 | 🔴 컬럼 추가 필요 |
| **리스트 편집 방식** | **상세화면 진입 후 수정** | **리스트에서 엑셀형 인라인 편집** | **🔴 핵심 UX 갭** |
| 계획 유형 구분 | forecast/ongoing 뱃지 | **계획(수요예측기간)** / **수시** 뱃지 | 🟡 라벨 변경 |
| 전년도 계속 여부 | 없음 | **계속** / **신규** 뱃지 | 🔴 `is_recurring` 컬럼 필요 |
| 상세 기본정보 | 계획명, 상신자, 소속, 교육목적, 교육유형, 계정, 계획액 | + **과정명**, **참석인원**, **교육기간** | 🟡 detail JSON에 존재 가능 |
| 배정액 입력 | 없음 | **리스트 인라인 입력** + 상세 뷰 보조 입력 | 🔴 핵심 기능 부재 |
| 실사용액 조회 | 없음 | applications 테이블 집계 연동 | 🔴 연동 로직 부재 |
| 교육계획 간 조정 | 없음 | 승인된 배정액을 계획 간 이관 | 🔴 신규 기능 |

### 3.2 예산수요분석 (bo_budget_demand.js) — 694행

| 항목 | As-Is | To-Be | 갭 |
|------|-------|-------|------|
| 예상 예산안(Envelope) | 없음 | **예산 총액** 설정 + 시뮬레이션 | 🔴 핵심 기능 부재 |
| 배분 시뮬레이션 | 없음 | 각 교육계획별 배분금액 입력 → What-if 분석 | 🔴 신규 기능 |
| 배정 확정 | 없음 → 별도 승인만 | 시뮬레이션→확정 워크플로우 | 🔴 워크플로우 부재 |
| 통장 연동 여부 | 수요분석과 통장 독립 | 예산안은 통장과 독립 동작 | ✅ 설계에 반영 |

### 3.3 예산배정 및 관리 (bo_allocation.js) — 73,058행

| 항목 | As-Is | To-Be | 갭 |
|------|-------|-------|------|
| 통장 간 이관 | UI 존재 | 같은 계정 내 통장만 이관 가능 제약 | 🟡 검증 로직 추가 |
| 조직개편 이관 | 없음 | 교육계획+예산 선택적 이관 | 🔴 신규 기능 |
| DB 테이블 | bankbooks/allocations 테이블 미존재 | 테이블 생성 필요 | 🔴 스키마 부재 |

### 3.4 예산 사용이력 (bo_budget_history.js) — 19,490행

| 항목 | As-Is | To-Be | 갭 |
|------|-------|-------|------|
| 사용이력 로그 | UI 존재 | budget_usage_log 테이블 미존재 | 🔴 스키마 부재 |
| 6단계 추적 레포트 | 없음 | 계획→배정→신청→승인→실사용→잔액 | 🔴 신규 기능 |

---

## 4. 상세 기능 요구사항

### Phase 1: 교육계획 리스트 고도화 (🔴 HIGH)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| F-001 | 리스트 3컬럼 체계 | `계획액` → `배정액` → `실사용액` 3개 금액 컬럼 표시 | 🔴 HIGH |
| F-002 | 계획유형 뱃지 | `📅 계획` (수요예측기간 내 제출) / `📝 수시` (기간 외 제출) | 🔴 HIGH |
| F-003 | 전년도 계속 뱃지 | `🔄 계속` (전년도 교육 이어가기) / `🆕 신규` | 🔴 HIGH |
| F-004 | 상세 기본정보 확장 | 과정명, 참석인원, 교육기관명 표시 | 🟡 MED |
| ~~F-005~~ | ~~배정액 입력 UI (상세 뷰)~~ | ~~상세 뷰 내 입력 필드~~ → F-008로 대체 | ~~취소~~ |
| F-006 | 실사용액 자동 집계 | `applications` 테이블에서 해당 plan_id의 승인된 금액 합산 | 🟡 MED |
| F-007 | 교육계획 간 예산 조정 | 동일 계정 내 승인된 계획 간 배정액 이전 | 🟡 MED |

#### ★ 엑셀형 인라인 편집 UX (고객 핵심 요구사항)

> **"상세화면에 들어가서 하나씩 수정하는 것은 싫다. 리스트에서 금액을 바로 고치고 저장하고 싶다."**

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| **F-008** | **인라인 편집 모드 전환** | 리스트 상단에 `✏️ 편집 모드` 토글 버튼. 클릭 시 배정액 컬럼이 `<input type="number">` 로 전환 | **🔴 CRITICAL** |
| **F-009** | **셀 직접 수정 (엑셀 UX)** | 편집 모드에서 배정액 셀을 클릭하면 즉시 입력 가능. Tab 키로 다음 행 이동. Enter 키로 확인 | **🔴 CRITICAL** |
| **F-010-a** | **변경 감지 & 하이라이트** | 수정된 셀은 노란색 배경(`#FFFBEB`)으로 강조 표시. 원래 값과 비교하여 변경 여부 시각적 피드백 | **🔴 CRITICAL** |
| **F-010-b** | **합계 실시간 갱신** | 인라인 수정 시 하단 합계 행의 배정액 합계가 실시간 재계산 | **🔴 CRITICAL** |
| **F-010-c** | **일괄 저장 버튼** | 편집 모드 시 상단에 `💾 일괄 저장 (N건 변경)` 버튼 표시. 변경된 행만 Supabase batch update | **🔴 CRITICAL** |
| **F-010-d** | **변경 취소** | `↩ 취소` 버튼으로 모든 수정사항 원복. 저장 전이면 원래 값으로 리셋 | **🟡 MED** |
| **F-010-e** | **수요예측 동일 UX 적용** | `bo_budget_demand.js` 시뮬레이션 그리드도 동일한 인라인 편집 UX 적용 (Envelope 안에서 배분액 수정) | **🔴 CRITICAL** |

##### 인라인 편집 상세 UX 시나리오

```
[일반 모드]
┌──────┬──────────┬──────┬──────────┬──────────┬──────────┬──────┐
│ 유형 │ 계획명   │ 계정 │ 계획액   │ 배정액   │ 실사용액 │ 상태 │
├──────┼──────────┼──────┼──────────┼──────────┼──────────┼──────┤
│ 계획 │ AI교육   │ 일반 │ 500만    │ 400만    │ 380만    │ 승인 │
│ 수시 │ 어학연수 │ 일반 │ 300만    │ 250만    │ -        │ 대기 │
└──────┴──────────┴──────┴──────────┴──────────┴──────────┴──────┘
                              ↓ [✏️ 편집 모드] 클릭
[편집 모드] ── 💾 일괄 저장 (0건 변경)  ↩ 취소
┌──────┬──────────┬──────┬──────────┬─────────────┬──────────┬──────┐
│ 유형 │ 계획명   │ 계정 │ 계획액   │ 배정액 ✏️   │ 실사용액 │ 상태 │
├──────┼──────────┼──────┼──────────┼─────────────┼──────────┼──────┤
│ 계획 │ AI교육   │ 일반 │ 500만    │ [  400만  ] │ 380만    │ 승인 │
│ 수시 │ 어학연수 │ 일반 │ 300만    │ [  250만  ] │ -        │ 대기 │
├──────┴──────────┴──────┴──────────┼─────────────┼──────────┼──────┤
│                           합 계   │    650만    │  380만   │      │
└───────────────────────────────────┴─────────────┴──────────┴──────┘
                              ↓ 450만으로 수정
┌──────┬──────────┬──────┬──────────┬──────────────┬──────────┬──────┐
│ 계획 │ AI교육   │ 일반 │ 500만    │ [⚡ 450만  ] │ 380만    │ 승인 │  ← 노란 배경
└──────┴──────────┴──────┴──────────┴──────────────┴──────────┴──────┘
                     💾 일괄 저장 (1건 변경) 클릭 → DB UPDATE
```

### Phase 2: 수요예측 시뮬레이션 (🔴 HIGH)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| F-010 | 예상 예산안(Envelope) 설정 | 계정별 또는 제도그룹별 예상 총액 입력 | 🔴 HIGH |
| F-011 | 배분 시뮬레이션 테이블 | 각 교육계획별 "신청액 vs 배분액" 편집 가능 그리드 | 🔴 HIGH |
| F-012 | 잔여 예산 실시간 표시 | Envelope − Σ(배분액) = 잔여 → 음수 시 경고 | 🔴 HIGH |
| F-013 | 시뮬레이션 버전 관리 | 여러 시나리오 저장 & 비교 (v1, v2...) | 🟢 LOW |
| F-014 | 배정 확정 | 시뮬레이션 → 확정 시 plans.allocated_amount에 일괄 반영 | 🔴 HIGH |
| F-015 | 통장과 독립 동작 | Envelope는 실제 bankbook balance와 무관하게 시뮬레이션용 | 🔴 HIGH |

### Phase 3: 조직개편 이관 (🔴 HIGH)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| F-020 | 이관 대상 선택 | 원천 조직(팀)의 교육계획 리스트 → 체크박스 선택 | 🔴 HIGH |
| F-021 | 이관 옵션 | ① 교육계획만 이관 ② 교육계획+배정예산 이관 | 🔴 HIGH |
| F-022 | 대상 조직 지정 | 신규 조직(팀) 드롭다운 선택 → applicant_org_id 변경 | 🔴 HIGH |
| F-023 | 이관 이력 기록 | `org_transfer_log` 테이블에 원천→대상, 금액, 일시 기록 | 🟡 MED |

### Phase 4: 통장 간 이관 (🟡 MED)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| F-030 | 같은 계정 통장 간 이관 | 원천 bankbook → 대상 bankbook, 이관액 입력 | 🔴 HIGH |
| F-031 | 다른 계정 이관 차단 | account_code가 다른 통장 간 이관 시도 시 에러 | 🔴 HIGH |
| F-032 | 잔액 검증 | 원천 통장 잔액 < 이관액 시 거부 | 🔴 HIGH |
| F-033 | 이관 이력 기록 | budget_usage_log에 transfer_out/transfer_in 쌍 기록 | 🟡 MED |

### Phase 5: 6단계 추적 레포트 (🟡 MED)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|----------|
| F-040 | 조직별 예산 추적 카드 | 계획액→배정액→신청액→승인액→실사용액→잔액 워터폴 차트 | 🟡 MED |
| F-041 | 드릴다운 | 조직→교육계획→교육신청→교육결과 순서로 클릭 탐색 | 🟡 MED |
| F-042 | 집행률 대시보드 | 배정대비 집행률, 계획대비 배정률 시각화 | 🟢 LOW |

---

## 5. DB/데이터 구조

### 5.1 plans 테이블 변경 (기존)

```sql
-- 신규 컬럼 추가
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allocated_amount BIGINT DEFAULT 0;
  -- 배정액 (수요예측에서 확정 or 교육계획관리에서 직접 입력)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS actual_amount BIGINT DEFAULT 0;
  -- 실사용액 (교육결과 확정 후 집계)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
  -- 전년도 계속 교육 여부
ALTER TABLE plans ADD COLUMN IF NOT EXISTS prev_plan_id TEXT;
  -- 전년도 원본 plan ID (계속 교육 추적용)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS course_name TEXT;
  -- 과정명 (detail JSON 중복이지만 검색/정렬 용도)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;
  -- 참석인원
ALTER TABLE plans ADD COLUMN IF NOT EXISTS transferred_from_org TEXT;
  -- 조직개편 이관 원천 조직명
ALTER TABLE plans ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
  -- 이관 일시
```

### 5.2 budget_simulation (신규 테이블)

```sql
CREATE TABLE budget_simulation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  template_id TEXT,                              -- virtual_org_template_id
  account_code TEXT,                             -- 대상 예산계정
  envelope_amount BIGINT NOT NULL DEFAULT 0,     -- 예상 예산안 총액
  version INTEGER NOT NULL DEFAULT 1,            -- 시뮬레이션 버전
  version_label TEXT,                            -- 예: "최초안", "조정안1"
  allocations JSONB NOT NULL DEFAULT '[]',       -- [{plan_id, plan_name, requested, allocated, memo}]
  status TEXT NOT NULL DEFAULT 'draft',          -- draft / confirmed
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 org_transfer_log (신규 테이블)

```sql
CREATE TABLE org_transfer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  from_org_id TEXT,                -- 원천 조직 ID
  from_org_name TEXT,              -- 원천 조직명
  to_org_id TEXT,                  -- 대상 조직 ID
  to_org_name TEXT,                -- 대상 조직명
  include_budget BOOLEAN DEFAULT FALSE,  -- 예산 포함 이관 여부
  transferred_amount BIGINT DEFAULT 0,   -- 이관된 배정액
  transferred_by TEXT,
  transferred_at TIMESTAMPTZ DEFAULT NOW(),
  memo TEXT
);
```

### 5.4 bankbooks 테이블 (신규 — 예산배정의 기반)

```sql
CREATE TABLE bankbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  account_code TEXT NOT NULL,           -- 예산계정 코드
  org_id TEXT,                          -- 조직 ID (팀/부서)
  org_name TEXT,                        -- 조직명
  template_id TEXT,                     -- virtual_org_template_id
  group_id TEXT,                        -- VOrg 그룹(본부) ID
  fiscal_year INTEGER NOT NULL,
  initial_amount BIGINT DEFAULT 0,      -- 최초 배정액
  current_balance BIGINT DEFAULT 0,     -- 현재 잔액
  frozen_amount BIGINT DEFAULT 0,       -- 동결액
  status TEXT DEFAULT 'active',         -- active / closed / suspended
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 budget_usage_log 테이블 (신규)

```sql
CREATE TABLE budget_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  bankbook_id UUID REFERENCES bankbooks(id),
  action TEXT NOT NULL,       -- allocate/adjust/freeze/use/transfer_in/transfer_out/release/carryover/topup
  amount BIGINT NOT NULL,
  balance_before BIGINT,
  balance_after BIGINT,
  reference_type TEXT,        -- plan/application/simulation/transfer
  reference_id TEXT,          -- 참조 ID
  memo TEXT,
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. 비즈니스 로직

### 6.1 금액 흐름 정의

```
[계획액]                    FO에서 상신한 교육계획 금액 (plans.amount)
  ↓ 수요예측 또는 직접 입력
[배정액]                    총괄담당자가 실제 배정한 금액 (plans.allocated_amount)
  ↓ 사용자가 교육신청
[신청액]                    개별 교육신청 금액 (applications.amount)
  ↓ 승인 프로세스
[승인액]                    승인된 교육신청 금액 (applications WHERE status='approved')
  ↓ 교육 이수 후
[실사용액]                  확정된 최종 사용금액 (plans.actual_amount, 교육결과 기반)
  ↓
[잔액]                      배정액 − 실사용액
```

### 6.2 수요예측 시뮬레이션 워크플로우

```
1. Envelope 설정: "내년도 이 계정에 약 5억을 쓸 수 있을 것 같다"
2. 교육계획 나열: 해당 계정의 submitted 교육계획 목록 (plan_type='forecast')
3. 시뮬레이션: 각 교육계획에 배분금액 수동 입력
   - 잔여 = Envelope - Σ(배분) → 실시간 표시
   - 음수 → 빨간 경고 "예산 초과"
4. 저장: draft 상태로 저장 (여러 버전 가능)
5. 확정: confirmed 시 → plans.allocated_amount 일괄 업데이트
   - ⚠️ 통장(bankbook)이 아직 없어도 동작 (예상 예산안이므로)
   - ⚠️ 나중에 실제 통장이 만들어지면 allocated_amount 기준으로 bankbook 초기화
```

### 6.3 교육계획 간 예산 조정 규칙

```
- 같은 계정(account_code) + 같은 fiscal_year 내에서만 조정 가능
- 원천 계획의 allocated_amount ≥ 조정액 (배정잔액 초과 불가)
- 원천 계획의 allocated_amount에서 차감, 대상 계획에 가산
- budget_usage_log에 기록 (action='adjust')
```

### 6.4 조직개편 이관 규칙

```
- 원천 조직의 모든 교육계획 또는 선택한 교육계획을 대상 조직으로 이전
- 옵션 ①: 교육계획만 이관 → applicant_org_id만 변경
- 옵션 ②: 교육계획+예산 이관 → applicant_org_id + allocated_amount 유지
  - 원천 통장에서 차감 → 대상 통장에 가산 (통장이 있는 경우)
  - 통장이 아직 없으면 plans.allocated_amount만 유지
- org_transfer_log에 이력 기록
```

### 6.5 통장 간 이관 규칙

```
- ⚠️ 같은 account_code (예산계정)의 통장만 서로 이관 가능
- 다른 계정 이관 시도 → "다른 예산계정 간 이관은 불가합니다" 에러
- 원천 통장 current_balance ≥ 이관액 (잔액 부족 시 거부)
- 양쪽 통장 balance 갱신 + budget_usage_log에 쌍(pair) 기록
```

---

## 7. 접근 권한

| 역할 | 리스트 조회 | 배정액 입력 | 시뮬레이션 | 확정 | 조직이관 | 통장이관 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| 플랫폼 관리자 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 테넌트 총괄 관리자 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 예산 총괄 관리자 | ✅ | ✅ | ✅ | ✅(자기 계정) | ✅ | ✅ |
| 예산 운영 담당 | ✅ | ✅(자기 관할) | 조회만 | ❌ | ❌ | ✅(자기 통장)  |
| 일반 사용자(FO) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 8. 예외 처리 및 엣지 케이스

### 🔴 비판적 기획자가 파헤친 핵심 엣지케이스

| # | 케이스 | 위험도 | 처리 방식 |
|---|--------|:---:|----------|
| EC-01 | **배정액 > 계획액** — 총괄이 계획보다 더 많이 배정하는 경우 | 🟡 | 허용하되, 경고 팝업: "계획액을 초과하여 배정합니다. 계속하시겠습니까?" |
| EC-02 | **Envelope = 0 상태에서 확정** — 예상 예산안 미설정 시 | 🔴 | 확정 버튼 비활성화 + "예상 예산안을 먼저 설정해 주세요" 안내 |
| EC-03 | **시뮬레이션 확정 후 새 교육계획 추가** — 이미 확정 후 추가 제출 | 🟡 | 추가분은 "수시" 유형으로 분류, 기존 확정에 영향 없음. 별도 배정 필요 |
| EC-04 | **실사용액 > 배정액** — 교육비가 예상보다 초과 | 🔴 | 금액 입력은 허용하되, 초과분 빨간 경고 표시. 추가 예산 배정 유도 |
| EC-05 | **조직개편 시 원천 통장에 잔액 없음** — 예산 포함 이관인데 잔액 0 | 🟡 | 이관은 진행하되, 금액은 0원 이관 처리. 별도 배정 필요 안내 |
| EC-06 | **동일 교육계획 중복 이관** — 이미 이관된 계획 재이관 시도 | 🔴 | transferred_at 체크 → "이미 이관된 교육계획입니다" 에러 |
| EC-07 | **수요예측 기간 마감 후 시뮬레이션 수정** — 마감 후 변경 시도 | 🟡 | 확정된 시뮬레이션은 수정 불가. 새 버전(v2)으로만 수정 가능 |
| EC-08 | **연도 경계 — 12월에 내년도 계획 vs 올해 계획** | 🟡 | fiscal_year 필터 철저 적용. 두 연도 계획이 혼재 시 연도별 탭 분리 |
| EC-09 | **통장 없는 상태에서 배정 확정** — bankbook 미생성 시 | 🔴 | 시뮬레이션 단계에서는 동작 허용 (통장 독립). 실제 집행 시점에 통장 존재 여부 검증 |
| EC-10 | **삭제된 교육계획에 배정액 존재** — soft delete 후 금액 불일치 | 🟡 | deleted_at IS NOT NULL인 계획의 allocated_amount는 집계에서 제외하되, 이력 보존 |
| EC-11 | **같은 조직에서 여러 계정의 교육계획 혼재** — 이관 시 계정 혼선 | 🔴 | 이관은 plan 단위로 수행. 계정별로 분리 표시하여 혼선 방지 |
| EC-12 | **예산 동결(freeze) 상태에서 이관 시도** | 🔴 | frozen_amount 차감 불가. "동결된 예산은 이관할 수 없습니다" 에러 |
| EC-13 | **복수 시뮬레이션 버전 간 확정 충돌** — v1 확정 후 v2도 확정 시도 | 🔴 | 한 계정+연도에 confirmed 시뮬레이션은 1개만. 재확정 시 기존 덮어쓰기 경고 |
| EC-14 | **전년도 계속 교육인데 전년 데이터 없음** — is_recurring=true지만 prev_plan_id 존재 안함 | 🟡 | prev_plan_id NULL 허용. "전년도 계획 미연결" 라벨 표시 |
| EC-15 | **FO에서 취소된 교육계획의 배정액 처리** — 신청자가 교육계획 취소 | 🔴 | status='cancelled' 전환 시 allocated_amount는 유지하되 "회수 가능" 뱃지 표시. 총괄이 수동으로 재배분 |
| EC-16 | **동시 수정 레이스 컨디션** — 두 관리자가 동시에 같은 계획의 배정액 수정 | 🟡 | 낙관적 잠금(Optimistic Lock): updated_at 비교 → 충돌 시 "다른 관리자가 수정했습니다. 새로고침해 주세요" |
| EC-17 | **부분 이관 — 팀의 교육계획 중 일부만 이관** | 🟡 | 체크박스 선택으로 부분 이관 지원. 잔여분은 원천 조직에 유지 |
| EC-18 | **실사용액 역전 — 교육 취소로 환불 발생** | 🟡 | actual_amount 마이너스 조정 허용 (환불 처리). budget_usage_log에 'refund' action 추가 |
| **EC-19** | **인라인 편집 중 다른 사용자가 동일 행 수정** — 동시 편집 충돌 | 🔴 | 저장 시 updated_at 비교 → 충돌 감지 → "다른 관리자가 이미 수정했습니다" 팝업 + 새로고침 유도 |
| **EC-20** | **인라인 편집 중 페이지 이탈** — 저장 안 된 변경사항 유실 | 🟡 | `beforeunload` 이벤트로 "저장하지 않은 변경사항이 있습니다" 경고. 편집 모드에서 메뉴 이동 시에도 동일 경고 |
| **EC-21** | **편집 모드에서 숫자 외 문자 입력** — 잘못된 형식 | 🟡 | `<input type="number">` + 클라이언트 검증. 음수 입력 차단 (min=0). 빈 값은 0으로 처리 |
| **EC-22** | **대량 수정 (50건+) 일괄 저장 시 네트워크 타임아웃** | 🟡 | 변경된 행만 batch update (최대 50건 단위 chunk). 진행률 표시 ("3/15건 저장 중...") |

---

## 9. 기획자 검토 필요 항목

### ⚠️ 정책 결정 필요

| # | 질문 | 결정 사항 | 결정 상태 |
|---|------|-----------|:---:|
| Q-01 | 배정액 입력은 **교육계획관리**에서 할지, **수요예측**에서 할지? | 수요예측에서 승인+배정, 교육계획에서 조정 | ✅ 확정 |
| Q-02 | 시뮬레이션 버전 최대 개수? | **최대 10개** + 오래된 것 자동 아카이브 | ✅ 확정 |
| Q-03 | 조직개편 이관 시 승인 워크플로우? | **불요** — 총괄담당자 직접 실행 + 이력 기록 | ✅ 확정 |
| Q-04 | 통장 간 이관 상한액? | **상한 없음** — 잔액 이내 전액 이관 가능 | ✅ 확정 |
| Q-05 | 실사용액 확정 기준 시점? | **교육결과 등록 시점**에 확정 | ✅ 확정 |
| Q-06 | 자동 배분 알고리즘 지원? | **수동 배분만** (1차). 자동 배분은 향후 검토 | ✅ 확정 |

### ⚠️ 기술적 위험

| 위험 | 영향도 | 대응 |
|------|:---:|------|
| `plans` 테이블 컬럼 추가 시 기존 FO 코드 영향 | 🟡 | 신규 컬럼은 모두 NULLABLE + DEFAULT 설정, FO 측 read-only |
| `bankbooks`/`budget_usage_log` 테이블 신규 생성 | 🔴 | Migration으로 안전하게 생성. allocation 탭 코드가 이미 해당 테이블 참조 중 → JS mock fallback 유지 |
| 시뮬레이션 대규모 데이터 (교육계획 500건+ 시) | 🟡 | 페이지네이션 + 가상 스크롤 적용. 시뮬레이션 allocations JSON 크기 모니터링 |
| 조직개편 대량 이관 (100건+) 시 트랜잭션 타임아웃 | 🔴 | Supabase Edge Function으로 서버사이드 배치 처리 권장 |

---

## 10. 개발 계획서

### Phase 순서 및 예상 공수

| Phase | 범위 | 핵심 산출물 | 우선순위 | 의존성 |
|-------|------|-----------|:---:|--------|
| **P1** | plans 테이블 스키마 확장 | DB Migration + 컬럼 추가 | 🔴 1순위 | 없음 |
| **P2** | 교육계획 리스트 고도화 + **엑셀형 인라인 편집** | bo_plan_mgmt.js 수정 (3컬럼, 뱃지, **인라인 편집 모드**, 일괄 저장) | **🔴 1순위 (CRITICAL UX)** | P1 |
| **P3** | ~~상세 뷰 배정액 입력~~ → **인라인 편집에 통합** | P2에 흡수. 상세 뷰는 조회 전용으로 전환 | 🔴 1순위 | P2 |
| **P4** | budget_simulation 테이블 + **인라인 편집 기반** 시뮬레이션 UI | bo_budget_demand.js 확장 (동일 인라인 UX 적용) | 🔴 1순위 | P1 |
| **P5** | 시뮬레이션 → 확정 워크플로우 | 확정 시 plans.allocated_amount 일괄 반영 | 🔴 1순위 | P4 |
| **P6** | bankbooks + budget_usage_log 테이블 생성 | DB Migration | 🟡 2순위 | P1 |
| **P7** | 통장 간 이관 (같은 계정 제약) | bo_allocation.js 수정 | 🟡 2순위 | P6 |
| **P8** | 조직개편 이관 기능 | 신규 UI + org_transfer_log | 🟡 2순위 | P1, P6 |
| **P9** | 6단계 추적 레포트 | 워터폴 차트 + 드릴다운 | 🟢 3순위 | P1~P6 |
| **P10** | 실사용액 자동 집계 연동 | applications → plans.actual_amount 동기화 | 🟢 3순위 | P6 |

### 개발 순서도

```
P1 (DB 스키마) ─────┬──→ P2 (리스트 고도화 + ★인라인 편집) ──→ P3 (상세뷰 조회전용)
                    │
                    ├──→ P4 (시뮬레이션 + ★인라인 편집) ──→ P5 (확정 워크플로우)
                    │
                    └──→ P6 (bankbooks 생성) ─┬──→ P7 (통장이관)
                                              ├──→ P8 (조직이관)
                                              └──→ P9 (추적 레포트) ──→ P10 (실사용액 집계)
```

---

## 11. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-16 | 최초 작성 — 9개 요구사항 분석, 갭 분석, 엣지케이스 18건, 개발 계획서 | AI (비판적 기획자 모드) |
| 2026-04-16 | **UX 요구사항 추가** — ★ 엑셀형 인라인 편집 (F-008~F-010-e), 엣지케이스 4건 추가 (EC-19~22), P2/P3 개발 계획 수정 | AI (고객 피드백 반영) |
