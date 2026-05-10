# 문서 결재 상태(Status) 표준화 명세서 (PRD)

> **작성자**: PRD Engineer & Domain Council (결재거버넌스)
> **적용 대상**: 사업계획(Forecast), 운영계획(Ongoing), 교육신청(Application), 결과보고(Result)
> **최종 갱신**: 2026-05-10
> **상태**: ✅ 반영 완료

---

## 1. 개요 및 목적
기존 HMG 교육 예산 시스템은 문서 종류(계획, 신청, 결과)별로 파편화된 상태값(`draft`, `pending`, `result_pending`, `completed` 등)을 사용하고 있었습니다. 이로 인해 결재 상태 동기화 및 예산 점유(Hold)/해제(Release) 로직에 결함(Side-effect)이 발생했습니다.
본 PRD는 4대 주요 교육 문서의 상태를 중앙화된 단일 State Machine으로 통합하여 결재 거버넌스 및 예산/정산 무결성을 확보하기 위한 표준 규격을 정의합니다.

## 2. 도메인 전문가 교차 검증 (Domain Council)

### 🧐 발언자: 결재거버넌스 전문가 (Approval Governance Expert)
> "기존에는 문서 회수 시 `cancelPlan`이나 `cancelApply` 등 모듈별로 다른 함수를 호출하여 상태를 강제 업데이트했습니다. 이로 인해 상위 결재 노드에서 결재가 진행 중인데도 문서 상태가 초기화되는 엣지 케이스가 있었습니다. 모든 문서는 `_aprRecallSubmit` 등 중앙화된 함수를 거쳐야 하며, 상태값은 결재 상태계(State Machine)에 1:1로 매핑되어야 합니다."

### 💰 발언자: 예산/정산 전문가 (Budget & Ledger Expert)
> "동의합니다. 상태값이 파편화되면 예산의 `Hold`(가점유) 및 `Release`(반환) 시점을 보장할 수 없습니다. 특히, '반려(Rejected)'와 '회수(Recalled)' 발생 시 점유된 예산을 즉각 반환해야 하는데, 기존 신청/결과 상태에서는 이 이벤트 트리거가 누락되는 경우가 있었습니다."

### 🎓 발언자: 교육계획 전문가 (Edu Plan Expert)
> "학습자 관점에서 보면, '작성중'인지 '결재진행중'인지 명확한 라벨링이 필요합니다. FO 화면에서 통일된 뱃지와 Stepper가 렌더링되도록, Backend 상태값과 Frontend 라벨의 표준 매핑 테이블이 필요합니다."

---

## 3. 4대 핵심 문서 상태 (Status) 표준화 규격

모든 문서(plans, applications, results)는 아래의 **표준 5단계 상태**를 공유합니다.

| 상태 (DB Code) | FO 사용자 UI 라벨 | 설명 및 결재 진행 상황 | 예산 (Budget) 연동 상태 | 다음 전이 가능 상태 |
|:---|:---|:---|:---|:---|
| **`saved`** | **작성완료** (또는 임시저장) | 필수 데이터가 모두 기입되어 언제든 상신 가능한 대기 상태. 회수(Recall) 시 돌아오는 기본 상태. | 변동 없음 | `submitted` |
| **`submitted`** | **결재중** | 문서가 상신되어 `submission_documents`에 연결된 상태. (진행 중) | **가점유 (Hold)** 발생 | `approved`, `rejected`, `recalled` |
| **`approved`** | **승인완료** (또는 수료/정산완료) | 결재 라인의 최종 승인을 득한 상태. | **실집행 (Used)** 확정 | 없음 (종결) |
| **`rejected`** | **반려** | 결재권자에 의해 승인이 거절된 상태. 사용자가 내용을 보완해야 함. | **점유 반환 (Release)** | `saved` (수정 후 재상신) |
| **`recalled`** | **회수됨** (시스템 내부 전이) | 기안자가 결재 전에 자의로 결재를 철회한 상태. (DB에서는 즉시 `saved`로 복귀 처리) | **점유 반환 (Release)** | `saved` |

> ⚠️ **과거 레거시 코드 호환성**
> - `draft`: 작성 중으로 필수값이 누락된 상태. UI에서만 처리하며 DB 반영 최소화. (현재는 `saved`로 포괄하여 임시저장 지원)
> - `result_pending`, `completed` (결과보고): 점진적으로 `submitted` 및 `approved`로 마이그레이션하여 상태계 표준화 진행.

## 4. 핵심 액션 및 부작용(Side-effect) 통제

1. **상신 (`_aprSingleSubmit` / 묶음상신)**
   - **이벤트**: `saved` → `submitted`
   - **Side-effect**: 통장(Account) 잔액 검증 후 해당 금액을 `Hold` 처리.

2. **결재 회수 (`_aprRecallSubmit`)**
   - **조건**: `submission_documents`의 `current_node_order === 0` (결재자가 아직 처리 전)일 때만 가능.
   - **이벤트**: `submitted` → `recalled` (내부) → 즉시 `saved` 로 전이.
   - **Side-effect**: `Hold` 된 예산 즉시 `Release`. 해당 문서의 `submission_id` 연결 해제.

3. **결재 승인 / 반려 (Back Office 연동)**
   - 승인 시: `submitted` → `approved`. (`Hold` → `Used` 정산 반영)
   - 반려 시: `submitted` → `rejected`. (`Hold` → `Release` 반환)

## 5. FO UI 적용 사항 (UI Standardization)

FO의 각 리스트 뷰(`fo_plans_list.js`, `fo_apply_list.js` 등)에서 렌더링되는 뱃지(Badge) 색상은 아래와 같이 표준화됩니다.

- `saved`: 회색 (`bg-gray-100 text-gray-600`) - "작성완료"
- `submitted`: 파란색 (`bg-blue-100 text-blue-700`) - "결재중"
- `approved`: 초록색 (`bg-emerald-100 text-emerald-700`) - "승인완료"
- `rejected`: 빨간색 (`bg-red-100 text-red-700`) - "반려"

이 표준 규격은 향후 시스템 내 추가되는 모든 증빙/정산 문서에도 동일하게 적용됩니다.
