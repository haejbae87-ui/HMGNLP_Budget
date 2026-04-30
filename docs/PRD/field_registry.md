# Field Registry — BO·FO 양식 필드 레지스트리

> **단일 진실 공급원(Single Source of Truth)**
> 이 문서는 HMG 교육예산 시스템의 모든 양식 필드를 정의합니다.
> 필드 추가·수정·삭제 시 이 문서를 가장 먼저 수정하고, 코드 반영 후 검증합니다.

---

## 메타데이터

| 항목 | 값 |
|---|---|
| 문서 버전 | v1.0 |
| 최종수정일 | 2026-04-30 |
| 관련 스킬 | `.agents/skills/field_manager/SKILL.md` |
| 관련 코드 | `fo_form_loader.js > _BO_TO_FO_KEY_MAP` |
| 관련 코드 | `bo_form_management.js > _FORM_FIELDS` |

---

## 필드 레지스트리 전체 목록

### 범례 (Legend)

| 컬럼 | 설명 |
|---|---|
| BO 키 | `bo_form_management.js`의 `_FORM_FIELDS`에 정의된 키. DB `form_config`에 저장됨 |
| FO 키 | `foRenderStandardPlanForm`의 `inlineFields`에서 참조하는 키 |
| 매핑 관계 | `_BO_TO_FO_KEY_MAP`에서의 변환 방식 |
| BO 전용 | FO에 렌더링되지 않는 BO 관리 전용 필드 (`null` 매핑) |
| 단계 | `forecast`(사업계획) · `plan`(교육계획) · `apply`(신청) · `result`(결과) |
| 휴리스틱 | 이러닝/무예산 등 추가 조건이 있는 필드 |

---

### 섹션 1: 기본정보 (Basic Info)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `edu_purpose` | `edu_purpose` | 교육목적 | 전체 | ✗ | - | |
| `edu_type` | *(null — Step2 선택)* | 교육유형 | 전체 | ✓ | - | FO Step2에서 이미 선택 |
| `course_name` | `course_name` | 교육과정명 | 전체 | ✗ | - | |
| `is_overseas` | `is_overseas` | 국내/해외 | 전체 | ✗ | 이러닝: BO 설정 우선 | |
| `education_region` | `is_overseas` | 교육지역 | 전체 | ✗ | is_overseas의 alias | |
| `is_continuing` | `is_continuing` | 전년도 계속여부 | forecast,plan | ✗ | - | |

---

### 섹션 2: 교육 일정 (Schedule)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `edu_period` | `start_end_date` | 교육기간(시작~종료) | 전체 | ✗ | - | BO·FO 키 불일치 주의 |
| `planned_days` | `edu_days` | 교육일수 | 전체 | ✗ | - | BO·FO 키 불일치 주의 |
| `planned_rounds` | `planned_rounds` | 예상차수 | forecast,plan | ✗ | - | |
| `hours_per_round` | `hours_per_round` | 차수별 학습시간 | 전체 | ✗ | - | |
| `has_accommodation` | `has_accommodation` | 숙박여부 | plan | ✗ | hasFormConfig시 기본 숨김 | |
| `lunch_provided` | `lunch_provided` | 중식제공여부 | plan | ✗ | hasFormConfig시 기본 숨김 | |

---

### 섹션 3: 대상·인원 (Target)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `target_audience` | `target_audience` | 교육대상 | 전체 | ✗ | - | |
| `planned_headcount` | `planned_headcount` | 참가인원(계획) | forecast,plan | ✗ | - | |
| `headcount` | `headcount` | 참가인원(실제) | apply,result | ✗ | - | |

---

### 섹션 4: 장소·기관 (Venue)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `venue_detail` | `venue_type` | 장소유형 | plan,apply | ✗ | 이러닝: 항상 숨김 | BO·FO 키 불일치 주의 |
| `venue_type` | `venue_type` | 장소유형(alias) | plan,apply | ✗ | 이러닝: 항상 숨김 | |
| `institution_name` | `edu_org` | 교육기관 | 전체 | ✗ | - | BO·FO 키 불일치 주의 |
| `education_format` | `education_format` | 교육형태(온/오프) | plan,apply | ✗ | hasFormConfig시 기본 숨김 | |
| `instructor_name` | `instructor_name` | 강사명 | plan,apply | ✗ | 이러닝: 항상 숨김 | |
| `overseas_country` | `is_overseas` | 해외국가 | plan,apply | ✗ | is_overseas 연동 | |

---

### 섹션 5: 교육 내용 (Content)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `learning_objective` | `learning_objective` | 교육목표/내용 | 전체 | ✗ | - | |
| `course_description` | `learning_objective` | 과정설명 | 전체 | ✗ | - | learning_objective의 alias |
| `expected_benefit` | `learning_objective` | 기대효과 | 전체 | ✗ | - | learning_objective에 포함 |
| `apply_reason` | `learning_objective` | 신청사유 | apply | ✗ | - | |
| `learning_content` | `learning_objective` | 학습내용 | 전체 | ✗ | - | |
| `supporting_docs` | `supporting_docs` | 증빙자료/첨부파일 | 전체 | ✗ | - | |
| `course_brochure` | `supporting_docs` | 과정안내서 | 전체 | ✗ | - | supporting_docs의 alias |

---

### 섹션 6: 비용 (Cost)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 휴리스틱 예외 | 비고 |
|---|---|---|---|---|---|---|
| `requested_budget` | `requested_budget` | 요청예산규모 | forecast,plan,apply | ✗ | 무예산: 강제 숨김 | |
| `planned_amount` | `requested_budget` | 계획금액 | forecast,plan | ✗ | 무예산: 강제 숨김 | requested_budget의 alias |
| `calc_grounds` | `calc_grounds` | 세부산출근거 | 전체 | ✗ | 무예산: 강제 숨김 | |
| `is_paid_education` | `is_paid_education` | 유료교육여부 | plan,apply | ✗ | hasFormConfig시 기본 숨김 | |
| `is_ei_eligible` | `is_ei_eligible` | 고용보험 환급여부 | plan,apply | ✗ | - | |
| `ei_refund_amount` | `ei_refund_amount` | 고용보험 환급예상액 | plan,apply | ✗ | is_ei_eligible=true 일 때만 | |

---

### 섹션 7: BO 전용 관리 (BO Only)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 비고 |
|---|---|---|---|---|---|
| `admin_comment` | *(null)* | 관리자 코멘트 | 전체 | ✓ | BO 결재 화면 전용 |
| `allocated_amount` | *(null)* | 배정액 | 전체 | ✓ | BO 예산 배정 전용 |

---

### 섹션 8: 결과 단계 (Result — 교육 결과 입력)

| BO 키 | FO 키 | BO 라벨 | 단계 | BO 전용 | 비고 |
|---|---|---|---|---|---|
| `is_completed` | `is_completed` | 수료여부 | result | ✗ | |
| `score` | `score` | 점수 | result | ✗ | |
| `actual_hours` | `actual_hours` | 실제 학습시간 | result | ✗ | |
| `actual_days` | `actual_days` | 실제 학습일수 | result | ✗ | |
| `attendance_rate` | `attendance_rate` | 출석률 | result | ✗ | |
| `review_comment` | `review_comment` | 학습 후기 | result | ✗ | |
| `work_application_plan` | `work_application_plan` | 업무 적용 계획 | result | ✗ | |
| `recommendation_target` | `recommendation_target` | 추천 대상 | result | ✗ | |
| `share_result` | `share_result` | 결과 공유 | result | ✗ | |
| `remarks` | `remarks` | 비고 | result | ✗ | |
| `satisfaction_rating` | `satisfaction_rating` | 만족도 | result | ✗ | |

---

## 필드 추가 절차 (SOP)

### 신규 필드 추가 체크리스트

```
[ ] 1. 이 문서(field_registry.md)에 행 추가 및 최종수정일 업데이트
[ ] 2. bo_form_management.js > _FORM_FIELDS 배열에 항목 추가
[ ] 3. fo_form_loader.js > _BO_TO_FO_KEY_MAP 에 매핑 추가
[ ] 4. fo_form_loader.js > foRenderStandardPlanForm 에 렌더링 블록 추가
        - 적절한 섹션 배열 (basicFields, scheduleFields, ...) 에 삽입
        - hasFormConfig 조건 결정 (BO 설정 없을 때 기본 표시 여부)
        - 이러닝/무예산 휴리스틱 예외 여부 검토
[ ] 5. BO에서 해당 필드 저장 테스트
[ ] 6. FO에서 강력 새로고침 후 콘솔 확인
[ ] 7. BO 미리보기 ↔ FO 화면 일치 검증
[ ] 8. 버전 범프 (frontoffice.html의 fo_form_loader.js?v=N)
```

### 필드 삭제 체크리스트

```
[ ] 1. 이 문서(field_registry.md)에서 해당 행 삭제 또는 상태 표시
[ ] 2. bo_form_management.js > _FORM_FIELDS 에서 해당 항목 제거
[ ] 3. fo_form_loader.js > _BO_TO_FO_KEY_MAP 에서 해당 키 제거
[ ] 4. fo_form_loader.js > foRenderStandardPlanForm 에서 렌더링 블록 제거
[ ] 5. DB의 기존 form_config 데이터에 해당 키가 남아있는지 확인
        → 남아있더라도 매핑이 제거되면 FO에서 자동 무시됨
[ ] 6. 버전 범프
```

---

## 키 불일치 필드 특별 주의사항

> [!WARNING]
> 아래 필드는 BO 키와 FO 키가 **다릅니다**. 혼동 주의.

| BO 키 (DB 저장) | FO 키 (렌더러 사용) | 이유 |
|---|---|---|
| `edu_period` | `start_end_date` | FO 렌더러 변수명 차이 |
| `planned_days` | `edu_days` | FO 렌더러 변수명 차이 |
| `venue_detail` | `venue_type` | BO 구버전 키 정규화 |
| `institution_name` | `edu_org` | FO 렌더러 약어 사용 |
| `course_description` | `learning_objective` | FO에서 하나의 텍스트영역으로 통합 |
| `expected_benefit` | `learning_objective` | 동일 |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 담당 |
|---|---|---|---|
| 2026-04-30 | v1.0 | 초기 생성 — 현재 코드 기준 전체 필드 역추적 | AI |
