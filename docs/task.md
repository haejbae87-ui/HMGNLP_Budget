# 🚧 실시간 AI 작업 진행 상황

- [x] Step 1: 예산 배분(Drilldown) 탭 계정 미선택 시 안내 문구 노출 및 시스템 관리자 조회 권한 복구 (완료)
- [x] Step 2: Supabase DB에 `virtual_edu_orgs` 테이블 구조 분석 및 SQL 마이그레이션 확인 (실제 DB는 `virtual_org_templates`로 판명됨)
- [x] Step 3: `supabase_client.js`에서 Fallback 제거 및 실제 테이블(`virtual_org_templates`)과 스키마(`tree_data` 등) 매핑 교체 완료
- [x] Step 4: `bo_alloc_drilldown.js` 및 `bo_allocation.js`에서 Hardcoded 템플릿 탐색 로직(`isRnd`)을 `template_id` 기반 동적 참조 로직으로 전면 교체 완료
- [x] Step 5: `pre_dev` 스킬 검증 및 `docs/TASKS/active_tasks.md` 히스토리 업데이트 완료
- [x] Step 6: 자동 검증 및 푸시 배포 완료 (커밋: `496e84f`) 🎉

---

### 🚑 핫픽스 (2026-05-07)
- [x] **에러 수정 1**: `bo_budget_master.js` 탭 클릭 시 `setbmTab is not defined` 발생하는 이슈 조치 완료 (`window.setbmTab` 전역 함수 등록)
- [x] **에러 수정 2**: `bo_allocation.js` 배포 중 발생했던 괄호 닫기(`}`) SyntaxError 조치 완료 (`renderBoAllocation is not defined` 에러 해결)
- [x] **자동 배포**: 핫픽스 사항 `main` 브랜치에 자동 푸시 진행 중... 🚀
