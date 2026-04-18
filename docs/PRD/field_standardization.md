# 교육양식 필드 표준화 정의서 (Field Standardization)

> **최초 작성**: 2026-04-18
> **최종 갱신**: 2026-04-18
> **상태**: ✅ 1차 통합 완료 — 그룹사 이캠퍼스 + 러닝라운지(현대자동차/기아) 반영
> **AS-IS 소스**: 그룹사 이캠퍼스 (현대자동차 계열사), 러닝라운지 (현대자동차 연구직, 현대자동차/기아 일반직)

---

## 1. 라이프사이클 단계 정의

> 현대자동차/기아의 교육운영 프로세스 반영으로, 기존 3단계에서 **4단계**로 확장됨.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  계획     │ ──→ │  신청     │ ──→ │  수행     │ ──→ │  결과     │
│ (Plan)   │     │ (Apply)  │     │ (실행중) │     │ (Result) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                                  │
     │                │    ┌──────────────────────┐      │
     └────────────────└──→ │  관리 (Provide/Admin) │ ←───┘
                           └──────────────────────┘
```

| 단계 | 코드 | 입력 주체 | 시점 | 해당 양식 |
|------|------|---------|------|---------|
| **계획** | `plan` | FO 운영담당 / BO | 수요예측 시 — 교육계획 작성 | 교육운영 계획 |
| **신청** | `apply` | FO 학습자 / 운영담당 | 교육 전 — 신청서 작성 | 개인직무 신청, 교육운영 신청 |
| **결과** | `result` | FO 학습자 | 교육 후 — 결과 등록 | 공통 |
| **관리** | `provide` | BO 담당자 | 전 과정 — 검토/지급/코멘트 | 공통 |

> **🆕 변경**: 현대자/기아 교육운영은 **수요예측용 계획 → 교육 신청** 2단계 흐름이 명확하게 분리됨.
> 계열사 이캠퍼스는 계획과 신청이 단일 양식으로 통합되어 있어 Plan 단계가 없었음.

### 1.1 DB 테이블 매핑 가이드

> ⚠️ **핵심 원칙**: 각 라이프사이클 단계는 **별도 DB 테이블**에 대응합니다.
> 아래 문서에서 Plan/Apply/Result 단계별로 필드를 구분하는 것은
> **"이 필드가 어느 테이블의 컬럼인가"**를 명시하기 위한 것이지,
> 같은 필드를 여러 테이블에 이중으로 만들겠다는 뜻이 아닙니다.

```
DB 테이블                 라이프사이클 단계              저장 내용
──────────               ──────────────              ──────────
plans                    계획 (Plan)                  수요예측/상시 교육계획 데이터
applications             신청 (Apply)                 개인직무 신청 / 교육운영 신청 데이터
edu_results              결과 (Result)                교육 후 실비용, 수료정보, 결과보고서
(plans/applications)     관리 (Provide)               BO 담당자가 기존 레코드에 추가 기입
```

**공유 필드(course_name, start_date 등)가 plans와 applications에 각각 존재하는 이유:**
- 계획 건과 신청 건은 **서로 다른 레코드**이므로 각 테이블에 1개씩 있는 것은 이중 컬럼이 아니라 **자연스러운 정규화**
- 교육운영의 경우: `applications.plan_id → plans.id`로 연결하며, 신청 시 계획 데이터를 복사/참조
- 개인직무의 경우: 계획 없이 `applications` 레코드만 직접 생성

**결과(Result) 단계가 별도 테이블인 이유:**
- 교육 前(신청)과 교육 後(결과)에 입력하는 데이터가 본질적으로 다름
- **신청 시**: 예상 학습시간, 요청 예산, 교육 내용 → `applications` 테이블
- **결과 시**: 실제 이수시간, 실 교육비, 수료증, 증빙서류 → `edu_results` 테이블

| 시점 | 테이블 | 대표 필드 예시 |
|------|--------|-------------|
| 교육 **전** (신청) | `applications` | planned_hours, requested_budget, course_description |
| 교육 **후** (결과) | `edu_results` | actual_hours, actual_cost, is_completed, completion_cert, expense_receipt |
| 관리자 검토 | `applications` / `plans` | admin_comment, payment_completed (기존 레코드에 추가 기입) |

---

## 2. 공통 필드 표준화

> 중복·유사 필드를 통합하고 canonical_key(영문 snake_case)를 부여합니다.
> 현대자/기아 반영으로 공통 필드가 대폭 확장되었습니다.

### 2.1 계획 단계 (Plan) — 🆕 16개

> 교육운영 계획(수요예측/상시) 작성 시 입력하는 필드.
> 상당수가 신청(Apply) 단계 필드와 공유됩니다.

| # | 표준명 | canonical_key | 타입 | 필수 | 설명 | 원본 필드 | Apply 공유 |
|---|--------|-------------|------|:---:|------|----------|:---:|
| PL-01 | 교육과정명 | `course_name` | text | ✅ | 운영할 교육 과정명 | 교육과정명 | = A-01 |
| PL-02 | 교육기관 | `institution_name` | autocomplete | ❌ | 교육 주관 기관 | 교육기관 | = A-02 |
| PL-03 | 교육목표 | `learning_objective` | textarea | ❌ | 교육을 진행하는 목표 | 교육목표 | = A-04 |
| PL-04 | 기대효과 | `expected_benefit` | textarea | ❌ | 교육으로 기대하는 효과 | 기대효과 | 🆕 |
| PL-05 | 교육시작일 | `start_date` | date | ✅ | 교육 시작 날짜 | 교육기간 | = A-06 |
| PL-06 | 교육종료일 | `end_date` | date | ✅ | 교육 종료 날짜 | 교육기간 | = A-07 |
| PL-07 | 교육일수 | `planned_days` | number | ❌ | 몇 박 몇 일 교육인지 | 교육일수 | 🆕 |
| PL-08 | 차수별 시간 | `hours_per_round` | number | ❌ | 1개 차수 기준 교육 시간 (시) | 과정시간(차수별) | 🆕 |
| PL-09 | 교육차수 | `planned_rounds` | number | ❌ | 몇 차수 교육을 진행할 것인지 | 교육차수 | 🆕 |
| PL-10 | 교육장소 | `venue_detail` | text | ❌ | 시스템에서 관리하는 교육장소 | 교육장소 | = A-11 |
| PL-11 | 교육인원 | `planned_headcount` | number | ✅ | 전체 교육 대상 인원 | 교육인원 | 공유 |
| PL-12 | 교육대상 | `target_audience` | select | ❌ | 누구를 위한 교육인지 (대상군) | 교육대상 | 🆕 |
| PL-13 | 전년도 계속 여부 | `is_continuing` | boolean | ❌ | 이전년도 교육계획 연속 교육 여부 | 이전년도 교육계획 여부 | 공유 |
| PL-14 | 교육내용 | `course_description` | textarea | ❌ | 교육 내용 상세 설명 / 주요 내용 | 주요 내용 | = A-03 |
| PL-15 | 고용보험 환급 여부 | `is_ei_eligible` | boolean | ❌ | 고용보험환급 대상 교육 여부 | 고용보험 환급 여부 | = C-06 |
| PL-16 | 증빙자료 | `supporting_docs` | file[] | ❌ | 증빙자료 업로드 | 증빙자료 | 🆕 |

> **PL-04 `expected_benefit`**: Result 단계의 `work_application_plan`과 구분됨
> — Plan 단계는 **사전 기대 효과**, Result 단계는 **사후 업무적용 계획**

### 2.2 신청 단계 (Apply) — 20개 (기존 17 + 신규 3)

| # | 표준명 | canonical_key | 타입 | 필수 | 설명 | 원본 필드 |
|---|--------|-------------|------|:---:|------|----------|
| A-01 | 과정명 | `course_name` | text | ✅ | 수강할 교육 과정명 / 학습명 | 과정명, 학습명 |
| A-02 | 교육기관명 | `institution_name` | autocomplete | ✅ | 표준화된 기관 DB에서 선택 + 직접입력 가능 | 교육기관명, 주관 |
| A-03 | 교육내용 | `course_description` | textarea(4000) | ✅ | 교육 내용 상세 설명 | 교육내용, 상세학습계획 |
| A-04 | 교육목표 | `learning_objective` | textarea | ❌ | 교육을 통해 달성하려는 목표 / 목적 | 교육목표, 목적 |
| A-05 | 교육신청 사유 | `apply_reason` | textarea | ✅ | 사외교육 신청 사유 | 교육신청 사유 |
| A-06 | 교육시작일 | `start_date` | date | ✅ | 교육 시작 날짜 | 교육시작일시, 교육기간 |
| A-07 | 교육종료일 | `end_date` | date | ✅ | 교육 종료 날짜 | 교육종료일시, 교육기간 |
| A-08 | 학습시간(예정) | `planned_hours` | number | ✅ | 예정 총 학습시간 (시) | 학습시간, 시간 |
| A-09 | 학습기간 | `planned_duration` | text | ❌ | 몇박 몇일인지 (예: "2박3일") | 학습기간, 일 |
| A-10 | 교육지역 | `education_region` | select | ❌ | 교육 장소 지역 (서울, 경기 등) | 교육장소 |
| A-11 | 교육장소 상세 | `venue_detail` | text | ❌ | 구체적 교육 장소 (건물명 등) | 교육장소 상세, 장소, 학습장소 |
| A-12 | 숙박여부 | `has_accommodation` | boolean | ❌ | 숙박/합숙 포함 여부 | 숙박 + 합숙여부 (통합) |
| A-13 | 중식제공여부 | `lunch_provided` | boolean | ❌ | 교육 기관에서 점심 제공 여부 | 중식제공여부 |
| A-14 | 유료교육여부 | `is_paid_education` | boolean | ✅ | 유료 교육 여부 (true일 때만 비용 입력) | 유료교육여부 |
| A-15 | 강사명 | `instructor_name` | text | ❌ | 사외교육 강사 이름 | 강사명 |
| A-16 | 과정소개 자료 | `course_brochure` | file | ❌ | 교육 과정 소개 문서/이미지 첨부 | 과정소개 자료, 첨부파일 |
| A-17 | 학습내용 | `learning_content` | textarea | ❌ | 어떤 것을 배우는지 상세 기술 | 학습내용 |
| **A-18** | **🆕 교육형태** | `education_format` | select | ❌ | 온라인/오프라인 선택 | 교육형태 (HMC R&D) |
| **A-19** | **🆕 해외교육여부** | `is_overseas` | boolean | ❌ | 국내/해외 교육 여부 | 국가 유무 (HMC R&D) |
| **A-20** | **🆕 해외교육 국가** | `overseas_country` | text | ❌ | 해외 교육 시 국가명 (`is_overseas=true`만) | 국가 (HMC R&D) |

> **통합 처리**: `숙박` + `합숙여부` → `has_accommodation` (동일 개념)
> **통합 처리**: `교육내용` ≠ `학습내용` — 전자는 기관 제공 커리큘럼, 후자는 본인이 배울 것. 별도 유지.
> **🆕 A-18**: HMC R&D에서 발견. `edu_type`(집합/이러닝/블렌디드)과 구분 — 단순 온/오프라인 구분
> **🆕 A-19~20**: 4.4절 누락 필드에서 공통 승격. 출장비/항공료 calc_grounds 조건에 필수

### 2.3 비용 단계 (Cost) — 세부산출근거 연동 (확장)

> ⚠️ 아래 필드들은 **독립 폼 필드가 아니라 `calc_grounds` 산출근거 항목으로 관리**합니다.
> 학습자는 세부산출근거 입력 섹션에서 항목 선택 후 금액을 입력합니다.

| # | 표준명 | calc_grounds 항목명 | apply_conditions | 설명 | 원본 필드 |
|---|--------|------------------|-----------------|------|----------|
| C-01 | 교육참가비 | `교육참가비` | `{}` (항상) | 교육비/수강료 | 교육비 |
| C-02 | 부가세 | `부가세` | `{}` (항상) | 교육비 부가세 | 부가세 |
| C-03 | 출장비 | `출장비` | `{"is_overseas": true}` | 해외 교육 시 출장 경비 | 출장비 |
| C-04 | 항공료 | `항공료` | `{"is_overseas": true}` | 해외 교육 시 항공권 | 항공료 |
| C-05 | 숙박비 | `숙박비` | `{"has_accommodation": true}` | 숙박 비용 | 숙박비 |
| **C-11** | **🆕 교보재비** | `교보재비` | `{}` (항상) | 교재, 보조자료 비용 | 교보재비 (HMC/Kia) |
| **C-12** | **🆕 시험응시료** | `시험응시료` | `{}` (항상) | 자격증/시험 응시 비용 | 시험응시료 (HMC/Kia) |
| **C-13** | **🆕 등록비** | `등록비` | `{}` (항상) | 과정 등록/가입 비용 | 등록비 (HMC R&D) |

> **고용보험 환급 처리:**

| # | 표준명 | canonical_key | 타입 | 설명 | 원본 필드 |
|---|--------|-------------|------|------|----------|
| C-06 | 고용보험 해당 여부 | `is_ei_eligible` | boolean | 고용보험환급 대상 교육 여부 | 고용보험 여부 |
| C-07 | 고용보험 환급예상액 | `ei_refund_amount` | number | 환급 예상 금액 | 고용보험 환급액 |

> **결제 관련:**

| # | 표준명 | canonical_key | 타입 | 단계 | 설명 | 원본 필드 |
|---|--------|-------------|------|------|------|----------|
| C-08 | 결제방식 | `payment_method` | select | result | 법카/개인카드/현금 | 결제방식 |
| C-09 | 비용결제일 | `payment_date` | date | result | 결제 처리 날짜 | 비용결제일 |
| C-10 | 실 교육비 | `actual_cost` | number | result | 실제 지출 금액 | 실 교육비 |

### 2.4 결과 단계 (Result) — 12개

| # | 표준명 | canonical_key | 타입 | 필수 | 설명 | 원본 필드 |
|---|--------|-------------|------|:---:|------|----------|
| R-01 | 수료여부 | `is_completed` | boolean | ✅ | 교육 수료 여부 | 수료여부 |
| R-02 | 취득점수 | `score` | number | ❌ | 기관 발급 취득 점수 | 취득점수 |
| R-03 | 이수시간 | `actual_hours` | number | ❌ | 실제 학습 시간 | 이수시간 |
| R-04 | 이수일수 | `actual_days` | number | ❌ | 실제 학습 일수 | 이수일 |
| R-05 | 출석률 | `attendance_rate` | number(%) | ❌ | 출석률 (%) | 출석률 |
| R-06 | 수료증 파일 | `completion_cert` | file | ❌ | 수료증 첨부 | 수료증 파일 |
| R-07 | 증빙서류 파일 | `expense_receipt` | file | ❌ | 비용 증빙 자료 첨부 | 증빙서류 파일 |
| R-08 | 교육소감 | `review_comment` | textarea | ❌ | 교육 후 소감문 | 교육소감 |
| R-09 | 업무적용계획 | `work_application_plan` | textarea | ❌ | 교육 내용을 업무에 어떻게 적용할지 | 기대효과+업무적용계획+업무활용의견 (통합) |
| R-10 | 추천대상 | `recommendation_target` | text | ❌ | 이 교육을 추천하고 싶은 대상 | 추천대상 |
| R-11 | 결과공유여부 | `share_result` | boolean | ❌ | 학습 결과를 사내 공유할지 여부 | 결과공유여부 |
| R-12 | 비고 | `remarks` | textarea | ❌ | 기타 참고 사항 | 비고, 기타 |

> **통합 처리**: `기대효과`(현대엔지니어링) + `업무적용계획`(현대트랜시스) + `업무활용의견`(현대차증권) → `work_application_plan`

### 2.5 별점 평가 (Rating) — 4개 표준 + 3개 옵션

| # | 표준명 | canonical_key | 표준? | 설명 | 원본 필드 |
|---|--------|-------------|:---:|------|----------|
| RT-01 | 교육만족도 | `satisfaction_rating` | ✅ 공통 | 교육 전반 만족도 | 교육만족도 점수 |
| RT-02 | 현업적용도 | `applicability_rating` | ✅ 공통 | 업무 적용 가능성 평가 | 현업적용도 점수 |
| RT-03 | 과정추천도 | `recommendation_rating` | ✅ 공통 | 타인에게 추천 의향 | 과정 추천도 |
| RT-04 | 강사만족도 | `instructor_rating` | ✅ 공통 | 강사 역량/전달력 평가 | 강사만족도 (현대차증권→공통 승격) |
| RT-05 | 교육난이도 | `difficulty_rating` | ❌ 옵션 | 교육 난이도 적정성 | 교육난이도 만족도 (현대엔지니어링) |
| RT-06 | 직무관련성 | `relevance_rating` | ❌ 옵션 | 직무와의 연관성 평가 | 직무관련성 만족도 (현대엔지니어링) |
| RT-07 | 교육기관시설 | `facility_rating` | ❌ 옵션 | 교육 시설 만족도 | 교육기관시설만족도 (현대제철) |

### 2.6 관리/제공 단계 (Provide/Admin) — 3개

| # | 표준명 | canonical_key | 타입 | 입력주체 | 설명 | 원본 필드 |
|---|--------|-------------|------|---------|------|----------|
| P-01 | 교육비 지급완료 | `payment_completed` | boolean | BO | 교육비 지급 처리 완료 여부 | 교육비 지급 완료여부 |
| P-02 | 담당자 코멘트 | `admin_comment` | textarea | BO (provide) | 학습자에게 전달할 코멘트 | 교육 담당자 코멘트 (현대트랜시스→공통 승격) |
| P-03 | 교육정보 URL | `course_info_url` | url | BO (provide) | 교육 과정 정보 확인 URL | 교육정보URL (현대케피코→공통 승격) |

---

## 3. 계열사 특화 필드 → extra_fields 관리

> 표준화 불가하거나 1~2개 사만 사용하는 필드. `extra_fields` JSON으로 관리.

### 3.1 현대오토에버 (어학교육 특화)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `language_type` | select | 어학 종류 (영어/일어/중국어 등) |
| `class_schedule` | select | 수강형태 (주중반/주3회/주말반) |
| `class_format` | select | 교육형태 (주중/주말) |
| `enrollment_month` | select | 수강월 |
| `class_days` | number | 수업일수 |
| `attendance_days` | number | 출석일수 |
| `enrollment_cert` | file | 수강확인증 파일 |
| `is_work_related` | boolean | 업무유관사유 여부 |

### 3.2 현대로템 (강사 활동 특화)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `has_instructor_fee` | boolean | 강사료/자문료 수령 여부 |
| `instructor_fee_amount` | number | 강사료/자문료 금액 |

### 3.3 현대위아 (SAP 연동)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `team_cost_code` | text | SAP 팀코스트번호 |

### 3.4 현대제철 (교육비 선입금 프로세스)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `is_prepaid` | boolean | 교육비 선입금 여부 |
| `prepaid_deadline` | date | 선입금 기한 |
| `refund_bank` | select | 교육비 입금은행 |
| `refund_account` | text | 교육비 입금 계좌번호 |
| `apply_purpose` | select | 교육신청목적 (선택) |
| `apply_purpose_text` | text | 교육신청목적 (직접입력) |

### 3.5 현대차증권 (온라인 서명 등)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `esign_agreed` | boolean | 온라인 서명 동의 여부 |
| `esign_date` | date | 서명 동의 일자 |
| `current_job_role` | text | 담당직무 |
| `education_opinion` | textarea | 교육관련의견 |

### 3.6 현대트랜시스 (자격증 관련)

| canonical_key | 타입 | 설명 |
|-------------|------|------|
| `is_certification_course` | boolean | 자격증 취득 과정 여부 |

### 3.7 🆕 현대자동차 연구직 (R&D 전용)

> HMC R&D는 일반직과 다른 별도 양식을 사용하며, 기술자료 구매 등 고유 프로세스가 존재.

| canonical_key | 타입 | 단계 | 설명 |
|-------------|------|------|------|
| `roms_unit_price` | number | apply | ROMS 결정가격 — 업체 용역 단가 |
| `tech_material_type` | select | apply | 기술자료 유형 (DB구독 / 자료구매). 교육유형이 기술자료인 경우에만 |
| `tech_material_institution` | text | apply | 기술자료 제공 기관명. 교육유형이 기술자료인 경우에만 |
| `planned_budget_display` | number | apply | 계획금액 — 계획 시 배정된 금액 (표시 전용, readonly) |

> **조건부 표시**: `tech_material_type`, `tech_material_institution`은 교육유형이 "기술자료"인 경우에만 나타남

### 3.8 🆕 현대자동차/기아 일반직 (교육운영 + 개인직무)

> 현대자/기아는 **교육운영**(수요예측/상시/신청)과 **개인직무**(개인 학습)로 양식이 분리됨.
> 교육운영에는 월별 인원/예산 관리, 정산방식 등 대규모 교육 관리 전용 필드가 존재.

#### 교육운영 전용 (Plan + Apply)

| canonical_key | 타입 | 단계 | 설명 |
|-------------|------|------|------|
| `mandatory_edu_category` | select | plan | 필수교육구분 — 회사 지정 필수교육 유형 선택 |
| `settlement_method` | select | plan, apply | 정산방식 — 해당없음/인원비율정산/매출액비율정산/G코드정산 |
| `monthly_headcount` | JSONB | plan | 월별 교육인원 — `{"1월": 20, "2월": 15, ...}` 형태 |
| `monthly_budget_forecast` | JSONB | plan | 월별 예상금액 — 세부산출근거 기반 월별 예산 배분 |

#### 교육운영 신청 전용 (Apply)

| canonical_key | 타입 | 단계 | 설명 |
|-------------|------|------|------|
| `budget_usage_type` | select | apply | 예산 사용 구분 — H-교육/H-정산/K-교육/K-정산 |
| `round_selection` | JSONB | apply | 교육 차수 정보 선택 — 계획에서 미사용 차수만 선택 가능 |
| `participant_breakdown` | JSONB | apply | 참가자 구분별 인원 — `{"현대": 10, "기아": 5, "그룹사": 3, "협력사": 2, "가족": 0, "기타": 1}` |
| `sap_expense_code` | text | provide | 경상예산코드 — SAP 전표처리용. 총괄관리자 최종 승인 시 확정 |

#### 개인직무 전용 (Apply)

| canonical_key | 타입 | 단계 | 설명 |
|-------------|------|------|------|
| `approval_valid_period` | daterange | apply | 품의가용기간 — 예산 처리 기한 |

> **`participant_breakdown` 상세 구조 (교육운영 신청):**
> ```json
> {
>   "rounds": [
>     { "round": 1, "현대": 10, "기아": 5, "그룹사": 3, "협력사": 2, "가족": 0, "기타": 1, "total": 21 },
>     { "round": 2, "현대": 8, "기아": 4, "그룹사": 2, "협력사": 1, "가족": 0, "기타": 0, "total": 15 }
>   ],
>   "grand_total": 36
> }
> ```

---

## 4. 필드 간 선후·상관관계 맵

### 4.1 조건부 표시 관계 (if A → show B)

```
[유료교육여부: is_paid_education]
  └── true → 비용 입력 섹션 전체 활성화
        ├── 교육참가비 (C-01, calc_grounds)
        ├── 부가세 (C-02, calc_grounds)
        ├── 결제방식 (C-08)
        ├── 비용결제일 (C-09)
        └── 실 교육비 (C-10)

[고용보험 해당여부: is_ei_eligible]
  └── true → 고용보험 환급예상액 (C-07) 표시

[숙박여부: has_accommodation]
  └── true → 숙박비 (C-05, calc_grounds) 항목 활성화
             학습기간 "몇박" 입력 강조

[해외교육여부: is_overseas]  ← ✅ A-19로 공통 승격 완료
  └── true → 출장비 (C-03), 항공료 (C-04), 숙박비 (C-05) 활성화
             해외교육 국가 (A-20) 표시
             교육지역 → 국가 선택으로 전환

[수료여부: is_completed]
  └── true → 수료증 파일 (R-06) 필수화
             취득점수 (R-02) 활성화
  └── false → 미수료 사유 입력란 (추가 필요?)

[교육유형: 기술자료] ← 🆕 HMC R&D 전용
  └── true → 기술자료 유형 (tech_material_type) 표시
             기술자료 기관 (tech_material_institution) 표시
```

### 4.2 라이프사이클 데이터 흐름 (계획→신청→결과)

```
계획 단계                   신청 단계                    결과 단계
──────────                 ──────────                  ──────────
교육과정명 ──── 연결 ────→ 과정 목록에서 선택
  course_name                (계획 참조)

교육차수  ──── 연결 ────→ 차수 선택 (미사용분만)
  planned_rounds               round_selection

세부산출근거 ── 연결 ────→ 산출근거 가져와서 수정
  [calc_grounds]                [calc_grounds 복사]

학습시간(예정) ────────────────── 대비 ───→ 이수시간 (실제)
  planned_hours                              actual_hours

학습기간 ──────────────────────── 대비 ───→ 이수일수 (실제)
  planned_duration                           actual_days

교육비 (요청) ─────────────────── 대비 ───→ 실 교육비 (실제)
  [calc_grounds 합계]                        actual_cost

교육시작일 ────────────────────────────→ 출석률 산정 기준
  start_date                                 attendance_rate
교육종료일
  end_date
```

### 4.3 비용 필드 → 세부산출근거 매핑

```
┌──────────────────────────────────────────────────────────────┐
│ 기존 폼 필드 (AS-IS)       →   세부산출근거 (TO-BE)           │
├──────────────────────────────────────────────────────────────┤
│ 교육비 (단일 숫자 입력)     →   교육참가비 (단가×인원)          │
│ 부가세 (단일 숫자 입력)     →   부가세 (정액)                   │
│ 출장비 (단일 숫자 입력)     →   출장비 (조건: 해외)             │
│ 항공료 (단일 숫자 입력)     →   항공료 (조건: 해외)             │
│ 숙박비 (단일 숫자 입력)     →   숙박비 (조건: 숙박)             │
│ 교보재비 (HMC/Kia 신규)   →   교보재비 (항상)              🆕 │
│ 시험응시료 (HMC/Kia 신규)  →   시험응시료 (항상)             🆕 │
│ 등록비 (HMC R&D 신규)     →   등록비 (항상)                 🆕 │
│                                                              │
│ ※ AS-IS: 학습자가 총액만 입력                                  │
│ ※ TO-BE: 항목별 단가×수량 입력 (자동 합산)                      │
│ ※ 직접학습형(사외교육)은 2중 승산: 단가 × 인원(1)               │
│ ※ 교육운영형은 3중 승산: 단가 × 수량 × 횟수                     │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 누락 필드 발견 (업데이트)

| # | 필드명 | canonical_key | 상태 | 이유 |
|---|--------|-------------|:---:|------|
| ~~⚠️~~ | ~~해외교육여부~~ | `is_overseas` | ✅ 해결 | A-19로 공통 승격 완료 |
| ⚠️ | **미수료 사유** | `incompletion_reason` | ⏳ | 미수료 시 사유 기록 필요 (환급 차단 근거) |
| ⚠️ | **카드영수증 파일** | `card_receipt` | ⏳ | 증빙서류와 별도로 카드 전표 관리 니즈 (현대오토에버→공통 검토) |
| ⚠️ | **🆕 교육대상자 검색** | `target_participants` | ⏳ | 교육생을 시스템에서 검색/등록 (HMC R&D "교육대상", HMC/Kia "참가자"). 별도 UX 컴포넌트 필요 |

---

## 5. 🆕 HMC/Kia 양식 ↔ 표준 필드 크로스 매핑

> 사용자가 정의한 4가지 양식의 각 필드가 어떤 표준 필드에 매핑되는지 전수 분석.

### 5.1 현대자동차 연구직 (HMC R&D)

| 원본 필드 | 매핑 | canonical_key | 비고 |
|----------|:---:|-------------|------|
| 교육명 | ✅ 공통 | `course_name` | A-01 |
| 교육형태 (온/오프라인) | ✅ 공통 | `education_format` | A-18 (신규 승격) |
| 목적 | ✅ 공통 | `learning_objective` | A-04 |
| 교육 기간 (시작/종료) | ✅ 공통 | `start_date` + `end_date` | A-06, A-07 |
| 차수 | ✅ 공통 | `planned_rounds` | PL-09 |
| 시간 (차수당) | ✅ 공통 | `hours_per_round` | PL-08 (신규) |
| 일 | ✅ 공통 | `planned_days` | PL-07 (신규) |
| 장소 | ✅ 공통 | `venue_detail` | A-11 |
| 업체명 | ✅ 공통 | `institution_name` | A-02 |
| ROMS 결정가격 | 🔴 전용 | `roms_unit_price` | 3.7절 |
| 교육대상 | ⚠️ 검토 | `target_participants` | 4.4절 누락 필드 |
| 주요 내용 | ✅ 공통 | `course_description` | A-03 |
| 기타 | ✅ 공통 | `remarks` | R-12 |
| 계획금액 | 🔴 전용 | `planned_budget_display` | 3.7절 (표시 전용) |
| 예산 | ✅ 공통 | `requested_budget` | 기존 plans 컬럼 |
| 첨부파일 | ✅ 공통 | `course_brochure` | A-16 |
| 고용보험 환급 여부 | ✅ 공통 | `is_ei_eligible` | C-06 |
| 주관 | ✅ 공통 | `institution_name` | A-02 (중복 — 업체명과 통합) |
| 교육형태 (중복) | — | — | 상단과 중복 |
| 국가 | ✅ 공통 | `overseas_country` | A-20 (is_overseas=true 시) |
| 등록비 | ✅ calc | `등록비` | C-13 (신규) |
| 출장비 | ✅ calc | `출장비` | C-03 |
| 기술자료 유형 | 🔴 전용 | `tech_material_type` | 3.7절 |
| 기관 (기술자료) | 🔴 전용 | `tech_material_institution` | 3.7절 |

> **매핑 결과**: 22개 필드 중 — 공통 15개(68%) / calc_grounds 3개(14%) / 전용 4개(18%)

### 5.2 현대자동차/기아 일반직 — 개인직무 교육

| 원본 필드 | 매핑 | canonical_key | 비고 |
|----------|:---:|-------------|------|
| 학습명 | ✅ 공통 | `course_name` | A-01 |
| 학습기간 | ✅ 공통 | `start_date` + `end_date` | A-06, A-07 |
| 학습시간 | ✅ 공통 | `planned_hours` | A-08 |
| 학습장소 | ✅ 공통 | `venue_detail` | A-11 |
| 상세학습계획 | ✅ 공통 | `course_description` | A-03 |
| 고용보험 환급 여부 | ✅ 공통 | `is_ei_eligible` | C-06 |
| 참가자 | ⚠️ 검토 | `target_participants` | 4.4절 누락 필드 |
| 품의가용기간 | 🔴 전용 | `approval_valid_period` | 3.8절 |
| 세부산출근거 | ✅ calc | calc_grounds 연동 | 기존 시스템 |

> **매핑 결과**: 9개 필드 중 — 공통 6개(67%) / calc_grounds 1개(11%) / 전용 1개(11%) / 검토 1개(11%)

### 5.3 현대자동차/기아 일반직 — 교육운영 계획 (수요예측 + 상시)

> 수요예측용과 상시용은 필드가 거의 동일하며, 차이는 `is_continuing`(전년도 연결) 유무만.

| 원본 필드 | 매핑 | canonical_key | 비고 |
|----------|:---:|-------------|------|
| 이전년도 교육계획 여부 | ✅ 공통 | `is_continuing` | PL-13 (수요예측만) |
| 교육과정명 | ✅ 공통 | `course_name` | PL-01 |
| 교육기관 | ✅ 공통 | `institution_name` | PL-02 |
| 필수교육구분 | 🔴 전용 | `mandatory_edu_category` | 3.8절 |
| 교육대상 | ✅ 공통 | `target_audience` | PL-12 |
| 교육일수 | ✅ 공통 | `planned_days` | PL-07 |
| 과정시간(차수별) | ✅ 공통 | `hours_per_round` | PL-08 |
| 교육장소 | ✅ 공통 | `venue_detail` | PL-10 |
| 교육인원 (전체) | ✅ 공통 | `planned_headcount` | PL-11 |
| 교육차수 | ✅ 공통 | `planned_rounds` | PL-09 |
| 교육목표 | ✅ 공통 | `learning_objective` | PL-03 |
| 기대효과 | ✅ 공통 | `expected_benefit` | PL-04 (신규 승격) |
| 고용보험 환급 여부 | ✅ 공통 | `is_ei_eligible` | PL-15 |
| 세부산출 근거 | ✅ calc | calc_grounds 연동 | 기존 시스템 |
| 교육인원 (월별) | 🔴 전용 | `monthly_headcount` | 3.8절 (JSONB) |
| 월별 예상금액 | 🔴 전용 | `monthly_budget_forecast` | 3.8절 (JSONB) |
| 증빙자료 | ✅ 공통 | `supporting_docs` | PL-16 |
| 정산방식 | 🔴 전용 | `settlement_method` | 3.8절 |

> **매핑 결과**: 18개 필드 중 — 공통 13개(72%) / calc_grounds 1개(6%) / 전용 4개(22%)

### 5.4 현대자동차/기아 일반직 — 교육운영 신청

| 원본 필드 | 매핑 | canonical_key | 비고 |
|----------|:---:|-------------|------|
| 제목 | ✅ 공통 | `course_name` | A-01 (신청 제목) |
| 과정 목록 | 🟡 시스템 | 계획 연결 참조 | 계획에서 과정 선택 |
| 예산 사용 구분 | 🔴 전용 | `budget_usage_type` | 3.8절 |
| 교육 차수 정보 선택 | 🔴 전용 | `round_selection` | 3.8절 (미사용 차수만) |
| 예상인원 (구분별) | 🔴 전용 | `participant_breakdown` | 3.8절 (JSONB) |
| 세부산출근거 | ✅ calc | calc_grounds 연동 | 계획에서 복사→수정 |
| 정산방식 | 🔴 전용 | `settlement_method` | 3.8절 |
| 내용 | ✅ 공통 | `course_description` | A-03 |
| 첨부파일 | ✅ 공통 | `course_brochure` | A-16 |
| 팀 예산현황 | 🟡 시스템 | 표시 전용 | 기존 예산 조회 연동 |
| 신청 금액 | ✅ 공통 | `requested_budget` | 기존 plans 컬럼 |
| 경상예산코드 | 🔴 전용 | `sap_expense_code` | 3.8절 (provide 단계) |

> **매핑 결과**: 12개 필드 중 — 공통 4개(33%) / calc_grounds 1개(8%) / 시스템연동 2개(17%) / 전용 5개(42%)

---

## 6. 표준 필드 총 요약 (갱신)

| 카테고리 | 공통 필드 | 옵션 확장 | 계열사 전용(extra) |
|----------|:---:|:---:|:---:|
| 🆕 계획 (Plan) | 16개 | - | - |
| 신청 (Apply) | 20개 (+3) | - | - |
| 비용 (Cost/calc_grounds) | 8개 항목 (+3) + 5개 메타필드 | - | - |
| 결과 (Result) | 12개 | - | - |
| 별점 (Rating) | 4개 | 3개 | - |
| 관리 (Provide) | 3개 | - | - |
| 현대오토에버 전용 | - | - | 8개 |
| 현대로템 전용 | - | - | 2개 |
| 현대위아 전용 | - | - | 1개 |
| 현대제철 전용 | - | - | 6개 |
| 현대차증권 전용 | - | - | 4개 |
| 현대트랜시스 전용 | - | - | 1개 |
| 🆕 현대자동차 연구직 전용 | - | - | 4개 |
| 🆕 현대자동차/기아 일반직 전용 | - | - | 9개 |
| **합계** | **63개 + 8항목** | **3개** | **35개** |

> **이전 대비 변화**: 공통 41→63개(+22), calc 5→8항목(+3), 전용 22→35개(+13)

---

## 7. 표준화 판정 기준

| 판정 | 기준 | 예시 |
|------|------|------|
| ✅ **공통 승격** | 3개 사 이상 사용 or 범용적 가치 | 강사만족도, 담당자코멘트, 교육정보URL, 기대효과🆕, 교육형태🆕 |
| 🟡 **옵션 확장** | 1~2개 사 사용이나 보편적 니즈 | 교육난이도, 직무관련성, 교육기관시설, 필수교육구분🆕 |
| 🔴 **계열사 전용** | 특정 사 업무 프로세스에 종속 | 팀코스트번호, 어학종류, 온라인서명, ROMS결정가격🆕, 정산방식🆕 |

### 승격 판정 근거 (이번 추가분)

| 필드 | 판정 | 근거 |
|------|:---:|------|
| `expected_benefit` | ✅ 공통 | HMC/Kia 교육운영 + 현대엔지니어링에서 사용. 교육계획의 보편적 필드 |
| `education_format` | ✅ 공통 | HMC R&D + 범용 온/오프라인 구분. 모든 교육에 적용 가능 |
| `is_overseas` | ✅ 공통 | 산출근거 조건 필터링에 필수. 3개 이상 사에서 해외교육 발생 |
| `overseas_country` | ✅ 공통 | is_overseas의 종속 필드. 해외교육 시 필수정보 |
| `hours_per_round` | ✅ 공통 | HMC R&D + HMC/Kia 교육운영에서 사용. 차수별 시간은 범용적 |
| `planned_days` | ✅ 공통 | HMC R&D + HMC/Kia 교육운영에서 사용. 교육 기본정보 |
| `planned_rounds` | ✅ 공통 | HMC R&D + HMC/Kia 교육운영에서 사용. form_simplification에도 정의 |
| `target_audience` | ✅ 공통 | 교육 대상군 분류는 계획 단계의 보편적 필드 |
| `supporting_docs` | ✅ 공통 | 증빙자료 업로드는 범용적 |
| `settlement_method` | 🔴 전용 | HMC/Kia만의 정산 프로세스 (인원비율/매출액비율/G코드) |
| `budget_usage_type` | 🔴 전용 | H-교육/H-정산/K-교육/K-정산은 HMC/Kia 고유 구분 |
| `participant_breakdown` | 🔴 전용 | 현대/기아/그룹사/협력사 구분은 HMC/Kia 고유 |

---

## 8. form_simplification.md 컬럼 정의 갱신 필요 사항

> 이 문서의 분석 결과를 `form_simplification.md` 섹션 4.1에 반영해야 합니다.

### plans 테이블 추가 컬럼 (갱신 필요)

| 컬럼 | 타입 | 출처 | 기존 정의 | 변경 |
|------|------|------|:---:|------|
| `expected_benefit` | TEXT | PL-04 | 🔴 없음 | 추가 필요 |
| `education_format` | TEXT | A-18 | 🔴 없음 | 추가 필요 (online/offline) |
| `hours_per_round` | NUMERIC | PL-08 | 🔴 없음 | 추가 필요 |
| `planned_days` | INTEGER | PL-07 | ✅ 이미 정의 | — |
| `planned_rounds` | INTEGER | PL-09 | ✅ 이미 정의 | — |
| `is_overseas` | BOOLEAN | A-19 | ✅ 이미 정의 | — |
| `overseas_country` | TEXT | A-20 | ✅ 이미 정의 | — |
| `target_audience` | TEXT | PL-12 | 🔴 없음 | 추가 필요 |
| `supporting_docs` | TEXT[] | PL-16 | 🔴 없음 | 추가 필요 (Storage 경로 배열) |

### calc_grounds 항목 추가

| 항목명 | apply_conditions | 상태 |
|--------|-----------------|:---:|
| 교보재비 | `{}` | 🔴 시딩 필요 |
| 시험응시료 | `{}` | 🔴 시딩 필요 |
| 등록비 | `{}` | 🔴 시딩 필요 |

---

## 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-18 | 최초 작성 — 그룹사 이캠퍼스 공통(35개)+계열사(22개) 필드 분석. 라이프사이클 3단계 분류, calc_grounds 매핑 5건, 조건부 관계 5건, 누락 필드 3건 발견 | AI |
| 2026-04-18 | **1차 통합** — 현대자동차 연구직(22필드), HMC/Kia 일반직 개인직무(9필드), 교육운영 계획(18필드), 교육운영 신청(12필드) 반영. 라이프사이클 4단계 확장(Plan 추가). 공통 41→63개, calc 5→8항목, 전용 22→35개로 확장. 크로스 매핑 4건 작성 | AI |
