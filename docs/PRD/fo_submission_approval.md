# 📋 FO 상신·결재 프로세스 — 상신 문서 기반 통합 설계 PRD

> **v1.6** · 2026-04-26 최종 갱신  
> **도메인**: Front Office 상신/결재 (Submission & Approval)  
> **관련 파일**: `plans.js`, `apply.js`, `result.js`, `gnb.js`, `approval.js` (FO), `bo_approval.js` (BO)  
> **관련 PRD**: [approval_line_design.md](approval_line_design.md), [multi_plan_application.md](multi_plan_application.md), [edu_support_operations_role_design.md](edu_support_operations_role_design.md), [budget_lifecycle.md](budget_lifecycle.md)  
> **관련 시나리오**: [SC-001](../SCENARIOS/SC-001_plan_budget_reallocation.md)  
> **상태**: 🟡 구현 중 (Phase 17 S-1~S-6, S-9 구현 완료)

### v1.6 주요 확정 사항 (2026-04-26)

> [!IMPORTANT]
> **교육계획(Plan) 다건 상신 기능 전면 제거 및 단건 초고속 상신 UX 도입**
> 기존 계획되었던 '목록에서의 다중 체크박스 일괄 상신' 기능은 결재 라인 복잡도 증가 및 부분 반려 불가(예산 묶임)라는 치명적 UX 결함으로 인해 도메인 전문가 위원회(Domain Council) 합의하에 **전면 폐기**되었습니다.
> 대신, 기안자의 클릭 피로도를 줄이기 위해 페이지 이동(결재함 강제 리다이렉트) 없이 그 자리에서 팝업을 띄우고 연속해서 여러 개의 계획을 빠르게 **단건 상신**할 수 있는 초고속 단건 상신 로직으로 개편되었습니다.
>
> *(단, 향후 교육신청(Application) 단계에서는 동일 계정+동일 유형의 경우 1개의 문서로 묶는 합산 신청을 지원하되, 결재함에서 리더가 일괄 승인하는 방향으로 프로세스를 고도화할 예정입니다.)*

### v1.4 주요 확정 사항 (2026-04-20)

> [!NOTE]
> **Q1 (3단계 상태)**: `draft`(임시저장, 필수항목 무시) → `saved`(저장완료, 필수항목 충족) → `submitted`(상신). 양식 변경으로 필수항목 누락 발생 시에도 `saved` 상태 유지.
>
> **Q2 (회수 기준)**: `current_node_order === 0`일 때만 회수 가능. 결재라인의 첫 노드(직급 무관)가 액션하면 회수 불가. 팀장뿐 아니라 실장·센터장 등 모든 상위직급자에 동일 적용.
>
> **Q3 (N:M 계획-신청)**: 1개 신청서에 N개 계획 포함 가능. **동일 예산계정 + 동일 교육유형만 묶기 허용**. 부분 승인 불가(신청서 단위 승인/반려만). 계획 담당자 ≠ 신청 작성자 허용(팀 대표 작성 개념).
>
> **Q7 (이어쓰기)**: 회수/반려 → saved 복귀 후 이어쓰기 시 **계획 목록 추가/삭제 모두 가능**.
>
> **Q8 (상신 팝업)**: 결재라인 미리보기 + 신청 금액 정보 표시 예정. **개발은 보류** — 계획·신청·결과 저장 흐름 테스트 완료 후 상세 정의.

---

## 1. 배경 및 문제 정의

### 1.1 현행 코드 분석 (As-Is)

| 영역 | 현재 상태 | 문제 |
|------|----------|------|
| **상태 흐름** | `draft` → `pending` (제출 = 즉시 상신) | "저장 완료" 상태가 없어 **작성 완료 후 상신 시점을 사용자가 통제할 수 없음** |
| **상신 단위** | 계획/신청/결과 각각 단건 제출 | **다건을 모아서 한 번에 상신하는 기능 없음** |
| **상신 문서** | 없음 — `plans.status = 'pending'`으로 바로 전환 | 상신 제목/내용/결재선/첨부 건 목록을 관리하는 **엔티티가 존재하지 않음** |
| **결재함** | GNB에 팀원용/리더용 결재함 메뉴 존재 | 상신 문서 관리 화면이 아닌, **개별 건의 상태만 표시** — 상신 단위 추적 불가 |
| **회수** | `cancelPlan()` → `pending` → `draft` 전환 | "회수"라는 명시적 기능은 없고, 취소 시 임시저장으로 롤백 |
| **결재선** | `approval_line_design.md`에 nodes 기반 설계 확정 | **상신 문서와 결재선 연결 구조 미구현** |
| **통합결재** | GNB에 통합결재(HMC/KIA) 메뉴 존재 | 협조처/참조처 정보를 상신 문서에 표시하는 로직 없음 |

### 1.2 핵심 문제 요약

> [!CAUTION]
> 현재 "제출 = 즉시 상신"이므로, 사용자가 **여러 건을 작성해 놓고 한 번에 상신하는 워크플로우가 불가능**하다.
> 또한 상신 이후 결재 진행 상황을 체계적으로 추적할 엔티티(상신 문서)가 없어,
> 팀원용 결재함에서 "내가 무엇을 상신했고 어디까지 결재가 진행됐는지"를 정확히 알 수 없다.

---

## 2. 목표

| # | 목표 | 측정 기준 |
|---|------|----------|
| G1 | **3단계 상태 분리** | 임시저장(draft) → 저장완료(saved) → 상신(submitted) |
| G2 | **단건/다건 상신 선택 가능** | 개별 폼에서 바로 상신 + 목록에서 다건 선택 상신 |
| G3 | **상신 문서 엔티티 도입** | 제목, 내용, 건 목록, 예산 요약, 결재선을 관리 |
| G4 | **팀원용 결재함 강화** | 상신 문서 기반으로 진행 상황 추적 |
| G5 | **팀장용 결재함 강화** | 승인 대기 상신 문서 목록 + 상세 확인 + 승인/반려 |
| G6 | **회수 기능** | 상신 후 결재 진행 전 회수 가능 |

---

## 3. 상태 머신 재설계

### 3.1 계획/신청/결과 개별 건 상태 (plans, applications)

```
[신규 작성] → draft (임시저장)
draft → saved (저장 완료 — 내용 확정, 상신 전 대기)
saved → submitted (상신 — 상신 문서에 포함됨)
submitted → in_review (결재 진행 중 — 1단계 이상 결재 시작)
in_review → approved (최종 승인)
in_review → rejected (반려)
submitted → recalled (회수 — 결재 시작 전 사용자가 철회)
recalled → saved (회수 후 저장완료로 복귀, 수정 후 재상신 가능)
rejected → saved (반려 후 수정하여 재상신)
approved → approved (배정액 축소 — v1.3 신규. 내용 불변, 금액 하향 조정만. 승인 불필요)
```

> [!IMPORTANT]
> **v1.3 확정**: `approved` 상태에서 **배정액(allocated_amount) 하향 조정만 허용**.
> 교육명, 과정, 인원 등 **내용 변경은 불허**. 승인 없이 사용자가 직접 축소 가능.
> 축소된 금액은 통장으로 자동 환불(`used_amount -= 차액`).
> 축소 후 남은 예산으로 새 교육계획 수립 가능.

### 3.2 상태 전이 다이어그램

```
         ┌──────────────────────────────────────────┐
         │                                          │
  draft ─┤─→ saved ──→ submitted ──→ in_review ──→ approved
         │     ↑           │            │
         │     │           │            └──→ rejected
         │     │           │                    │
         │     │           └──→ recalled        │
         │     │                  │             │
         │     └──────────────────┘             │
         │     └────────────────────────────────┘
         │
         └──→ [삭제] (draft만 삭제 가능)
```

### 3.3 As-Is → To-Be 상태 매핑

| As-Is | To-Be | 변경 이유 |
|-------|-------|----------|
| `draft` | `draft` | 유지 — 임시저장 |
| *(없음)* | **`saved`** | **신규** — 작성 완료, 상신 대기 상태 |
| `pending` | **`submitted`** | 명칭 변경 — 상신 문서에 포함된 상태 |
| *(없음)* | **`in_review`** | **신규** — 결재선의 1단계 이상이 처리 시작 |
| `approved` | `approved` | 유지 |
| `rejected` | `rejected` | 유지 |
| *(없음)* | **`recalled`** | **신규** — 사용자가 상신 회수 |

> [!IMPORTANT]
> **하위호환**: 기존 `pending` 상태 데이터는 마이그레이션에서 `submitted`로 일괄 변환.
> DB trigger 또는 RLS에서 `pending`을 `submitted`의 alias로 처리할 수도 있음.

---

## 4. 상신 문서 (Submission Document)

### 4.1 개념

**상신 문서**는 사용자가 1개 이상의 계획/신청/결과를 묶어 결재선에 올리는 **결재 단위 엔티티**이다.

> [!WARNING]
> **v1.2 확정 (Q-SUB2)**: 상신 문서에는 **동일 통장(org_id+account_code) + 동일 유형(plan/application/result)** 의 건만 포함 가능.
> 계획+신청 혼합, 서로 다른 통장의 건 혼합은 **불허**한다.

```
┌─────────────────────────────────────────┐
│ 📄 상신 문서 (submission_documents)       │
│                                         │
│ • 제목: "2026년 2분기 교육계획 상신"       │
│ • 내용: "AI 역량 교육 3건 일괄 상신합니다"  │
│ • 작성자: 배재혁 (역량혁신팀)              │
│ • 상신일시: 2026-04-18 14:30             │
│                                         │
│ ┌─ 첨부 건 목록 ──────────────────────┐  │
│ │  📋 계획: AI Foundations 교육계획     │  │
│ │  📋 계획: 데이터분석 심화 계획         │  │
│ │  📥 신청: Q2 컨퍼런스 참가 신청       │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌─ 예산 요약 ──────────────────────────┐ │
│ │  계정: HMC-RND / 잔액: 5,000,000원   │ │
│ │  이번 상신액 합계: 3,800,000원        │ │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌─ 결재선 ─────────────────────────────┐ │
│ │  기안(배재혁) → 승인(김팀장)           │ │
│ │  → 협조(교육협조처) → 승인(박실장)     │ │
│ │  → 참조(재경팀)                       │ │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.2 DB 설계

```sql
-- 상신 문서 테이블 (FO 상신 + 수요예측 묶음 통합)
CREATE TABLE submission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  
  -- ★ 상신 유형 (v1.1: plan_bundles 통합)
  submission_type TEXT NOT NULL DEFAULT 'fo_user',
    -- fo_user        : FO 사용자 단건/다건 상신 (계획/신청/결과)
    -- team_forecast  : FO 팀 대표 수요예측 묶음 상신
    -- org_forecast   : BO 운영 교육조직 수요예측 재묶음 상신
  
  -- 상신 기본 정보
  title TEXT NOT NULL,                      -- 상신 제목
  content TEXT,                             -- 상신 본문 (사유, 설명)
  
  -- 작성자
  submitter_id TEXT NOT NULL,               -- 상신자 ID
  submitter_name TEXT NOT NULL,             -- 상신자명
  submitter_org_id TEXT,                    -- 상신자 소속 조직 ID
  submitter_org_name TEXT,                  -- 상신자 소속 조직명
  
  -- ★ 예산 계정 제약 (v1.1: Q-SUB1 확정 — 동일 계정만)
  account_code TEXT,                        -- 상신 대상 예산계정 (단일값 강제)
  total_amount NUMERIC DEFAULT 0,           -- 총 상신 금액
  
  -- 결재선
  approval_system TEXT DEFAULT 'platform',  -- external / platform / integrated
  approval_nodes JSONB DEFAULT '[]',        -- 결재선 nodes 배열 (결재라인 PRD 구조)
  current_node_order INT DEFAULT 0,         -- 현재 결재 진행 단계
  
  -- 통합결재 전용 (HMC/KIA)
  coop_teams JSONB DEFAULT '[]',            -- 협조처 정보
  reference_teams JSONB DEFAULT '[]',       -- 참조처 정보
  
  -- ★ 수요예측 묶음 전용 확장 (v1.1: plan_bundles 통합)
  fiscal_year INTEGER,                      -- 수요예측 연도 (fo_user 시 NULL)
  parent_submission_id UUID REFERENCES submission_documents(id),
    -- 계층 구조: team_forecast → org_forecast 연결 (fo_user 시 NULL)
  total_requested NUMERIC,                  -- 원래 요청 총액 (수요예측 시)
  total_adjusted NUMERIC,                   -- 1차 조정 총액 (수요예측 시)
  total_allocated NUMERIC,                  -- 최종 배정 총액 (수요예측 시)
  
  -- 상태
  status TEXT NOT NULL DEFAULT 'draft',
    -- [공통] draft / submitted / in_review / approved / rejected / recalled / partial
    -- [수요예측 추가] team_approved / ops_reviewing / ops_approved
    --                ops_leader_approved / final_reviewing / allocated
  
  -- 시간
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  recalled_at TIMESTAMPTZ,
  allocated_at TIMESTAMPTZ,                 -- 수요예측: 최종 배정 확정 시각
  reject_reason TEXT,                       -- 반려 사유
  reject_node_label TEXT,                   -- 반려한 결재 단계
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sd_tenant_submitter ON submission_documents(tenant_id, submitter_id);
CREATE INDEX idx_sd_status ON submission_documents(status);
CREATE INDEX idx_sd_type ON submission_documents(submission_type);
CREATE INDEX idx_sd_fiscal ON submission_documents(tenant_id, fiscal_year)
  WHERE fiscal_year IS NOT NULL;

-- 상신 문서 ↔ 개별 건 연결 테이블
CREATE TABLE submission_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission_documents(id) ON DELETE CASCADE,
  
  item_type TEXT NOT NULL,                  -- 'plan' | 'application' | 'result'
  item_id TEXT NOT NULL,                    -- plans.id / applications.id
  
  -- 건별 요약 정보 (스냅샷)
  item_title TEXT,                          -- 건 제목
  item_amount NUMERIC DEFAULT 0,            -- 건별 금액
  account_code TEXT,                        -- 예산계정
  policy_id TEXT,                           -- 서비스 정책 ID
  
  -- 건별 승인 상태 (다건 부분 승인 지원)
  item_status TEXT DEFAULT 'pending',       -- pending | approved | rejected
  item_reject_reason TEXT,
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_si_submission ON submission_items(submission_id);
CREATE INDEX idx_si_item ON submission_items(item_type, item_id);

-- 결재 이력 테이블
CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission_documents(id) ON DELETE CASCADE,
  
  node_order INT NOT NULL,                  -- 결재 단계 순서
  node_type TEXT NOT NULL,                  -- draft | approval | coop | reference
  node_label TEXT,                          -- 결재 단계명 (팀장, 실장 등)
  
  action TEXT NOT NULL,                     -- approved | rejected | forwarded | recalled
  actor_id TEXT,                            -- 결재자 ID
  actor_name TEXT,                          -- 결재자명
  comment TEXT,                             -- 결재 의견
  
  acted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ah_submission ON approval_history(submission_id);
```

### 4.3 결재선 구성 규칙

상신 문서에 포함된 건들의 조건에 따라 결재선이 자동 구성된다.

```
결재선 구성 알고리즘:

1. 상신 문서의 건 목록에서 각 건의 정책(policy_id) 확인
2. 각 정책의 계정(account_code)에서 approvalSystem 확인
3. 총 금액(total_amount)으로 축1 구간 결정 → 승인자 레벨 결정
4. 각 건의 산출근거 soft_limit 초과 여부 확인 → 축2 협조처 활성화
5. approvalSystem별 분기:
   - external: 결재선 생성 안 함 (외부 결재 참고 정보만)
   - platform: 축1 승인자만
   - integrated: 축1 승인자 + 축2 협조처 + 참조처

### 4.3 교육예산 라이프사이클 철학 및 묶음/연동 규칙

> **[핵심 비즈니스 철학 (사용자 정의)]**
> 1. **교육계획(Plan)**: 교육을 신청하기 전에 "얼마의 돈이 필요할 것 같으니 예산을 확보해달라"고 요청하는 예산 확보 절차.
> 2. **교육신청(Application)**: 실질적으로 교육을 다녀오거나 운영하기 위해 "확보된 예산을 실질적으로 사용하겠다"고 요청하는 절차.
> 3. **교육결과(Result)**: 신청을 기반으로 "최종적으로 예산을 이렇게 썼다"고 결과를 보고하는 절차.

위 철학에 따라 묶음(Bundle) 및 연동(Linkage) 규칙을 다음과 같이 명확히 정의한다 (v1.5 확정):

**1. 교육계획 묶음 상신 (Plan Bundle Submission)**
- **목적**: 예산을 사전에 확보하기 위한 절차이므로, 여러 건의 계획을 한 번에 팀장 등에게 승인받는 것이 효율적임.
- **제약 조건**: **[동일 예산계정(`account_code`)]**
- **허용 사항**: 계정만 같다면 교육유형(`edu_type`)이 달라도 한 번에 묶어서 상신할 수 있음.

**2. 다중 계획 합산 신청 (Multi-Plan Application)**
- **목적**: 기 승인된 여러 개의 예산(계획)을 모아서, 실질적인 "1건의 교육신청서"를 작성하고 집행을 결재받는 절차. (※ 교육신청 단계 자체의 묶음 상신은 원천 금지됨)
- **제약 조건**: **[동일 예산계정(`account_code`) + 동일 교육유형(`edu_type`)]**
- **사유**: 실제 자금을 집행하는 단계이므로, 결재선과 협조처가 교육유형별로 달라짐. 따라서 같은 계정이면서 동시에 같은 유형인 승인된 교육계획들만 모아서 1건의 신청서로 합산해야 함.

> **Q-SUB1 (v1.5 수정)**: ✅ **확정** — 계획 상신 시에는 **동일 계정 내 이기종 교육유형 혼합** 묶음 상신을 지원한다. 교육신청은 목록에서의 묶음 상신을 원천 제외하며, 신청서 작성 폼 내에서 "동일 계정+동일 유형"의 승인된 계획을 다중 선택하여 합산 신청(Multi-Plan Application)하는 방식으로 대체한다.

---

## 5. FO 워크플로우 재설계

### 5.1 개별 폼에서의 상태 흐름

```
┌──────────────────────────────────────────────┐
│  교육계획/신청/결과 폼 (plans.js 등)            │
│                                              │
│  Step 4 세부정보 입력                          │
│                                              │
│  [💾 임시저장]  →  status: draft              │
│  [✅ 저장]      →  status: saved              │
│  [📤 저장+상신]  →  status: saved → submitted  │
│                    (단건 상신 문서 자동 생성)    │
└──────────────────────────────────────────────┘
```

**버튼 3개 배치**:

| 버튼 | 동작 | 상태 변경 | 결재선 |
|------|------|----------|--------|
| `💾 임시저장` | 입력 중 데이터 보존 (필수 검증 안 함) | `draft` | 없음 |
| `✅ 저장` | 필수 검증 통과 → 저장 완료 | `saved` | 없음 |
| `📤 저장+상신` | 필수 검증 → 저장 → 상신 문서 1건 자동 생성 → 상신 | `saved` → `submitted` | 자동 구성 |

### 5.2 목록에서 직접 다건 상신 (Batch Submit from Plan List) - **[v1.6 폐기]**

> [!WARNING]
> **해당 기능은 v1.6 업데이트에서 도메인 전문가 위원회 합의하에 전면 폐기되었습니다.**
> (사유: 부분 반려 불가에 따른 기안자/결재자 불편 초래 및 결재선 꼬임 방지)
> 현재는 각 카드 우측 상단의 "상신" 버튼을 통한 **단건 인라인 상신**만 지원하며, 상신 후 페이지 이동 없이 리스트 화면을 유지하여 빠르게 여러 건을 단건 상신할 수 있도록 UX를 개편했습니다.

~~기존 기안 내용:~~
~~목록에서 체크박스로 여러 건을 선택하여 하단 플로팅 액션 바로 일괄 상신...~~

### 5.3 상신 문서 작성 화면

**일괄 상신** 버튼 클릭 시 상신 문서 작성 화면으로 이동:

```
┌──────────────────────────────────────────────────┐
│  📤 상신 문서 작성                                 │
│                                                  │
│  제목: [2026년 2분기 AI 교육 계획 상신_________]   │
│                                                  │
│  내용:                                            │
│  [AI 역량 교육 2건을 상신합니다.                    ]│
│  [Q2 내 실시 예정이며 예산 범위 내입니다.            ]│
│                                                  │
│  ┌─ 상신 건 목록 ─────────────────────────────┐   │
│  │  📋 AI Foundations 교육계획   500,000원     │   │
│  │  📋 데이터분석 심화 계획      3,500,000원    │   │
│  │  ─────────────────────────────────────── │   │
│  │  합계: 4,000,000원                        │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌─ 예산 정보 ─────────────────────────────────┐  │
│  │  계정: HMC-RND (연구투자)                    │  │
│  │  잔액: 12,000,000원                         │  │
│  │  이번 상신: 4,000,000원                      │  │
│  │  상신 후 잔액: 8,000,000원                   │  │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌─ 결재선 ────────────────────────────────────┐  │
│  │  기안(배재혁) → 승인(김팀장)                   │  │
│  │                                              │  │
│  │  ※ 통합결재 계정 시:                          │  │
│  │  기안 → 승인(팀장) → 협조(교육협조처)           │  │
│  │  → 승인(실장) → 참조(재경팀)                   │  │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  [취소]                    [📤 상신 확정]          │
└──────────────────────────────────────────────────┘
```

### 5.4 결재선 표시 분기 (통합결재 vs 일반)

| 구분 | 표시 내용 | 적용 대상 |
|------|---------|----------|
| **통합결재** (`integrated`) | 기안 → 승인(팀장) → 협조(교육협조처) → 승인(실장) → 참조(재경팀) — **협조처/참조처 모두 표시** | HMC, KIA |
| **자체결재** (`platform`) | 기안 → 승인(팀장) → 승인(실장) — **누구까지 결재가 진행되는지만 표시** | 기타 테넌트 |
| **외부결재** (`external`) | "외부 결재 시스템에서 처리됩니다" 안내만 | 일부 계정 |

---

## 6. 결재함 설계

### 6.1 팀원용 결재함 (`approval-member`)

> **목적**: 내가 상신한 문서의 결재 진행 상황을 추적 (더 이상 이 메뉴에서 상신 문서를 새로 작성하지 않음)

```
┌──────────────────────────────────────────────────┐
│  📋 팀원용 결재함 — 내가 상신한 문서                  │
│                                                  │
│  [상태 필터: 전체 | 결재대기 | 결재중 | 완료 | 반려]  │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ 📤 2026년 2분기 AI 교육 계획 상신               ││
│  │ 📋 계획 2건 │ 4,000,000원                      ││
│  │ 📅 2026-04-18 14:30 상신                       ││
│  │ 🔄 결재중: 팀장 승인 완료 → 실장 결재 대기        ││
│  │                                                ││
│  │ [📄 상세보기] [🔙 회수]                          ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ 📤 Q1 이러닝 교육 결과 보고                     ││
│  │ 📄 결과 1건 │ 350,000원                        ││
│  │ 📅 2026-04-15 09:00 상신                       ││
│  │ ✅ 승인 완료 (2026-04-16)                       ││
│  │                                                ││
│  │ [📄 상세보기]                                   ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**팀원용 결재함 기능**:

| 기능 | 설명 |
|------|------|
| 상신 문서 목록 | 내가 상신한 문서 시간순 정렬 |
| 상태 필터 | 전체/결재대기/결재중/완료/반려/회수 |
| 진행 상황 트래커 | 결재선 노드별 처리 상태 시각화 |
| 상세 보기 | 상신 문서 전문 + 결재 이력 확인 |
| 회수 | 결재선 첫 단계 미처리 시만 회수 가능 |
| 반려 재상신 | 반려 건 수정 → 재상신 안내 |

### 6.2 팀장/리더용 결재함 (`approval-leader`)

> **목적**: 내가 승인해야 하는 상신 문서를 확인하고 결재

```
┌──────────────────────────────────────────────────┐
│  📥 리더용 결재함 — 승인 대기 문서                   │
│                                                  │
│  [상태: 승인대기 3건 | 처리완료 12건]                │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ 📤 배재혁 — 2026년 2분기 AI 교육 계획 상신      ││
│  │ 📋 계획 2건 │ 4,000,000원 │ HMC-RND           ││
│  │ 📅 2026-04-18 14:30 수신                       ││
│  │                                                ││
│  │ • AI Foundations 교육계획     500,000원          ││
│  │ • 데이터분석 심화 계획      3,500,000원          ││
│  │                                                ││
│  │ [📄 상세] [✅ 승인] [❌ 반려]                    ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**팀장 결재 시 화면**:

```
┌──────────────────────────────────────────────────┐
│  📄 상신 문서 상세 — 결재 처리                      │
│                                                  │
│  [상신 문서 전문 표시 — 제목, 내용, 건 목록 등]       │
│                                                  │
│  결재 의견:                                        │
│  [____________________________________________]   │
│                                                  │
│  [❌ 반려 (사유 필수)]        [✅ 승인]              │
└──────────────────────────────────────────────────┘
```

### 6.3 팀원이 회수하는 경로

회수는 **2곳**에서 가능:

| 경로 | 설명 |
|------|------|
| **① 팀원용 결재함** | 상신 문서 목록에서 `🔙 회수` 버튼 |
| **② 계획/신청/결과 목록** | `submitted` 상태 건의 상세에서 `🔙 상신 회수` 버튼 |

```
회수 동작:
1. submission_documents.status → 'recalled'
2. 해당 submission_items의 모든 item_id → plans/applications.status → 'saved'
3. approval_history에 recalled 이력 기록
4. 수정 후 재상신 가능
```

---

## 7. 기존 코드 변경 설계

### 7.1 plans.js 변경

| 현재 | 변경 |
|------|------|
| `savePlanDraft()` → `status: 'draft'` | 유지 — 임시저장 |
| `confirmPlan()` → `status: 'pending'` → 즉시 상신 | **분리**: `savePlanFinal()` → `status: 'saved'` + 선택적 상신 |
| `cancelPlan()` → `pending` → `draft` | `recallSubmission()` → `submitted` → `saved` (상신 문서 단위) |

```javascript
// ── AS-IS (현재) ──
// 1. 💾 임시저장 → status: 'draft'
// 2. ✅ 확정 제출 → status: 'pending' → alert("상신되었습니다")

// ── TO-BE (변경) ──
// 1. 💾 임시저장 → status: 'draft'
// 2. ✅ 저장     → status: 'saved'    → alert("저장되었습니다. 목록에서 상신할 수 있습니다.")
// 3. 📤 저장+상신 → status: 'saved' → createSubmissionDoc() → status: 'submitted'
```

### 7.2 apply.js 변경

plans.js와 동일 패턴 적용. `submitApplication()` → 저장(saved) + 선택적 상신 분리.

### 7.3 result.js 변경

plans.js와 동일 패턴 적용.

### 7.4 gnb.js 변경

```javascript
// 팀원용 결재함 → 상신 문서 목록 화면 연결
// 리더용 결재함 → 승인 대기 상신 문서 목록 연결
```

---

## 8. 기존 PRD 연관 관계 분석

### 8.1 approval_line_design.md (결재라인 고도화)

| 연관 항목 | 관계 | 영향 |
|----------|------|------|
| 결재선 nodes 구조 | **직접 참조** — 상신 문서의 `approval_nodes`가 이 노드 구조를 사용 | ✅ 호환 |
| 축1 금액 구간 에스컬레이션 | **확장** — 다건 합산 금액 기준으로 구간 결정 필요 | 🟡 로직 추가 |
| 축2 soft_limit 초과 협조처 | **확장** — 여러 건 중 1개라도 초과 시 활성화 | 🟡 확인 필요 |
| `approvalSystem` (외부/자체/통합) | **직접 사용** — 상신 문서의 결재선 표시 방식 결정 | ✅ 호환 |

### 8.2 multi_plan_application.md (복수 계획 연동)

| 연관 항목 | 관계 | 영향 |
|----------|------|------|
| Header + Line Items 구조 | **독립** — multi_plan은 신청서 내부 구조, 상신 문서는 외부 결재 래퍼 | ✅ 충돌 없음 |
| N:1 계획↔신청 | **확장** — 1개 신청(Multi-Plan)이 1개 상신 문서 item이 될 수 있음 | ✅ 호환 |
| 부분 취소 (Q-MP6) | **연관** — 상신 문서 내 특정 item만 반려하는 것과 유사 | 🟡 정책 정합성 확인 |

### 8.3 edu_support_operations_role_design.md (역할별 운영관리)

| 연관 항목 | 관계 | 영향 |
|----------|------|------|
| 운영담당자 1차 검토 | **확장** — FO 상신 → 운영담당자 결재 → 총괄 결재 흐름에서 상신 문서가 매개 | 🔴 핵심 연동 |
| 묶음 상신 (submission_bundles) | **분리 유지** (v1.1 확정) — BO 운영→총괄 "검토 보고" 전용. `submission_documents`와는 별도 테이블 | ✅ 분리 확정 |
| 2단계 결재 | **구현** — 상신 문서의 `approval_nodes`와 `current_node_order`로 다단계 추적 | ✅ 직접 구현 |

> [!NOTE]
> **v1.1 확정 — `submission_bundles` 분리 유지 (D안)**
>
> `submission_bundles`는 BO 운영담당자 → 총괄에게 **"1차 검토 완료 건을 전달"**하는 검토 보고서 성격이므로,
> 결재 래퍼인 `submission_documents`와는 분리한다.
>
> - `submission_documents` = 📤 **결재 요청** ("이 건들을 결재해 주세요")
> - `submission_bundles` = 📋 **검토 보고** ("이 건들 1차 검토했습니다, 처리해 주세요")
>
> 주요 차이:
> - `submission_bundles`는 건별 `op_comment`/`op_status` (1차 검토 의견) + 총괄 건별 `final_status` (부분 승인)
> - `submission_documents`는 문서 단위 결재선 승인/반려

### 8.4 budget_lifecycle.md (예산 라이프사이클)

| 연관 항목 | 관계 | 영향 |
|----------|------|------|
| 수요예측 묶음 상신 (Phase 11~15) | ✅ **통합 확정** (v1.1) — `plan_bundles` → `submission_documents` (submission_type='team_forecast'/'org_forecast')로 대체 | 🔴 테이블 통합 |
| `plans.bundle_id` FK | **변경** — `plans.bundle_id` → `submission_items`로 대체. `plans`에는 상신 문서 참조 불필요 | 🟡 스키마 변경 |
| 승인 시 자동 배정 | **유지** — 상신 문서 최종 승인 시 `plans.allocated_amount` 설정 트리거 | ✅ 호환 |
| 6단계 추적 레포트 | **확장** — 상신 문서 단위 추적이 추가됨 | 🟡 확장 |

---

## 9. 엣지케이스 분석 (20건)

### 9.1 상신 문서 구성

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S01 | **다건 상신 시 서로 다른 계정의 건** | 🔴 | ✅ **확정**: 동일 계정만 포함 강제 (`account_code` 단일값). 다른 계정 선택 시 경고 후 분리 상신 유도 |
| EC-S02 | **계획+신청+결과 혼합 상신** | 🔴 | ✅ **확정 (v1.2 Q-SUB2)**: **불허** — 동일 유형(plan/application/result) + 동일 통장(org_id+account_code)만 1개 상신 문서에 포함 가능. 목록 UI에서 체크박스 선택 시 같은 통장+유형만 선택 가능하도록 제약. 결재선 충돌 방지 목적 |
| EC-S03 | **다건 상신 시 일부 건에만 soft_limit 초과** | 🟡 | 1건이라도 초과 시 상신 문서 전체 결재선에 협조처 활성화 |
| EC-S04 | **0원 계획 상신** | 🟢 | 허용 — 예산 미소요 교육도 결재 필요할 수 있음 |
| EC-S05 | **같은 건이 2개 상신 문서에 포함** | 🔴 | FK + 상태 체크로 차단. `saved` → `submitted` 전이 시 이미 다른 상신 문서에 포함되었는지 확인 |

### 9.2 회수

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S06 | **첫 결재 노드가 이미 액션한 후 회수 시도** | 🔴 | ✅ **확정 (v1.4)**: 회수 불가 — `current_node_order > 0` 이면 차단. 직급(팀장/실장/센터장 등)에 관계없이 **누구든 첫 노드가 액션하면 회수 불가**. UI에서 "회수 불가 — 결재 진행 중입니다" 안내 |
| EC-S07 | **회수 후 건 내용 수정 → 재상신** | 🟡 | ✅ **확정 (v1.4)**: 회수 시 건 status → `saved` + **예산 Hold 해제** + **계획 목록 편집 가능**(추가/삭제). 수정 후 새 상신 문서 생성(기존 상신 문서는 `recalled` 이력 보존) |
| EC-S08 | **다건 상신 후 일부만 회수하고 싶음** | 🔴 | 일부 회수 불가 — 상신 문서 단위로 전체 회수만 가능. 부분 수정 필요 시 전체 회수 → 수정 → 재상신 |
| EC-S09 | **회수와 동시에 결재자가 승인 처리 (Race Condition)** | 🔴 | Row-level 보호 — 회수 API에서 `status = 'submitted' AND current_node_order = 0` 조건으로 UPDATE. 이미 진행됐으면 0행 업데이트 → 회수 실패 알림 |

### 9.3 결재 처리

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S10 | **팀장 반려 시 상신 문서의 모든 건 반려** | 🟡 | 상신 문서 status → `rejected`. 모든 item status → `rejected`. 건 status → `rejected` |
| EC-S11 | **결재선에 팀장 없는 경우 (외부결재 계정)** | 🟡 | 외부결재: 상신은 기록만. 실제 결재는 외부 시스템. status → `submitted` 유지 |
| EC-S12 | **통합결재 협조처가 VOrg에 미등록** | 🟡 | coop 노드 스킵 + 관리자 경고 로그 (기존 approval_line_design EC-6 동일) |
| EC-S13 | **결재 진행 중 결재자 교체 (인사이동)** | 🟡 | 결재 시점의 결재선 유지 (스냅샷). 교체된 결재자는 다음 상신부터 적용 |
| EC-S14 | **상신 문서에 건이 1개도 없이 생성** | 🔴 | 클라이언트 + DB CHECK 제약으로 차단 |

### 9.4 상태 정합성

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S15 | **draft 건을 상신 문서에 포함 시도** | 🔴 | 차단 — `saved` 상태만 상신 가능. 필수 검증 통과 확인 |
| EC-S16 | **이미 approved된 건이 포함된 상신 문서 반려** | 🔴 | 이미 승인된 건은 반려 대상에서 제외. 상신 문서 status → `partial` (향후) |
| EC-S17 | **상신 문서 삭제 시도** | 🟡 | `draft` 상태 상신 문서만 삭제 가능. `submitted` 이상은 삭제 불가, `recalled`만 가능 |
| EC-S18 | **`pending` 레거시 데이터 호환** | 🔴 | 마이그레이션: `status = 'pending'` → `'submitted'` 일괄 변환. trigger에서 alias 처리 |

### 9.5 사이드 이펙트

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S19 | **BO 결재 화면(bo_approval.js)과의 이중화** | 🔴 | BO도 상신 문서 기반으로 전환. 기존 정책 기반 자동필터 → 상신 문서 필터로 교체 |
| EC-S20 | **예산 차감 시점** | 🔴 | ✅ **확정 (v1.2 Q-SUB6)**: **상신 시 Hold(frozen_amount 증가)** → 최종 승인 시 확정 차감(used_amount 증가 + frozen 감소). 회수/반려 시 Hold 해제(frozen 감소) |

### 9.6 다건 선택 제약 (v1.2 신규)

| # | 시나리오 | 위험도 | 처리 |
|---|---------|:---:|------|
| EC-S21 | **목록에서 서로 다른 유형(계획+신청) 동시 선택 시도** | 🔴 | UI 차단: 첫 번째 선택 건의 유형으로 잠금. 다른 유형 체크 시 "⚠️ 같은 유형만 선택 가능합니다" 경고 + 체크 해제 |
| EC-S22 | **목록에서 서로 다른 통장(다른 org_id) 건 동시 선택 시도** | 🔴 | UI 차단: 첫 번째 선택 건의 통장(org_id+account_code)으로 잠금. 다른 통장 건 선택 시 "⚠️ 같은 예산 통장만 선택 가능합니다" 경고 |
| EC-S23 | **반려 후 saved 복귀 → 수정 → 재상신 시 예산이 다른 건에 이미 선점됨** | 🔴 | ✅ **확정 (v1.2 Q-SUB4)**: 반려 → saved 복귀 시 Hold 해제됨. 재상신 시 Hold 재시도 → 잔액 부족이면 "❌ 예산이 부족합니다" 실패 |
| EC-S24 | **회수(recalled) 시 Hold 해제 후 다른 건이 예산 선점 → 재상신 불가** | 🟡 | ✅ **확정**: 회수 시 Hold 해제되므로 재상신 시 잔액 검증 + Hold 재시도 필요. 선점된 경우 재상신 실패 허용 |

---

## 10. 사이드 이펙트 종합

### 10.1 BO 결재 화면 (`bo_approval.js`)

| 현재 | 변경 필요 |
|------|----------|
| `approverPersonaKey`로 정책 기반 건 필터링 | 상신 문서의 `approval_nodes[current_node_order]`로 내가 처리할 건 필터링 |
| 개별 건 단위 승인/반려 | 상신 문서 단위 승인/반려 (건별 분리는 향후 지원) |
| Line Items 미렌더링 | 상신 문서 내 items 목록 + 각 item의 Line Items 렌더링 |

### 10.2 예산 배정/차감 (`bo_allocation.js`)

| 현재 | 변경 필요 |
|------|----------|
| 교육계획 승인 시 `allocated_amount` 자동 배정 | 상신 문서 최종 승인 시 포함된 모든 건의 예산 일괄 처리 |

### 10.3 대시보드 (`dashboard.js`)

| 현재 | 변경 필요 |
|------|----------|
| `plans.filter(status==='pending')` | `submission_documents.filter(status==='submitted')` 기반으로 대기 건수 표시 |

### 10.4 기존 PRD 테이블 통합 확정 (v1.1 D안)

| 기존 테이블 | 이 PRD 테이블 | 결정 |
|------------|-------------|------|
| `plan_bundles` (budget_lifecycle) | `submission_documents` | ✅ **통합 확정** — `submission_type = 'team_forecast' / 'org_forecast'`로 대체. 수요예측 전용 필드는 동 테이블 확장 컬럼 |
| `plans.bundle_id` FK | `submission_items` | ✅ **대체** — 개별 계획↔상신 문서 연결은 `submission_items`로 통일 |
| `bundle_adjust_log` (budget_lifecycle) | 유지 | 🟡 유지 — 수요예측 금액 조정 이력은 별도 테이블 유지 (`submission_id` FK로 변경) |
| `submission_bundles` (edu_support_ops) | **분리 유지** | ✅ **분리** — BO 운영→총괄 검토 보고 전용. 결재 래퍼와는 다른 성격 |
| `submission_bundle_items` | **분리 유지** | ✅ **분리** — 건별 `op_comment`/`final_status` 등 검토 전용 필드 |

---

## 11. 미결정 사항 (Open Questions)

| ID | 질문 | 영향 | 긴급도 | 상태 |
|----|------|------|--------|------|
| ~~**Q-SUB1**~~ | ~~다건 상신 시 서로 다른 계정의 건 포함 가능?~~ | EC-S01 | — | ✅ **확정**: 동일 계정만 허용 |
| ~~**Q-SUB2**~~ | ~~상신 문서에 계획+신청+결과 혼합 허용?~~ | EC-S02 | — | ✅ **확정 (v1.2)**: **혼합 불허**. 동일 통장(org_id+account_code) + 동일 유형(plan/application/result)만 1개 상신 문서에 포함 가능. 결재선 충돌 방지. 목록 UI에서 선택 시 통장+유형 동일성 제약 적용 |
| ~~**Q-SUB3**~~ | ~~회수 가능 시점~~ | EC-S06 | — | ✅ **확정 (v1.2)**: **팀장 결재 처리 전까지만 회수 가능**. 팀장 승인 이후에는 협조처 또는 상위 결재자가 반려해야 함. 현재 코드 `approval.js` L1058~1063의 `in_review`/`approved` 차단 로직과 호환 |
| ~~**Q-SUB4**~~ | ~~반려 후 재상신 방식~~ | EC-S07 | — | ✅ **확정 (v1.2)**: 반려 → **saved 상태 유지** (draft 아님). saved 상태에서 수정 가능하므로 임시저장으로 변경 불필요. 재상신 시 새 상신 문서 생성. 반려 시 예산 Hold 해제(frozen_amount 감소). 재상신 시 잔액 재검증 + Hold 재시도 |
| ~~**Q-SUB5**~~ | ~~`plan_bundles`/`submission_bundles`를 `submission_documents`로 통합?~~ | 10.4 | — | ✅ **확정 (D안)**: `plan_bundles` → `submission_documents` 통합. `submission_bundles` 분리 유지 |
| ~~**Q-SUB6**~~ | ~~예산 예약(hold) 메커니즘 구현 여부~~ | EC-S20 | — | ✅ **확정 (v1.2)**: **상신(submitted) 시점에 Hold**. `frozen_amount += amount`. 임시저장(draft)/저장완료(saved) 시에는 Hold 없음. 승인 시 Hold→확정 차감. 반려/회수 시 Hold 해제. 현재 S-9 구현과 정합 |
| ~~**Q-SUB7**~~ | ~~외부결재 계정의 상신 문서 — 내부에서는 기록만 하고 결재 진행 안 함?~~ | EC-S11 | — | ✅ **확정 (v1.4)**: 용어 정리 확정 — **`platform`(플랫폼 자체 결재)와 `integrated`(통합결재 = HMC/KIA 외부 결재 시스템)**. `external` 타입은 폐지. `integrated` 상신 시 상신문서 정보를 외부 결재 시스템에 전송 → 외부에서 승인/반려/회수 결과를 회신받아 내부 상태를 다음 단계로 전환. 각 결재 단계도 동일한 패턴 적용. |

### 예산 Hold/Release 정책 요약 (v1.2 확정)

| 상태 전이 | frozen_amount 변화 | 비고 |
|----------|-------------------|------|
| draft → saved | 변동 없음 | 저장만, Hold 안 잡음 |
| saved → submitted | **+amount (Hold)** | 상신 시 예약 |
| submitted → recalled | **-amount (Release)** | 회수 시 해제 |
| submitted → approved | **-amount (→ used_amount)** | 확정 차감 |
| submitted → rejected | **-amount (Release)** | 반려 시 해제 |
| rejected → saved | 변동 없음 | saved 복귀, Hold 없음 (재상신 시 재잡기) |
| recalled → saved | 변동 없음 | saved 복귀, Hold 없음 (재상신 시 재잡기) |
| **approved → 배정액 축소** | **used_amount -= 차액 (Refund)** | **v1.3 신규**. 승인 불필요. 내용 불변 |

---

## 12. 구현 Phase

| Phase | 범위 | 의존성 | 난이도 |
|-------|------|--------|:---:|
| **S-1** | DB: `submission_documents`, `submission_items`, `approval_history` 테이블 생성 | 없음 | ✅ 완료 |
| **S-2** | plans.js: 3단계 버튼 분리 (`임시저장`/`저장`/`저장+상신`) + `saved` 상태 추가 | S-1 | ✅ 완료 |
| **S-3** | 상신 문서 작성 화면 (단건/다건 공통) + 결재선 자동 구성 | S-1, S-2 | ✅ 완료 |
| **S-4** | 팀원용 결재함 개편 — 상신 문서 기반 목록 + 회수 | S-3 | ✅ 완료 |
| **S-5** | 팀장용 결재함 개편 — 상신 문서 기반 승인/반려 | S-3 | ✅ 완료 |
| **S-6** | apply.js, result.js에 동일 패턴 적용 | S-2 | ✅ 완료 |
| **S-7** | 통합결재 표시 (협조처/참조처) — HMC/KIA 전용 | S-3 | ⭐⭐ |
| **S-8** | BO 결재 화면 (`bo_approval.js`) 상신 문서 기반 전환 | S-3, S-5 | ⭐⭐⭐⭐ |
| **S-9** | 예산 예약/확정 차감 로직 | S-5 | ✅ 완료 |
| **S-10**| 레거시 마이그레이션 (`pending` → `submitted`, 기존 데이터 상신 문서 변환) | S-1 | ✅ 스킵 |
| **S-11**| **승인 후 배정액 축소 + 예산 환불** — FO 배정액 하향 조정 UI + `_s9RefundBudget()` | S-9 | ⭐⭐⭐ |

---

## 13. 검증 계획

### 13.1 단건 상신 E2E 테스트
1. 교육계획 작성 → 임시저장(draft 확인) → 저장(saved 확인) → 상신(submitted + 상신 문서 생성 확인)
2. 팀원용 결재함에서 상신 문서 확인
3. 팀장용 결재함에서 해당 문서 수신 확인 → 승인 → approved 확인
4. 예산 차감 확인

### 13.2 다건 상신 E2E 테스트
1. 교육계획 3건 저장(saved) → 목록에서 2건 선택 → 일괄 상신
2. 상신 문서에 2건 포함 확인 → 합산 금액/결재선 확인
3. 팀장 승인 → 2건 모두 approved 확인

### 13.3 회수 테스트
1. 상신 후 결재 시작 전 회수 → saved 복귀 확인
2. 결재 1단계 진행 후 회수 시도 → 차단 확인
3. 회수 후 수정 → 재상신 → 새 상신 문서 생성 확인

### 13.4 반려 테스트
1. 팀장 반려 + 사유 입력 → 상신 문서/건 모두 rejected 확인
2. 팀원 결재함에서 반려 사유 확인
3. 건 수정 → 재상신(새 상신 문서)

### 13.5 승인 후 배정액 축소 테스트 (v1.3 신규 — SC-001)
1. 교육계획 승인(approved, allocated=80만) → FO 상세에서 "📉 배정액 축소" 버튼 존재 확인
2. 80만 → 0원 축소 → `used_amount -= 80만` 통장 환불 확인
3. 축소 후 교육명/과정명 등 내용 필드 편집 불가 확인
4. 새 교육계획(클로드코드 80만) 수립 → 잔액 검증 통과 → 상신 → 승인 → 신청 가능 확인
5. 이미 교육신청이 연결된 계획에서 신청금액 이하로 축소 시도 → 차단 확인

---

## 14. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-18 | v1.0 최초 작성 — 코드 역추적 기반 상태 분석, 3단계 상태 분리, 상신 문서 엔티티 설계, 결재함, 회수, 기존 PRD 연관 분석, 엣지케이스 20건, 사이드이펙트 4건, 구현 Phase 10단계 | AI |
| 2026-04-18 | **v1.1** — Q-SUB1 확정(동일 계정만 다건 상신), Q-SUB5 확정(D안: plan_bundles→submission_documents 통합, submission_bundles 분리 유지). DB에 submission_type, 수요예측 확장 컬럼(fiscal_year, parent_submission_id, 3단 금액) 추가. account_codes배열→account_code 단일값 변경 | AI |
| **2026-04-19** | **v1.2** — **Q-SUB2 확정**: 혼합 상신 불허(통장+유형 동일성 강제). **Q-SUB3 확정**: 팀장 결재 전까지만 회수, 이후 상위 결재자 반려 필요. **Q-SUB4 확정**: 반려→saved 유지(draft 아님), 재상신 시 새 문서. **Q-SUB6 확정**: 상신 시 Hold(현행 S-9 유지), 회수/반려 시 해제. EC-S02 변경, EC-S21~S24 신규 4건 추가. Hold/Release 정책 요약표 추가 | AI |
| **2026-04-19** | **v1.3** — **승인 후 배정액 축소 정책 추가 (SC-001)**: approved 상태에서 배정액 하향 조정 허용(내용 불변, 승인 불필요). 부분 축소 허용. `_s9RefundBudget()` 환불 로직 설계. Hold/Release 표에 Refund 행 추가. S-11 Phase 신규. 검증계획 §13.5 추가. 시나리오 관리 체계 도입 (docs/SCENARIOS/) | AI |
| **2026-04-20** | **v1.4** — 사용자 Q1~Q8 확정 반영. **회수 기준 변경**: 팀장 한정 → `current_node_order === 0` (직급 무관). **N:M 계획-신청**: 동일계정+동일교육유형 제약 확정. 부분승인 불가 확정. **이어쓰기**: 계획 목록 추가/삭제 허용. **상신 팝업**: 결재라인 미리보기+금액정보 예정, 개발 보류(저장 흐름 테스트 후 정의). **양식-정책 통합**: 현행 분리 유지. EC-S06/S07/S09 갱신 | AI |
| **2026-04-26** | **v1.6** — **교육계획 다건 상신 기능 전면 제거 (Domain Council 반영)**. 목록 체크박스 및 일괄 상신 플로팅 바 삭제. 단건 인라인 팝업 상신 및 상신 후 페이지 유지(결재함 강제 이동 해제)를 통해 연속 단건 상신 프로세스로 UX 개편. §5.2 폐기 처리 추가. | AI |
