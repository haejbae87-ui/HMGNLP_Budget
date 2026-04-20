# 양식 필드 카탈로그 v2 PRD

> **최초 작성**: 2026-04-20
> **상태**: 기획 확정 대기
> **관련 PRD**: field_standardization.md, form_simplification.md, calc_grounds_ux_redesign.md
> **변경 사유**: 기존 52개 필드를 비판적 검토 후 재표준화

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **비용은 세부산출근거로 100% 위임** | 개별 비용 필드(교육비, 참가비, 강사료 등) 전량 삭제 |
| **첨부는 단일 필드 + 안내문구** | 목적별 첨부(강사이력서, 수료증 등) 분리 금지 |
| **DnD 제거 → ON/OFF 토글** | 카테고리 순서 고정, 필드별 켜기/끄기만 허용 |
| **DB 기반 선택지** | 교육기관/장소는 DB에서 로드, 없으면 key-in |
| **선행/후행 관계 엄격 적용** | 조건 필드 활성화 시 종속 필드 자동 표시 |

---

## 2. 전체 필드 목록 (24개)

### 그룹 1: 기본정보 (5개)

| # | 필드명 | canonicalKey | 타입 | 필수 | 설명 |
|:-:|--------|-------------|------|:---:|------|
| 01 | 과정명 | `course_name` | text | ✅ | 교육과정/행사명 |
| 02 | 교육장소 | `edu_venue` | venue-selector | ✅ | 사내/사외 선택 → DB 조회 (아래 상세) |
| 03 | 교육기간 | `edu_period` | daterange | ✅ | 시작일~종료일 |
| 04 | 교육목적 | `learning_objective` | textarea | ✅ | 교육목표 + 기대효과 통합 |
| 05 | 교육내용 | `course_description` | textarea | — | 교육 세부 내용 및 커리큘럼 |

#### 02. `edu_venue` 상세 설계

```
[사내/사외 선택] ──→ 사내 ──→ DB 교육장소 목록 (캠퍼스 등) 드롭다운
                 └──→ 사외 ──→ DB 교육기관 목록 드롭다운
                              └──→ 목록에 없음 → key-in 직접입력
```

**BO 연동 (추후 개발):**
- 백오피스 `교육장소 관리` 메뉴에서 사내 캠퍼스/교육장 CRUD
- 세부산출근거에서 사내 교육장소별 단가 설정 연동
  - 예: "울산캠퍼스" → 대관비 단가 50만원/일 자동 적용

**DB 테이블:**
```sql
-- edu_venues (교육장소 마스터)
id, tenant_id, venue_type ('internal'|'external'),
name, address, capacity, daily_rate, active, sort_order
```

> ⚠️ **삭제**: 기존 `교육기관(edu_institution)` + `장소(location)` + `교육장소(edu_venue select)` 3개 → 이 1개로 통합

---

### 그룹 2: 교육 속성 (4개)

| # | 필드명 | canonicalKey | 타입 | 필수 | 선행조건 |
|:-:|--------|-------------|------|:---:|--------|
| 06 | 교육형태 | `education_format` | select | — | — |
| 07 | 해외교육 여부 | `is_overseas` | boolean | — | — |
| 08 | 해외교육 국가 | `overseas_country` | text | — | `is_overseas = true` |
| 09 | 숙박 여부 | `has_accommodation` | boolean | — | — |
| 10 | 고용보험 환급 여부 | `is_ei_eligible` | boolean | — | — |
| 11 | 고용보험 환급예상액 | `ei_refund_amount` | number | — | `is_ei_eligible = true` |

**`education_format` 선택값:** 온라인 / 오프라인
> 이러닝/집합/세미나 등 세부 유형은 FO 입력폼 진입 전에 이미 선택 완료.
> 이 필드는 단순 온/오프라인 구분만 담당.

**`is_overseas` 연동:**
- true → `overseas_country` 자동 표시 + 필수화
- true → calc_grounds 에서 해외 전용 항목(출장비, 항공료) 자동 표시

**`has_accommodation` 연동:**
- true → calc_grounds 에서 숙박비 항목 자동 표시

**`is_ei_eligible` 연동:**
- true → `ei_refund_amount` 자동 표시
- ⚠️ 환급예상액은 **예산 지출이 아니라 교육기관에서 돌려받을 금액**
- calc_grounds(비용 산출)와는 별도 관리

> ⚠️ **삭제**: `필수교육구분(requirement_type)` — 당분간 제외

---

### 그룹 3: 운영 규모 (4개) — 직접학습 + 운영형 공통

| # | 필드명 | canonicalKey | 타입 | 필수 | 비고 |
|:-:|--------|-------------|------|:---:|------|
| 12 | 교육시간(H) | `planned_hours` | number | — | 직접학습: 총 시간 / 운영형: 차수별 시간 |
| 13 | 교육일수 | `planned_days` | text | — | "2박3일" 형식 또는 숫자 |
| 14 | 교육차수 | `planned_rounds` | number | — | 운영형 주로 사용, 직접학습은 1 고정 가능 |
| 15 | 교육인원 | `planned_headcount` | headcount-or-search | — | 아래 상세 |

#### 13. `planned_headcount` 상세 설계

```
[인원 입력 모드 선택]
  ├── 예상인원 입력 (숫자) ← 운영형: 대상자 불명확할 때
  └── 대상자 검색 입력 (user-search) ← 직접학습: 명확한 대상자
```

- 운영형(교육운영): 예상인원 숫자 입력이 기본
- 직접학습(개인직무): 사용자 검색으로 참여자 직접 지정
- 두 모드 전환 가능 (토글 or 자동 판별)

> ⚠️ **삭제**: `수강인원(attendee_count)`, `정원(capacity)`, `예상인원(expected_headcount)` 전량 통합
> ⚠️ **변경**: "운영형만" → 직접학습도 교육시간/일수 입력 필요

---

### 그룹 4: 참가자/담당자 (3개)

| # | 필드명 | canonicalKey | 타입 | 필수 | 비고 |
|:-:|--------|-------------|------|:---:|------|
| 16 | 교육담당자 | `person_in_charge` | user-search | — | 아래 상세 |
| 17 | 참여자명단 | `participant_list` | user-search | — | 교육 참여 대상자 검색/등록 |
| 18 | 강사정보 | `instructor_info` | user-search | — | 내부/외부 강사 정보 |

#### 16. `person_in_charge` 상세 설계

- **기본값**: FO에서 양식을 작성하는 로그인 사용자 (작성자 = 담당자)
- **변경**: 작성자와 실제 담당자가 다를 경우, 사용자 검색으로 다른 사람 선택
- **결과**: 작성자(`created_by`)와 담당자(`person_in_charge`)가 분리 관리됨
- **용도**: 결재 시 담당자 기준으로 결재라인 결정, 알림 발송 대상

> 그룹 3의 `교육인원`이 user-search 모드일 때 참여자명단 필드와 연동 가능

---

### 그룹 5: 비용 (1개)

| # | 필드명 | canonicalKey | 타입 | 필수 | 비고 |
|:-:|--------|-------------|------|:---:|------|
| 19 | 세부산출근거 | `calc_grounds` | calc-grounds | — | 모든 비용 처리의 SSOT |

**조건부 항목 자동 표시:**
```
[항상 표시]     교육참가비, 부가세, 교보재비, 시험응시료, 등록비
[is_overseas]   출장비, 항공료
[has_accommodation] 숙박비
[edu_venue=사내] 대관비 (사내 교육장소 단가 자동 연동)
```

> ⚠️ **삭제**: 예상비용, 교육비, 참가비, 강사료, 대관비, 식대/용차, 실지출액 (7개 전량)

---

### 그룹 6: 첨부 (1개)

| # | 필드명 | canonicalKey | 타입 | 필수 | 비고 |
|:-:|--------|-------------|------|:---:|------|
| 20 | 첨부파일 | `attachment` | file-multi | — | 다중 업로드 + 안내문구 |

**안내문구 설정:**
- 양식 설계 시 BO 관리자가 안내문구를 직접 입력 가능
- 예: "다음 서류를 첨부해 주세요: ① 과정소개서 ② 견적서 ③ 강사이력서"
- FO에서 첨부 영역 상단에 안내문구 읽기전용 표시

**구현:**
```json
{
  "canonicalKey": "attachment",
  "fieldType": "file-multi",
  "config": {
    "guidance_text": "BO에서 입력한 안내문구",
    "max_files": 10,
    "allowed_types": ["pdf", "doc", "docx", "xlsx", "jpg", "png"]
  }
}
```

> ⚠️ **삭제**: 강사이력서, 보안서약서, 영수증, 수료증, 대관확정서, 납품확인서 (6개 전량)

---

### 그룹 7: 결과 (4개) — 교육 완료 후 FO 입력

| # | 필드명 | canonicalKey | 타입 | 필수 | scope |
|:-:|--------|-------------|------|:---:|:-----:|
| 21 | 수료여부 | `is_completed` | boolean | ✅ | front |
| 22 | 실지출액 | `actual_cost` | number | — | front |
| 23 | 업무적용계획 | `work_application_plan` | textarea | — | front |
| 24 | 교육소감 | `review_comment` | textarea | — | front |

> ⚠️ **변경**: `실지출액`을 BO전용 → **FO 결과 단계**로 이동 (교육 종료 후 학습자/운영담당이 입력)
> ⚠️ **삭제**: `수료생명단` (참여자명단 재사용), `학습만족도` (별도 설문 시스템으로 분리 권장)

---

### 그룹 8: BO 전용 (3개)

| # | 필드명 | canonicalKey | 타입 | scope | 비고 |
|:-:|--------|-------------|------|:-----:|------|
| 25 | 검토의견 | `admin_comment` | textarea | back | 검토의견+관리자피드백+관리자비고 통합 |
| 26 | 안내사항 | `announcement` | textarea | provide | BO→FO 공지 (준비물, 확정장소, 확정강사 통합) |
| 27 | ERP코드 | `erp_code` | text | back | ERP 연동 비용 코드 |

> ⚠️ **삭제**: 관리자비고, 관리자피드백, 준비물, 확정교육장소, 확정강사, 합격/수료여부 (6개)
> ⚠️ **삭제**: 시스템 필드 3개 (계획서연결, 예산계정, 과정-차수연결) → 시스템 내부 동작으로 처리

---

## 3. L2 테넌트 전용 필드

> 아래 필드는 공통 카탈로그(L1)에서 제외하고, DB `form_field_catalog` 테이블에서 테넌트별 관리.

### HMC/KIA 전용

| canonicalKey | 필드명 | 타입 | 설명 |
|-------------|--------|------|------|
| `education_target` | 교육대상 (직군선택) | select | **운영형 전용** — 직군별 대상 선택 |
| `settlement_method` | 정산방식 | select | **HMC/KIA 전용** — 인원비율/매출액비율/G코드 |
| `monthly_headcount` | 월별 교육인원 | monthly-grid | **HMC/KIA 전용** — 12개월 그리드 |
| `monthly_budget` | 월별 예상 집행금액 | monthly-grid | **HMC/KIA 전용** — 12개월 그리드 |
| `budget_usage_type` | 예산 사용 구분 | select | H-교육/H-정산/K-교육/K-정산 |
| `participant_breakdown` | 참가자 구분별 인원 | JSONB | 현대/기아/그룹사/협력사/가족/기타 |
| `round_selection` | 차수 정보 선택 | JSONB | 계획에서 미사용 차수만 선택 |
| `sap_expense_code` | 경상예산코드 | text | SAP 전표처리용 |
| `approval_valid_period` | 품의가용기간 | daterange | 개인직무 전용 |

### HMC R&D 전용

| canonicalKey | 필드명 | 타입 | 설명 |
|-------------|--------|------|------|
| `roms_unit_price` | ROMS 결정가격 | number | 업체 용역 단가 |
| `tech_material_type` | 기술자료 유형 | select | DB구독/자료구매 |
| `tech_material_institution` | 기술자료 기관명 | text | 교육유형=기술자료 시 |

### 그룹사별 전용 (변경 없음)

현대오토에버(8), 현대로템(2), 현대위아(1), 현대제철(6), 현대차증권(4), 현대트랜시스(1) — PRD #18 유지

---

## 4. 선행/후행 관계도

```
[07] 해외교육 여부 = true
  ├──→ [08] 해외교육 국가 (활성화 + 필수화)
  └──→ [19] calc_grounds: 출장비, 항공료 항목 자동 표시

[09] 숙박 여부 = true
  └──→ [19] calc_grounds: 숙박비 항목 자동 표시

[10] 고용보험 환급 여부 = true
  └──→ [11] 고용보험 환급예상액 (활성화)

[02] 교육장소 = 사내
  └──→ [19] calc_grounds: 대관비 (해당 장소 단가 자동 적용)

[21] 수료여부 = true
  └──→ [20] 첨부파일: "수료증을 첨부해 주세요" 안내 강조

[19] 세부산출근거 내부 조건 필터:
  ├── is_overseas=true  → 출장비, 항공료
  ├── has_accommodation=true → 숙박비
  ├── edu_venue=사내 → 대관비 (단가 자동)
  └── (항상) → 교육참가비, 부가세, 교보재비, 시험응시료, 등록비
```

---

## 5. ON/OFF 토글 구조

```
[카테고리 고정 순서]  [ON/OFF]  [필수]   비고
────────────────────────────────────────────
▼ 그룹 1: 기본정보
  01 과정명         [■ ON]  [★ 필수]   잠금 — 끌 수 없음
  02 교육장소       [■ ON]  [★ 필수]   잠금 (사내/사외 DB 선택)
  03 교육기간       [■ ON]  [★ 필수]   잠금
  04 교육목적       [■ ON]  [★ 필수]   잠금
  05 교육내용       [□ OFF] [  선택]   관리자 선택

▼ 그룹 2: 교육 속성
  06 교육형태       [□ OFF] [  선택]   온라인/오프라인
  07 해외교육 여부  [□ OFF] [  선택]   → ON 시 08 자동 표시
  08 해외교육 국가  [  ---] [  ---]    07에 종속, 독립 ON/OFF 불가
  09 숙박 여부      [□ OFF] [  선택]
  10 고용보험 환급  [□ OFF] [  선택]   → ON 시 11 자동 표시
  11 환급예상액     [  ---] [  ---]    10에 종속, 독립 ON/OFF 불가

▼ 그룹 3: 운영 규모
  12 교육시간       [□ OFF] [  선택]
  13 교육일수       [□ OFF] [  선택]
  14 교육차수       [□ OFF] [  선택]
  15 교육인원       [□ OFF] [  선택]   모드: 숫자/검색 전환

▼ 그룹 4: 참가자/담당자
  16 교육담당자     [□ OFF] [  선택]   기본=작성자, 변경 가능
  17 참여자명단     [□ OFF] [  선택]
  18 강사정보       [□ OFF] [  선택]

▼ 그룹 5: 비용
  19 세부산출근거   [□ OFF] [  선택]

▼ 그룹 6: 첨부
  20 첨부파일       [□ OFF] [  선택]   안내문구 설정 가능

▼ 그룹 7: 결과 (result 양식 전용)
  21 수료여부       [□ OFF] [  선택]
  22 실지출액       [□ OFF] [  선택]
  23 업무적용계획   [□ OFF] [  선택]
  24 교육소감       [□ OFF] [  선택]

▼ 그룹 8: BO 전용
  25 검토의견       [□ OFF] [  선택]
  26 안내사항       [□ OFF] [  선택]
  27 ERP코드       [□ OFF] [  선택]
```


> **규칙**: 그룹 간 순서 변경 불가 / 그룹 내 순서도 고정 / ON/OFF + 필수 토글만 허용

---

## 6. 기존 → 신규 대사표 요약

### 삭제 (28개)

| 삭제 필드 | 사유 |
|----------|------|
| 교육기관(edu_institution) | → `edu_venue` 통합 |
| 장소(location) | → `edu_venue` 통합 |
| 기대효과(expected_effect) | → `learning_objective` 통합 |
| 교육장소 select(edu_venue) | → 새 `edu_venue` venue-selector로 대체 |
| 필수구분(requirement_type) | 당분간 제외 |
| 고용보험환급(employment_insurance) | → calc_grounds 내부 항목 |
| 예상비용(cost_total) | → calc_grounds |
| 교육비(tuition) | → calc_grounds |
| 참가비(participation_fee) | → calc_grounds |
| 강사료(instructor_fee) | → calc_grounds |
| 대관비(venue_fee) | → calc_grounds |
| 식대/용차(meal_transport) | → calc_grounds |
| 교육대상(target_audience) | → L2 HMC/KIA 운영형 전용 |
| 수강인원(attendee_count) | → `planned_headcount` 통합 |
| 정원(capacity) | → `planned_headcount` 통합 |
| 예상인원(expected_headcount) | → `planned_headcount` 통합 |
| 강사이력서~납품확인서 (6개) | → `attachment` 단일화 |
| 차수별교육시간(session_hours) | → `planned_hours` 통합 |
| 과정시간(course_hours_per_session) | → `planned_hours` 통합 |
| 총차수(total_sessions) | → `planned_rounds` 이름 변경 |
| 수료생명단(completion_list) | → participant_list 재사용 |
| 학습만족도(satisfaction) | 별도 설문 시스템 분리 |
| 교육결과요약(result_summary) | → `review_comment` 통합 |
| 준비물~확정강사 등 provide 4개 | → `announcement` 통합 |
| 관리자비고(admin_note) | → `admin_comment` 통합 |
| 관리자피드백(manager_feedback) | → `admin_comment` 통합 |
| 시스템 필드 3개 | → 시스템 내부 동작화 |

### 신규 추가 (5개)

| 신규 필드 | 사유 |
|----------|------|
| `education_format` | 온라인/오프라인 구분 (PRD #18) |
| `is_overseas` + `overseas_country` | 해외교육 → calc_grounds 연동 (PRD #18) |
| `has_accommodation` | 숙박 → calc_grounds 연동 (PRD #18) |
| `work_application_plan` | 결과 단계 업무적용계획 (PRD #18 R-09) |

---

## 7. 규모 비교

| 구분 | v1 (현재) | v2 (신규) | 변화 |
|------|:-------:|:-------:|:---:|
| L1 공통 필드 | 52개 | **27개** | **-48%** |
| 비용 필드 | 7개 | **1개** (calc_grounds) | -86% |
| 첨부 필드 | 7개 | **1개** (file-multi) | -86% |
| BO/provide 필드 | 9개 | **3개** | -67% |
| L2 테넌트 전용 | 변경 없음 | 변경 없음 | — |

---

## 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | v2 최초 작성 — 52→24개 재표준화. 교육기관+장소 DB통합, 비용 calc_grounds 단일화, 첨부 단일화, DnD→ON/OFF, 교육대상 운영형전용(L2), 정산방식 HMC/KIA전용(L2), 월별그리드 L2 이동, 실지출액 FO결과단계 이동 | AI+사용자 |
| 2026-04-20 | v2.1 — 고용보험 환급 여부+환급예상액 복원(비용 지출이 아닌 교육기관 환급금), 교육담당자(person_in_charge) 필드 추가(작성자≠담당자 분리). 24→27개 | AI+사용자 |
