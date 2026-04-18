# 📋 교육지원제도 운영관리 — 역할별 업무 설계 PRD

> **v1.1** · 2026-04-18 최종 갱신  
> **도메인**: 교육지원제도 운영관리 (Back Office)  
> **상태**: 🔴 기획 확정 / 미구현  
> **관련 PRD**: [multi_plan_application.md](multi_plan_application.md), [field_standardization.md](field_standardization.md), [budget_lifecycle.md](budget_lifecycle.md)

---

## 1. 배경 및 목표

### 1.1 문제 정의

교육지원제도 운영관리 하위 6개 메뉴를 사용하는 두 핵심 역할(제도 총괄담당자, 제도 운영담당자)의 업무 범위와 권한이 **코드 레벨에서 명확히 분리되어 있지 않다.**

현재 코드 분석 결과:
- `BUDGET_ADMIN_MENUS`(총괄)와 `BUDGET_OP_MENUS`(운영)가 **동일한 메뉴 6개**를 가지고 있어 메뉴 접근 차이가 없음
- `bo_plan_mgmt.js`에서 운영담당자의 관할 조직 필터(`_boEduFilter`)가 존재하지만, 총괄과 운영 간 **승인 권한/배정 편집 권한 분기가 미약**
- `bo_approval.js`에서 결재 건은 정책 기반 자동 라우팅이나, **운영 → 총괄 2단계 상신 로직이 미구현**
- `bo_allocation.js`에서 `isVorgManager()` 체크로 운영관리자 뷰는 분리되나, **배정 조정 읽기/쓰기 권한이 불완전**

### 1.2 목표

| # | 목표 | 측정 기준 |
|---|------|----------|
| G1 | **역할별 데이터 범위 분리** | 운영담당자는 자신의 교육조직 데이터만 접근 |
| G2 | **2단계 결재 프로세스** | 운영 1차 검토 → 팀장 결재 → 총괄 최종 승인 |
| G3 | **예산 배정 권한 분리** | 운영은 관할 조직 조회만, 총괄은 전체 배정·조정 |
| G4 | **상신(묶음 상신) 기능** | 운영담당자가 관할 교육조직 건을 모아 총괄에게 상신 |

---

## 2. 역할 정의

### 2.1 제도 총괄담당자 (`budget_global_admin`)

> **역할 요약**: 테넌트 전체의 교육지원제도를 관장하는 최종 의사결정자

| 영역 | 업무 범위 |
|------|----------|
| **교육계획** | 전체 교육조직의 계획 목록 조회 + **최종 승인/반려** |
| **교육신청** | 전체 신청 건 조회 + **최종 승인(운영 1차 통과 건)** |
| **교육결과** | 전체 결과 조회 + 결산 승인 |
| **예산 배정** | 기초/추가 배정 등록 + 팀 배분 + **전 조직 배정액 조정** + 이관 |
| **예산 사용이력** | 전체 조직 트랜잭션 조회 + CSV 내보내기 |
| **예산 수요분석** | 전체 드릴다운 + **시뮬레이션 생성/확정** |

### 2.2 제도 운영담당자 (`budget_op_manager`)

> **역할 요약**: 특정 교육조직(VOrg 내 1~N개 그룹)을 관할하는 실무 운영자

| 영역 | 업무 범위 | 제약 |
|------|----------|------|
| **교육계획** | **관할 조직만** 조회 + **1차 검토(승인 추천/반려)** | 최종 승인 불가 |
| **교육신청** | **관할 조직만** 조회 + **1차 검토** | 최종 승인 불가 |
| **교육결과** | 관할 조직 결과 조회 + 1차 정산 검토 | 최종 정산 불가 |
| **예산 배정** | 관할 조직 **배정 현황 조회만** (조정 불가) | 기초/추가/이관 불가 |
| **예산 사용이력** | 관할 조직 트랜잭션만 조회 | 전체 조직 조회 차단 |
| **예산 수요분석** | 관할 조직 수요 조회 | 시뮬레이션 불가 |

### 2.3 역할 매핑 다이어그램

```
┌────────────────────────────────────────────┐
│            프론트오피스 (학습자/팀장)            │
│  교육계획 수립 → 교육신청(Multi-Plan) → 결과보고   │
└────────────────┬───────────────────────────┘
                 │ 상신
┌────────────────▼───────────────────────────┐
│      운영담당자 (budget_op_manager)            │
│  • 관할 조직 1차 검토/승인 추천                    │
│  • 건별 또는 묶음 상신 → 팀장 결재               │
│  • 관할 예산 현황 조회 (읽기 전용)                │
└────────────────┬───────────────────────────┘
                 │ 묶음 상신 (팀장 결재 경유)
┌────────────────▼───────────────────────────┐
│      총괄담당자 (budget_global_admin)           │
│  • 전체 교육조직 최종 승인/반려                   │
│  • 예산 배정·조정·이관                          │
│  • 수요분석 시뮬레이션 확정                       │
└────────────────────────────────────────────┘
```

---

## 3. 메뉴별 상세 설계

### 3.1 교육계획 관리 (`plan-mgmt` → `bo_plan_mgmt.js`)

#### As-Is 문제점
- 운영담당자와 총괄담당자가 **동일한 뷰**를 보고 동일 버튼으로 승인
- 운영담당자의 교육조직 범위 필터는 있으나, "1차 검토" vs "최종 승인" 분기 없음
- 배정액 인라인 편집이 역할 무관하게 노출

#### To-Be 설계

| 기능 | 총괄담당자 | 운영담당자 |
|------|-----------|-----------|
| 목록 조회 범위 | **전체 조직** | **관할 VOrg 그룹만** |
| 상태 필터 | pending, reviewed, approved, rejected | pending, reviewed |
| 승인 버튼 | **"✅ 최종 승인"** (status → `approved`) | **"📤 검토 완료/상신"** (status → `reviewed`) |
| 반려 버튼 | ✅ 있음 | ✅ 있음 (사유 필수) |
| 배정액 편집 | ✅ 인라인 편집 | 🚫 읽기 전용 |
| 묶음 상신 | — | ✅ 체크박스 선택 → "📦 일괄 상신" |
| 배정 결과 확인 | ✅ 계획별 배정/잔액 표시 | ✅ 관할 조직 배정 현황 조회 |

#### 신규 상태 흐름

```
[학습자 제출] → pending
    → [운영담당자 검토] → reviewed (1차 통과)
    → [팀장 결재] → reviewed_approved (결재 완료)  
    → [총괄담당자 최종] → approved | rejected
```

> **Q-OP1**: `reviewed` → `reviewed_approved` 사이에 팀장 결재를 DB에서 어떻게 추적할 것인가? (외부 그룹웨어 연동 vs 내부 결재 로그)

---

### 3.2 교육신청 관리 (`my-operations` → `bo_approval.js`)

#### As-Is 문제점
- `renderMyOperations()` 함수가 정책 기반 `approverPersonaKey`로 자동 필터링하지만, 운영/총괄 간 단계 구분 없음
- 2단계 결재(운영 1차→총괄 최종) 미구현
- **Multi-Plan Line Items** 기반 묶음 결재 문서 렌더링 미구현 (v1.3 PRD 참고)

#### To-Be 설계

| 기능 | 총괄담당자 | 운영담당자 |
|------|-----------|-----------|
| 결재 탭 구성 | 계획/신청/결과 3탭 (그대로) | 계획/신청/결과 3탭 (관할 조직만) |
| 노출 건 | **운영이 상신 완료한 건** (`reviewed` 이상) | **학습자가 제출한 건** (`pending`) |
| 승인 액션 | **"✅ 최종 승인"** → approved + 예산 차감 | **"📤 1차 검토 완료"** → reviewed |
| Line Items 렌더 | ✅ 전체 카드 + 과정-차수 + 단가 | ✅ 전체 카드 + 과정-차수 |
| 결재 문서 헤더 | 정책명, 신청자, 총금액, 결재 이력 | 동일 |

#### Multi-Plan 결재 문서 구조

```
┌─────────────────────────────────────────────┐
│ 📄 교육신청서 (Header)                        │
│ ├ 정책: HMC-운영계정/참가/교육운영              │
│ ├ 신청자: 역량혁신팀 · 배재혁                   │
│ ├ 합계 금액: 7,500,000원                     │
│ └ 상태: 운영 검토 완료 → 총괄 승인 대기          │
├─────────────────────────────────────────────┤
│ 📋 Line Item ① — FY26 전사 AI 역량 교육        │
│ ├ 과정: AI Foundations │ 차수: 2026-1차        │
│ ├ 인원: 사무직 15명, 연구직 5명                 │
│ ├ 산출근거: 교육비 400,000 × 20 = 8,000,000    │
│ └ 소계: 4,000,000원                          │
├─────────────────────────────────────────────┤
│ 📋 Line Item ② — FY26 데이터분석 심화           │
│ ├ 과정: 데이터분석 마스터 │ 차수: 없음           │
│ ├ 인원: 본인 1명                              │
│ ├ 산출근거: 수강료 3,500,000 × 1               │
│ └ 소계: 3,500,000원                          │
├─────────────────────────────────────────────┤
│ [검토 이력]                                   │
│ └ 2026-04-15 운영담당자(박oo): 1차 검토 완료     │
│ [✅ 최종 승인] [❌ 반려] [📝 관리자 필드]        │
└─────────────────────────────────────────────┘
```

---

### 3.3 교육결과 관리 (`result-mgmt` → `bo_result_mgmt.js`)

#### To-Be 설계

| 기능 | 총괄담당자 | 운영담당자 |
|------|-----------|-----------|
| 조회 범위 | 전체 조직 | 관할 VOrg 그룹만 |
| 정산 승인 | **"✅ 최종 정산 승인"** → completed + 실차감 | **"📤 정산 검토 완료"** → reviewed |
| 실지출액 입력 | ✅ (관리자 필드) | ✅ 1차 입력 가능 |
| 통계 조회 | 전체 조직 KPI | 관할 조직 KPI |

---

### 3.4 예산 배정 및 관리 (`allocation` → `bo_allocation.js`)

#### As-Is 문제점
- `isVorgManager()` 체크로 운영담당자 뷰 분리는 되어 있으나:
  - 기초/추가 배정 탭(Tab 2)이 운영담당자에게도 노출됨
  - 팀 배분 탭(Tab 3)과 이관 탭(Tab 4)도 차단되지 않음
- 총괄 전용 기능(기초 예산 등록, 계정 추가 배정, 조직 간 이관)이 역할 체크 없이 실행 가능

#### To-Be 설계

| 탭 | 총괄담당자 | 운영담당자 |
|----|-----------|-----------|
| Tab 0: 계정 예산 현황 | ✅ 전체 조직 + 계정 총액 | ✅ **관할 조직만** + 계정 총액 비공개 (배분받은 금액만 표시) |
| Tab 1: 기초·추가 배정 | ✅ 등록 가능 | 🚫 **탭 숨김** |
| Tab 2: 팀 배분 | ✅ 전체 조직 배분 | 🚫 **탭 숨김** |
| Tab 3: 이관 | ✅ 실행 가능 | 🚫 **탭 숨김** |
| Tab 4: 변경 이력 | ✅ 전체 이력 | ✅ 관할 조직 이력만 |

#### 구현 방안

```javascript
// bo_allocation.js 내 탭 렌더 분기
function renderBoAllocation() {
  const isGlobal = boCurrentPersona.role === 'budget_global_admin' 
                || boCurrentPersona.role === 'platform_admin'
                || boCurrentPersona.role === 'tenant_global_admin';
  
  const tabs = isGlobal
    ? ["📊 계정 예산 현황", "➕ 기초·추가 배정", "📋 팀 배분", "↔ 이관", "📜 변경 이력"]
    : ["📊 내 조직 예산", "📜 변경 이력"]; // 운영: 2탭만
  // ...
}
```

---

### 3.5 예산 사용이력 (`budget-history` → `bo_budget_history.js`)

#### To-Be 설계

| 기능 | 총괄담당자 | 운영담당자 |
|------|-----------|-----------|
| 조직 필터 | 전체 그룹 선택 가능 | **관할 그룹만** (드롭다운 제한) |
| CSV 내보내기 | ✅ 전체 데이터 | ✅ 관할 데이터만 |
| 6단계 추적 | ✅ 전사 워터폴 | ✅ 관할 조직 워터폴 |
| 실사용액 동기화 | ✅ 실행 가능 | 🚫 버튼 숨김 |

---

### 3.6 예산 수요분석 (`budget-demand` → `bo_budget_demand.js`)

#### To-Be 설계

| 기능 | 총괄담당자 | 운영담당자 |
|------|-----------|-----------|
| Level 1 (그룹 요약) | ✅ 전체 VOrg 그룹 | ✅ **관할 그룹만** |
| Level 2 (팀 상세) | ✅ 전체 드릴다운 | ✅ 관할 그룹 내 팀만 |
| Level 3 (계획 목록) | ✅ 전체 계획 | ✅ 관할 조직 계획만 |
| 시뮬레이션 | ✅ 생성/수정/확정 | 🚫 **버튼 숨김** |
| 시뮬레이션 조회 | ✅ 확정된 버전 조회 | ✅ 확정 결과만 읽기 |

---

## 4. 운영 → 총괄 상신 프로세스

### 4.1 묶음 상신 (Bundle Submission)

운영담당자가 관할 교육조직의 교육계획/신청 건을 모아서 총괄담당자에게 일괄 상신하는 기능.

#### 4.1.1 상신 워크플로우

```
1. 운영담당자: 관할 조직의 pending 건 목록 조회
2. 건별 검토 → 1차 승인(reviewed) 또는 반려(rejected)
3. reviewed 건을 체크박스로 복수 선택
4. "📦 일괄 상신" 버튼 → 상신 문서 생성
   └ 자동 포함 정보: 
     - 상신자(운영담당자명)
     - 상신 건수/합계금액
     - 각 건의 계획명/신청자/금액/1차 검토 의견
5. (선택적) 팀장 결재 경유
6. 총괄담당자: 상신 문서 확인 → 개별/일괄 최종 승인/반려
```

#### 4.1.2 DB 설계 — `submission_bundles` (분리 유지 확정)

> [!NOTE]
> **v1.1 확정 (D안)**: `submission_bundles`는 BO 운영→총괄 **"검토 보고"** 전용 테이블로 **분리 유지**한다.
> FO 상신(계획/신청/결과) 및 수요예측 묶음은 `submission_documents`에서 관리.
> 상세: [fo_submission_approval.md](fo_submission_approval.md) §10.4 참조.

```sql
-- 상신 문서 테이블
CREATE TABLE submission_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  submitted_by TEXT NOT NULL,           -- 운영담당자 persona key
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted',       -- submitted | approved | rejected | partial
  total_count INT NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  reviewer_comment TEXT,                 -- 총괄담당자 의견
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상신 문서 ↔ 계획/신청 연결
CREATE TABLE submission_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES submission_bundles(id),
  reference_type TEXT NOT NULL,          -- 'plan' | 'application'
  reference_id UUID NOT NULL,
  op_comment TEXT,                       -- 운영담당자 1차 검토 의견
  op_status TEXT DEFAULT 'reviewed',     -- reviewed | concern (유보 의견)
  final_status TEXT,                     -- approved | rejected (총괄 판정)
  final_comment TEXT
);
```

### 4.2 팀장 결재 경유

> **정책**: 상신 문서는 운영담당자의 팀장(라인 결재선)을 경유한 후 총괄담당자에게 도달

```
운영담당자 상신 → 팀장 결재(그룹웨어 or 내부) → 총괄담당자 수신
```

> **Q-OP2**: 팀장 결재를 내부 시스템에서 처리할 것인가, 외부 그룹웨어(현대차 전자결재)와 연동할 것인가?

---

## 5. 공통 권한 체크 유틸리티

### 5.1 역할 판별 함수 설계

```javascript
// utils.js 또는 bo_layout.js에 추가

/** 총괄 담당자 여부 */
function isGlobalAdmin(persona) {
  return ['platform_admin', 'tenant_global_admin', 'budget_global_admin']
    .includes(persona?.role);
}

/** 운영 담당자 여부 */
function isOpManager(persona) {
  return persona?.role === 'budget_op_manager';
}

/** 관할 VOrg 그룹 ID 목록 */
function getManagedGroupIds(persona) {
  if (isGlobalAdmin(persona)) return null; // null = 전체 접근
  return persona?.vorgIds 
      || persona?.isolationGroups 
      || (persona?.domainId ? [persona.domainId] : []);
}

/** 데이터 조회 필터 적용 */
function applyRoleFilter(query, persona, orgField = 'vorg_group_id') {
  const groupIds = getManagedGroupIds(persona);
  if (groupIds === null) return query; // 총괄: 필터 없음
  if (groupIds.length === 0) return query.eq(orgField, '__NONE__'); // 빈 결과
  return query.in(orgField, groupIds);
}
```

### 5.2 UI 권한 체크 패턴

```javascript
// 각 모듈에서 사용하는 공통 패턴
function renderSomeModule() {
  const persona = boCurrentPersona;
  const canApprove = isGlobalAdmin(persona); // 최종 승인 가능?
  const canEdit = isGlobalAdmin(persona);    // 배정 편집 가능?
  const canSimulate = isGlobalAdmin(persona); // 시뮬레이션 가능?
  
  // 버튼 렌더
  const approveBtn = canApprove
    ? '<button>✅ 최종 승인</button>'
    : '<button>📤 1차 검토 완료</button>';
}
```

---

## 6. 영향 범위 및 구현 계획

### 6.1 수정 대상 파일

| 파일 | 변경 내용 | 우선순위 |
|------|----------|---------|
| `bo_layout.js` | `BUDGET_OP_MENUS` 탭 구성 축소 (배정탭 숨김) | 🟢 즉시 |
| `bo_plan_mgmt.js` | 역할별 승인 버튼 분기 + 배정액 편집 잠금 + 묶음 상신 UI | 🔴 핵심 |
| `bo_approval.js` | 2단계 결재 렌더링 + Line Items 카드 + 결재 이력 표시 | 🔴 핵심 |
| `bo_result_mgmt.js` | 역할별 정산 권한 분기 + 관할 필터 | 🟡 |
| `bo_allocation.js` | 운영담당자 탭 제한 + 읽기 전용 뷰 강화 | 🟢 즉시 |
| `bo_budget_history.js` | 관할 조직 필터 강제 적용 + 동기화 버튼 숨김 | 🟢 즉시 |
| `bo_budget_demand.js` | 시뮬레이션 버튼 역할 체크 + 관할 드릴다운 제한 | 🟢 즉시 |
| **[신규]** `bo_submission.js` | 묶음 상신 문서 생성/관리 UI | 🟡 |
| **[신규]** DB 마이그레이션 | `submission_bundles`, `submission_bundle_items` 테이블 | 🟡 |

### 6.2 구현 Phase

| Phase | 설명 | 영향 파일 | 난이도 |
|-------|------|----------|--------|
| **E-1** | 공통 유틸 (`isGlobalAdmin`, `applyRoleFilter`) 추가 | utils.js, bo_layout.js | ⭐ |
| **E-2** | 예산 배정 탭 역할 분기 (운영: 읽기전용 2탭) | bo_allocation.js | ⭐⭐ |
| **E-3** | 예산 사용이력/수요분석 관할 필터 | bo_budget_history.js, bo_budget_demand.js | ⭐⭐ |
| **E-4** | 교육계획 1차검토/최종승인 분기 + 상태 확장 (`reviewed`) | bo_plan_mgmt.js | ⭐⭐⭐ |
| **E-5** | 교육신청 2단계 결재 + Line Items 렌더 | bo_approval.js | ⭐⭐⭐⭐ |
| **E-6** | 묶음 상신 UI 및 DB | [신규] bo_submission.js | ⭐⭐⭐⭐ |
| **E-7** | 교육결과 정산 권한 분기 | bo_result_mgmt.js | ⭐⭐ |

---

## 7. 엣지케이스

| # | 시나리오 | 대응 |
|---|---------|------|
| EC-1 | 운영담당자가 관할 VOrg가 2개 이상 | VOrg 전환 셀렉트로 처리 (기존 `boSwitchVorg` 활용) |
| EC-2 | 총괄담당자가 운영담당자 검토 없이 직접 승인 | ✅ 허용 — 총괄은 pending 건도 직접 최종 승인 가능 |
| EC-3 | 운영담당자가 반려한 건을 학습자가 수정 재제출 | status → pending으로 리셋. 운영담당자부터 다시 검토 |
| EC-4 | 묶음 상신에 포함된 건 중 일부만 총괄이 승인 | `submission_bundle_items.final_status`로 건별 관리. 번들 status → `partial` |
| EC-5 | 운영담당자 교체 시 기존 상신 문서 | `submitted_by`는 이력 보존. 새 운영담당자는 새 상신 문서 생성 |
| EC-6 | 팀장 결재 거부 시 | 상신 문서 → rejected. 운영담당자에게 반려 사유 전달 |
| EC-7 | 예산 배정 변경 후 이미 승인된 계획 | 알림 + 재검토 요청 (강제 리콜은 하지 않음) |

---

## 8. 미결정 사항 (Open Questions)

| ID | 질문 | 영향 | 긴급도 |
|----|------|------|--------|
| **Q-OP1** | `reviewed` → `reviewed_approved` 팀장 결재 추적 방식? (내부 vs 그룹웨어) | E-4, E-6 | 🔴 |
| **Q-OP2** | 팀장 결재를 내부 처리 vs 현대차 전자결재 연동? | E-6 | 🔴 |
| **Q-OP3** | 운영담당자가 총괄에게 "긴급 상신" (검토 없이 bypass) 가능여부? | E-4 | 🟡 |
| **Q-OP4** | 묶음 상신 시 **첨부파일(사유서 등)** 지원? | E-6 | 🟡 |
| **Q-OP5** | 운영담당자의 예산 수요분석에서 **확정 시뮬레이션 결과 조회 범위**? (관할만 vs 전체) | E-3 | 🟢 |

---

## 9. 검증 계획

### 9.1 자동화 테스트
- 총괄 페르소나 로그인 → 모든 메뉴 접근 + 모든 액션 가능 확인
- 운영 페르소나 로그인 → 배정 탭 숨김, 시뮬레이션 버튼 숨김, 관할 조직만 데이터 표시 확인
- 운영 → 1차 검토 → 총괄 → 최종 승인 흐름 E2E 테스트

### 9.2 역할 전환 테스트
- 동일 사용자가 (운영 VOrg A) → (운영 VOrg B) 전환 시 데이터 격리 확인
- 총괄 → 운영 전환 시 UI 변경 즉시 반영 확인

### 9.3 보안 검증
- 운영담당자가 DevTools로 총괄 전용 API 직접 호출 시 서버사이드 차단 확인 (RLS)

---

## 10. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-18 | v1.0 최초 작성 — 역할별 업무 설계, 2단계 결재, submission_bundles, 권한 유틸, 구현 Phase 7단계 | AI |
| 2026-04-18 | **v1.1** — `submission_bundles` **분리 유지 확정** (D안). `plan_bundles` → `submission_documents` 통합은 fo_submission_approval.md에서 처리. submission_bundles는 BO 검토 보고 전용으로 유지 | AI |
