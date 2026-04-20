# BO 예산 1차 취합 대시보드 요구사항 정의서 (PRD)

> **도메인**: Back Office — 예산 운영 (취합/집계)
> **관련 파일**: `bo_approval.js`, `bo_plan_mgmt.js`, `bo_budget_consolidation.js` (신규)
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: 🟡 구현 갭 있음 (수요예측 묶음 상신은 완료, 취합 대시보드 미구현)

---

## 1. 기능 개요

운영담당자가 팀별 수요예측(`team_forecast`) 상신 문서들을 선택하여 교육조직 묶음(`org_forecast`)으로 취합하고,
총괄담당자에게 상신하는 **예산 1차 취합 워크플로우**와,
현재 취합 현황을 계정/팀/상태별로 집계하여 보여주는 **취합 대시보드** 기능.

---

## 2. 사용자 스토리

> "운영담당자는 결재함에서 팀 수요예측 문서들을 선택 → 교육조직 묶음으로 취합 상신할 수 있다."
> "총괄담당자는 취합 대시보드에서 전체 예산 신청 현황을 계정/팀별로 한눈에 볼 수 있다."
> "BO 담당자는 수요예측 묶음의 조정 가능/불가능 여부를 확인하고 1차 배정 시뮬레이션을 수행할 수 있다."

---

## 3. 상세 기능 요구사항

### [P13-A] 수요예측 묶음 상신 (운영담당자)
| 번호 | 기능 | 현재 상태 |
|------|------|----------|
| F-001 | team_forecast 카드에 체크박스 표시 | ✅ 구현 |
| F-002 | 선택 건수 플로팅 바 | ✅ 구현 |
| F-003 | 교육조직 묶음 생성 모달 | ✅ 구현 |
| F-004 | org_forecast 상신 문서 생성 + 팀 문서 parent 연결 | ✅ 구현 |
| F-005 | 팀별 1차 조정액 입력 (모달 내) | ❌ 미구현 |

### [P13-B] 예산 취합 대시보드
| 번호 | 기능 | 현재 상태 |
|------|------|----------|
| F-010 | 전체 예산 취합 현황 KPI (총 신청액, 총 조정액, 총 배정액) | ❌ 미구현 |
| F-011 | 계정별 집계 테이블 (신청액 합계, 승인 건수, 진행 건수) | ❌ 미구현 |
| F-012 | 팀별 집계 테이블 (팀명, 신청액, 조정액, 상태) | ❌ 미구현 |
| F-013 | 상태별 필터 (전체/대기/승인/반려) | ❌ 미구현 |
| F-014 | CSV 내보내기 | ❌ 미구현 (향후) |

---

## 4. DB/데이터 구조

### 조회 대상 테이블
```
submission_documents (submission_type IN ['team_forecast', 'org_forecast'])
  ├── submission_items (item_type='plan', item_id → plans.id)
  └── plans (allocated_amount, account_code)

bankbooks (tenant_id, account_code, initial_amount, used_amount, current_balance)
```

### 취합 집계 로직
```
계정별:
  total_requested = SUM(plans.amount) where submission_type IN ['team_forecast']
  total_allocated = SUM(plans.allocated_amount) where status='approved'
  count_pending   = COUNT(*) where status IN ['submitted','in_review']

팀별:
  team_name = doc.submitter_org_name
  amount    = doc.total_adjusted OR doc.total_amount
  status    = doc.status
```

---

## 5. 비즈니스 로직

- 운영담당자는 자신의 관할 조직(managedGroups) 팀 문서만 취합 가능
- 총괄담당자는 전체 테넌트 문서 조회 가능
- org_forecast 생성 시: `status = 'in_review'`, 묶인 team_forecast `parent_submission_id` 설정
- 조정액(`total_adjusted`) ≠ 신청액(`total_amount`) 인 경우 차이 표시

---

## 6. 접근 권한

| 역할 | 취합 상신 | 대시보드 조회 | 팀 필터 |
|------|:--------:|:-----------:|:------:|
| 운영담당자 (boIsOpManager) | ✅ | ✅ | 관할 팀만 |
| 총괄담당자 (boIsGlobalAdmin) | ❌ | ✅ | 전체 |
| 기타 | ❌ | ❌ | - |

---

## 7. 예외 처리

| 케이스 | 처리 |
|--------|------|
| team_forecast 0건인 경우 | "수요예측 상신 데이터 없음" 안내 |
| org_forecast 중복 생성 | 기존 묶음이 있으면 경고 |

---

## 8. [기획자 검토 필요 항목]

- **Q-P13a**: 팀별 1차 조정액 입력은 어느 화면에서? (묶음 모달 내 vs 별도 상세화면)
- **Q-P13b**: 취합 대시보드를 결재함 탭으로 넣을지, 별도 BO 메뉴로 만들지?

> **현재 결정 (v1.0)**: Q-P13a = 묶음 모달에 팀별 조정액 입력 추가 / Q-P13b = 결재함 내 탭(📊 취합현황)으로 구현

---

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | 최초 작성 — 기존 구현 갭 분석 + P13-B 대시보드 정의 | AI |
