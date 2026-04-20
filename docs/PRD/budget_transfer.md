# 팀 간 예산 이관 요구사항 정의서 (PRD)

> **도메인**: Back Office — 예산 배분 & 이관
> **관련 파일**: `bo_allocation.js` (주), `bo_budget_master.js` (VOrg 이관)
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: 🟡 구현 갭 있음 (이관 UI 존재, bankbooks 테이블 미연동 + 이력 DB 미저장)

---

## 1. 기능 개요

BO 담당자가 동일 예산계정 내에서 A팀의 배분 잔액을 B팀으로 이동시키는 **예산 이관** 기능.
계정 오너 또는 교육조직 담당자(VOrg Manager)가 사용하며,
이관 처리 후 `bankbooks` 테이블(현행 구조)에 자동으로 반영되어야 한다.

---

## 2. 사용자 스토리

> "계정 오너 또는 교육조직 담당자는 예산 배분 화면에서 동일 계정 내 A팀 → B팀으로 잔여 배분액을 이관하고, 이관 사유를 기록할 수 있다."

---

## 3. 상세 기능 요구사항

| 번호 | 기능 | 현재 상태 | 비고 |
|------|------|----------|------|
| F-001 | 이관 대상 계정 선택 | ✅ 구현 | `tr-ab` 셀렉트 |
| F-002 | From/To 팀 선택 (드롭다운) | ✅ 구현 | `updateTrTeams()` |
| F-003 | 이관 금액 입력 + 잔액 초과 방지 | ✅ 구현 | `submitTransfer()` |
| F-004 | 이관 사유 필수 입력 | ✅ 구현 | `tr-reason` textarea |
| F-005 | **bankbooks 테이블 연동** | ❌ 미구현 | 현행 구조 미반영 (레거시 org_budget_bankbooks 사용) |
| F-006 | **이관 이력 budget_adjust_logs 저장** | ❌ 미구현 | DB 이력 없음 |
| F-007 | 이관 후 인메모리 동기화 | ✅ 구현 | TEAM_DIST 갱신 |
| F-008 | VOrg Manager 관할 팀 내 이관만 허용 | ✅ 구현 | `_trVmTeamNames` 필터 |

---

## 4. DB/데이터 구조

### 현행 테이블 (신규 구조)
```
bankbooks
  ├── id, tenant_id, account_code, org_name, user_id (null=팀 통장)
  ├── initial_amount, current_balance, used_amount, frozen_amount
  └── status ('active')

budget_adjust_logs
  ├── id, tenant_id, plan_id, submission_id
  ├── before_amount, after_amount
  ├── adjusted_by, adjusted_at, reason
  └── from_bankbook_id, to_bankbook_id (이관 추적용)
```

### 레거시 테이블 (구버전)
```
org_budget_bankbooks → budget_allocations (현재 submitTransfer가 사용)
```

---

## 5. 비즈니스 로직

### 이관 처리 순서 (신규)
```
1. bankbooks 조회 (tenant_id + account_code + status='active')
   - org_name 기반으로 From/To 팀 통장 매핑
2. From bankbook: current_balance -= 이관금액
3. To bankbook: current_balance += 이관금액
4. budget_adjust_logs 삽입 (reason, from_bankbook_id, to_bankbook_id)
5. 인메모리 TEAM_DIST 갱신 (화면 리렌더)
```

### 잔액 초과 방지
- `from.current_balance >= 이관금액` 검증
- 미충족 시 alert + return

---

## 6. 접근 권한

| 역할 | 이관 가능 범위 |
|------|:------------:|
| 계정 오너 (ownedAccounts) | 계정 내 전체 팀 간 |
| VOrg 담당자 (isVorgManager) | 관할 VOrg 소속 팀 간만 |
| 기타 | ❌ 불가 |

---

## 7. 예외 처리

| 케이스 | 처리 |
|--------|------|
| From=To 동일 팀 선택 | alert + 차단 |
| 잔액 부족 | alert + 차단 |
| bankbooks 미매칭 | 경고 후 인메모리만 갱신 (비치명적) |
| DB 오류 | 인메모리 폴백 + 콘솔 경고 |

---

## 8. [기획자 검토 필요 항목]

- **Q-P8a**: 계정 간 이관 (A계정 → B계정)도 지원할지?
  > **현재 결정**: 동일 계정 내 팀 간 이관만 지원 (교차 계정 이관 제외)
- **Q-P8b**: 이관 후 FO 팀장에게 알림 필요?
  > **현재 결정**: 알림 없음 (향후 필요시 추가)

---

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | 최초 작성 — 기존 구현 갭 분석 (bankbooks 미연동 확인) | AI |
