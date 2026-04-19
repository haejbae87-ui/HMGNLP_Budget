# 교육계획 N:1 교육신청 — 복수 계획 연동 요구사항 정의서 (PRD)

> **도메인**: 교육 신청 (Front Office + Back Office)
> **관련 파일**: `apply.js`, `plans.js`, `utils.js`, `fo_form_loader.js`
> **최초 작성**: 2026-04-18
> **최종 갱신**: 2026-04-18 (v1.3)
> **상태**: 🔴 미구현 — 기획 확정 단계
> **선행 PRD**: `learning_apply.md`, `field_standardization.md`, `form_simplification.md`

---

## 1. 기능 개요

### 고객의 핵심 니즈

> **"서로 다른 교육과정의 계획을 한 번에 모아서 신청하고, 리더(팀장/실장/센터장)는 1회만 결재하고 싶다."**

현재 시스템은 교육계획 1건 : 교육신청 1건 (1:1) 관계만 지원한다.
그러나 실무에서는 **다수의 승인된 교육계획을 하나의 신청서에 묶어 제출**하는
요구사항이 강하며, 그 핵심 동기는 **결재 부담 감소**이다.

### 문제점 (As-Is)

| 구분 | 현재 상태 | 문제 |
|------|---------|------|
| DB 구조 | `applications.plan_id` 단일 FK | N:1 관계 불가 |
| UI | "승인된 교육계획 선택 (2건)" 표시 | **실제로는 1건만 연결됨** (구현 안 됨) |
| 결재 | 과정마다 별도 신청 → 별도 결재 | 리더의 결재 피로 |
| 교육유형 | 계획에서 자동 가져오는 장점 | 복수 계획 시 "어떤 유형?" 모호 |

### As-Is 코드 (apply.js L83~94)

```javascript
// 현재: 단건 plan_id만 저장
const pl = JSON.parse(sessionStorage.getItem("_applyFromPlan"));
applyState.planId = pl.plan_id;   // ← 단일 값
applyState.title = pl.title;
```

---

### 설계 배경: 계획↔과정 디커플링 (v1.3)

#### 러닝라운지 (As-Is) — 타이트 커플링의 문제

```
교육계획 수립 → 📌과정 개설(직접 연결) → 차수 생성
          └─ 계획 ∋ 과정 (타이트 커플링)
              │
              └── 교육신청 시: 계획에 달린 과정-차수를 "선택"
```

**핵심 문제 — "바꿔치기":**
```
2025년 계획: "리더십 교육" → 과정 "리더십 집합교육" (1~3차수) ← 직접 연결
2026년: 같은 과정에 4~6차수를 추가하고 싶음
  → 2025년 계획에서 과정 연결을 끊어야 함 (바꿔치기)
  → 2025년 계획의 이력: "과정 연결 없음" ← 데이터 유실!
```

과정의 생명주기가 연도를 넘기기 때문에, 연도 단위 계획에 과정을 직접 물리면
**시간이 흐를수록 과거 데이터가 깨지는 근본적 구조 결함**이 발생한다.

#### 차세대 (To-Be) — 신청 시점 연결

```
교육계획 수립 (독립)     과정-차수 개설 (독립)
     │                        │
     └────── 교육신청 ─────────┘
             (이 시점에서 연결)

application_plan_items (교차 테이블)
  ├── plan_id ────→ 교육계획 (예산 근거 — "왜, 얼마나")
  ├── course_id ──→ LMS 과정 (운영 실체 — "무엇을, 어떻게")
  └── linked_sessions → 차수 (실행 단위)
```

**해결 결과:**
```
2025년 교육신청: 계획 "25년 리더십" + 과정 "리더십 집합교육" 1~3차수
2026년 교육신청: 계획 "26년 리더십" + 과정 "리더십 집합교육" 4~6차수

→ 두 계획 모두 이력 완전 보존
→ 바꿔치기 불필요
→ "리더십 과정은 어떤 연도의 어떤 계획 예산으로 운영됐는가?" 양방향 역추적 가능
```

#### 이 설계의 핵심 가치

| 관점 | 효과 |
|------|------|
| **시간축 독립성** | 계획은 연도 단위, 과정은 수년 운영 → 생명주기가 달라도 관계가 깨지지 않음 |
| **양방향 추적** | 계획→과정 (이 예산으로 뭘 했나), 과정→계획 (이 과정은 어떤 예산을 썼나) |
| **업무 분업** | 예산 담당자(계획 수립) ≠ 운영 담당자(과정 개설) → 독립적으로 일하고 신청 시점에 연결 |
| **데이터 정규화** | 관계를 엔티티에 내장(As-Is) → 교차 테이블에서 관리(To-Be) → 변경에 강함 |

> [!IMPORTANT]
> **계획은 "왜, 얼마나" (예산 근거)이고, 과정은 "무엇을, 어떻게" (운영 실체)이다.**
> 이 둘을 타이트하게 묶으면 시간이 흐를수록 데이터가 깨진다.
> 신청 시점에 연결하면 "이 예산으로 이 과정을 운영했다"는 추적이 **영구적으로** 가능하다.

#### 주의사항

| # | 우려 | 대응 |
|---|------|------|
| 1 | 사용자가 직접 과정을 찾아야 하는 인지부담 | 피커에서 **계획의 교육유형과 일치하는 과정 우선 표시** + 나의 채널 과정 필터 |
| 2 | 잘못된 과정 연결 (계획A + 과정B 미스매치) | 교육유형 불일치 시 **경고** 표시 (차단은 아님 — 유연성 유지) |
| 3 | 과정이 아직 미개설 상태에서 신청 | 과정 연결은 **권장, 필수 아님** — 나중에 연결 가능 (EC-15) |

---

## 2. 사용자 스토리

### US-01: 복수 계획 통합 신청 (핵심)

> "교육 담당자는 교육신청 시 **같은 유형의 승인된 교육계획 여러 건**을 
> 하나의 신청서에 담아 제출할 수 있다. 과정별로 차수와 인원을 지정하며,
> 리더는 이 **1건의 신청서에 대해 1회만 결재**한다."
> ※ 개인직무든 교육운영이든 동일한 양식 구조를 사용한다.

### US-02: 동일 계획 다차수 분리 신청

> "담당자가 '소통 스킬 교육' 계획(총 3차수)에 대해, 
> **1차수만 먼저 신청**하고, 나중에 **2차수를 별도 신청**할 수 있다.
> 각 신청서에는 해당 차수의 인원과 산출근거만 포함된다."

### US-03: 계획에서 양식 자동 가져오기

> "교육신청 시 교육계획을 선택하면, 계획 작성 시 입력했던 
> **과정명·기관·교육유형·산출근거 등이 자동으로 채워져** 
> 교육유형을 별도로 선택하지 않아도 된다."

### US-04: 단건 선택 시 빠른 신청

> "계획 **1건만 선택**하면 모든 필드가 프리필되어 빠르게 신청할 수 있다.
> 추가 과정이 필요하면 [+ 교육계획 추가]로 더 넣을 수도 있다."

---

## 3. 비즈니스 시나리오 분석

### ✅ 시나리오 A: 서로 다른 과정 통합 신청 ⭐ (핵심 시나리오)

```
[계획 ①] 파이썬 기초 (일반교육예산-운영, 승인 완료, 3차수)
[계획 ②] 데이터 분석 (일반교육예산-운영, 승인 완료, 2차수)

→ 교육 신청 시:
  계획 ① 선택 → 파이썬 기초의 1차수
  계획 ② 선택 → 데이터 분석의 2차수
  → 1건의 신청서로 제출 → 리더 1회 결재
```

**고객의 핵심 동기**: "과정이 열릴 때마다 결재받는 게 불편해서 한번에 몰아 신청"

> [!IMPORTANT]
> **이 시나리오는 같은 예산 계정(제도그룹) 및 같은 교육유형(edu_type) 내에서만 가능해야 한다.**
> 예산 추적 체계 및 결재선이 다를 수 있으므로 다른 계정 또는 다른 교육유형의 계획은 합칠 수 없음.

### ✅ 시나리오 B: 동일 과정 다차수 분리 신청

```
[계획 ①] 소통 스킬 교육 (3차수, 차수당 15명)

→ 신청 1건: 1차수 (15명) ← 계획 ① 연결
   ... 시간 경과 ...
→ 신청 2건: 2차수 (15명) ← 계획 ① 연결 (동일 계획!)
   ... 시간 경과 ...
→ 신청 3건: 3차수 (15명) ← 계획 ① 연결 (동일 계획!)
```

**핵심**: 계획 1건이 여러 신청에서 참조됨 (1 Plan : N Applications)

### ❌ 시나리오 C: 서로 다른 예산 계정 합산 → 불허

```
[계획 ①] 리더십 교육 (일반교육예산-운영, 100만원)
[계획 ②] 기술교육 (R&D교육예산, 200만원)

→ 다른 제도그룹 → 합칠 수 없음
→ 각각 별도 신청해야 함
```

**불허 사유**: 제도그룹이 다르면 예산 체계·결재라인·산출근거 기준이 모두 다름

---

## 4. 상세 기능 요구사항

### 4.1 핵심 기능

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|:---:|
| F-001 | **복수 계획 선택** | 교육신청 Step 2에서 동일 예산계정의 승인된 교육계획을 **N건** 선택 가능 | 🔴 HIGH |
| F-002 | **과정별 차수 선택** | 선택한 각 계획에 대해 사용 가능한 차수를 개별 선택 (기 신청 차수 제외) | 🔴 HIGH |
| F-003 | **과정별 인원 입력** | 차수별 참가자 구분 인원 (현대/기아/그룹사/협력사 등) 입력 | 🔴 HIGH |
| F-004 | **산출근거 계획 복사** | 각 계획의 산출근거를 자동 복사하여 신청 단위로 편집 가능 | 🔴 HIGH |
| F-005 | **교육유형 자동 적용** | 계획에 포함된 교육유형(edu_type)을 신청서에 자동 반영, Step 3 스킵 | 🟡 MED |
| F-006 | **결재 1회** | N개 과정이 포함된 1건의 신청서에 대해 리더 1회 결재 | 🔴 HIGH |
| F-007 | **계정/유형 제한** | 같은 예산 계정 + 같은 교육유형의 계획만 합칠 수 있음. 조건 불일치 시 경고 | 🔴 HIGH |
| F-008 | **차수 중복 방지** | 이미 다른 신청에서 사용한 차수는 선택 불가 (비활성 + "신청 완료" 태그) | 🔴 HIGH |
| F-009 | **채널-과정-차수 연결** 🆕 | 교육운영 집합/이러닝 유형 계획에 한해, Line Item에서 LMS 채널→과정→차수를 선택하여 맵핑. 예산 집행 대상 과정을 정확히 추적 가능. 기존 `course-session` 피커(`fo_form_loader.js`) 재사용 | 🔴 HIGH |

### 4.2 양식 적용 기준 (v1.2 — 모드 분리 삭제)

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|:---:|
| F-010 | **패턴 기반 양식 결정** | process_pattern이 A 또는 D인 정책 → Header + Line Items 양식 적용. 개인직무/교육운영 구분 없이 동일 구조 | 🔴 HIGH |
| F-011 | **적응형 Line Item 카드** | purpose에 따라 카드 내 필드 적응: 개인직무→인원=본인(구분 UI 숨김), 교육운영 집합/이러닝→📺과정-차수 연결 피커 노출, 기타 교육운영→과정 연결 숨김. 패턴 D(예산 미사용)→예산구분/정산 필드 숨김 | 🟡 MED |
| ~~F-012~~ | ~~모드 자동 판별~~ | ✅ **v1.2에서 삭제** — 모드 개념 자체 제거. 패턴 A/D이면 무조건 같은 양식 | — |

### 4.3 데이터 흐름

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|:---:|
| F-020 | **계획→신청 필드 프리필** | 과정명, 교육기관, 교육일수, 차수별시간 등 Plan 필드를 자동 채움 | 🟡 MED |
| F-021 | **단건 선택 시 완전 프리필** | 계획 1건만 선택 시, 교육유형·양식 등 모든 컨텍스트 자동 적용 (1:1의 장점) | 🔴 HIGH |
| F-022 | **복수 선택 시 Header만 직접 입력** | 제목·내용·첨부 등 Header 필드는 사용자가 입력, 과정 상세는 계획에서 가져옴 | 🟡 MED |

---

## 5. 양식 구조 설계 (Header + Line Items 패턴)

### 5.0 설계 핵심 원칙 (v1.1 수정)

> [!IMPORTANT]
> **예산 사용 구분(budget_usage_type)과 정산방식(settlement_method)은 Line Item 레벨로 이동.**
> 이유: 교육계획마다 H-교육/H-정산/K-교육/K-정산이 다를 수 있고,
> 정산이 필요한 과정과 불필요한 과정이 하나의 신청에 섞일 수 있음.

**Line Item = 미니 신청서 (Sub-Application)**
```
각 Line Item은 자기 완결적:
  ├── 어떤 계획/과정인지 (plan 참조)
  ├── 몇 차수, 몇 명인지 (차수/인원)
  ├── 어떤 예산 구분으로 쓰는지 (budget_usage_type)
  ├── 정산이 필요한지 (settlement_method)
  ├── 얼마를 쓰는지 (산출근거 + 소계)
  └── (향후) 결과를 어떻게 올리는지 (result_status)

Header = 결재 봉투 (Approval Bundle)
  ├── 신청 제목, 내용, 첨부
  └── 총 합계 + 팀 예산현황
```

### 5.1 전체 구조 (v1.1 — 예산구분/정산 → Line Item 이동)

```
┌─────────────────────────────────────────────────────────────┐
│ 교육신청서 (Header = 결재 봉투)                               │
│                                                             │
│  📌 신청 제목: [자동 생성 또는 사용자 입력]                     │
│  📝 내용/비고: [선택 입력]                                    │
│  💰 팀 예산현황: [표시 전용 — 잔액 조회]                       │
│  📎 첨부파일: [업로드]                                        │
├─────────────────────────────────────────────────────────────┤
│ 연결된 교육계획 (Line Items = 과정별 미니 신청서)               │
│                                                             │
│ ┌─ 과정 ①: 파이썬 기초 ────────────────────────────────┐     │
│ │ 📋 계획 연결: PLN-001 (파이썬 기초)                    │     │
│ │ 🏫 교육기관: 한국IT교육원                               │     │
│ │ 📅 교육 기간: 2027-05-01 ~ 2027-05-03                 │     │
│ │ 🎯 차수 선택: ☑ 1차 ☐ 2차(신청완료) ☐ 3차             │     │
│ │ 💳 예산구분: [H-교육 ▼]                     ← Line Item│     │
│ │ ⚖️ 정산방식: [인원비율정산 ▼]                 ← Line Item│     │
│ │ 👥 예상 인원:                                          │     │
│ │    현대 10 | 기아 5 | 그룹사 3 | 기타 2 = 합계 20명     │     │
│ │ 💰 산출근거 (계획에서 복사):                             │     │
│ │    강사료: 800,000 × 1 = 800,000                       │     │
│ │    교재비: 20,000 × 20 = 400,000                       │     │
│ │    소계: 1,200,000원                                   │     │
│ └────────────────────────────────────────────────────────┘     │
│ ┌─ 과정 ②: 데이터 분석 ───────────────────────────────┐     │
│ │ 📋 계획 연결: PLN-002 (데이터 분석 역량 강화)           │     │
│ │ 🏫 교육기관: 패스트캠퍼스                               │     │
│ │ 📅 교육 기간: 2027-06-10 ~ 2027-06-12                 │     │
│ │ 🎯 차수 선택: ☐ 1차(신청완료) ☑ 2차                    │     │
│ │ 💳 예산구분: [H-정산 ▼]              ← 과정마다 다름!    │     │
│ │ ⚖️ 정산방식: [해당없음 ▼]            ← 정산 불필요!      │     │
│ │ 👥 예상 인원:                                          │     │
│ │    현대 8 | 기아 4 | 그룹사 0 | 기타 0 = 합계 12명      │     │
│ │ 💰 산출근거 (계획에서 복사):                             │     │
│ │    수강료: 150,000 × 12 = 1,800,000                    │     │
│ │    소계: 1,800,000원                                   │     │
│ └────────────────────────────────────────────────────────┘     │
│                                                             │
│ [+ 교육계획 추가하기]                                         │
├─────────────────────────────────────────────────────────────┤
│ 📊 신청 금액 합계: 3,000,000원                               │
│ 💰 사용 예산 계정: 일반-운영 (잔액: 8,500,000원)              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 계획 1건만 선택 시 (single_plan과 동일 UX)

```
계획 1건 선택 → 모든 필드가 자동 채움 (프리필)
  ├── 교육유형: 자동 적용 → Step 3 (교육유형 선택) 스킵
  ├── 과정명, 기관, 기간: 계획에서 복사
  ├── 예산구분, 정산방식: 계획에서 복사
  ├── 산출근거: 계획에서 복사
  └── 사용자는 차수 + 인원만 입력하면 끝

→ 기존 1:1 연결의 "빠르게 신청할 수 있는 장점"을 완벽 유지
```

### 5.3 필드 분류: Header vs Line Item (v1.1 수정)

| 필드 | 소속 | 근거 |
|------|:---:|------|
| 신청 제목 | **Header** | 전체 신청서를 대표하는 제목 (자동 생성 가능) |
| 내용 / 비고 | **Header** | 신청서 전체에 대한 설명 |
| 첨부파일 | **Header** | 신청서 전체 첨부 |
| 팀 예산현황 | **Header** | 표시 전용 |
| 신청 금액 합계 | **Header** | Line Items 소계의 합 (자동 계산) |
| ─── | ─── | ─── |
| 연결 계획 (plan_id) | **Line Item** | 과정별 계획 참조 |
| 과정명, 교육기관, 기간 | **Line Item** | 계획에서 복사 (과정마다 다름) |
| 차수 선택 | **Line Item** | 과정마다 다른 차수 |
| **예산 사용 구분** ⭐ | **Line Item** | 교육계획마다 H-교육/K-정산 등 다를 수 있음 |
| **정산방식** ⭐ | **Line Item** | 정산 필요/불필요 과정이 섞일 수 있음 |
| **채널-과정-차수 연결** 🆕 | **Line Item** | 교육운영 집합/이러닝만 해당. 예산 집행 대상 과정 추적 |
| 인원 (구분별) | **Line Item** | 과정마다 다른 인원 |
| 산출근거 | **Line Item** | 과정마다 다른 비용 항목 |
| 소계 | **Line Item** | 해당 과정의 비용 합 (자동 계산) |

---

## 6. DB/데이터 구조

### 6.1 신규 테이블: application_plan_items (v1.1 — 예산구분/정산/결과상태 추가)

```sql
CREATE TABLE application_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  
  -- 과정 기본 정보 (계획에서 복사 — 스냅샷)
  course_name TEXT,                   -- 과정명 스냅샷
  institution_name TEXT,              -- 교육기관 스냅샷
  start_date DATE,                    -- 교육 시작일
  end_date DATE,                      -- 교육 종료일
  edu_type TEXT,                      -- 교육유형 (이러닝/집합/...)
  
  -- 차수 & 인원
  selected_rounds JSONB DEFAULT '[]', -- 선택한 차수 목록 [1, 3]
  headcount_breakdown JSONB,          -- 참가자 구분별 인원
  -- 예: {"rounds": [{"round": 1, "현대": 10, "기아": 5, ...}]}
  
  -- ⭐ 과정별 예산/정산 설정 (v1.1: Header에서 Line Item으로 이동)
  budget_usage_type TEXT,              -- H-교육/H-정산/K-교육/K-정산
  settlement_method TEXT,              -- 인원비율정산/매출액비율정산/G코드정산/해당없음
  
  -- 🆕 채널-과정-차수 연결 (v1.3: 교육운영 집합/이러닝에만 해당)
  channel_id UUID,                     -- 연결된 LMS 채널 (edu_channels.id)
  course_id UUID,                      -- 연결된 LMS 과정 (edu_courses.id)
  linked_sessions JSONB DEFAULT '[]',  -- 연결된 차수 [{session_id, session_no, name, period}]
  -- ※ 개인직무/워크숍 등에서는 NULL (연결 불필요)
  -- ※ 기존 Header의 courseSessionLinks 배열이 Line Item별로 분배됨
  
  -- 비용
  calc_grounds_snapshot JSONB,        -- 이 과정의 산출근거 (계획에서 복사→편집)
  subtotal BIGINT DEFAULT 0,          -- 이 과정의 비용 소계
  
  -- ⭐ 결과 연결 준비 (Q-MP5 대비 — 보류 상태)
  result_status TEXT DEFAULT 'pending',  -- pending/completed/not_required
  -- ※ 실제 결과 데이터는 edu_results 테이블에서 이 id를 FK로 참조 예정
  
  -- 정렬 & 메타
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_api_application ON application_plan_items(application_id);
CREATE INDEX idx_api_plan ON application_plan_items(plan_id);

-- 동일 신청서에서 같은 계획의 같은 차수 중복 방지
-- (단, 다른 신청서에서는 같은 계획 참조 가능 — 시나리오 B)
CREATE UNIQUE INDEX idx_api_app_plan_round 
  ON application_plan_items(application_id, plan_id, selected_rounds);
```

### 6.2 기존 테이블 변경: applications (v1.2 — application_mode 삭제)

```sql
-- plan_id 컬럼 유지 (하위 호환 — 마이그레이션 후 제거 예정)
-- 새 구조: 항상 application_plan_items를 통해 계획 연결
-- plan_id에는 Line Item이 1건일 경우 해당 plan_id를 미러링 (하위 호환)
-- Line Item이 N건일 경우 plan_id = NULL

-- ※ application_mode 컬럼 불필요 (v1.2에서 삭제)
-- 패턴 A/D인지는 서비스 정책(process_pattern)으로 판별
-- 별도 모드 컬럼이 필요 없음
```

### 6.3 관계 다이어그램

```
plans (교육계획)
  │
  │  1:N (시나리오 B — 동일 계획의 다차수 분리 신청)
  │
  ├──▶ application_plan_items (Line Items = 미니 신청서)
  │       ├── plan_id (FK → plans)
  │       ├── application_id (FK → applications)
  │       ├── selected_rounds: [1, 3]
  │       ├── headcount_breakdown: {...}
  │       ├── budget_usage_type: 'H-교육'   ← ⭐ v1.1 이동
  │       ├── settlement_method: '인원비율'  ← ⭐ v1.1 이동
  │       ├── calc_grounds_snapshot: {...}
  │       ├── subtotal
  │       └── result_status: 'pending'      ← ⭐ Q-MP5 대비
  │
  │  N:1 (시나리오 A — 다른 과정 통합 신청)
  │
  └──▶ applications (교육신청서, Header = 결재 봉투)
          ├── id
          ├── plan_id: NULL 또는 미러링 (하위 호환)
          ├── total_amount (= Σ subtotal)
          └── ... (제목, 내용, 첨부 등 메타 필드)
```

**관계 요약:**
```
Plan 1 ←──── N ────→ application_plan_items ←──── N ────→ Application 1
Plan 2 ←──── N ────┘                        └──── N ────┘
                          (M:N 관계, 차수 단위 매핑)
```

---

## 7. 비즈니스 로직

### 7.1 양식 적용 판별 (v1.2 — 패턴 기반 통일)

```javascript
function needsPlanLinkage(processPattern) {
  // 패턴 A(예산+계획) 또는 D(무예산+계획) → Header + Line Items 양식
  return processPattern === 'A' || processPattern === 'D';
  // 패턴 B(계획없는 신청), C(결과만), E(기타) → 기존 양식 유지
}

function getLineItemFieldConfig(purpose, processPattern, eduType) {
  // Line Item 카드의 필드 구성을 목적/패턴/교육유형에 따라 적응
  const isEduOps = purpose?.category === 'edu-operation';
  const isClassOrElearning = ['이러닝', '집합', '집합(비대면)',
    'ops_elearning', 'ops_class'].includes(eduType);
  
  return {
    showHeadcountBreakdown: isEduOps,
    // 개인직무 → false (본인 1명), 교육운영 → true (구분별 인원)
    showBudgetUsageType: processPattern === 'A',
    // 패턴 A(예산 사용) → true, 패턴 D(예산 미사용) → false
    showSettlementMethod: processPattern === 'A',
    // 패턴 A → true, 패턴 D → false
    showCourseSessionLink: isEduOps && isClassOrElearning,
    // 🆕 v1.3: 교육운영 + 집합/이러닝 유형만 과정-차수 연결 피커 노출
    // 교육운영 워크숍/세미나/기타 → false (LMS 과정이 아님)
    // 개인직무 → false (외부 교육이므로 채널 없음)
  };
}
```

> [!NOTE]
> **모드(single_plan/multi_plan) 개념 완전 삭제 (v1.2).**
> 양식 구조는 항상 Header + Line Items. 1건이든 N건이든 같은 양식.
> 목적/패턴/교육유형에 따라 Line Item 카드 내 **필드 노출만 적응**.

### 7.2 차수 사용 현황 조회

```javascript
// 특정 계획의 차수별 신청 현황을 조회
async function getUsedRounds(planId) {
  const { data } = await sb
    .from('application_plan_items')
    .select('selected_rounds, application_id')
    .eq('plan_id', planId);
  
  // Flatten: 어떤 차수가 이미 신청에 사용되었는지
  const usedRounds = new Set();
  (data || []).forEach(item => {
    (item.selected_rounds || []).forEach(r => usedRounds.add(r));
  });
  
  return usedRounds;
  // 예: Set {1, 2} → 1차, 2차는 이미 신청됨
}
```

### 7.3 계획 선택 제약 조건

```
1. 같은 예산 계정(budget_account) 및 같은 교육유형(edu_type) 내 계획만 선택 가능
   → 조건 불일치 계획 선택 시: "같은 예산 계정 및 교육유형의 계획만 합칠 수 있습니다" 경고

2. 승인 완료(status = 'approved') 계획만 선택 가능

3. 사용 가능한 차수가 1개 이상 남아있어야 선택 가능
   → 모든 차수가 기 신청된 계획: "모든 차수 신청 완료" 태그 + 비활성

4. 동일 신청서 내 같은 계획의 같은 차수 중복 불가
```

### 7.4 제목 자동 생성 로직

```javascript
function generateApplicationTitle(lineItems) {
  if (lineItems.length === 1) {
    return lineItems[0].courseName;
    // "파이썬 기초"
  }
  return `${lineItems[0].courseName} 외 ${lineItems.length - 1}건`;
  // "파이썬 기초 외 1건"
}
```

### 7.5 신청 금액 계산

```
총 신청금액 = Σ(각 Line Item의 subtotal)
각 Line Item subtotal = Σ(해당 과정 산출근거의 단가 × 수량)

※ 총 신청금액이 팀 예산 잔액을 초과하면 경고 (차단은 아님)
```

---

## 8. 구현 방식: 기존 위저드 확장

### 8.0 핵심 설계 원칙 (v1.2)

> [!IMPORTANT]
> **패턴 A/D = Header + Line Items 양식. 개인직무/교육운영 구분 없음.**
> - 별도 모드(single_plan/multi_plan)를 두지 않음
> - 양식 구조는 항상 동일. Line Item 1건이면 단건 신청, N건이면 복수 신청
> - Line Item 카드 내 필드만 purpose/pattern에 따라 **적응형**으로 노출

### 8.1 현재 위저드 구조 (As-Is)

```javascript
// apply.js L1016~1023 — 고정 4단계
${[1, 2, 3, 4].map(n => ...)}
// ["목적 선택", "예산 선택", "교육유형 선택", "세부 정보"]
```

### 8.2 변경 후: 패턴 A/D 통일 Step (To-Be)

```javascript
function getApplySteps(processPattern) {
  if (processPattern === 'A' || processPattern === 'D') {
    // 계획 연결이 필요한 패턴 → Header + Line Items 양식
    return [
      { n: 1, label: "목적 선택" },
      { n: 2, label: "예산 선택" },
      { n: 3, label: "교육계획 구성" },   // 🆕 Line Items 편집
      { n: 4, label: "신청 정보" },       // Header (제목, 첨부)
      { n: 5, label: "확인 및 제출" },
    ];
  }
  // 패턴 B/E (계획 없는 신청) → 기존 양식 유지
  return [
    { n: 1, label: "목적 선택" },
    { n: 2, label: "예산 선택" },
    { n: 3, label: "교육유형 선택" },
    { n: 4, label: "세부 정보" },
  ];
}
```

### 8.3 위저드 Step 구조 (패턴 A/D — 통일)

```
Step 1: 목적 선택
Step 2: 예산 선택
Step 3: 교육계획 구성 ← 핵심 Step (개인직무, 교육운영 모두 동일)
        ├── 승인된 교육계획 선택 (첫 1건 필수)
        ├── [+ 교육계획 추가] 버튼 (같은 유형의 승인된 계획 추가 가능)
        ├── 과정마다 Line Item 카드 표시:
        │     ├── 차수 선택 (기 신청 차수 비활성)
        │     ├── 💳 예산구분 (패턴 A만 노출 / 패턴 D 숨김)
        │     ├── ⚖️ 정산방식 (패턴 A만 노출 / 패턴 D 숨김)
        │     ├── 📺 채널-과정-차수 연결 (v1.3):
        │     │     교육운영 집합/이러닝 → 피커 노출 (기존 course-session 피커 재사용)
        │     │     교육운영 워크숍/세미나/기타 → 숨김
        │     │     개인직무 → 숨김 (외부 교육이므로 LMS 채널 없음)
        │     ├── 👥 인원 입력:
        │     │     교육운영 → 구분별 (현대/기아/그룹사/...)
        │     │     개인직무 → 본인 1명 (구분 UI 숨김)
        │     ├── 산출근거 확인/편집 (계획에서 자동 복사)
        │     └── 소계 자동 계산
        └── [과정 삭제] 버튼
Step 4: 신청 정보 (제목, 내용, 첨부) ← Header 필드
Step 5: 예산현황 확인 + 제출

※ 교육유형은 각 Line Item이 계획에서 자동 결정 → 별도 Step 불필요
※ 계획 1건만 선택 시: 프리필 → 추가 안 하면 단건 신청과 동일
※ 개인직무든 교육운영이든 같은 화면 → HMC 연구직 등 사용자 혼란 방지
※ 과정-차수 연결은 교육유형(edu_type)으로 자동 판별 → 집합/이러닝만 표시
```

---

## 9. 예외 처리 및 엣지 케이스

| # | 케이스 | 위험도 | 처리 방식 |
|---|--------|:---:|----------|
| EC-01 | **다른 예산 계정의 계획을 합치려 함** | 🔴 | 차단 — "같은 예산 계정의 계획만 합칠 수 있습니다" |
| EC-02 | **사용 가능한 차수가 0개인 계획 선택** | 🟡 | 선택 불가 — "모든 차수 신청 완료" 태그 + 비활성 |
| EC-03 | **동일 차수를 같은 신청서에 중복 선택** | 🔴 | 차단 — 체크박스 비활성화 |
| EC-04 | **신청 제출 후 계획이 반려/취소됨** | 🟡 | 신청서 상태는 유지되되, "원본 계획 상태 변경" 알림 |
| EC-05 | **산출근거를 과도하게 수정 (계획 대비 200% 초과)** | 🟡 | 경고만 — "계획 대비 ○○% 초과합니다" |
| EC-06 | **패턴 A/D인데 승인된 계획이 0건** | 🔴 | 차단 — "먼저 교육계획을 수립하세요" + 바로가기 |
| EC-07 | **복수 계획의 교육유형이 서로 다름** | 🔴 | 차단 — 사용자 요청에 따라 "같은 계정 + 같은 교육유형"만 합칠 수 있음 |
| EC-08 | **계획 선택 후 예산 계정을 변경** | 🟡 | 선택된 Line Items 전체 초기화 + 재선택 필요 안내 |
| EC-09 | **1건 선택 후 계획 추가 → 2건이 됨** | 🟢 | 자연스러운 흐름 — Header의 제목 자동 재생성 |
| EC-10 | **N건 선택 후 N-1건 삭제 → 1건으로 돌아감** | 🟢 | 1건 시 프리필 UX로 자동 전환 |
| EC-11 | **결재 반려 후 재신청 — Line Items 수정 가능?** | 🟡 | 가능 — 반려 시 draft로 전환, Line Items 편집 가능 |
| EC-12 | **같은 차수를 다른 신청서에서 사용한 경우** | 🔴 | 차단 — "이 차수는 신청서 APP-001에서 이미 사용 중입니다" |
| EC-13 | **계획의 총 차수보다 많은 차수를 선택** | 🔴 | 차단 — 계획에 정의된 차수까지만 선택 가능 |
| EC-14 | **개인직무인데 계획을 2건 이상 추가** | 🟢 | 허용 — 같은 유형이면 개인직무도 복수 계획 가능 |
| EC-15 | **교육운영 집합인데 과정-차수를 연결 안 함** | 🟡 | 경고만 — "LMS 과정을 연결하면 예산 추적이 정확해집니다" (필수 아님, 권장) |
| EC-16 | **과정-차수 피커에서 담당자 채널 외 과정이 보이는 경우** | 🟡 | 기존 피커 로직 재사용 — `user_roles`의 `_ch_mgr_` 역할 기준 채널 필터. 역할 없으면 전체 active 과정 표시 |
| EC-17 | **동일 과정을 2개 Line Item에서 중복 연결** | 🟡 | 허용 — 같은 과정이라도 계획(목적/차수)이 다르면 정상. 단, 같은 차수(session) 중복 시 경고 |
| EC-18 | **워크숍/세미나 계획인데 과정-차수 연결을 원함** | 🟢 | 숨김 — 워크숍/세미나는 LMS 채널 기반이 아닌 외부 행사이므로 연결 불필요 |

---

## 10. 접근 권한 (v1.2 — 모드 구분 삭제)

| 역할 | 패턴 A/D 양식 사용 | 비고 |
|------|:---:|------|
| 학습자 (learner) | ✅ | 개인직무 계획 기반 신청 — Line Item 카드 간소화 (인원=본인) |
| 교육담당자 (operator) | ✅ | 교육운영 계획 기반 신청 — Line Item 카드 풀 표시 |
| 교육담당+개인직무 겸임 | ✅ | purpose에 따라 카드 필드만 적응. 양식 구조는 동일 |

---

## 11. field_standardization.md 연동

### Line Item 필드 이동 종합 (v1.3 수정)

| 필드 | 현재 위치 (field_standardization) | 변경 후 위치 | 적용 조건 |
|------|---------|-----------|---------|
| `round_selection` | 3.8절 extra_fields | **application_plan_items.selected_rounds** | 전체 |
| `participant_breakdown` | 3.8절 extra_fields | **application_plan_items.headcount_breakdown** | 교육운영만 |
| `calc_grounds` (과정별) | applications 연결 | **application_plan_items.calc_grounds_snapshot** | 전체 |
| `course_name` (과정별) | applications.edu_name | **application_plan_items.course_name** | 전체 |
| `institution_name` (과정별) | applications 필드 | **application_plan_items.institution_name** | 전체 |
| `settlement_method` ⭐ | extra_fields | **application_plan_items.settlement_method** | 패턴 A만 |
| `budget_usage_type` ⭐ | extra_fields | **application_plan_items.budget_usage_type** | 패턴 A만 |
| `courseSessionLinks` 🆕 | applyState (Header 레벨) | **application_plan_items.{channel_id, course_id, linked_sessions}** | 교육운영 집합/이러닝만 |

---

## 12. 개발 영향 범위 (v1.2 — 모드 분리 제거로 범위 축소)

| 파일 | 변경 내용 | 규모 |
|------|---------|:---:|
| `apply.js` | 패턴 A/D일 때 Step 3 "교육계획 구성" 신규 Step 추가 (패턴 기반 Step 분기) | 🔴 대 |
| `apply.js` | Line Item 카드 렌더러 (적응형 필드 — purpose/pattern/eduType에 따라 표시 제어) | 🟡 중 |
| `apply.js` | 계획 선택 팝업 컴포넌트 (learning_apply.md F-002 확장) | 🟡 중 |
| `apply.js` | 차수 선택 UI + 사용 현황 조회 (getUsedRounds) | 🟡 중 |
| `apply.js` | 산출근거 계획→신청 자동 복사 + 편집 UI | 🟡 중 |
| `apply.js` | submit 로직: application_plan_items INSERT (channel_id, course_id, linked_sessions 포함) | 🟡 중 |
| `fo_form_loader.js` | 기존 `course-session` 피커 (L640~953)를 Line Item 컨텍스트에서 호출하도록 연동 | 🟡 중 |
| `plans.js` | "교육신청 하기" 버튼에서 Line Items 양식으로 전환 | 🟢 소 |
| DB Migration | `application_plan_items` 테이블 생성 (channel_id, course_id, linked_sessions 포함) | 🟢 소 |
| ~~DB Migration~~ | ~~`applications.application_mode` 컬럼 추가~~ ✅ **불필요** (v1.2) | — |
| `bo_approval.js` | 결재 문서에서 Line Items 렌더링 (과정-차수 연결 정보 포함) | 🟡 중 |

---

## 13. 기획자 검토 필요 항목

> [!IMPORTANT]
> **결재 문서 포맷**: multi_plan 신청서의 결재 문서를 어떻게 표시할지.
> 현재 결재 문서는 단건 신청 정보만 표시. N개 과정의 요약 테이블 + 접이식 상세가 필요.
> → `budget_lifecycle.md` Phase 15 (묶음 결재문서 포맷)과 연계 가능.

> [!WARNING]
> **예산 추적 정확성**: Line Item 별로 계획(plan_id)이 연결되므로,
> BO에서 "계획금액 vs 실사용금액" 추적 시 `application_plan_items`를 
> 집계해야 함. 기존 `applications.plan_id` 단일 FK 기반 집계 로직 수정 필요.
> → `budget_lifecycle.md` Phase 10 (실사용액 자동 집계)에 영향.

> [!CAUTION]
> **learning_apply.md와 관계 정리**: 기존 learning_apply.md의 "복수 선택" 기능은
> 본 PRD로 흡수됨. learning_apply.md는 "팝업 UI 컴포넌트"에 집중하고,
> 복수 선택의 비즈니스 로직은 본 PRD에서 관리.

### 미결정 사항

| # | 질문 | 옵션 | 영향 | 상태 |
|---|------|------|------|:---:|
| ~~Q-MP1~~ | ~~개인직무도 multi_plan을 쓸 가능성?~~ | — | — | ✅ **해결** (v1.2: 모드 개념 삭제. 개인직무도 동일 양식) |
| Q-MP2 | **차수가 없는 계획 (차수=1)도 Line Item으로?** | A) 예 (일관성) / B) 아니오 | UX 복잡도 | ⏳ |
| Q-MP3 | **결재 반려 시 Line Items 수정 범위?** | A) 기존 과정 편집만 / B) 과정 추가/삭제도 가능 | 데이터 무결성 | ⏳ |
| ~~Q-MP4~~ | ~~이캠퍼스 계열사에 multi_plan 노출?~~ | — | — | ✅ **해결** (v1.2: 패턴 A/D 정책이 있으면 자동 적용) |
| **Q-MP5** ⏳ | **결과 분리 등록**: 신청서의 결과를 Line Item(과정)별로 분리해서 각각 결과 보고서를 올릴 수 있어야 함 | — | 🔴 HIGH | ⏳ 보류 |
| Q-MP6 | **부분 취소**: 3개 과정 신청 중 1개만 취소하고 나머지 유지 가능? | A) 전체 취소만 / B) 부분 취소 가능 | Line Item 상태 관리 | ⏳ |
| Q-MP7 | **과정별 결재 분기**: 리더가 과정 ②만 반려하고 ①은 승인 가능? | A) 전체 단위 / B) 부분 가능 | 결재 엔진 확장 | ⏳ |

> [!WARNING]
> **Q-MP5 (결과 분리 등록)는 아키텍처에 직접 영향합니다.**
> `application_plan_items.result_status` 컬럼을 미리 배치하여,
> 향후 `edu_results` 테이블에서 `application_plan_item_id`를 FK로 참조할 수 있도록 대비.
> **상세 기획은 보류하되, DB 구조는 선제 설계.**

---

## 14. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-18 | 최초 작성 — 고객 니즈 기반 N:1 연결 기획. 시나리오 3건 분석, Header+LineItems 패턴 확정, DB 설계, 위저드 Step 구조, 엣지케이스 13건, 미결정 4건 | AI (비판적 기획자) |
| 2026-04-18 | **v1.1** — 예산사용구분/정산방식을 Header→Line Item으로 이동. 기존 위저드 확장(C안) 채택. DB에 budget_usage_type, settlement_method, result_status 컬럼 추가. 미결건 Q-MP5~7 등록. 구현 방식 비교(A/B/C안) 추가 | AI (비판적 기획자) |
| 2026-04-18 | **v1.2** — **application_mode 개념 완전 삭제.** 패턴 A/D = Header+LineItems 양식으로 통일. 개인직무/교육운영 구분 없이 동일 폼 구조. Line Item 카드가 purpose/pattern에 따라 적응형 동작. Q-MP1, Q-MP4 해결. F-012 삭제. applications.application_mode 컬럼 불필요. EC-14 추가 | AI (비판적 기획자) |
| 2026-04-18 | **v1.3** — **채널-과정-차수 연결을 Line Item 속성으로 추가.** 교육운영 집합/이러닝 유형에만 적용 (워크숍/세미나/개인직무는 숨김). DB에 channel_id, course_id, linked_sessions 컬럼 추가. 적응형 필드에 showCourseSessionLink 조건 추가. 기존 fo_form_loader.js 피커 재사용. Header의 courseSessionLinks → Line Item별 분배. **계획↔과정 디커플링 설계 배경 문서화** (러닝라운지 바꿔치기 문제 → 신청 시점 연결로 해결). F-009 추가, EC-15~18 추가 | AI (비판적 기획자) |
