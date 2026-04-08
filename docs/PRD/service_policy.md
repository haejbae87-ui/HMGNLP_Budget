# 서비스 정책 기반 FO 교육유형 필터링 PRD

> **도메인**: 서비스 정책 (Service Policy)
> **관련 파일**: `utils.js`, `fo_persona_loader.js`, `plans.js`, `apply.js`, `supabase_client.js`
> **최초 작성**: 2026-04-08
> **최종 갱신**: 2026-04-08
> **상태**: 🟡 구현 갭 있음

---

## 1. 기능 개요

프론트 오피스(FO)의 교육 계획·신청·결과 화면에서 사용자가 선택할 수 있는 **교육유형(이러닝, 집합, 세미나 등)** 은 사용자의 역할(학습자/교육담당자), 직종(일반직/연구직)과 무관하게, **사용자의 소속 조직이 속한 가상조직(VOrg)에 설정된 서비스 정책**에 의해서만 결정된다.

---

## 2. 핵심 원칙

> ⚠️ 아래 원칙은 Mock 데이터 개발 시 혼입된 잘못된 조건을 명확히 제거하기 위한 것임.

| 원칙 | 내용 |
|---|---|
| **역할 무관** | 학습자/교육담당자 여부로 교육유형을 제한하지 않는다 |
| **직종 무관** | 일반직/연구직 여부로 교육유형을 제한하지 않는다 |
| **VOrg 정책 우선** | 사용자 조직→VOrg→서비스 정책이 primary key |
| **통장 비의존** | 통장(bankbook)이 없는 예산 미사용 계정도 정책 매칭 가능해야 함 |

---

## 3. 올바른 정책 매칭 흐름

```
1. 사용자 소속 조직(org_id)
       ↓
2. virtual_org_templates.tree_data 에서 조직 ID 검색
   (통장 유무에 관계없이 VOrg 멤버십 판단)
       ↓
3. 매칭된 VOrg 목록(vorg_ids) 획득
       ↓
4. service_policies WHERE vorg_template_id IN (vorg_ids)
       + tenant_id 일치
       + status = 'active'
   → 활성 정책 목록
       ↓
5. 사용자가 선택한 예산 계정 코드(account_code)로 추가 필터
   → 계정별 정책 narrowing
       ↓
6. 정책의 selected_edu_item / edu_types → 허용 교육유형 목록 반환
```

---

## 4. 현재 구현 vs 올바른 구현 비교

| 항목 | 현재 (잘못됨) | 올바른 구현 |
|---|---|---|
| VOrg 조회 경로 | `org_budget_bankbooks.template_id` → 통장 있는 경우만 | `virtual_org_templates.tree_data` → 통장 유무 무관 |
| 역할 필터 | `target_type='learner'/'operator'` 로 UI 분기 | 제거 (정책 목적/계정으로만 구분) |
| 직종 필터 | `jobType='research'/'general'` 로 일부 분기 | 제거 |
| Fallback | 정책 없으면 모든 교육유형 허용 | 정책 있으나 매칭 없으면 관리자 문의 안내 |

---

## 5. DB 구조

### 조직-VOrg 멤버십 (primary lookup)

```sql
-- 조직 ID로 소속 VOrg 목록 조회
SELECT id, name
FROM virtual_org_templates
WHERE tenant_id = :tenantId
  AND tree_data @> '[{"hqs": [{"teams": [{"id": :orgId}]}]}]'
  -- 또는 JSON 함수로 재귀 탐색
```

**`tree_data` JSONB 구조:**
```json
{
  "hqs": [
    {
      "id": "VG-...",
      "name": "그룹명",
      "teams": [
        { "id": "org_uuid", "name": "팀명" }
      ]
    }
  ]
}
```

### 서비스 정책 (service_policies)

| 컬럼 | 설명 |
|---|---|
| `id` | 정책 ID |
| `tenant_id` | 테넌트 |
| `vorg_template_id` | VOrg 템플릿 ID (primary key) |
| `account_codes` | 적용 계정 코드 배열 |
| `purpose` | 교육 목적 (`external_personal`, `external_group`, ...) |
| `edu_types` | 허용 교육유형 코드 배열 |
| `selected_edu_item` | 세부 선택 (`{ typeId, subId }`) |
| `status` | `active` / `inactive` |

### 예산 미사용 계정 케이스

```
HMC-1987 (교육이력 등록계정):
  uses_budget = false
  bankbook_count = 0
  → org_budget_bankbooks에 통장 없음
  → 현재 코드: VOrg 매칭 불가 ❌
  → 올바른 코드: tree_data에서 org_id 검색 → VOrg 매칭 ✅
```

---

## 6. FO 화면별 적용 범위

| 화면 | 적용 위치 | 현황 |
|---|---|---|
| 교육계획 수립 위저드 Step3 | `plans.js` renderPlanWizard() | 🟡 불완전 |
| 교육신청 위저드 Step3 | `apply.js` renderApplyWizard() | 🟡 불완전 |
| 교육결과 등록 | `apply.js` 결과 화면 | 📝 미확인 |

---

## 7. utils.js 함수별 수정 방향

### `_getActivePolicies(persona)` — 핵심 수정 대상

**현재:**
```js
// ① vorgIds 매칭 (bankbook.template_id 기반)
if (pDomainId && vorgIds.length > 0 && vorgIds.includes(pDomainId)) return true;
```

**올바른 흐름:**
```js
// persona.vorgIds는 fo_persona_loader.js가 tree_data 검색으로 채워야 함
// utils.js는 vorgIds 기반 매칭만 수행 (로직 변경 없음)
// → fo_persona_loader.js의 vorgIds 수집 방법을 수정해야 함
```

### `getPolicyEduTypes(persona, purposeId, budgetAccountType)` — 추가 확인

**현재 purpose 매핑:**
```js
_BO_TO_FO_PURPOSE = {
  'external_group': 'external_personal',  // BO의 external_group → FO의 external_personal로 매핑
}
// 역매핑: _FO_TO_BO_PURPOSE['external_personal'] = ['external_personal', 'external_group'] ✅
```
→ purpose 매핑 로직 자체는 올바름.

---

## 8. fo_persona_loader.js 수정 방향

### 현재 (통장 기반):
```js
// 361-368줄: bankbook.template_id에서만 vorgIds 수집
const bbVorgIds = directBbs.map(bb => bb.template_id).filter(Boolean);
persona.vorgIds = [...new Set([...existingIds, ...bbVorgIds])];
```

### 올바른 구현 (tree_data 기반):
```js
// 통장 없는 VOrg도 포함하기 위해 tree_data 검색으로 vorgIds 수집
async function _resolveVorgsByOrgId(sb, tenantId, orgId) {
  const { data: vorgs } = await sb
    .from('virtual_org_templates')
    .select('id')
    .eq('tenant_id', tenantId);
  
  // tree_data JSONB에서 orgId 포함 여부 확인
  const matched = (vorgs || []).filter(v => _orgInTreeData(v.tree_data, orgId));
  return matched.map(v => v.id);
}
```

> ⚠️ **성능 고려**: `virtual_org_templates`를 전부 fetch 후 JS에서 JSON 탐색하는 방식.
> VOrg 수가 많아지면 Supabase RPC 또는 Postgres 함수로 서버측 JSON 탐색이 필요할 수 있음.

---

## 9. Fallback 정책 (Step3 빈 tree 처리)

| 상황 | 처리 |
|---|---|
| `SERVICE_POLICIES` 미로드 | 모든 교육유형 허용 (개발 초기 모드) |
| 정책 로드됨 + 매칭 VOrg 없음 | "이 계정에 설정된 서비스 정책이 없습니다. 관리자에게 문의하세요." |
| 정책 로드됨 + VOrg 매칭됨 + edu_types 없음 | "허용된 교육유형 정보가 없습니다. 관리자에게 서비스 정책 설정을 요청하세요." |

---

## 10. 예시: 이O봉(내구기술팀) 시나리오

```
이O봉(내구기술팀, 연구직)이 개인직무 사외학습 신청:

1. 내구기술팀(org_id: 1510fb8a...) 
   → tree_data 검색
   → 소속 VOrg: [TPL_1774867919831(일반), TPL_1774870843727(R&D), TPL-1775559170063(무예산)]

2. service_policies WHERE vorg_template_id IN 위 목록
   → POL-HMC-GEN-001: 일반, HMC-PART, external_group, elearning만 허용
   → POL-1774586331900: R&D, HMC-RND, external_personal, elearning만 허용
   → POL-1775622931084: 무예산, HMC-1987, external_personal, elearning만 허용

3. 사용자가 "일반교육예산 참가계정(HMC-PART)" 선택
   → POL-HMC-GEN-001 매칭
   → 허용 교육유형: ['elearning'] (이러닝만)

4. Step3에 "이러닝" 버튼만 표시 ✅
```

---

## 11. 변경 이력

| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-08 | 최초 작성 (역할/직종 무관 원칙 명시, tree_data 기반 VOrg 매핑 설계) | AI |
