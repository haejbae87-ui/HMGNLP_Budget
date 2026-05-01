# 🚧 예산 배분 드릴다운 엔진 — 실시간 진행 상황판

## ⏳ 현재 진행 중: Step 2-B bo_alloc_drilldown.js 생성

- [x] Step 0: pre_dev 체크 완료 (bo_allocation.js 94KB, 신규파일 생성)
- [x] Step 1: PRD 확인 완료
- [x] Step 2-A: bo_allocation.js 탭 구조 변경 완료
- [⏳] Step 2-B: **bo_alloc_drilldown.js 신규 파일 생성 중... 🛠️**
- [ ] Step 3: backoffice.html script 태그 추가
- [ ] Step 4: CSS 추가 (워터폴 바, 모달)
- [ ] Step 5: node --check 검증
- [ ] Step 6: git add → commit → push
- [ ] Step 7: nav_verify 브라우저 테스트

## 📐 구현 함수 목록
- renderInitialAlloc() — renderAllocEntry() 래핑
- renderBudgetDistribution() — _ddLevel 분기
- _renderDDLevel0() — 계정→교육조직 배분 그리드
- _renderDDLevel1() — 교육조직→팀 배분 그리드
- calcDDRemain() — 워터폴 잔액 실시간
- _showDistConfirmModal() — 확정 모달
- _submitDDDist() — DB 저장
- _showRecallModal() — 회수 모달
- ddNavTo() / ddSelectAccount() — 내비게이션
