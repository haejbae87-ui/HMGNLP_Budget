# BO 교육계획 상세보기 + 관리자 수정 요구사항 정의서 (PRD)

> **도메인**: Back Office — 교육계획 관리
> **관련 파일**: `bo_plan_mgmt.js`
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: 🟡 구현 갭 있음 (기본 UI 존재, 기능 갭 다수)

---

## 1. 기능 개요

BO 담당자가 교육계획 목록에서 특정 계획을 클릭하면 **풀페이지 상세보기**로 전환된다.
상세보기에서는 계획 내용 조회 + **결재 이력 표시** + **배정액 직접 수정** + **BO 전용 코멘트 입력**이 가능하다.

---

## 2. 사용자 스토리

> "BO 운영담당자/총괄담당자는 교육계획 목록에서 계획을 클릭하여 풀페이지 상세 화면에서 결재 이력, 배정액, BO 코멘트를 확인·수정할 수 있다."

---

## 3. 상세 기능 요구사항

### [P3] 풀페이지 상세보기
| 번호 | 기능 | 현재 상태 | 비고 |
|------|------|----------|------|
| F-P3-01 | 목록 → 풀페이지 전환 (← 목록으로 버튼) | ✅ 구현 | `_openBoPlanDetail()` |
| F-P3-02 | 기본 정보 표시 (상태, 신청자, 금액 등) | ✅ 구현 | `_renderBoPlanDetail()` |
| F-P3-03 | 결재 이력 (approval_history) 표시 | ❌ 미구현 | submission_documents 연동 필요 |
| F-P3-04 | 상신 문서 제목/상태 배지 표시 | ❌ 미구현 | submission_documents 연동 필요 |
| F-P3-05 | 산출근거 테이블 표시 | ✅ 구현 | calcGrounds 렌더링 |

### [P2] BO 관리자 수정 기능
| 번호 | 기능 | 현재 상태 | 비고 |
|------|------|----------|------|
| F-P2-01 | 관리자 입력 필드 패널 (back/provide/is_bo_only) | ✅ 구현 | `_renderBoAdminFieldsPanel()` |
| F-P2-02 | 관리자 필드 저장 (`detail._bo/_provide/_back`) | ✅ 구현 | `_saveBoAdminFields()` |
| F-P2-03 | **배정액 직접 수정** (approved 상태) | ❌ 미구현 | 상세보기 내 배정액 인라인 편집 |
| F-P2-04 | 배정액 수정 시 bankbooks 동기화 | ❌ 미구현 | `boAdjustForecastAmount` 연동 |
| F-P2-05 | 승인/반려 버튼 (결재 미도입 계획) | 🟡 부분구현 | plans.status 기반만 처리 |

---

## 4. 결재 이력 연동 설계

```
plans.id → submission_items.item_id → submission_id
→ submission_documents (status, approval_nodes, approved_at)
→ approval_history (node_label, approver_name, action, action_at, comment)
```

---

## 5. 접근 권한

| 역할 | 결재 이력 조회 | 배정액 수정 | BO 필드 수정 |
|------|:----------:|:---------:|:-----------:|
| 운영담당자 (boIsOpManager) | ✅ | ✅ | ✅ |
| 총괄담당자 (boIsGlobalAdmin) | ✅ | ✅ | ✅ |
| 기타 | ✅ 조회만 | ❌ | ❌ |

---

## 6. 배정액 수정 비즈니스 로직

```
신규 배정액 입력 → plans.allocated_amount 업데이트
→ bankbooks.used_amount 증/감 (차액 적용)
→ budget_adjust_logs 이력 저장
```

- 증액 시: `used_amount += 차액` (bankbooks 잔액 확인 필요)
- 감액 시: `used_amount -= 차액` (S-11 `_s9RefundBudget` 재사용)

---

## 7. 예외 처리

| 케이스 | 처리 |
|--------|------|
| approved 아닌 상태에서 배정액 수정 시도 | 비활성화 처리 |
| submission_items 연결 없을 때 결재 이력 | "상신 이력 없음" 표시 |

---

## 8. [기획자 검토 필요 항목]

- **Q-P2a**: 배정액 증액 시 bankbooks 잔액 초과 경우 어떻게 처리? (차단 or 경고)
- **Q-P2b**: 승인 취소(`boPlanForceRevert`) 시 bankbooks.used_amount도 복원?

> **현재 결정 (v1.0)**: Q-P2a = 경고 후 허용, Q-P2b = bankbooks 복원 없음 (수동 처리)

---

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | 최초 작성 — P2/P3 기능 갭 분석 결과 | AI |
