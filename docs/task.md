# ✅ 예산 배분 드릴다운 엔진 — 배포 완료

**커밋**: `67a8d04` feat: 예산 배분 통합 드릴다운 엔진 구현

## 완료된 작업

- [x] Step 0: pre_dev 체크
- [x] Step 1: PRD 생성 (`docs/PRD/budget_distribution_drilldown.md`)
- [x] Step 2-A: `bo_allocation.js` 탭 구조 변경 (3탭, _ddLevel/_ddAbId/_ddOrgId)
- [x] Step 2-B: `bo_alloc_drilldown.js` 신규 파일 생성 ✅
  - renderInitialAlloc() — renderAllocEntry() 래핑
  - renderBudgetDistribution() — _ddLevel 분기
  - _renderDDLevel0() — 계정→교육조직 배분 그리드 + 워터폴 잔액바
  - _renderDDLevel1() — 교육조직→팀 배분 그리드
  - calcDDRemain() — 실시간 워터폴 계산
  - _showDistConfirmModal() — 이관 확정 모달
  - _submitDDDist() — Supabase upsert + 인메모리 동기화
  - _showRecallModal() / _submitDDRecall() — 회수 기능
  - ddNavTo() / ddSelectAccount() — 브레드크럼 내비게이션
- [x] Step 3: `backoffice.html` script 태그 추가
- [x] Step 4: node --check 문법 검증 통과
- [x] Step 5: git add → commit → push 완료 (SHA: 67a8d04)
