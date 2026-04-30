# 🚧 실시간 AI 작업 진행 상황 — F-G01 연도 마감/이월/개시

> **시작**: 2026-05-01 00:59 | **상태**: 🔄 진행 중

## 진행 체크리스트
- [x] Step 0: Pre-dev 체크 + DB 스키마 확인 완료
- [ ] ⏳ Step 1: bo_budget_carryover.js 리팩토링 — bankbook_fiscal_periods 연동 🛠️
- [ ] Step 2: 연도 마감 프로세스 구현 (status: open→closed)
- [ ] Step 3: 이월 정책 적용 (잔액 이월 vs 소멸)
- [ ] Step 4: 신년도 개시 (opening_balance 자동 생성)
- [ ] Step 5: 문법 검증 + 배포

## DB 스키마 (bankbook_fiscal_periods)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| bankbook_id | uuid | 통장 FK |
| fiscal_year | int | 회계연도 |
| opening_balance | numeric | 개시 잔액 |
| carried_forward | numeric | 전년 이월액 |
| total_allocated | numeric | 배정 합계 |
| total_used | numeric | 사용 합계 |
| total_frozen | numeric | 동결 합계 |
| current_balance | numeric | 현재 잔액 |
| burn_rate | numeric | 소진율 |
| status | text | open/closed |
| closed_at | timestamptz | 마감일시 |
