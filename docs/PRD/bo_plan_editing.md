# 교육계획 온라인 편집 UI (P2) 요구사항 정의서 (PRD)

> **도메인**: 교육계획 관리 (Back Office / Front Office)
> **관련 파일**: `bo_fb_editor.js`, `fo_form_loader.js`, `bo_plan_mgmt.js`, `fo_plans_list.js`
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: ✅ 완전 구현

---

## 1. 기능 개요

BO 운영담당자/총괄담당자가 교육계획에 **코멘트(반려사유, 운영 피드백)를 동적 폼 필드로 관리**할 수 있도록 하고,
FO 사용자는 해당 코멘트를 **읽기전용으로 확인**할 수 있다.
또한 FO 사용자가 기존 교육계획을 **복제**하여 유사 내용의 새 교육계획을 쉽게 작성할 수 있도록 한다.

## 2. 사용자 스토리

> "BO 운영담당자는 양식 마법사에서 'BO 전용 필드'를 생성하고, 교육계획 상세 뷰에서 반려사유/코멘트를 입력할 수 있다."
> "FO 사용자는 해당 BO 코멘트를 읽기전용으로 확인하고, 필요 시 교육계획을 복제하여 새 계획을 작성할 수 있다."

## 3. DB/데이터 구조

### plans 테이블 (기존)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| detail | JSONB | 동적 필드 저장소 |
| detail._bo | Object | BO 전용 코멘트 네임스페이스 (신규) |
| detail._provide | Object | BO 제공 → FO 읽기전용 필드 |
| detail._back | Object | BO 전용 입력 필드 |

### form_field_catalog 테이블 (기존)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| is_bo_only | boolean | BO 전용 필드 여부 (신규) |

### tenant_l1_overrides 테이블 (기존)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| is_bo_only | boolean | L1 필드의 BO 전용 오버라이드 (신규) |

## 4. 화면별 기능 요구사항

### BO 양식 마법사 (bo_fb_editor.js)
| 기능 | 구현 | 설명 |
|---|---|---|
| L2 필드 생성 시 [BO 전용] 체크박스 | ✅ | `fc-m-bo-only` 체크박스, DB에 `is_bo_only` 저장 |
| L1 필드 수정 시 [BO 전용] 체크박스 | ✅ | `fc-l1-bo-only` 체크박스, `tenant_l1_overrides` 저장 |
| BO 전용 필드 아이콘 | ✅ | `is_bo_only=true`면 🛡️ 아이콘, scope=provide로 자동 설정 |

### BO 교육계획 상세뷰 (bo_plan_mgmt.js)
| 기능 | 구현 | 설명 |
|---|---|---|
| is_bo_only 필드 편집 UI | ✅ | 관리자 입력 패널에 🛡️ 코멘트 섹션 표시 |
| BO 코멘트 저장 | ✅ | `detail._bo` 네임스페이스에 저장 |
| allocated_amount 수정 | ✅ | 기존 인라인 편집 로직 유지 |

### FO 교육계획 폼 렌더링 (fo_form_loader.js)
| 기능 | 구현 | 설명 |
|---|---|---|
| is_bo_only 필드 FO 표시 | ✅ | 값 있을 때만 주황 배경 읽기전용 카드로 표시 |
| 입력 불가 | ✅ | FO에서 `<input>` 렌더링 없음, 텍스트만 표시 |

### FO 교육계획 목록 (fo_plans_list.js)
| 기능 | 구현 | 설명 |
|---|---|---|
| [📱 복제] 버튼 | ✅ | 모든 상태(draft/saved/pending/approved)의 계획에 표시 |
| 복제 실행 | ✅ | `clonePlan()` — status=draft, 제목에 [복제] 추가, BO코멘트 초기화 |

## 5. 핵심 비즈니스 로직

### BO 코멘트 저장 흐름
```
BO 담당자 입력 → _saveBoAdminFields() → detail._bo 네임스페이스 병합 → plans.detail UPDATE
```

### FO 코멘트 표시 조건
```
fieldRef.is_bo_only || def.is_bo_only === true
AND detail._bo[stateKey] 값이 존재 (빈 문자열/null이면 숨김)
```

### 복제 시 데이터 처리
- **복제 포함**: `edu_name`, `account_code`, `purpose`, `edu_type`, `amount`, `detail` (동적 필드 전체)
- **복제 제외**: `status`(→draft), `allocated_amount`(→0), `_bo` 코멘트, 승인 관련 필드 전부

## 6. 접근 권한

| 역할 | is_bo_only 필드 편집 | 복제 버튼 |
|---|---|---|
| platform_admin | ✅ | — |
| budget_ops (운영담당자) | ✅ | — |
| total_general (총괄담당자) | ✅ | — |
| FO 일반 사용자 | ❌ (읽기전용) | ✅ |

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|---|---|
| BO 코멘트 없을 때 FO 표시 | 빈 값이면 완전 숨김 (렌더링 없음) |
| 복제 시 DB INSERT 실패 | alert으로 오류 메시지 표시, 목록 유지 |
| 복제본 ID 충돌 | `PLN_CLONE_` + timestamp 방식으로 고유 ID 생성 |
| BO 전용 필드 양식 미설정 시 | 관리자 패널 자체가 렌더링되지 않음 |

## 8. [기획자 검토 필요 항목]

- `plans` 테이블 ID 컬럼이 UUID 타입이면 `PLN_CLONE_` 형식 ID가 INSERT 실패할 수 있음 → UUID 생성으로 교체 권장
- is_bo_only 필드를 form_templates.fields 배열에 저장하는 스키마 변경 필요 (현재는 form_field_catalog에만 저장)
- 복제 시 다음 연도 계획으로 연도만 변경하는 옵션 추가 검토

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-20 | 최초 작성 (P2 구현 완료) | AI |
