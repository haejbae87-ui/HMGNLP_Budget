# 결재 프로세스 및 문서 상태 요구사항 정의서 (PRD)

> **도메인**: 결재 관리 (Approval Process)
> **관련 파일**: `public/js/approval.js`, `public/js/approval_stepper.js`, `public/js/fo_plans_wizard.js`, `public/js/fo_plans_actions.js`, `public/js/plans.js`
> **최초 작성**: 2026-04-25
> **최종 갱신**: 2026-04-25
> **상태**: ✅ 완전 구현

---

## 1. 기능 개요
프론트 오피스(FO)에서 수립한 교육계획 및 신청 문서가 거치는 **결재 워크플로우(상신, 대기, 회수, 승인, 반려)와 상태 전이 규칙**을 정의합니다. 특히 가점유 예산(Hold Budget)의 생성과 해제, 그리고 UI 상의 정확한 상태 노출에 중점을 둡니다.

## 2. 사용자 스토리
> "상신자(기안자)는 상신 전 문서 상태를 확인하고 언제든 상신할 수 있으며, 결재자가 승인하기 전이라면 언제든 상신을 회수(Recall)하여 문서를 수정 상태(Saved)로 되돌릴 수 있다."
> "결재자(팀장/총괄)는 상신된 문서를 검토 후 승인(Approve)하거나 반려(Reject)할 수 있다."

## 3. 핵심 상태 전이도 (State Machine)

문서(`plans`, `applications`)는 아래와 같은 생명주기를 가집니다.

1. **draft (작성중)**: 필수값이 입력되지 않았거나 사용자가 명시적으로 임시저장한 상태.
2. **saved (저장완료/상신대기)**: 문서 작성이 완료되어 로컬 DB에 저장되었으나, 결재선으로 상신(Submit)되지 않은 상태. 묶음 상신의 대상이 될 수 있음.
3. **submitted/pending (결재대기/신청중)**: 상신이 완료되어 `submission_documents`에 등록된 상태. 이때 **예산 가점유(Hold)**가 자동 실행됨.
4. **approved (승인완료)**: 결재라인의 최종 승인을 획득한 상태.
5. **rejected (반려)**: 결재자에 의해 문서가 거절된 상태. 예산 가점유가 즉시 반환(Release)됨.
6. **recalled (회수됨)**: 상신 후 결재자가 승인하기 전에 작성자가 자의로 상신을 철회한 상태. `plans` 문서는 다시 `saved` 상태로 돌아감.

## 4. 화면별 UI 동작 요구사항 (FO Detail View)

| 문서 상태 (DB) | 상태 배지 라벨 | Stepper 상태 | 표시되는 액션 버튼 |
|---|---|---|---|
| `draft` | 작성중 | 작성중(Active) | ✏️ 이어쓰기, 🗑 삭제 |
| `saved` | 작성완료 | 상신대기(Active) | 📤 상신하기, ✏️ 수정, 📱 복제 |
| `pending` | 결재대기 | 결재대기(Active) | **회수하기**, 📱 복제 |
| `approved`| 승인완료 | 승인완료(Done) | ▶ 이 계획으로 교육신청, 📉 배정액 축소, 📱 복제 |
| `rejected`| 반려 | 반려(Failed) | ✏️ 수정 (복제 후 재상신 유도) |

## 5. 결재 워크플로우 핵심 비즈니스 로직

1. **가점유 예산(Budget Hold) 로직**
   - 상신(`_aprSingleSubmit`, 묶음 상신) 시: `account_budgets` 테이블에서 해당 금액만큼 잔액을 가점유(Hold)하여 다른 기안자가 중복 사용하지 못하도록 막음.
   - 승인 시: 가점유된 금액이 실제 지출(Used)로 확정 전환됨.
   - 회수(`_aprRecallSubmit`) 또는 반려 시: 묶였던 가점유 예산이 즉시 반환되어 통장 잔액으로 원복됨.

2. **회수(Recall) 가능 조건**
   - 오직 **결재자가 아직 아무 조치를 취하지 않았을 때(current_node_order === 0)**에만 회수 가능.
   - 결재가 1단계 이상 진행(팀장 승인 완료 등)되거나, 상태가 `in_review`로 넘어간 경우 시스템적으로 회수가 차단되며 반려 요청을 해야 함.

## 6. DB 테이블 구조

- `plans` / `applications`
  - `status`: 현재 문서의 상태
  - `amount`: 계획/신청 예산액
- `submission_documents` (결재 문서 마스터)
  - `id`: 상신 문서 고유 ID
  - `status`: 문서 결재 진행 상태 (submitted, in_review, approved, rejected, recalled)
  - `current_node_order`: 현재 진행 중인 결재선 단계 (0 = 1차 결재자 대기)
- `submission_items` (결재 포함 항목)
  - `submission_id`: 마스터 문서 ID
  - `item_id`: `plans` 또는 `applications` ID

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|---|---|
| 네트워크 지연 중 상신 모달 충돌 | 결재함(`approval-member`)으로 우선 이동(navigate)한 뒤 DOM 렌더링이 완전히 끝난 직후 `window._pendingAprSubmit` 훅을 감지하여 모달을 오픈. (레이스 컨디션 방지) |
| 상위 승인자가 결재 중인데 회수 시도 | `submission_documents.current_node_order > 0` 인지 확인하여, 조건 만족 시 `alert`로 회수 차단 및 반려 요청 안내. |
| 회수 버튼 연타 (더블 클릭) | 낙관적 잠금: `update({ status: 'saved' }).in('status', ['pending', 'submitted'])` 구문으로 방어하여 최초 1회만 트랜잭션 성공 처리. |

## 8. 기획자 검토 결과 (Domain Council 합의점)
- "상신하기" 버튼이 FO 환경에서 안정적으로 동작하도록 Bridge 훅을 개편하였음.
- 계획 상세 화면에서 "회수하기" 버튼이 올바르게 나타나고, `saved` 상태로 돌아가는 기능이 구현됨을 확인함.
- 회수 시 예산(Hold) 반환이 완벽하게 이루어지므로, 정산/예산 도메인 관점의 리스크가 모두 해소됨.

## 9. 변경 이력
| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-25 | 결재 프로세스 워크플로우 역설계 및 상신/회수 상태 갱신 | PRD Engineer (AI) |
