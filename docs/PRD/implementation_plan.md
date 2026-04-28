# Phase 3: 팀 사업계획 일괄 확정 (Team Forecast Bundle) 구현 계획

> **도메인**: FO — 교육계획 (수요예측 번들 확정)
> **관련 파일**: `fo_plans_list.js`, `fo_plans_wizard.js`, `fo_approval.js`, `submission_documents` 테이블
> **최초 작성**: 2026-04-28
> **최종 갱신**: 2026-04-28
> **상태**: 🔴 미구현

---

## 🏛️ Domain Council 확정 정책 (최종)

| 정책 | 확정 내용 |
|---|---|
| **확정 권한** | 팀 구성원(`currentPersona.dept` 일치) 누구나 가능. 대표 지정 없음 |
| **포함 필터** | `saved` 상태 + `plan_type='forecast'` 계획만 포함. `draft` 제외 |
| **계정 혼합** | ❌ 금지 — **계정(account_code)별 번들 분리 생성** |
| **예산 Hold** | ❌ 없음 — `plans.amount`는 수요 요청액(수요예측 금액)이며 예산 예약 아님 |
| **팀장 자가 확정** | 확정 누른 사람 = 팀장인 경우 → `team_approved` 자동 전환 → BO 바로 전달 |
| **PRD 충돌 해소** | `fo_submission_approval.md` v1.1 `account_code` 단일값 정책과 완전 일치. `budget_lifecycle.md` F-112 (대표 지정) → "누구나 가능"으로 이 문서가 우선 적용 |

---

## 1. 기능 개요

팀원들이 각자 수요예측 사업계획을 수립(`saved`)한 후, 팀 구성원 중 누구든 해당 계정의 `saved` 계획들을 하나의 번들로 묶어 팀장에게 통보하는 경량 워크플로우.

- 결재를 타는 개념이 아닌 **"팀 수요 취합 통보"** 성격
- 예산 Hold 없음 — 금액은 "얼마 필요합니다" 수준의 요청액
- 계정별로 별도 번들 생성 (HMC-OPS 번들, HMC-ETC 번들 각각)
- 팀장은 번들을 확인 후 BO 운영담당자에게 전달

---

## 2. 사용자 스토리

> "팀원(누구나)은 팀 탭에서 계정별로 `saved` 상태 수요예측 계획을 확인하고, '팀 사업계획 확정' 버튼을 눌러 팀장에게 번들 통보할 수 있다."

> "팀장은 결재함에서 번들 문서를 열어 팀 전체 사업계획 목록을 확인하고, BO 운영담당자에게 전달할 수 있다."

> "BO 운영담당자는 팀별 team_forecast 번들을 수신하여 1차 예산 취합 대시보드에서 검토할 수 있다."

---

## 3. 상세 기능 요구사항

### [F-001] 팀 탭 — 계정별 번들 현황 표시

| 번호 | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| F-001a | 계정별 그룹핑 표시 | 팀원들의 `saved` + `forecast` 계획을 `account_code`별로 그룹핑하여 표시 | 🔴 HIGH |
| F-001b | 번들 상태 표시 | 계정별로 "확정 대기 중", "확정 완료(N건)", "BO 전달 완료" 상태 표시 | 🔴 HIGH |
| F-001c | 미완료 팀원 표시 | `draft` 상태 계획 작성자 목록을 "미완료 N명" 으로 표시 (번들 미포함) | 🟡 MED |
| F-001d | 번들 후 추가 계획 표시 | 번들 확정 후 새로 `saved`된 계획은 "번들 미포함" 표시 + "재확정" 안내 | 🟡 MED |

### [F-002] 팀 사업계획 확정 버튼

| 번호 | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| F-002a | 계정별 확정 버튼 | 계정 그룹마다 독립적인 "📤 [계정명] 사업계획 확정" 버튼 | 🔴 HIGH |
| F-002b | 중복 확정 방지 | 동일 팀 + 동일 계정 + 동일 연도에 `submitted` 번들 존재 시 버튼 비활성화 + 확정자 표시 | 🔴 HIGH |
| F-002c | 확정 전 확인 모달 | "N건 포함, 총 요청액 X원. M명 미완료(제외)" 확인 후 진행 | 🟡 MED |

### [F-003] 번들 생성 처리

| 번호 | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| F-003a | submission_documents 생성 | `submission_type='team_forecast'`, `account_code` 단일값, `submitter_id`=클릭한 사람 | 🔴 HIGH |
| F-003b | submission_items INSERT | 포함된 `plan_id`들을 `submission_items`에 INSERT | 🔴 HIGH |
| F-003c | plans.status 전환 | 번들에 포함된 계획: `saved` → `submitted` (번들 잠금) | 🔴 HIGH |
| F-003d | 팀장 자가 확정 처리 | submitter = 팀장(`pos` 포함)인 경우 → `status='team_approved'` 자동 전환 | 🟡 MED |

### [F-004] 팀장 결재함 — 번들 카드 뷰

| 번호 | 기능 | 설명 | 우선순위 |
|---|---|---|---|
| F-004a | 번들 카드 표시 | 기존 개별 계획 카드와 분리된 "📦 팀 번들" 카드 표시 | 🔴 HIGH |
| F-004b | 번들 상세 드릴다운 | 번들 카드 클릭 → 팀원별 계획 목록 + 상세 내용 열람 | 🔴 HIGH |
| F-004c | BO 전달 버튼 | 검토 완료 후 "BO 전달" 클릭 → `status='team_approved'` | 🔴 HIGH |
| F-004d | 반려 기능 | 번들 반려 시 → 포함 계획 전건 `saved` 복귀 + "번들 반려" 표시 | 🟡 MED |

---

## 4. DB/데이터 구조

### 기존 테이블 활용 (신규 테이블 없음)

```sql
-- submission_documents: team_forecast 번들 1건 (계정별)
INSERT INTO submission_documents (
  id,
  submission_type,   -- 'team_forecast'
  tenant_id,
  submitter_id,      -- 확정 버튼 누른 팀원 ID
  submitter_name,    -- 확정자 이름
  submitter_dept,    -- 팀명 (dept)
  account_code,      -- 단일 계정 (HMC-OPS / HMC-ETC 등)
  fiscal_year,       -- 대상 연도
  total_amount,      -- SUM(plans.amount) — 요청액 합계, Hold 없음
  status,            -- 'submitted' (팀장 검토 대기)
  created_at
)

-- submission_items: 번들에 포함된 각 계획
INSERT INTO submission_items (
  submission_id,     -- 위 번들 ID
  item_type,         -- 'plan'
  item_id,           -- plans.id
  amount             -- plans.amount
)

-- plans 상태 전환
UPDATE plans SET status = 'submitted' 
WHERE id IN (번들에 포함된 plan_id들)
```

### status 흐름

```
[FO 팀원 확정]
  plans.status: saved → submitted
  submission_documents.status: 'submitted'
        ↓
[팀장 결재함 수신]
  팀장이 [BO 전달] 클릭
  submission_documents.status: 'team_approved'
        ↓
[BO 운영담당자 대시보드 수신]
  bo_budget_consolidation: team_forecast 카드 표시
  (기존 F-001~F-004 흐름 연결)
```

### 팀장 자가 확정 분기

```javascript
const isTeamLeader = /팀장|리더|부장|차장|과장/i.test(currentPersona.pos || '');
const isSelfSubmit = submitterId === teamLeaderId;

if (isTeamLeader || isSelfSubmit) {
  // team_approved 자동 전환 → BO 바로 전달
  status = 'team_approved';
} else {
  status = 'submitted'; // 팀장 검토 대기
}
```

---

## 5. 비즈니스 로직

### 5.1 번들 포함 조건 (필터링 로직)

```javascript
// 팀 탭에서 번들 대상 계획 필터
const bundleTarget = allPlans.filter(p =>
  p.dept === currentPersona.dept &&          // 같은 팀
  p.status === 'saved' &&                     // saved만 (draft 제외)
  p.plan_type === 'forecast' &&              // 수요예측만
  p.account_code === targetAccountCode &&     // 동일 계정만
  p.fiscal_year === currentFiscalYear         // 동일 연도
);
```

### 5.2 중복 번들 방지

```javascript
// 확정 버튼 클릭 전 기존 번들 존재 여부 확인
const existingBundle = await getSB()
  .from('submission_documents')
  .select('id, submitter_name, created_at')
  .eq('submission_type', 'team_forecast')
  .eq('submitter_dept', currentPersona.dept)
  .eq('account_code', targetAccountCode)
  .eq('fiscal_year', currentFiscalYear)
  .in('status', ['submitted', 'team_approved', 'in_review'])
  .single();

if (existingBundle) {
  // 버튼 비활성화 + "이미 확정됨 (확정자: 홍길동)" 표시
  return;
}
```

### 5.3 예산 처리 원칙

- `frozen_amount` 변경 없음
- `used_amount` 변경 없음
- `plans.amount` = 수요 요청액으로만 기록
- 실제 예산 배정은 BO 운영담당자 → 총괄담당자 단계에서 결정

---

## 6. 접근 권한

| 역할 | 팀 탭 조회 | 확정 버튼 | 번들 반려 | BO 결재함 수신 |
|---|:---:|:---:|:---:|:---:|
| FO 일반 팀원 | ✅ (같은 팀) | ✅ | ❌ | ❌ |
| FO 팀장 | ✅ | ✅ | ✅ | ✅ (자기 팀) |
| BO 운영담당자 | ❌ | ❌ | ❌ | ✅ (관할 팀) |

---

## 7. 예외 처리 및 엣지 케이스

| # | 케이스 | 위험도 | 처리 방안 |
|---|---|---|---|
| EC-1 | 동일 계정 번들 중복 생성 시도 | 🔴 | 기존 `submitted` 번들 존재 시 버튼 비활성화, 확정자·일시 표시 |
| EC-2 | 팀장이 직접 확정 → 자기 결재함 도달 | 🟡 | `team_approved` 자동 전환 → BO 바로 전달 |
| EC-3 | 번들 확정 후 팀원이 새 계획 saved | 🟡 | 번들 미포함 표시 + "재확정 필요" 안내. 재확정 = 기존 번들 취소 후 재생성 |
| EC-4 | dept 값이 없는 사용자의 확정 시도 | 🟡 | dept 없으면 팀 탭 숨김 + "팀 정보가 없습니다" 안내 |
| EC-5 | 번들 포함 계획이 0건 (모두 draft) | 🟢 | 확정 버튼 비활성화 + "확정 가능한 완료 계획이 없습니다" 표시 |
| EC-6 | 팀에 계정이 N개 → N개 번들 각각 확정 필요 | 🟡 | 계정별 그룹마다 확정 버튼 독립 표시. "미확정 계정" 뱃지로 안내 |
| EC-7 | 번들 반려 후 재확정 | 🟡 | 반려된 번들의 계획들 `saved` 복귀 → 재확정 가능 |

---

## 8. UI/UX 설계

### 8.1 팀 탭 — 계정별 번들 그룹

```
[우리 팀 2026년 수요예측 사업계획]

 ┌── HMC-OPS 계정 ──────────────────────────┐
 │ ✅ 홍길동 — 이러닝 집합 교육  3,000,000  │
 │ ✅ 이민지 — 워크샵 세미나    5,000,000   │
 │ ⚠️ 박영희 — 작성 중 (제외)               │
 │ 포함: 2건 / 요청액 8,000,000원           │
 │                                          │
 │  [📤 HMC-OPS 사업계획 확정]              │
 └──────────────────────────────────────────┘

 ┌── HMC-ETC 계정 ──────────────────────────┐
 │ ✅ 김철수 — 외부교육 참가    2,000,000   │
 │ 포함: 1건 / 요청액 2,000,000원           │
 │                                          │
 │  ✅ 확정 완료 (확정자: 홍길동 · 04/28)   │
 └──────────────────────────────────────────┘
```

### 8.2 팀장 결재함 — 번들 카드

```
 ┌── 📦 팀 수요예측 번들 ──────────────────────┐
 │ [내구기술팀] 2026년 HMC-OPS 사업계획        │
 │ 확정자: 이민지 · 2026-04-28 14:05           │
 │ 포함: 2건 · 총 요청액 8,000,000원           │
 │                                             │
 │  ▼ 계획 목록                                │
 │  홍길동 - 이러닝 집합  3,000,000원  [상세▶] │
 │  이민지 - 워크샵      5,000,000원  [상세▶] │
 │                                             │
 │  [BO 전달]  [반려]                          │
 └─────────────────────────────────────────────┘
```

---

## 9. 수정 필요 PRD 목록

| PRD 파일 | 수정 내용 | 우선순위 |
|---|---|---|
| `budget_lifecycle.md` F-112 | "대표만 상신" → "팀원 누구나 확정 가능" 수정 | 🟡 |
| `fo_submission_approval.md` | `team_forecast` 번들 FO 생성 흐름 §4.x에 추가 | 🟡 |

---

## 10. 구현 대상 파일

| 파일 | 작업 내용 |
|---|---|
| `fo_plans_list.js` | 팀 탭 — 계정별 번들 그룹 UI, 확정 버튼, 중복 방지 로직 |
| `fo_approval.js` | 팀장 결재함 — 번들 카드 렌더링, BO 전달 버튼 |
| Supabase | `submission_documents`, `submission_items` INSERT 로직 |

---

## 11. Verification Plan

- **중복 확정 차단**: 같은 계정 번들을 2명이 연달아 누를 때 두 번째 시도 차단 확인
- **팀장 자가 확정**: 팀장 계정으로 확정 시 `team_approved` 자동 전환 + BO 대시보드 즉시 도달
- **Draft 제외**: `draft` 계획이 번들에 포함되지 않음 확인
- **BO 연결**: `team_approved` 이후 `bo_budget_consolidation` F-001 카드에 정상 노출 확인

---

## 12. 📌 추후 논의 필요 항목 (Deferred Decisions)

> [!IMPORTANT]
> 아래 항목들은 현재 Phase 3 구현 범위에서 제외되었으나, 반드시 후속 논의 및 설계가 필요한 사항입니다.

### Q-P3-01: 수요예측 결재라인 — 계정 단위 분리 설계 (🔴 HIGH)

**현황**:
- BO 정책 빌더(`bo_policy_builder.js`)에는 이미 **"수요예측 결재라인"** UI 섹션이 존재하며, 현재 "미설정" 상태
- 기존 결재라인 설정은 **교육유형(edu_type)별**로 금액 구간 결재자를 지정하는 구조

**문제점**:
- 수요예측(forecast) 사업계획은 특정 교육유형이 아닌 **계정(account_code) 단위**로 예산이 관리됨
- `HMC-OPS` 계정 수요예측과 `HMC-RND` 계정 수요예측은 결재자가 다를 수 있음
- 현재 교육유형별 결재라인으로는 이 분리가 불가능

**논의 필요 사항**:
1. 수요예측 결재라인을 **계정 단위**로 별도 설정하는 UI/DB 구조 설계
2. 기존 교육유형별 결재라인(`approval_line_design.md`)과 수요예측 계정별 결재라인의 **공존 아키텍처**
3. `bo_policy_builder.js`의 "수요예측 결재라인" 섹션을 계정 단위 설정으로 확장하는 방안
4. 팀장 → BO 운영담당자 → 총괄담당자 3단계 고정 라인 vs 계정별 유연 설정 중 선택

**참고 스크린샷**: BO 정책 빌더 Step 3 "결재라인" 화면에서 "수요예측 결재라인" 섹션이 이미 분리되어 있으나 미설정 상태 확인됨.

**연관 PRD**: `fo_submission_approval.md`, `budget_lifecycle.md` Phase 12~14, `approval_line_design.md`

---

## 13. 변경 이력

| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-28 | 최초 작성 — Phase 3 팀 사업계획 일괄 확정. Domain Council 3회 검증. 계정별 번들 분리, 누구나 확정, Hold 없음 확정 | AI |
| 2026-04-28 | §12 추후 논의 항목 추가 — Q-P3-01 수요예측 결재라인 계정 단위 분리 설계 기록 | AI |
