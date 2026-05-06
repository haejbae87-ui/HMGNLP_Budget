# 예산계정 마스터 요구사항 정의서 (PRD)

> **도메인**: 예산관리 — 계정별 기초/추가 배정
> **관련 파일**: `bo_budget_master.js`, `bo_allocation.js`, `bo_budget_account.js`
> **최초 작성**: 2026-05-06
> **최종 갱신**: 2026-05-06
> **상태**: 🟡 구현 갭 있음 (기초 배정 UI 존재, 데이터 동기화 단절)

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

## 3. 화면 구조

```
[상단 3단 필터] 회사 → 제도그룹(edu_support 유형만) → 예산계정 → [조회]
      ↓ 조회 후
[요약 카드 4개]  관리 계정 수 / 기초 예산 합계 / 추가 배정 합계 / 총 예산
      ↓
[기초 예산 등록 섹션]  ← baseAmount=0인 계정이 있을 때만 표시
   대상 계정: [드롭다운 or 필터 고정 라벨]
   연간 기초 예산 총액: [숫자 입력]
   [📋 기초 예산 등록 확정]
      ↓ 모든 계정 등록 완료 시 → 녹색 배너로 대체
[추가 배정 섹션]  ← 항상 표시
   추가 배정 계정: [드롭다운 or 필터 고정 라벨]
   추가할 금액: [숫자 입력]
   변경 사유 (Audit Trail 필수): [텍스트 입력]
   [✅ 추가 배정 확정]
```

---

## 4. 핵심 비즈니스 로직

### 4.1 기초 예산 등록 (1회성)

```javascript
// 조건: ACCOUNT_BUDGETS[i].sourceType === 'platform' && baseAmount === 0
// 저장: account_budgets 테이블 upsert
{
  account_code, fiscal_year, total_budget: amount,
  deducted: 0, holding: 0, tenant_id
}
// 추가: budget_allocations 동기화 (_syncBudgetAllocations)
// 완료 후: renderBudgetMaster() 재렌더
```

**전제 조건**: `ACCOUNT_BUDGETS` 인메모리 배열에 해당 계정 데이터가 있어야 함.
→ `_syncAllocFromDB()`가 성공적으로 호출되어야 함.

### 4.2 추가 배정 (연중 증액)

```javascript
// ACCOUNT_BUDGETS[i].totalAdded += amount
// account_budgets upsert: total_budget = baseAmount + totalAdded
// budget_adjust_logs 저장: type='추가배정', Audit Trail reason 필수
// budget_allocations 동기화
```

### 4.3 3단 필터 캐스케이드

| 단계 | DB 테이블 | 필터 조건 |
|------|----------|----------|
| 1. 회사(Tenant) | 드롭다운 고정 | 현재 로그인 테넌트 |
| 2. 제도그룹 | `virtual_org_templates` | `tenant_id = ?` AND **`purpose = 'edu_support'`** |
| 3. 예산계정 | `budget_accounts` | `template_id = 선택된 제도그룹` |

> [!IMPORTANT]
> 제도그룹은 **`purpose = 'edu_support'`** 조건으로 필터링.
> 자격증(cert), 뱃지(badge), 어학(language) 제도그룹은 이 화면에서 조회 불가.

### 4.4 상단 필터 → 배정 폼 자동 연동

- `_bmFilterAcctCode` (전역 변수) 가 설정되면:
  - `renderAllocEntry()` 내에서 `_bmFilterAcctList`에서 계정명 조회
  - 드롭다운 대신 **고정 라벨** (`💳 계정명 | 상단 필터에서 선택됨`)로 대체
  - `submitInitBudget()` / `submitAddBudget()` 호출 시 해당 계정 자동 사용

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
