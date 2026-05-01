# 🚧 실시간 AI 작업 진행 상황

> **작업**: 운영계획 관리 화면 신설 + 메뉴명 변경 + 사업계획→운영계획 연결
> **시작**: 2026-05-01 10:30 | **상태**: 🟡 진행 중

## 진행 현황
- [x] 배포 확인 완료 (GitHub 5504394 = 정상, sync-docs 자동커밋)
- [x] pre_dev 체크 완료 (bo_plan_mgmt.js 130KB REFACTOR 대상 → 신규 파일로 우회)
- [ ] ⏳ Step 1: `bo_layout.js` 메뉴명 변경 (교육계획 관리 → 운영계획 관리) 진행 중 🛠️
- [ ] Step 2: `bo_operation_plan.js` 신규 생성 (VOrg 트리 + 드릴다운 + 운영계획 목록)
- [ ] Step 3: `backoffice.html` 스크립트 태그 추가
- [ ] Step 4: `bo_layout.js` 라우팅 연결
- [ ] Step 5: 배포 검증

## 설계 결정
- **신규 파일 전략**: bo_plan_mgmt.js(130KB) 직접 수정 대신 `bo_operation_plan.js` 신규 생성
  → 컨텍스트 절약 + 130KB 파일 순회 회피
- **운영계획 필터**: `plan_type = 'operation' OR 'ongoing'` + `approved` 상태 or 모든 상태
- **사업계획 연결**: `source_forecast_plan_id` 있으면 연결 배지 표시
- **VOrg 드릴다운**: bo_budget_demand.js 동일 패턴 재사용
