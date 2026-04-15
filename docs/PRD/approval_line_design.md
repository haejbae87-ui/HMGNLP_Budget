# 결재라인 조건부 라우팅 설계안

> **도메인**: 서비스 정책 — 결재라인 자동 구성  
> **최초 작성**: 2026-04-15  
> **상태**: 📋 설계 분석 (리뷰 요청)

---

## 1. 현재 구현 비판적 분석

### 1.1 현재 BO UI가 지원하는 것 (`bo_policy_builder.js` Step 4)

```
현재 모델:
  결재 시스템 선택 ─┬─ LXP 플랫폼 자체 결재
                    └─ HMG 통합결재 (AutoWay)

  금액 구간별 결재자 ── maxAmt → approverKey ── "1000만원 이하면 팀장"
  결재 후 검토자 ── 최대 2명 (1차/최종)
```

### 1.2 ❌ 현재 모델의 치명적 한계

| # | 한계 | 실제 요구 | 격차 |
|---|------|----------|------|
| 1 | **"총액 기준" 단일 조건** | 세부산출근거 **항목별** 단가 + 총액 + 기타항목 유무 **복합 조건** | 🔴 Critical |
| 2 | **참조 vs 협조 구분 없음** | 단순결재선은 "참조"(CC), 복잡결재선은 "협조"(Review Required) | 🔴 Critical |
| 3 | **세부산출근거 연동 없음** | 교육참가비·교보재비·시험응시료 등 **항목별 기준 금액** 판별 필요 | 🔴 Critical |
| 4 | **협조처 동적 결정 불가** | 교육총괄팀, 재경협조팀이 **조건에 따라** 참조↔협조로 전환 | 🔴 Critical |
| 5 | 결재자 = "사람" 고정 | 실제로는 **"팀"** 단위 (교육총괄팀, 재경협조팀) | 🟠 High |
| 6 | 교육유형별 분기 없음 | 사외교육 참가 vs 교육운영 — 완전히 다른 결재 규칙 | 🟠 High |

> [!CAUTION]
> **현재 UI는 실제 결재 비즈니스 로직의 약 20%만 표현 가능합니다.**  
> 가장 큰 문제는 "어떤 조건에서 참조이고, 어떤 조건에서 협조인가"를 설정할 수 없다는 점입니다.

---

## 2. 실제 결재 비즈니스 규칙 정리

### 2.1 사외교육 참가신청 (학습자 직접 신청)

```
결재 시스템: HMG 통합결재 (AutoWay)

┌─── 조건 판별 ───────────────────────────────────────────────┐
│ 세부산출근거 항목의 "인당 금액" 계산:                          │
│   인당금액 = 세부산출근거 총액 ÷ 참석인원                      │
│                                                             │
│  ✅ 단순결재선 조건 (ALL 충족):                                │
│   • 교육참가비 인당 ≤ 200만원                                 │
│   • 교보재비 < 3만원                                         │
│   • 시험응시료 < 10만원                                       │
│                                                             │
│  ❌ 복잡결재선 조건 (ANY 하나라도 미충족)                      │
└─────────────────────────────────────────────────────────────┘

┌─── 단순결재선 ──────────────────────────────────┐
│ 신청자 → 팀장결재 → 본부교육주무팀 1차검토      │
│                    → 교육총괄팀/재경팀 ▶참조◀    │
│                    → 경상예산코드 자동생성        │
└─────────────────────────────────────────────────┘

┌─── 복잡결재선 ──────────────────────────────────┐
│ 신청자 → 팀장결재 → 본부교육주무팀 1차검토      │
│                    → 교육총괄팀/재경팀 ▶협조◀    │
│                    → 경상예산코드 자동생성        │
└─────────────────────────────────────────────────┘
```

### 2.2 교육운영 품의 (교육주관팀 신청)

```
결재 시스템: HMG 통합결재 (AutoWay)

┌─── 조건 판별 ───────────────────────────────────────────────┐
│  ✅ 단순결재선 조건 (ALL 충족):                                │
│   • 품의 총액 < 5,000만원                                    │
│   • 세부산출근거 단가 상한 모두 준수 (Soft/Hard 위반 없음)    │
│   • 세부산출근거에 "기타" 항목 미포함                          │
│                                                             │
│  ❌ 복잡결재선 조건 (ANY 하나라도 미충족)                      │
└─────────────────────────────────────────────────────────────┘

┌─── 단순결재선 ──────────────────────────────────────────────┐
│ 교육주관팀 → 본부교육주무팀 검토                             │
│            → 교육총괄팀 ▶참조◀  +  재경팀 ▶참조◀            │
│            → 경상예산코드 자동생성                            │
└─────────────────────────────────────────────────────────────┘

┌─── 복잡결재선 ──────────────────────────────────────────────┐
│ 교육주관팀 → 본부교육주무팀 1차검토                          │
│            → 교육총괄팀 ▶협조(금액수정가능)◀                 │
│            → 재경팀 ▶협조◀                                  │
│            → 경상예산코드 자동생성                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 핵심 개념 모델링

### 3.1 결재 노드 역할 (Role)

현재 시스템에 **없는** 핵심 개념:

| 역할 | 한글 | 의미 | AutoWay 매핑 |
|------|------|------|-------------|
| `approver` | 결재자 | 승인/반려 권한. 반려 시 프로세스 중단 | 결재 |
| `reviewer` | 검토자 | 1차 검토. 수정요청 또는 통과 | 품의 검토 |
| `cooperation` | 협조처 | **반드시 검토** 필요. 금액 수정 가능 | 품의 검토 (필수) |
| `cc` | 참조처 | 통보만. 승인/거부 권한 없음 | 품의 참조 |

> [!IMPORTANT]
> **참조(cc) vs 협조(cooperation)**가 핵심 분기점입니다.  
> 현재 UI에는 이 구분이 전혀 없으며, "검토자" 한 종류만 존재합니다.

### 3.2 조건 판별 엔진 (Condition Engine)

신청서 제출 시점에 **동적으로** 결재선을 결정하는 규칙이 필요합니다:

```
ApprovalCondition {
  field: string           // 판별 대상 필드
  operator: string        // 비교 연산자
  value: number | string  // 기준값
  calcGroundId?: string   // 특정 산출근거 항목 (optional)
}
```

| 조건 유형 | field | operator | value | 예시 |
|----------|-------|----------|-------|------|
| 총액 기준 | `totalAmount` | `<` / `>=` | 50000000 | 총액 5천만원 미만 |
| 인당 금액 | `perPersonAmount` | `<=` / `>` | 2000000 | 인당 200만원 이하 |
| 항목별 단가 | `calcGround.unitPrice` | `<` / `>=` | 30000 | 교보재비 3만원 미만 |
| 단가 상한 준수 | `calcGround.limitCompliance` | `==` | `true` | Soft/Hard 위반 없음 |
| 기타 항목 유무 | `calcGround.hasEtcItem` | `==` | `false` | 기타 항목 미포함 |

---

## 4. 제안 설계: "결재 규칙 빌더"

### 4.1 데이터 모델

```
approval_rules (결재 규칙 테이블 — 신규)
├── id                       PK
├── service_policy_id        FK → service_policies
├── stage                    'plan' | 'apply' | 'result'
├── rule_name                '단순결재선' | '복잡결재선'
├── priority                 1 (단순 우선 평가) → 2 (폴백)
├── approval_system          'platform' | 'hmg_autoway'
├── conditions               JSONB — 조건 배열 (AND 연산)
├── nodes                    JSONB — 결재 노드 배열 (순서)
└── is_default               boolean (모든 조건 미충족 시 적용)

conditions 예시:
[
  { "field": "perPersonAmount", "calcGroundName": "교육참가비",
    "operator": "<=", "value": 2000000 },
  { "field": "calcGround.unitPrice", "calcGroundName": "교보재비",
    "operator": "<", "value": 30000 },
  { "field": "calcGround.unitPrice", "calcGroundName": "시험응시료",
    "operator": "<", "value": 100000 }
]

nodes 예시:
[
  { "order": 1, "role": "approver", "target": "team_leader",
    "label": "팀장결재" },
  { "order": 2, "role": "reviewer", "target": "edu_hq_team",
    "label": "본부교육주무팀 1차검토" },
  { "order": 3, "role": "cc", "target": "edu_general_team",
    "label": "교육총괄팀 참조" },
  { "order": 3, "role": "cc", "target": "finance_team",
    "label": "재경협조팀 참조" }
]
```

### 4.2 결재선 자동 판별 흐름

```
신청서 제출
    │
    ▼
┌─── 정책의 approval_rules 로드 (priority 순) ───┐
│                                                 │
│  Rule 1 (단순결재선, priority=1)                │
│    conditions: [인당 ≤200만, 교보재<3만, ...]   │
│    → ALL 충족? ─── Yes → 이 규칙의 nodes 적용   │
│                                                 │
│  Rule 2 (복잡결재선, priority=2, is_default)    │
│    conditions: [] (무조건)                       │
│    → 폴백 — 이 규칙의 nodes 적용                │
│                                                 │
└─────────────────────────────────────────────────┘
    │
    ▼
결재 노드 목록 반환 → AutoWay API 호출 또는 내부 결재 생성
```

### 4.3 BO UI 설계안 — "결재 규칙 빌더"

현재 UI를 대체할 새로운 Step 5 구조:

```
┌──────────────────────────────────────────────────────────────┐
│  결재라인 설정                                                │
│                                                              │
│  🔧 결재 시스템: ○ LXP 자체결재  ● HMG 통합결재 (AutoWay)   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📋 규칙 1: 단순결재선  (우선순위: 1)          [삭제]    │  │
│  │                                                        │  │
│  │ ✅ 적용 조건 (모두 충족 시):                            │  │
│  │  ┌──────────────┬────┬──────────┬──────────┐           │  │
│  │  │ 교육참가비    │ ≤  │ 인당금액  │ 200만원  │ [삭제]   │  │
│  │  │ 교보재비      │ <  │ 단가     │ 3만원    │ [삭제]   │  │
│  │  │ 시험응시료    │ <  │ 단가     │ 10만원   │ [삭제]   │  │
│  │  └──────────────┴────┴──────────┴──────────┘           │  │
│  │  [+ 조건 추가]                                         │  │
│  │                                                        │  │
│  │ 📊 결재 노드:                                          │  │
│  │  1. [결재] 팀장결재                                     │  │
│  │  2. [검토] 본부교육주무팀 1차검토                        │  │
│  │  3. [참조] 교육총괄팀                                   │  │
│  │  3. [참조] 재경협조팀                                   │  │
│  │  [+ 노드 추가]                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📋 규칙 2: 복잡결재선  (기본 규칙 ★)          [삭제]    │  │
│  │                                                        │  │
│  │ ⚠️ 적용 조건: 위 규칙에 해당하지 않는 모든 경우         │  │
│  │                                                        │  │
│  │ 📊 결재 노드:                                          │  │
│  │  1. [결재] 팀장결재                                     │  │
│  │  2. [검토] 본부교육주무팀 1차검토                        │  │
│  │  3. [협조] 교육총괄팀 (금액 수정 가능)                   │  │
│  │  3. [협조] 재경협조팀                                   │  │
│  │  [+ 노드 추가]                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ 규칙 추가]                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 노드 타겟(target) 해석 방식

| target 유형 | 예시 | 런타임 해석 |
|-------------|------|-----------|
| `team_leader` | 팀장결재 | 신청자의 조직도상 팀장 (AutoWay 자동 매핑) |
| `dept_head` | 실장결재 | 신청자의 조직도상 실장 |
| `vorg_manager` | 교육주무팀 | VOrg cooperating_teams에서 조회 |
| `edu_general_team` | 교육총괄팀 | VOrg 설정의 교육총괄 협조팀 |
| `finance_team` | 재경협조팀 | VOrg 설정의 재경 협조팀 |
| `manual:persona_key` | 수동지정 | BO에서 직접 지정한 페르소나 |

> [!IMPORTANT]
> **교육총괄팀/재경협조팀은 정적 지정이 아니라, VOrg cooperating_teams에서 동적으로 해석**됩니다.  
> 현대차/기아가 각각 다른 협조팀을 가질 수 있으므로, 정책 레벨이 아닌 VOrg 레벨에서 관리해야 합니다.

---

## 6. 조건 판별 함수 설계

```javascript
/**
 * 신청서 데이터를 기반으로 적용할 결재 규칙을 판별
 * @param {Object} policy - 서비스 정책
 * @param {string} stage - 'plan' | 'apply' | 'result'
 * @param {Object} formData - 신청서 데이터 (산출근거 포함)
 * @returns {Object} 적용할 결재 규칙 (nodes 포함)
 */
function evaluateApprovalRule(policy, stage, formData) {
  const rules = policy.approval_rules
    .filter(r => r.stage === stage)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    if (rule.is_default) return rule;  // 폴백 규칙
    if (evaluateConditions(rule.conditions, formData)) return rule;
  }
  return rules.find(r => r.is_default);  // 안전장치
}

function evaluateConditions(conditions, formData) {
  return conditions.every(cond => {
    const val = resolveFieldValue(cond, formData);
    switch (cond.operator) {
      case '<':  return val < cond.value;
      case '<=': return val <= cond.value;
      case '>=': return val >= cond.value;
      case '>':  return val > cond.value;
      case '==': return val === cond.value;
      default:   return false;
    }
  });
}

function resolveFieldValue(cond, formData) {
  switch (cond.field) {
    case 'totalAmount':
      return formData.calcGrounds.reduce((s, g) => s + g.amount, 0);
    case 'perPersonAmount':
      const total = formData.calcGrounds
        .filter(g => g.name === cond.calcGroundName)
        .reduce((s, g) => s + g.amount, 0);
      return total / (formData.participants || 1);
    case 'calcGround.unitPrice':
      const item = formData.calcGrounds
        .find(g => g.name === cond.calcGroundName);
      return item?.unitPrice || 0;
    case 'calcGround.limitCompliance':
      return formData.calcGrounds.every(g =>
        !g.softLimitExceeded && !g.hardLimitExceeded);
    case 'calcGround.hasEtcItem':
      return formData.calcGrounds.some(g =>
        g.category === 'etc' || g.name?.includes('기타'));
    default: return 0;
  }
}
```

---

## 7. 사외교육 참가신청 — 규칙 설정 예시

```json
[
  {
    "rule_name": "단순결재선",
    "priority": 1,
    "approval_system": "hmg_autoway",
    "conditions": [
      { "field": "perPersonAmount", "calcGroundName": "교육참가비",
        "operator": "<=", "value": 2000000 },
      { "field": "calcGround.unitPrice", "calcGroundName": "교보재비",
        "operator": "<", "value": 30000 },
      { "field": "calcGround.unitPrice", "calcGroundName": "시험응시료",
        "operator": "<", "value": 100000 }
    ],
    "nodes": [
      { "order": 1, "role": "approver", "target": "team_leader" },
      { "order": 2, "role": "reviewer", "target": "vorg_manager" },
      { "order": 3, "role": "cc", "target": "edu_general_team" },
      { "order": 3, "role": "cc", "target": "finance_team" }
    ]
  },
  {
    "rule_name": "복잡결재선",
    "priority": 99,
    "is_default": true,
    "approval_system": "hmg_autoway",
    "conditions": [],
    "nodes": [
      { "order": 1, "role": "approver", "target": "team_leader" },
      { "order": 2, "role": "reviewer", "target": "vorg_manager" },
      { "order": 3, "role": "cooperation", "target": "edu_general_team" },
      { "order": 3, "role": "cooperation", "target": "finance_team" }
    ]
  }
]
```

---

## 8. 교육운영 품의 — 규칙 설정 예시

```json
[
  {
    "rule_name": "단순결재선",
    "priority": 1,
    "approval_system": "hmg_autoway",
    "conditions": [
      { "field": "totalAmount", "operator": "<", "value": 50000000 },
      { "field": "calcGround.limitCompliance", "operator": "==", "value": true },
      { "field": "calcGround.hasEtcItem", "operator": "==", "value": false }
    ],
    "nodes": [
      { "order": 1, "role": "reviewer", "target": "vorg_manager" },
      { "order": 2, "role": "cc", "target": "edu_general_team" },
      { "order": 2, "role": "cc", "target": "finance_team" }
    ]
  },
  {
    "rule_name": "복잡결재선",
    "priority": 99,
    "is_default": true,
    "approval_system": "hmg_autoway",
    "conditions": [],
    "nodes": [
      { "order": 1, "role": "reviewer", "target": "vorg_manager" },
      { "order": 2, "role": "cooperation", "target": "edu_general_team",
        "options": { "canEditAmount": true } },
      { "order": 2, "role": "cooperation", "target": "finance_team" }
    ]
  }
]
```

---

## 9. 구현 우선순위

| 단계 | 작업 | 복잡도 | 비고 |
|------|------|--------|------|
| **Phase 1** | DB 모델 (`approval_rules` 테이블) | 🟡 | 정책과 1:N 관계 |
| **Phase 1** | 조건 판별 엔진 (`evaluateApprovalRule`) | 🟡 | 순수 JS 함수 |
| **Phase 2** | BO UI: 결재 규칙 빌더 (Step 5 재설계) | 🔴 | 조건+노드 편집기 |
| **Phase 2** | 노드 역할 4종 (결재/검토/협조/참조) 지원 | 🟠 | 드롭다운 추가 |
| **Phase 3** | FO 제출 시 동적 결재선 생성 | 🔴 | AutoWay API 연동 |
| **Phase 3** | VOrg cooperating_teams → target 자동 해석 | 🟠 | 동적 팀 매핑 |

---

## User Review Required

> [!IMPORTANT]
> ### 확인 필요 사항
> 1. **조건 판별 시점**: 신청서 "제출" 시점에 판별하는 것이 맞는지? (임시저장 시에도 미리 보여줄지?)
> 2. **VOrg별 협조팀 관리**: 교육총괄팀/재경협조팀을 VOrg의 `cooperating_teams`에서 관리하는 방식이 적절한지?
> 3. **참석인원 입력**: "인당 금액" 계산을 위해 참석인원 필드가 양식에 있어야 하는데, 현재 양식에 포함되어 있는지?
> 4. **기타 항목 판별**: 세부산출근거의 "기타" 항목을 어떤 기준으로 식별할지? (항목명에 "기타" 포함? 별도 category 필드?)
> 5. **구현 범위**: Phase 1~3 전체를 진행할지, Phase 1 (DB+엔진)만 먼저 진행할지?

---

## Open Questions

> [!WARNING]
> ### 추가 확인 필요
> - **기아**의 결재 규칙이 현대차와 동일한지? (캡쳐 자료가 현대차 기준)
> - AutoWay API와의 실제 연동 인터페이스 (참조/협조 구분을 AutoWay에서 어떻게 표현하는지?)
> - 결재 완료 후 "경상예산코드 자동생성"은 어떤 시스템에서 처리되는지?
