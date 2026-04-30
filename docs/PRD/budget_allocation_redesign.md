# 예산 배정 화면 개편 — 요구사항 정의서 (PRD)

> **도메인**: 예산관리 (Budget Allocation Redesign)
> **관련 파일**: `bo_allocation.js`, `bo_budget_account_mgmt.js`, `bo_budget_master.js`, `plans.js`
> **최초 작성**: 2026-04-30
> **최종 갱신**: 2026-04-30
> **상태**: 🟡 구현 중 (Phase 0-A DB 기반)

---

## 1. 기능 개요

예산 배정 및 관리 화면을 전면 개편하여:
1. **3가지 통장 정책**(팀별 분리/상위조직 공유/개인별 분리)에 따른 자동 UI 분기
2. **SAP 연동** 계정과 자체관리 계정의 이중 원장 아키텍처
3. **회계연도 레이어** — 통장 재사용 + 잔액 리셋 + 이월 관리
4. **역할 기반 권한** — 총괄/운영/FO 교육담당자 맞춤 뷰 제공

## 2. 사용자 스토리

> "총괄담당자는 SAP에서 수신된 교육조직 예산을 하위 팀 통장에 배분할 수 있다."
> "운영담당자는 관할 교육조직 내 팀 간 예산을 재배분할 수 있다."
> "FO 교육담당자는 팀 통장 범위 내에서 운영계획별 배정액을 재조정할 수 있다."
> "총괄담당자는 회계연도를 마감하고 이월 대상 건을 관리할 수 있다."

## 3. 상세 기능 요구사항

| 번호 | 기능 | 설명 | 우선순위 | 상태 |
|---|---|---|---|---|
| F-A01 | 회계연도 레이어 DB | `bankbook_fiscal_periods` 테이블 생성 | 🔴 HIGH | ❌ |
| F-A02 | 통장 확장 (교육조직 레벨) | `is_org_level`, `sap_cost_center_id` 추가 | 🔴 HIGH | ❌ |
| F-A03 | SAP 인터페이스 로그 | `sap_budget_interface_log` 테이블 생성 | 🔴 HIGH | ❌ |
| F-B01 | 기초·추가 배정 이동 | 예산계정 마스터 화면으로 이동 (배정 화면에서 제거) | 🔴 HIGH | ❌ |
| F-C01 | 대시보드 SAP/자체 분기 | 연동 방식별 UI 자동 전환 | 🔴 HIGH | ❌ |
| F-C02 | 소진율 트렌드 차트 | Burn Rate 월별 추이 시각화 | 🟡 MED | ❌ |
| F-D01 | isolated 팀 배분 | 교육조직→팀별 배분 그리드 | 🔴 HIGH | ❌ |
| F-D02 | shared 안내 | 공유 통장 배분 불필요 안내 | 🟡 MED | ❌ |
| F-D03 | individual 한도 설정 | 개인별 한도 일괄 설정 UI | 🟡 MED | ❌ |
| F-E01 | 이관 정책별 제약 | 통장 정책별 이관 가능/불가 분기 | 🟡 MED | ❌ |
| F-F01 | FO 운영계획 재배분 | 통장 정책별 재배분 UX | 🔴 HIGH | ❌ |
| F-G01 | 연도 마감/이월/개시 | 회계연도 전환 프로세스 UI | 🟡 MED | ❌ |

## 4. DB/데이터 구조

### 4.1 bankbook_fiscal_periods (신규)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID PK | |
| bankbook_id | UUID FK | org_budget_bankbooks.id |
| fiscal_year | INTEGER | 회계연도 |
| opening_balance | NUMERIC | 기초 잔액 (이월+배정) |
| carried_forward | NUMERIC | 전기 이월액 |
| total_allocated | NUMERIC | 누적 배정 |
| total_distributed | NUMERIC | 하위 배분 합계 |
| total_used | NUMERIC | 실사용 확정 |
| total_frozen | NUMERIC | 현재 Hold |
| current_balance | NUMERIC | 현재 잔액 |
| burn_rate | NUMERIC | 소진율(%) 캐시 |
| status | TEXT | active/settling/closed |
| UNIQUE | | (bankbook_id, fiscal_year) |

### 4.2 org_budget_bankbooks 확장
| 추가 컬럼 | 타입 | 설명 |
|---|---|---|
| is_org_level | BOOLEAN | 교육조직 레벨 통장 여부 |
| sap_cost_center_id | TEXT | SAP Cost Center 매핑 코드 |
| sap_sync_status | TEXT | synced/pending/error |

### 4.3 sap_budget_interface_log (신규)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID PK | |
| tenant_id | TEXT | 테넌트 |
| account_id | TEXT | 예산 계정 |
| sap_cost_center_id | TEXT | SAP Cost Center |
| org_bankbook_id | UUID FK | 교육조직 통장 |
| fiscal_year | INTEGER | 회계연도 |
| interface_type | TEXT | initial/additional/reduction/settlement |
| direction | TEXT | inbound/outbound |
| amount | NUMERIC | 금액 (양수=입금, 음수=삭감) |
| cost_type | TEXT | OPEX/CAPEX (예비) |
| sap_doc_number | TEXT | SAP 전표 번호 |
| status | TEXT | received/processed/rejected |

## 5. 비즈니스 로직

### 5.1 통장 정책별 UI 분기
- 계정 선택 시 `budget_account_org_policy.bankbook_mode` 조회
- `isolated` → 교육조직→팀 배분 그리드
- `shared` → 교육조직 단위 배분만 (팀 UI 숨김)
- `individual` → 개인 한도 일괄 설정

### 5.2 SAP/자체 분기
- `budget_accounts.integration_mode` 확인
- `sap` → 기초/추가 배정 숨김, SAP 동기화 버튼 표시
- `self` → 기초/추가 배정 노출

### 5.3 소진율 계산
```
burn_rate = (total_used + total_frozen) / total_allocated * 100
예상_연말_소진 = (burn_rate / 경과_월수) * 12
```

## 6. 접근 권한

| 역할 | 기초배정 | SAP동기화 | 팀배분 | 이관 | 연도마감 | 소진율 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 플랫폼관리자 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅전체 |
| 총괄담당자 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅전체 |
| 운영담당자 | ❌ | ❌ | 관할재배분 | 관할내 | ❌ | 관할 |
| FO교육담당자 | ❌ | ❌ | ❌ | ❌ | ❌ | 내통장 |

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|---|---|
| SAP 수신액 삭감 시 이미 배분 완료 | Delta 계산 + 미배분 잔액 우선 조정 + 부족 시 관리자 알림 |
| 연도 마감 시 submitted 건 존재 | 강제 회수 or 관리자 처리 안내 |
| shared 모드에서 팀 배분 시도 | UI 차단 + 안내 메시지 |
| individual에서 개인 간 이관 시도 | 차단 + "개인 간 이관은 불가합니다" 안내 |
| 연동 방식 변경 (SAP↔자체) | 회계연도 중 변경 금지 (연도 전환 시에만) |

## 8. 변경 이력

| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-30 | 최초 작성 — v3 설계안 기반 | AI |
