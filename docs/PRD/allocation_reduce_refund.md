# 배정액 축소 및 예산 환불 요구사항 정의서 (PRD)

> **도메인**: FO 교육계획 (승인 후 관리)
> **관련 파일**: `fo_plans_list.js`, `plans.js`, `approval.js`
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: 🟡 구현 중 (버튼 UI 존재, 함수 미구현)
> **관련 PRD**: `fo_submission_approval.md` §S-11, §13.5 SC-001

---

## 1. 기능 개요

승인 완료된 교육계획에 대해 **배정 예산의 일부 또는 전부를 하향 조정**하고,
줄어든 금액을 `bankbooks.used_amount`에서 차감하여 실제 예산을 복원한다.

FO 사용자(팀원)가 계획 상세 화면에서 직접 배정액을 수정할 수 있으며,
수정 시 `used_amount -= 차액` 처리가 자동 수행된다.

---

## 2. 사용자 스토리

> "FO 팀원은 승인된 교육계획 상세 화면에서 '배정액 축소' 버튼을 눌러 배정 금액을 낮추면, 줄어든 금액이 예산 통장에 자동 환불된다."

---

## 3. 상세 기능 요구사항

| 번호 | 기능 | 설명 | 우선순위 |
|------|------|------|---------|
| F-001 | 배정액 축소 모달 열기 | `foOpenReduceAllocation(planId)` — 현재 배정액 표시 + 새 금액 입력 UI | 🔴 HIGH |
| F-002 | 입력값 유효성 검증 | 새 금액 ≥ 0, 새 금액 < 현재 배정액, 숫자만 허용 | 🔴 HIGH |
| F-003 | plans.allocated_amount 업데이트 | `plans` 테이블 `allocated_amount = 새금액` | 🔴 HIGH |
| F-004 | bankbooks.used_amount 환불 | `used_amount -= (기존 배정액 - 새 금액)` | 🔴 HIGH |
| F-005 | 환불 사유 기록 | `budget_adjust_logs` 테이블에 이력 저장 | 🟡 MEDIUM |
| F-006 | 0원 처리 (전액 취소) | 새 금액 = 0이면 plans.status → 'cancelled' 처리 여부 확인 필요 | 🟡 MEDIUM |
| F-007 | 이미 신청 완료된 계획 보호 | 해당 계획으로 생성된 application이 있으면 축소 제한 | 🟡 MEDIUM |

---

## 4. DB 및 데이터 구조

### 4.1 bankbooks 테이블 (환불 대상)
```
used_amount   BIGINT   -- 사용액 (승인 시 증가, 환불 시 감소)
frozen_amount BIGINT   -- 예약액 (상신 시 증가, 승인/반려 시 변동)
```

### 4.2 plans 테이블 (축소 대상)
```
allocated_amount  NUMERIC  -- BO가 배정한 금액
amount            NUMERIC  -- FO가 최초 신청한 금액
status            TEXT     -- approved / cancelled 등
```

### 4.3 budget_adjust_logs (이력)
```
plan_id, submission_id, before_amount, after_amount
adjusted_by, adjusted_at, reason
```

---

## 5. 비즈니스 로직

### 5.1 환불 계산
```
refundAmt = plan.allocated_amount - newAmount
bankbooks.used_amount -= refundAmt
plans.allocated_amount = newAmount
```

### 5.2 엣지 케이스 처리
| 케이스 | 처리 방식 |
|--------|---------|
| 새 금액 > 현재 배정액 | ❌ 거부 (증액 불가 — 재상신 필요) |
| 새 금액 = 현재 배정액 | ❌ 거부 (변경 없음) |
| 새 금액 = 0 | ✅ 허용 — `plans.status → 'cancelled'` 전환 여부는 기획 확인 필요 |
| 이미 applications 존재 | ⚠️ 경고 후 계속 가능 (신청 금액보다 작게 축소 시 차단) |
| bankbooks not found | 잔액 처리 skip + 경고 toast |

### 5.3 bankbooks 조회 기준
`tenant_id + account_code + status='active'` 매칭 → 복수 시 `current_balance` 내림차순 1건

---

## 6. 접근 권한

| 역할 | 권한 |
|------|------|
| FO 팀원 (본인) | ✅ 본인 계획만 축소 가능 |
| FO 팀원 (타인) | ❌ 접근 불가 |
| BO 담당자 | BO 화면에서 별도 처리 (`boAdjustForecastAmount`) |

---

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|--------|---------|
| DB 연결 실패 | alert 오류 표시 |
| bankbooks 조회 실패 | plans만 업데이트, 경고 표시 |
| 중복 클릭 방지 | 처리 중 버튼 비활성화 |

---

## 8. [기획자 검토 필요 항목]

- **Q1**: 배정액을 0으로 축소 시 계획 상태를 `cancelled`로 변경해야 하나?
- **Q2**: 이미 신청된 application이 있는 계획의 배정액을 신청액보다 작게 축소할 수 있는가?
- **Q3**: 축소 후 BO 담당자에게 알림이 필요한가?

> **현재 구현 결정 (v1.0)**: Q1=상태변경 없음(approved 유지), Q2=경고만 표시, Q3=알림 없음

---

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | 최초 작성 — fo_submission_approval.md §S-11 기반 | AI |
