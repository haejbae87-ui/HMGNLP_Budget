# 예산 배정 BO→FO 실시간 연동 요구사항 정의서 (PRD)

> **도메인**: 예산 배정 / 잔액 연동
> **관련 파일**: `bo_allocation.js`, `fo_persona_loader.js`, `supabase_client.js`, `dashboard.js`
> **최초 작성**: 2026-04-16
> **최종 갱신**: 2026-04-16
> **상태**: 🔴 미구현 (핵심 연동 누락)

---

## 1. 기능 개요

백오피스(BO)에서 예산배정 현황관리 화면을 통해 통장(bankbook)에 예산을 배정하면,
프론트오피스(FO) 대시보드·교육계획·교육신청 화면에서 해당 예산 잔액이 실시간으로 반영되어야 한다.

현재 BO의 배정 액션은 **인메모리 목업 배열(`TEAM_DIST`, `ACCOUNT_BUDGETS`)만 수정**하고
Supabase DB(`budget_allocations` 테이블)에 저장하지 않아, FO와 연동되지 않는다.

---

## 2. 현재 아키텍처 vs. 목표 아키텍처

### 현재 (버그 상태)

```
BO 예산배정 현황관리
  ├─ submitBulkDist() → TEAM_DIST[] 인메모리 수정 ← ✋ DB 저장 없음
  ├─ submitInitBudget() → ACCOUNT_BUDGETS[] 인메모리 수정 ← ✋ DB 저장 없음
  └─ submitAddBudget() → ACCOUNT_BUDGETS[].totalAdded++ ← ✋ DB 저장 없음

FO 대시보드/교육계획
  └─ fo_persona_loader._initCurrentPersona()
       └─ budget_allocations.allocated_amount 조회 → 0원 (미연결)
```

### 목표 (정상 상태)

```
BO 예산 배정
  ├─ submitBulkDist()
  │    └─ budget_allocations.update (bankbook_id 기반 allocated_amount 갱신) ← DB 연동
  ├─ submitInitBudget() / submitAddBudget()
  │    └─ account_budgets.upsert (account_code, fiscal_year 기반 total_budget 갱신) ← DB 연동
  └─ TEAM_DIST, ACCOUNT_BUDGETS 인메모리 → 화면 반영용으로만 사용

FO 대시보드/교육계획
  └─ fo_persona_loader._initCurrentPersona()
       └─ budget_allocations.allocated_amount 조회 → 정상 잔액 표시 ← 연동됨
```

---

## 3. 사용자 스토리

> "예산총괄 담당자는 BO 예산배정 화면에서 역량혁신팀 일반-운영계정에 1,000,000원을 배정하면,
> 역량혁신팀 소속 FO 사용자의 대시보드에서 즉시 100만원 잔액이 표시되어야 한다."

---

## 4. DB 테이블 구조 (연동 대상)

### `budget_allocations` (FO가 읽는 테이블)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK |
| `bankbook_id` | uuid | `org_budget_bankbooks.id` FK |
| `allocated_amount` | numeric | 배정 금액 (BO가 써야 할 값) |
| `used_amount` | numeric | 집행 금액 |
| `frozen_amount` | numeric | 가점유(신청중) 금액 |
| `updated_at` | timestamptz | 최종 갱신 시각 |

### `org_budget_bankbooks` (팀-계정 연결 테이블)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK |
| `org_id` | text | 조직 UUID (organizations.id) |
| `org_name` | text | 팀명 |
| `account_id` | text | `budget_accounts.id` |
| `template_id` | text | VOrg 템플릿 ID |
| `tenant_id` | text | 회사 코드 |
| `bb_status` | text | active/inactive |

### `account_budgets` (BO 계정 총액 테이블 - supabase_client.js가 READ)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `account_code` | text | 예산 계정 코드 (예: HMC-OPS) |
| `fiscal_year` | integer | 회계연도 |
| `total_budget` | bigint | 기초예산+추가배정 합계 |
| `deducted` | bigint | 실집행 합계 |
| `holding` | bigint | 가점유 합계 |

---

## 5. 비즈니스 로직

### F-001: BO 팀 배분 → `budget_allocations` DB 연동

**트리거**: `submitBulkDist()` 실행 시

**처리 흐름**:
1. `_distAllTeams` 배열에서 입력 금액이 0 초과인 팀 추출
2. 각 팀의 `teamName` → `org_budget_bankbooks.org_name` 매칭 → `bankbook_id` 획득
3. `budget_allocations` 테이블에서 해당 bankbook_id 레코드 조회
   - 존재 시: `allocated_amount += 입력금액` (누적 배정)
   - 없을 시: 신규 INSERT (`allocated_amount = 입력금액, used_amount = 0, frozen_amount = 0`)
4. 인메모리 `TEAM_DIST` 배열도 동기 업데이트 (화면 리렌더용)

**키 매칭 전략**:
- `TEAM_DIST.teamName` ↔ `org_budget_bankbooks.org_name` 문자열 매칭
- 동일 계정코드 (`ab.accountCode`) + 동일 VOrg 템플릿 (`ab.templateId`) 조건 포함

### F-002: BO 기초·추가 예산 등록 → `account_budgets` DB 연동

**트리거**: `submitInitBudget()`, `submitAddBudget()` 실행 시

**처리 흐름**:
1. `account_budgets` 테이블 upsert (account_code + fiscal_year 복합키)
   - `total_budget` = `baseAmount + totalAdded` 재계산 반영

### F-003: FO 예산 잔액 표시 (현재 구조 유지)

`fo_persona_loader._initCurrentPersona()`:
- `budget_allocations.allocated_amount` → `persona.budgets[n].balance`
- `budget_allocations.used_amount` → `persona.budgets[n].used`
- 이미 올바른 로직이지만 BO가 DB에 저장하지 않아 0원으로 표시됨

---

## 6. 접근 권한

| 역할 | 배정 권한 |
|------|---------|
| `platform_admin`, `tenant_global_admin` | 모든 계정/팀 배정 가능 |
| `budget_global_admin` | 소속 테넌트 계정/팀 배정 가능 |
| `budget_op_manager` (VOrg Manager) | 관할 VOrg 하위 팀만 배정 가능 |
| FO learner | 읽기 전용 (잔액 조회만) |

---

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|--------|----------|
| bankbook_id 매칭 실패 (팀명 불일치) | `console.error` + alert "해당 팀의 통장이 없습니다" |
| budget_allocations 행 없음 (신규 배분) | INSERT (기존 upsert 흐름 활용) |
| 배분 금액이 배분가능 재원 초과 | 기존 클라이언트 검증(maxAmt)으로 차단, DB 저장 전 사전 차단 |
| 부분 실패 (일부 팀 저장 성공, 일부 실패) | 트랜잭션 미지원 → 실패 팀 목록 alert 후 인메모리는 롤백 |
| Supabase 오류 (401, 503 등) | catch 블록에서 alert("저장 실패, 다시 시도하세요") + 인메모리 롤백 |
| 중복 배정 (같은 팀에 2회 배분) | `allocated_amount += 새 금액` (누적) — 덮어쓰기가 아닌 가산 |
| account_budgets 행 없음 | upsert로 신규 생성 |
| org_budget_bankbooks에 template_id 불일치 | accountCode 단독 매칭으로 폴백 |

---

## 8. 개발 계획서

### Phase 1: BO → DB 배정 저장 연동 (핵심)

**대상 파일**: `public/js/bo_allocation.js`

#### 1-1. `submitBulkDist()` 개선
```javascript
// 기존: TEAM_DIST 인메모리만 수정
// 변경: Supabase budget_allocations UPSERT

async function submitBulkDist() {
  // ... 기존 검증 로직 유지 ...
  
  const sb = typeof getSB === 'function' ? getSB() : null;
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  
  // 1. org_budget_bankbooks에서 팀→bankbook_id 매핑 조회
  const { data: bankbooks } = await sb
    .from('org_budget_bankbooks')
    .select('id, org_name, account_id')
    .eq('tenant_id', boCurrentPersona.tenantId)
    .eq('bb_status', 'active');
  
  // 2. 각 팀 배분 처리
  const errors = [];
  for (const t of teams) {
    const v = Number(document.getElementById(t.inputId)?.value || 0);
    if (v <= 0) continue;
    
    // bankbook 매칭
    const bb = bankbooks?.find(b => 
      (b.org_name === t.teamName || b.org_name.includes(t.teamName)) &&
      b.account_id === ab.dbAccountId  // budget_accounts.id
    );
    if (!bb) { errors.push(t.teamName); continue; }
    
    // budget_allocations upsert
    const { data: existing } = await sb
      .from('budget_allocations')
      .select('id, allocated_amount')
      .eq('bankbook_id', bb.id)
      .single();
    
    if (existing) {
      await sb.from('budget_allocations')
        .update({ allocated_amount: Number(existing.allocated_amount) + v, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await sb.from('budget_allocations')
        .insert({ bankbook_id: bb.id, allocated_amount: v, used_amount: 0, frozen_amount: 0 });
    }
    
    // 인메모리 동기화
    const ex = TEAM_DIST.find(td => td.accountBudgetId === abId && td.teamName === t.teamName);
    if (ex) ex.allocAmount += v;
    else TEAM_DIST.push({ id: `TD${Date.now()}`, accountBudgetId: abId, teamName: t.teamName, allocAmount: v, spent: 0, reserved: 0 });
  }
  
  if (errors.length) alert(`⚠ 다음 팀의 통장을 찾지 못했습니다: ${errors.join(', ')}`);
  alert('✅ 배분 완료 (DB 저장됨)');
  showAllocTab(0);
}
```

#### 1-2. ACCOUNT_BUDGETS에 `dbAccountId` 필드 추가
- `bo_data.js`의 `ACCOUNT_BUDGETS` 배열 항목에 `dbAccountId` 필드 추가
- 또는 `budget_accounts` 테이블에서 `code = ab.accountCode AND active = true`로 조회

#### 1-3. `submitInitBudget()` / `submitAddBudget()` DB 저장 추가
```javascript
// account_budgets UPSERT
await sb.from('account_budgets').upsert({
  account_code: ab.accountCode,
  fiscal_year: _allocYear,
  total_budget: ab.baseAmount + ab.totalAdded,
  deducted: 0,
  holding: 0
}, { onConflict: 'account_code,fiscal_year' });
```

### Phase 2: FO 로직 확인 (현재 올바름, 검증만)

- `fo_persona_loader._initCurrentPersona()` 의 `budget_allocations` 조회 로직 정상 동작 확인
- DB 저장 후 페르소나 재로드 시 즉시 반영되는지 확인

### Phase 3: BO 배정 현황 화면에서 DB 실시간 조회 (선택적 개선)
- 현재 `renderAllocOverview()`는 `ACCOUNT_BUDGETS`(목업)을 사용
- Phase 1 완료 후 DB와 목업 간 동기화 확인

---

## 9. [기획자 검토 필요 항목]

### 🔴 CRITICAL: `dbAccountId` 매핑 문제
`ACCOUNT_BUDGETS` 목업의 `id`는 인메모리 키이고 `budget_accounts.id` (DB UUID)와 다르다.
팀→bankbook 매칭 시 `budget_accounts.code = ab.accountCode` 쿼리로 DB ID를 실시간 조회해야 한다.

### 🟡 중요: 팀명 일치 전략
`TEAM_DIST.teamName` vs `org_budget_bankbooks.org_name`이 항상 정확히 일치한다는 보장이 없다.
예: "역량혁신팀" vs "역량혁신센터". 이 매칭 로직에 fuzzy 처리가 필요하다.
**제안**: `org_id` 기반 매칭으로 전환 (VIRTUAL_EDU_ORGS의 팀에 org_id 포함 여부 확인 필요).

### 🟡 중요: 누적 배정 정책
현재 "배분 확정 후 취소 불가"를 안내하고 있으나, 실수로 2회 배분 시 누적됨.
개발 후 BO에 "이미 배분된 금액 수정(차감)" 기능 필요 여부 검토할 것.

### ⚠️ 주의: 계정 총액(`account_budgets.total_budget`) 연동 범위
현재 `supabase_client.sbGetBudgetBalance()`는 `account_budgets.total_budget`을 읽지만,
FO의 `fo_persona_loader`는 `budget_allocations.allocated_amount`를 읽는다.
두 경로가 다르므로 용도 구분을 명확히 해야 한다.
- `account_budgets` → BO 계정 원장 총액 (전체 풀)
- `budget_allocations` → 팀별 배정 금액 (FO가 소비하는 잔액)

---

## 10. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-16 | 최초 작성 (역추적 분석 기반) — BO인메모리↔FO DB 연동 단절 문제 정의 | AI |
