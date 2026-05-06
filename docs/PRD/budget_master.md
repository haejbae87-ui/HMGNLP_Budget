# 예산계정 마스터 요구사항 정의서 (PRD)

> **도메인**: 예산관리 — 계정별 기초/추가 배정
> **관련 파일**: `bo_budget_master.js`, `bo_allocation.js`
> **최초 작성**: 2026-05-06
> **최종 갱신**: 2026-05-06
> **상태**: 🟡 구현 갭 있음 (회수·마감·변경이력 조회 미구현)

---

## 1. 기능 개요

예산계정 마스터는 교육지원 제도그룹의 **예산계정별 연간 기초 예산을 최초 등록**하고,
**연중 추가 배정**을 관리하는 Back Office 전용 화면이다.

이 화면에서 설정된 예산은 `account_budgets` DB 테이블에 저장되며,
이후 팀 배분 → 개인 통장(bankbooks) → FO 예산 차감 순으로 흘러간다.

```
[예산계정 마스터] → [예산 배정 및 관리 (팀 배분)] → [FO 교육 신청 (예산 차감)]
   account_budgets     budget_allocations / bankbooks     applications
```

---

## 2. 사용자 스토리

| # | 역할 | 스토리 |
|---|------|--------|
| US-1 | 계정 오너 (총괄담당자) | 예산계정 마스터 화면에서 새 회계연도의 계정별 **기초 예산을 최초 등록**할 수 있다. |
| US-2 | 계정 오너 | 연중 예산 소진이 예상될 때 해당 계정에 **추가 배정**을 할 수 있다. |
| US-3 | 계정 오너 | 상단 필터(회사→제도그룹→예산계정)로 특정 계정을 선택하면 해당 계정의 요약 통계(기초·추가·총예산)를 한눈에 볼 수 있다. |
| US-4 | 계정 오너 | 상단 필터에서 선택한 계정이 하단 배정 폼에 자동 확정되어, **계정을 두 번 선택할 필요가 없다**. |

---

## 3. DB 테이블 구조 (`account_budgets`)

| 컬럼 | 타입 | 설명 | 상태 |
|------|------|------|------|
| `id` | uuid | PK | ✅ |
| `account_code` | text | 예산계정 코드 (FK → budget_accounts) | ✅ |
| `fiscal_year` | int | 회계연도 | ✅ |
| `total_budget` | numeric | 기초+추가 합산 총예산 | ✅ |
| `base_budget` | numeric | **기초 예산** (최초 등록액) | ⚠️ DB에 컬럼 추가 필요 |
| `added_budget` | numeric | **추가 배정 누적액** | ⚠️ DB에 컬럼 추가 필요 |
| `updated_at` | timestamp | 최종 수정 | ✅ |

> [!WARNING]
> `base_budget`, `added_budget` 컬럼이 DB에 없으면 코드는 `total_budget`만 저장하고,
> 화면에서 기초/추가를 분리하여 표시할 수 없습니다.
> **Supabase에서 두 컬럼을 추가해야 기초/추가 합계가 올바르게 표시됩니다.**

---

## 4. 화면 구조 및 기능 요구사항

```
[상단 3단 필터] 회사 → 제도그룹(edu_support) → 예산계정 → [조회]
      ↓
[요약 카드]  기초 예산 합계 / 추가 배정 합계 / 총 예산
      ↓
[기초 예산 등록 섹션]  ← base_budget=0인 계정이 있을 때만 표시
[추가 배정 섹션]       ← 항상 표시
[배정 변경 이력]       ← ❌ 미구현 (변경사유 DB 미저장)
[회수 섹션]            ← ❌ 미구현
[마감 섹션]            ← ❌ 미구현
```

| 기능 | 구현 상태 | 비고 |
|------|-----------|------|
| 기초 예산 최초 등록 | ✅ | submitInitBudget() |
| 추가 배정 | ✅ | submitAddBudget() |
| 기초/추가 분리 표시 | ⚠️ | DB 컬럼 추가 필요 |
| 변경 사유(Audit Trail) DB 저장 | ❌ | 인메모리에만 저장됨 |
| 배정 변경 이력 조회 | ❌ | 미구현 |
| 예산 회수 | ❌ | 미구현 |
| 연도 마감 | ❌ | 미구현 |

---

## 5. 핵심 비즈니스 로직

### 5.1 기초 예산 등록 (1회성)

```javascript
// 조건: DB account_budgets에 해당 account_code+fiscal_year 레코드 없거나 total_budget=0
// 저장 방식: select → update or insert (upsert 불가 — unique constraint 없음)
// 저장 컬럼: total_budget=amount, base_budget=amount, added_budget=0
// fallback: base_budget 컬럼 없으면 total_budget만 저장
```

### 5.2 추가 배정 (연중 증액)

```javascript
// 조회: 기존 레코드에서 base_budget, added_budget 읽기
// 계산: newAdded = prevAdded + amount
//       newTotal = base_budget + newAdded
// 저장: total_budget=newTotal, added_budget=newAdded
// 변경 사유: ❌ 현재 인메모리(ACCOUNT_ADJUST_HISTORY)에만 저장
//           → account_budget_adjustments 테이블 별도 구축 필요
```

### 5.3 렌더링 (DB 직접 조회 방식)

```javascript
// 계정 목록: _bmFilterAcctList (budget_accounts DB 쿼리)
// 예산 금액: _bmDbBudgetData (account_budgets DB 쿼리)
// ACCOUNT_BUDGETS 인메모리 mock 의존 없음
// fallback: DB 레코드 없으면 ACCOUNT_BUDGETS 인메모리 참조
```

---

## 6. 미구현 기능 — 개발 계획

### 6.1 변경 이력(Audit Trail) DB 저장 ❌

**필요 테이블**: `account_budget_adjustments`
```sql
CREATE TABLE account_budget_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL,
  fiscal_year int NOT NULL,
  type text NOT NULL,  -- '기초입력' | '추가배정' | '회수' | '마감'
  amount numeric NOT NULL,
  reason text NOT NULL,  -- Audit Trail 필수
  performed_by text,
  created_at timestamptz DEFAULT now()
);
```

### 6.2 예산 회수 ❌

- 추가 배정한 금액 중 미사용분을 다시 차감하는 기능
- `added_budget -= 회수액`, `total_budget -= 회수액`
- 단, `total_budget < (deducted + holding)`인 경우 회수 불가 (가용예산 초과)

### 6.3 연도 마감 ❌

- 해당 연도의 예산을 동결하여 더 이상 추가 배정/회수 불가 상태로 전환
- `status = 'closed'` 컬럼 필요

---

## 7. 접근 권한

| 역할 | 기초 등록 | 추가 배정 | 조회 |
|------|-----------|-----------|------|
| `platform_admin` | ✅ | ✅ | 전사 |
| `tenant_global_admin` | ✅ | ✅ | 해당 테넌트 |
| `budget_global_admin` | ✅ | ✅ | 담당 계정 |
| 일반 관리자 | ❌ | ❌ | ❌ |

---

## 8. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-05-06 | 최초 PRD 작성 | AI |
| 2026-05-06 | DB 직접 조회 방식 전환, base/added 분리 로직 추가 | AI |
| 2026-05-06 | 미구현 기능(회수/마감/이력) 명시, DB 스키마 컬럼 추가 필요사항 문서화 | AI |
| 2026-05-06 | **회계연도 라이프사이클 정책 추가 (Domain Council 결과)** | AI |

---

## 9. 회계연도 라이프사이클 정책 (신규 기획 필요)

> [!IMPORTANT]
> 이 섹션은 **현재 미구현** 상태이며, 기획 확정 후 개발이 필요합니다.

### 9.1 핵심 질문과 답변

| 질문 | 현재 시스템 동작 | 권장 정책 |
|------|----------------|-----------|
| 최초 배정은 1회만 가능한가? | ✅ 같은 `fiscal_year` 내 1회만 가능 | 유지 |
| 마감 후 같은 연도에서 재시작? | ❌ 불가 (마감 = 동결) | 불가로 유지 |
| 다음 연도에서 최초 배정 가능? | ✅ 새 `fiscal_year` 레코드 → 자동 가능 | 명시적 연도 오픈 필요 |
| 회수하면 재시작 가능? | ❌ 회수는 추가분만 취소, 기초 배정은 유지 | 유지 |

### 9.2 올바른 연도 사이클

```
[n년 연도 오픈]
       ↓
[최초 배정 등록] ← 1회만 가능
       ↓
[추가 배정 / 회수] ← 연중 반복 가능
       ↓
[n년 마감] ← 이후 모든 쓰기 차단
       ↓
[n+1년 연도 오픈] ← 새 최초 배정 가능 상태로 전환
```

### 9.3 현재 시스템의 위험성

> [!WARNING]
> **`_allocYear = new Date().getFullYear()` 자동 설정 방식**은 아래 위험이 있습니다:
> - 12월 31일 자정에 시스템이 자동으로 새 연도로 전환
> - 이전 연도 미결 신청/예산 처리 정책 없음
> - 관리자가 의도적으로 연도를 통제할 수 없음

### 9.4 필요 DB 구조

```sql
-- 회계연도 관리 테이블 (신규 필요) ❌ 미구현
CREATE TABLE budget_fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  fiscal_year integer NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  open_date date NOT NULL,
  close_date date,
  opened_by text,
  closed_by text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, fiscal_year)
);

-- account_budgets에 상태 컬럼 추가 ❌ 미구현
ALTER TABLE account_budgets
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'
  CHECK (status IN ('open', 'closed'));
```

### 9.5 연도 오픈/마감 권한 정책

| 역할 | 연도 오픈 | 연도 마감 | 비고 |
|------|----------|----------|------|
| `platform_admin` | ✅ | ✅ | 전사 |
| `tenant_global_admin` | ✅ | ✅ | 자사만 |
| `budget_global_admin` | ❌ | ❌ | 마감 권한 없음 |

### 9.6 마감 처리 시 체크리스트 (미구현)

마감 전 아래 조건이 모두 충족되어야 합니다:
- [ ] 진행 중인 교육 신청이 모두 확정/거절 처리됨
- [ ] `holding(가점유)` 금액이 0
- [ ] 미정산 실지출이 없음

### 9.7 결론: 4순위(회수) + 5순위(마감)의 역할

```
회수(4순위): 추가 배정 일부 취소 → 기초 배정 유지 → 재시작 ❌
마감(5순위): 해당 연도 동결 → 쓰기 차단 → 동일 연도 재시작 ❌
연도 오픈(신규 6순위): 새 fiscal_year 레코드 생성 → 최초 배정 가능 ✅
```

> [!IMPORTANT]
> **4·5순위를 완료해도 같은 연도에서 재시작은 불가합니다.**
> "마감 후 재시작"은 **새 회계연도를 열어야만 가능**하며,
> 이를 위한 **6순위: 연도 오픈/마감 관리 화면**이 별도로 필요합니다.

---

## 5. DB 테이블 구조

### `account_budgets` (예산계정별 연간 예산 레코드)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `account_code` | TEXT | 예산계정 코드 (FK → budget_accounts) |
| `fiscal_year` | INTEGER | 회계연도 |
| `tenant_id` | TEXT | 테넌트 ID |
| `total_budget` | NUMERIC | 총 배정 예산 (기초 + 추가 누계) |
| `deducted` | NUMERIC | 집행(사용) 금액 |
| `holding` | NUMERIC | 가점유(Hold) 금액 |
| `updated_at` | TIMESTAMPTZ | 최종 갱신 시각 |

**Unique 제약**: `(account_code, fiscal_year, tenant_id)`

### `budget_allocations` (FO 예산 잔액 동기화)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `bankbook_id` | UUID | 통장 ID |
| `allocated_amount` | NUMERIC | FO에서 사용 가능한 총 배정액 |
| `used_amount` | NUMERIC | 실제 사용액 |
| `frozen_amount` | NUMERIC | 가점유액 |

---

## 6. 접근 권한

| 역할 | 기초 등록 | 추가 배정 | 조회 |
|------|:---:|:---:|:---:|
| Platform Admin | ✅ | ✅ | ✅ |
| 테넌트 총괄 관리자 | ✅ | ✅ | ✅ |
| 계정 오너 (ownedAccounts) | ✅ | ✅ | ✅ |
| VOrg Manager (isVorgManager만) | ❌ | ❌ | ✅ |
| 기타 | ❌ | ❌ | ❌ |

> **판정 로직**: `renderAllocEntry()` 내 `(persona.ownedAccounts || []).length > 0` 체크.
> ownedAccounts가 없으면 🔒 표시.

---

## 7. 현재 구현 갭 분석 (2026-05-06 기준)

### 🔴 치명적 갭: 기초 예산 등록 불가 문제

**현상**: 상단 필터에서 계정을 선택하고 조회해도 "관리 계정 수 0개"로 표시되며,
기초 예산 등록 섹션 대신 "모든 계정의 기초 예산이 등록됐습니다" 배너가 표시됨.

**원인 구조**:
```
_bmLoadFilterData() → DB에서 제도그룹/계정 로드 ✅
_bmRefreshAcctList() → budget_accounts 테이블 조회 ✅
   ↓
BUT renderBudgetMaster()가 사용하는 것은
getPersonaAccountBudgets(persona) → ACCOUNT_BUDGETS (인메모리 배열)
   ↓
ACCOUNT_BUDGETS는 _syncAllocFromDB()로 채워지는데...
_syncAllocFromDB()는 페르소나 로드 시에만 실행됨
   ↓
필터 조회 후 ACCOUNT_BUDGETS가 여전히 빈 배열 → 0개 표시
```

**해결 방향**: `renderBudgetMaster()` 내에서 DB의 `account_budgets` 테이블을
직접 조회하여 요약 카드와 배정 폼을 채워야 함.

### 🟡 중요 갭: 기초 등록 폼의 계정 선택 문제

**현상**: `_acctFixedLabel`이 표시되면 `<select id="init-ab">` DOM이 없음.
→ `submitInitBudget()`에서 `abId = ''` (빈 값) → 즉시 return.

**해결 방향**: `submitInitBudget()`에서 `_bmFilterAcctCode`를 fallback으로 사용.

### 🟢 개선 완료 항목

| 항목 | 상태 |
|------|------|
| 3단 캐스케이드 필터 (회사→제도그룹→계정) | ✅ 구현 |
| `purpose='edu_support'` 필터 | ✅ 구현 |
| 상단 필터 → 배정 폼 자동 연동 | ✅ 구현 |
| 추가 배정 드롭다운 → 고정 라벨 교체 | ✅ 구현 |
| `submitAddBudget()` DB 저장 + audit log | ✅ 구현 |

---

## 8. 예산 최초 할당 정상 운영 절차

> [!IMPORTANT]
> 현재 데이터 동기화 갭으로 인해 UI에서 직접 기초 등록이 불가능한 상태.
> 아래는 **의도된 정상 운영 절차** 이며, 갭 해소 후 사용 가능하다.

```
Step 1. [교육제도 > 예산계정 관리] 에서 해당 제도그룹의 예산계정을 신규 등록
        → budget_accounts 테이블에 계정 레코드 생성

Step 2. [교육제도 > 예산계정 관리] 에서 신규 계정의 통장 정책 설정
        → budget_account_org_policy 레코드 생성
        → _syncBankbooksForTemplate() 실행 → bankbooks/budget_allocations 생성

Step 3. [교육제도 > 예산계정 마스터] 에서
        상단 필터: 회사 → 제도그룹 → 예산계정 선택 → [조회]
        → ACCOUNT_BUDGETS 인메모리가 채워진 상태라면
        → '기초 예산 등록' 섹션이 표시됨
        → 금액 입력 후 [기초 예산 등록 확정]
        → account_budgets 테이블에 total_budget 저장
        → budget_allocations 동기화

Step 4. [교육제도 > 예산 배정 및 관리] 에서
        팀별 통장에 예산 배분 (드릴다운)
```

---

## 9. 우선 구현 과제 (미해결 갭 기준)

| 우선순위 | 과제 | 영향도 |
|---------|------|:---:|
| P1 🔴 | `renderBudgetMaster()`에서 DB `account_budgets` 직접 조회하여 요약카드/배정폼 구성 | 기초 등록 불가 해소 |
| P2 🔴 | `submitInitBudget()`에서 `_bmFilterAcctCode` fallback 처리 | 고정 라벨 상태에서 기초 등록 가능 |
| P3 🟡 | "0개지만 모두 등록됨" 배너 표시 조건 수정 (`myBudgets.length > 0 && ...`) | 잘못된 OK 신호 제거 |
| P4 🟡 | 기초 등록 완료 후 팀 배분 화면으로 안내 버튼 추가 | 워크플로우 연속성 |

---

## 10. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-05-06 | 최초 작성 — Domain Council 분석 결과 반영. 구현 갭 4건, 운영 절차 정의 | AI |
