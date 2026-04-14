# 세부산출근거 VOrg 단위 관리 설계 개선 PRD

> **도메인**: 세부산출근거 (Calculation Grounds)  
> **관련 파일**: `bo_data.js`, `bo_calc_grounds.js`, `plans.js`, `fo_form_loader.js`  
> **최초 작성**: 2026-04-14  
> **상태**: 🟡 설계 검토 중  

---

## 1. 현황 분석

### 1.1 데이터 이중화 문제 (Mock ↔ DB)

| 구분 | 위치 | 데이터 수 | 상태 |
|------|------|----------|------|
| **Mock (JS)** | `bo_data.js` > `CALC_GROUNDS_MASTER` | 28건 | `accountTypes: ['ops'/'etc']` 기반 |
| **DB (Supabase)** | `calc_grounds` 테이블 | 28건 | `account_code = NULL`, `virtual_org_template_id = NULL` |

> [!CAUTION]
> **두 데이터가 병존**하고 있음. `bo_calc_grounds.js`의 `loadCalcGroundsFromDb()`가 DB 데이터를 로드 시
> `CALC_GROUNDS_MASTER` 배열을 덮어쓰지만, DB 레코드에 `account_code`와 `virtual_org_template_id`가
> 모두 `NULL`이어서 **계정별 필터링이 작동하지 않음**.  
> 실제로는 `bo_data.js`의 Mock 배열(`accountTypes: ['ops'/'etc']`)이 필터링의 실질적 SSOT 역할을 수행 중.

### 1.2 현재 아키텍처

```
CALC_GROUNDS_MASTER (Mock·bo_data.js)
   ├── accountTypes: ['ops'] / ['etc']          ← 계정 유형별 분류
   └── CALC_ACCOUNT_GROUNDS (Mock 매핑)
        ├── HMC-OPS → accountType: 'ops' (운영 21종 전체)
        ├── HMC-ETC → accountType: 'etc' (기타 7종 전체)
        ├── HMC-PART → ops 중 CG017(교육참가비)만
        └── ...

calc_grounds 테이블 (DB)
   ├── account_code: NULL (미설정)
   ├── virtual_org_template_id: NULL (미설정)
   └── 28건 (Mock과 동일한 ID/이름이지만 연결 정보 없음)
```

### 1.3 문제점

1. **Mock ↔ DB 이중관리**: 산출근거 항목이 Mock과 DB에 중복 존재
2. **계정 고정 구조**: 현재 `accountTypes: ['ops'/'etc']`로 계정 유형에 종속 — **VOrg 간 공유 불가**
3. **DB 미완성**: `virtual_org_template_id`, `account_code` 컬럼은 존재하나 모두 NULL
4. **FO 필터 미작동**: DB 기반 로드 시 계정별 필터가 작동하지 않아 FO에서 모든 항목이 노출될 위험

---

## 2. 설계 개선 목표

### AS-IS → TO-BE

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| 관리 단위 | 예산계정(accountType) | **VOrg 템플릿** 단위 |
| 계정간 공유 | ❌ 불가 (ops/etc 분리) | ✅ 같은 VOrg 내 계정간 공유 |
| 데이터 SSOT | Mock (bo_data.js) | **DB (calc_grounds 테이블)** |
| Mock | 28건 하드코딩 | 삭제 → DB 100% 의존 |
| BO 관리 UI | 계정 탭 기반 | VOrg 탭 → 공유 체크박스 |

---

## 3. DB 스키마 개선

### 3.1 calc_grounds 테이블 변경

```sql
ALTER TABLE calc_grounds
  -- 기존 account_code는 유지하되 nullable (계정 특화 항목용)
  -- virtual_org_template_id를 primary 관리 키로 승격
  ADD COLUMN IF NOT EXISTS shared_account_codes TEXT[] DEFAULT '{}';
  -- 이 항목을 사용할 수 있는 계정 코드 배열 (빈 배열 = VOrg 내 전체 계정)
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 고유 식별자 |
| `tenant_id` | TEXT | 테넌트 |
| `virtual_org_template_id` | TEXT FK | **관리 단위 VOrg** (필수) |
| `account_code` | TEXT | 특정 계정 전용이면 지정, 공유면 NULL |
| `shared_account_codes` | TEXT[] | 사용 가능 계정 코드 배열 (빈 배열 = 전체) |
| `name` | TEXT | 항목명 |
| `unit_price` | BIGINT | 기준단가 |
| `limit_type` | TEXT | none / soft / hard |
| `soft_limit` / `hard_limit` | BIGINT | 상한액 |
| `usage_scope` | TEXT[] | 사용 단계 (plan, apply, settle) |
| `visible_for` | TEXT | both / domestic / overseas |
| `active` | BOOLEAN | 활성화 |
| `sort_order` | INT | 정렬순서 |

### 3.2 조회 로직

```sql
-- VOrg 기반 + 계정 필터
SELECT * FROM calc_grounds
WHERE tenant_id = :tenantId
  AND active = true
  AND virtual_org_template_id = :vorgTemplateId
  AND (
    shared_account_codes = '{}' -- 전체 계정 공유
    OR :accountCode = ANY(shared_account_codes)  -- 특정 계정 허용
  )
ORDER BY sort_order;
```

---

## 4. 마이그레이션 계획

### Phase 1: DB 데이터 정비 (Mock → DB 동기화)

```sql
-- 1) shared_account_codes 컬럼 추가
ALTER TABLE calc_grounds ADD COLUMN IF NOT EXISTS shared_account_codes TEXT[] DEFAULT '{}';

-- 2) 기존 28건의 VOrg 연결 + 계정 매핑 업데이트
-- 운영계정 항목 (CG001~CG021): HMC 일반 VOrg, 운영계정 전체 공유
UPDATE calc_grounds
SET virtual_org_template_id = 'TPL_1774867919831',
    shared_account_codes = '{}'  -- 전체 공유
WHERE id LIKE 'CG0%' AND tenant_id = 'HMC';

-- 기타계정 항목 (CG101~CG107): HMC 일반 VOrg, 기타계정만
UPDATE calc_grounds
SET virtual_org_template_id = 'TPL_1774867919831',
    shared_account_codes = '{"HMC-ETC"}'
WHERE id LIKE 'CG1%' AND tenant_id = 'HMC';
```

### Phase 2: Mock 데이터 제거

- `bo_data.js`의 `CALC_GROUNDS_MASTER` 초기값을 빈 배열로 변경
- `CALC_ACCOUNT_GROUNDS` mock 매핑 제거
- `bo_calc_grounds.js`의 DB 로드 로직이 유일한 데이터 소스가 됨

### Phase 3: BO 관리 UI 개선

- 기존 계정 탭 기반 UI → VOrg 탭 기반으로 변경
- VOrg 선택 후 해당 VOrg에 속한 산출근거 목록 표시
- 각 항목에 "공유 계정" 체크박스로 계정간 공유 설정

---

## 5. FO 영향도 분석

### 5.1 plans.js (세부산출근거 렌더링)

현재 `getCalcGroundsForAccount(accountCode)` 호출 → **변경 필요**

```javascript
// AS-IS
const items = getCalcGroundsForAccount(accountCode);

// TO-BE
const items = getCalcGroundsForVorg(vorgTemplateId, accountCode);
```

### 5.2 fo_form_loader.js (calc-grounds fieldType)

`calc-grounds` 필드 렌더링 시 VOrg + 계정 조합으로 항목을 조회해야 함.  
현재 `_renderOneField`에서 계정 코드만 전달 → VOrg ID 추가 전달 필요.

---

## 6. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| VOrg 없는 테넌트 | fallback: account_code로 기존 방식 조회 |
| 계정간 공유 해제 | shared_account_codes에서 해당 코드 제거, 이미 사용된 데이터는 유지 |
| R&D VOrg 전용 항목 | virtual_org_template_id = R&D VOrg, shared_account_codes = '{HMC-RND}' |
| 전사 공통 항목 | virtual_org_template_id = NULL, shared_account_codes = '{}' → 테넌트 전체 공유 |

---

## 7. 우선순위 및 일정

| 순번 | 작업 | 우선순위 | 상태 |
|------|------|----------|------|
| 1 | DB 마이그레이션 (shared_account_codes 컬럼 + 데이터 정비) | 🔴 HIGH | ⬜ |
| 2 | `bo_calc_grounds.js` DB 조회 로직 VOrg 기반 변경 | 🔴 HIGH | ⬜ |
| 3 | `bo_data.js` Mock 데이터 정리 (빈 배열로 교체) | 🔴 HIGH | ⬜ |
| 4 | `plans.js` FO 산출근거 조회 VOrg+계정 전환 | 🔴 HIGH | ⬜ |
| 5 | BO 관리 UI VOrg 탭 기반 리뉴얼 | 🟡 MED | ⬜ |
| 6 | VOrg 간 산출근거 복사/이동 기능 | 🟢 LOW | ⬜ |

---

## 8. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-14 | 최초 작성. Mock vs DB 이중화 분석, VOrg 단위 관리 설계 | AI |
