# 🚧 개발 진행 상황 (실시간)

> 이 파일은 개발 중 자동으로 업데이트됩니다.

---

## ✅ UI 연결 마무리 Phase 완료 (2026-04-18 23:43)

| 작업 | 내용 | 커밋 |
|------|------|------|
| **UI-1** | 신청 확인 화면 "저장완료로 보관" 버튼 | `23099bd` |
| **UI-2** | 신청 내역 카드 saved → 상신하기 버튼 | `23099bd` |
| **UI-3** | boPlanReview 토스트 + 알림 기록 | `23099bd` |

---

## 📊 전체 완료 현황 (20개 기능)

| Phase | 작업 수 | 커밋 |
|-------|---------|------|
| Core | 8개 | `7c22246` |
| Enhancement | 3개 | `10c1e34` |
| Polish | 3개 | `7a40d7d` |
| Next | 3개 | `a083a94` |
| UI 연결 | 3개 | `23099bd` |
| **합계** | **20개** | |

---

## 🔁 완성된 전체 흐름 요약

### FO 팀원 흐름
```
계획 작성 → saved 저장 → [직접 상신 or 팀장 대표 상신]
신청 작성 → 저장완료로 보관 or 확정 제출
결재함: 이력 타임라인 + 회수 버튼
```

### BO 처리 흐름
```
saved/pending → 1차검토(boPlanReview) → in_review [운영담당자]
  in_review → 최종승인(boPlanApprove) → approved [총괄담당자]
  in_review → 반려(boPlanReject) → rejected [총괄담당자]
```

### 알림 + 토스트
- 1차검토: 🔵 토스트 + approval_history 기록
- 승인: 🟢 토스트 + history 기록
- 반려: 🔴 토스트 + history 기록

---

## ✅ 시스템 완성도

핵심 라이프사이클 플로우 **완전 구현** 완료

## 2026-04-19 REFACTOR-1 — 대형 JS 모듈 분리 완료

| 원본 파일 | 분리 모듈 | 크기 절감 |
|-----------|----------|----------|
| o_budget_master.js (154KB, 3149줄) | o_budget_account_mgmt.js + o_budget_policy_mgmt.js + o_budget_org_mgmt.js | 각 52KB 수준 |
| o_form_builder.js (151KB, 3344줄) | o_fb_core.js + o_fb_library.js + o_fb_editor.js | 25/42/80KB |

- 기존 원본 파일은 호환성을 위해 보존 (backoffice.html에서만 분리 모듈로 교체)

## 2026-04-19 REFACTOR-3 — bo_data.js / bo_virtual_org_unified.js 분리 완료
| 원본 파일 | 분리 모듈 | 크기 |
|-----------|----------|------|
| bo_data.js (132KB, 4432줄) | bo_data_core.js + bo_data_vorg_templates.js + bo_data_mock.js | 44 / 24 / 60KB |
| bo_virtual_org_unified.js (127KB, 2772줄) | bo_vorg_render.js + bo_vorg_actions.js | 42 / 83KB |

## 2026-04-19 S-12 + P11 완료
- S-12: bo_approval.js에 boRoleModeBadge / boGetApproveAction 연동 완료
- P11: 운영담당자 전용 1차 검토 섹션 + boPlanOpReview 함수 구현
- REFACTOR-2: apply.js(142KB)→3분리, plans.js(141KB)→3분리 완료
- backoffice.html 한글 인코딩 전체 수정 완료

## 다음 우선 개발 로드맵
1. P12: 신청 관리 목록에서 운영담당자 1차검토 UI 추가 (bo_approval.js 신청 파트)
2. REFACTOR-4: prd_data.js (384KB) 분리
3. S-13: FO 상신 후 BO 알림 토스트 (Realtime 연동)

## 2026-04-19 P12 + REFACTOR-4 완료
- P12: bo_approval.js에 문서타입 필터탭(전체/교육계획/신청/결과) 추가 + _boApprovalDocFilter 상태 변수
- REFACTOR-4: prd_data.js(384KB) → prd_data_part1(123KB)+part2(164KB)+part3(98KB) 3분할
  - PRD_DATA_1/2/3 배열로 분리. part3에서 통합 PRD_DATA = [...1,...2,...3] 생성
  - 기존 코드 참조 호환 유지
- pre_dev_check.js Windows PowerShell 출력 깨짐 완전 수정(ASCII 전용)
