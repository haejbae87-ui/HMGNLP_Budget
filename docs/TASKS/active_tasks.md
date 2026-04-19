# 📋 HMGNLP_Budget — 작업 현황 (active_tasks.md)

> 최종 갱신: 2026-04-19

---

## ✅ 완료된 작업 이력

### 2026-04-19 세션 (PRD #13 / PRD #14 최종 검증)

- [x] **PRD #14 — DB 마이그레이션 완료**: `calc_grounds` 테이블에 `usage_type`, `has_rounds`, `has_qty2`, `is_overseas` 컬럼 추가, 직접학습용 기본 마스터 데이터(CG-SL-001~005) 이식
- [x] **PRD #14 — FO 아키텍처 정규화**: 하드코딩된 산출근거 로직 → DB 기반 `bo_calc_grounds.js` 컨트롤러 호출 방식 전환
- [x] **PRD #13 — fo_realtime.js 구현 확인**: FO Realtime 구독 (227줄) + `frontoffice.html` 포함 확인
- [x] **PRD #13 — bo_allocation.js DB 연동 확인**: `submitBulkDist()` → `budget_allocations` DB UPSERT (L1100~) 완료
- [x] **bo_fb_core.js 복원**: `renderFormBuilderMenu` 함수 본문 복원 (교육양식 마법사 메뉴 진입 버그 수정)
- [x] **bo_fb_library.js 수정**: 파일 로드 시점 dangling 코드 제거 (JS 에러 해결)
- [x] **전체 백로그 재점검**: CRITICAL 항목(F-008~F-010 인라인 편집, P16 역할뷰, P10 실사용액 집계) 모두 기구현 확인
- [x] **git push 배포**: 로컬 ↔ origin/main `ba58c57` 커밋 동기화 확인

---

### 2026-04-19 세션 2 (P16 역할 기반 뷰 모드 구현)

- [x] **P16 bo_role_view.js 전면 재작성 (F-150~F-156)**
  - `boGetRoleClass()`, `boIsGlobalAdmin()`, `boIsOpManager()` — 역할 판별 유틸
  - `boGetMyOrgIds()`, `boApplyOrgScopeFilter()`, `boFilterPlansByScope()` — 관할 데이터 스코핑
  - `boCanEditAllocation()`, `boCanRebalanceInScope()`, `boCanSimulate()` — 기능 권한 분기
  - `boRoleModeBadge()`, `boOpScopeBanner()` — 역할 뱃지 & 관할 배너 UI
  - `boRenderOpDashboard()` — 운영담당자 전용 KPI 대시보드 위젯
  - `boRenderRoleActionButtons()`, `boRoleApprove()`, `boRoleReject()` — 역할별 승인/반려 액션
- [x] **P16 bo_budget_demand.js 역할뷰 적용 (F-150, F-152)**
  - 운영담당자: 시뮬레이션 버튼 숨김 → "1차 검토 모드" 안내로 대체
  - 역할 뱃지 + 관할 배너 헤더 표시
- [x] **P16 bo_budget_history.js 역할뷰 적용 (F-150, F-155)**
  - 운영담당자: 단일 관할 그룹 자동 필터 초기화
  - 역할 뱃지 + 관할 배너 헤더 표시
- [x] **P16 bo_plan_mgmt.js 역할뷰 통합 (F-150, F-154)**
  - 레거시 `isGlobalAdmin/isOpManager` → `boIsGlobalAdmin/boIsOpManager` 교체
  - 운영담당자 `boFilterPlansByScope()` 관할 데이터 스코핑 적용
  - 화면 헤더에 `boOpScopeBanner()` 관할 배너 삽입
- [x] **P16 bo_allocation.js 역할뷰 통합 (F-151)**
  - `renderBoAllocation`, `showAllocTabByIdx` 두 곳 레거시 → 신규 함수 교체
- [x] **GitHub Actions sync-docs.yml 수정**: `docs/TASKS/` 보존 로직 추가
- [x] **auto_deploy SKILL.md 개선**: sync 커밋 SHA 불일치 대처 가이드 추가

---

## 🔄 진행 중 / 다음 작업

| 우선순위 | 항목 | 파일 | 상태 |
|---------|------|------|:---:|
| 🟠 HIGH | **P16 bo_plan_mgmt.js 역할뷰 검증** | `bo_plan_mgmt.js` | 🔄 검토 필요 |
| 🟠 HIGH | **P16 bo_allocation.js 역할뷰 검증** | `bo_allocation.js` | 🔄 검토 필요 |
| 🟠 HIGH | P8 조직개편 이관 UI | `bo_org_transfer.js` (신규) | ⏳ 미착수 |
| 🟠 HIGH | P11~P15 수요예측 묶음 상신 | 다수 파일 | ⏳ 미착수 |
| 🟠 HIGH | P7 통장 간 이관 잔액 검증 | `bo_budget_transfer.js` | ⏳ 미착수 |
| 🟡 MED | PRD #21 FO 결재라인 3단계 이상 지원 | `approval.js` | ⏳ 미착수 |

---

## 📊 전체 PRD 구현 상태 요약

| PRD | 제목 | 상태 |
|-----|------|:---:|
| PRD #1~12 | 기초 아키텍처, 페르소나, 폼빌더, 정책 등 | ✅ 완료 |
| PRD #13 | BO↔FO 예산 배정 실시간 동기 | ✅ 완료 |
| PRD #14 | 산출근거 UX 개선 + DB 정규화 | ✅ 완료 |
| PRD #15 (P1~P7, P10, **P16**) | 예산 라이프사이클 고도화 | ✅ 완료 |
| PRD #15 (P8, P9, P11~P15) | 조직이관, 6단계 레포트, 묶음 상신 | 🔴 미구현 |
| PRD #16~21 | 배정-신청 분석, 양식 간소화 등 | 🔴 미구현 |
