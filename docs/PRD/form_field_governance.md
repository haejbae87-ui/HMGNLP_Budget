# 교육양식 입력 필드 거버넌스 요구사항 정의서 (PRD)

> **도메인**: 교육양식 마법사 (Form Builder)
> **관련 파일**: `public/js/bo_form_builder.js`
> **최초 작성**: 2026-04-13
> **최종 갱신**: 2026-04-14 (v1.3 — provide scope 추가)
> **상태**: ✅ 완료

---

## 1. 기능 개요

교육양식 마법사(Form Builder)의 입력 필드를 **3계층 거버넌스 모델**(L1 플랫폼 표준 / L2 테넌트 확장 / L3 사용자 자유 생성 금지)로 관리한다. 각 필드는 텍스트 입력뿐 아니라 **셀렉트박스(선택값)** 타입을 지원하며, 양식별로 **필수/선택** 구분이 가능하고, 필드 간 **선후행 의존성 규칙**을 통해 데이터 무결성을 보장한다. 그룹사 전체 통계를 위해 `canonical_key` 기반의 필드 통합 집계 구조를 채택한다.

## 2. 사용자 스토리

> "플랫폼 관리자는 L1 표준 필드와 옵션값을 정의하여 전 테넌트에 적용할 수 있다."
> "테넌트 총괄 또는 예산 총괄담당자는 L2 확장 필드를 최대 10개까지 생성하여 자사 양식을 커스터마이징할 수 있다."
> "양식 작성 관리자는 각 양식에 필드를 배치할 때 필수/선택을 개별 지정할 수 있다."
> "프론트오피스 사용자는 필수 필드를 모두 입력해야 최종 상신할 수 있고, 미입력 시에도 임시저장은 가능하다."

## 3. 상세 기능 요구사항

| 번호 | 기능 | 설명 | 우선순위 | 상태 |
|---|---|---|---|---|
| F-001 | 필드 타입 확장 (select) | `ADVANCED_FIELDS`에 `options: [{label, value}]` 배열 지원. 셀렉트박스로 선택값 제공 | 🔴 HIGH | ✅ |
| F-002 | 필수구분 L1 필드 | `필수구분` 필드 등록 (법정 자격유지, 법정 필수교육, 핵심 Capability, 상생협력) | 🔴 HIGH | ✅ |
| F-003 | 양식별 필수/선택 토글 | 선택 필드 목록에서 클릭으로 필수↔선택 전환. `_fbTempFields[].required` 속성 | 🔴 HIGH | ✅ |
| F-004 | 선후행 의존성 규칙 | `predecessors` 배열로 선행 필드 정의. 후행 추가 시 선행 자동 추가 | 🔴 HIGH | ✅ |
| F-005 | 삭제 차단 정책 | 후행 필드가 남아있을 때 선행 필드 삭제 차단 (alert 표시) | 🔴 HIGH | ✅ |
| F-006 | L1/L2 계층 분리 | `ADVANCED_FIELDS`에 `layer`, `canonicalKey` 속성 추가. L2 필드는 DB에서 로드 | 🔴 HIGH | ✅ |
| F-007 | L2 필드 추가 고도화 | 기존 인라인 폼 대신 **팝업 모달**을 통해 L2 필드 추가 (최대 10개 제한 로직 유지). L2 필드가 select/multi_select 타입일 경우 옵션 값도 팝업 내에서 한 번에 등록 기능 포함. | 🔴 HIGH | ✅ |
| F-008 | DB 필드 카탈로그 | `form_field_catalog`, `field_options`, `field_dependencies`, `form_field_bindings` 테이블 | 🔴 HIGH | ✅ |
| F-009 | 필드별 미리보기 | 필드 카탈로그 표에서 각 필드의 렌더링된 컴포넌트(입력 UI)를 단일 팝업으로 즉시 확인하는 미리보기 기능 제공 | 🟡 MED | ✅ |
| F-014 | L1 필드 테넌트 오버라이드 | L1 표준 필드의 **표시명·힌트·필수여부·입력주체(scope)·숨김** 을 테넌트별로 조정 가능. `tenant_l1_overrides` 테이블에 저장하며, 코드 기본값으로 언제든 초기화 가능. 필드 타입·키는 코드로 보호. | 🟡 MED | ✅ |
| F-010 | 토스트 알림 | 선행 필드 자동 추가 시 화면 하단 토스트 메시지 표시 (3초 후 자동 소멸) | 🟡 MED | ✅ |
| F-011 | 프론트오피스 필수 검증 | 필수 필드 미입력 시 임시저장 ✅ / 최종 상신 ❌ | 🔴 HIGH | ✅ |
| F-012 | select 필드 팔레트 표시 | 팔레트에서 select 타입 필드에 ▼ 배지, L2 필드에 L2 배지 표시 | 🟢 LOW | ✅ |
| F-013 | canonical_key 매핑 | 모든 필드에 영문 snake_case `canonicalKey` 부여. 그룹사 통계 집계 기준 | 🔴 HIGH | ✅ |
| F-015 | **provide scope** | BO제공→FO구독 유형 추가. 관리자가 BO에서 입력하면 FO에 읽기전용 노출. 미입력 시 FO 숨김 처리 | 🔴 HIGH | ✅ |
| F-016 | provide L1 필드 6개 | 안내사항/준비물/확정 교육장소/확정 강사/합격·수료 여부/관리자 피드백 | 🔴 HIGH | ✅ |
| F-017 | FO 읽기전용 렌더링 | provide 필드를 파란색 카드 UI로 읽기전용 표시. 편집 불가 | 🔴 HIGH | ✅ |
| F-018 | provide 필수 검증 | provide 필드의 required=true는 **BO 저장 시에만** 검증. FO 제출 시에는 pass | 🔴 HIGH | ✅ |

## 4. DB/데이터 구조

### 4.1 form_field_catalog (필드 카탈로그)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | 고유 식별자 (FLD_{canonical_key}) |
| layer | TEXT | L1(표준) / L2(확장) |
| tenant_id | TEXT | L1=NULL, L2=특정 테넌트 |
| canonical_key | TEXT NOT NULL | 플랫폼 고유 식별자 (snake_case, 변경 불가) |
| display_name | TEXT NOT NULL | 사용자 표시명 |
| field_type | TEXT NOT NULL | text, textarea, number, select, multi_select, date, daterange, file, user_search, rating, system, budget_linked, calc_grounds, course_session |
| scope | TEXT | front, provide, back, system |
| default_required | BOOLEAN | 전역 기본 필수 여부 |
| is_locked | BOOLEAN | L1: true (테넌트 수정 불가) |
| is_reportable | BOOLEAN | 통계 리포트 포함 여부 |

### 4.2 field_options (select 옵션값)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | 옵션 ID |
| field_id | TEXT FK | 소속 필드 |
| layer | TEXT | L1(표준 옵션) / L2(테넌트 추가 옵션) |
| tenant_id | TEXT | L1=NULL, L2=특정 테넌트 |
| label | TEXT | 표시 라벨 |
| value | TEXT | 저장값 (통계용) |
| is_locked | BOOLEAN | L1 옵션: 삭제 불가 |

### 4.3 field_dependencies (의존성 규칙)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | 규칙 ID |
| successor_field_id | TEXT FK | 후행 필드 |
| predecessor_field_id | TEXT FK | 선행 필드 |
| rule_type | TEXT | auto_add / warn / block |
| UNIQUE | | (successor, predecessor) |

### 4.4 form_field_bindings (양식×필드 바인딩)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | |
| form_template_id | TEXT FK | 양식 ID |
| field_id | TEXT FK | 필드 ID |
| sort_order | INT | 양식 내 순서 |
| required | BOOLEAN | 이 양식에서 필수 여부 |
| scope_override | TEXT | 양식별 scope 오버라이드 |

## 5. 비즈니스 로직

### 5.1 3계층 거버넌스 정책

| 계층 | 관리 주체 | 수정 | 삭제 | 통계 | 저장 방식 |
|---|---|---|---|---|---|
| L1 플랫폼 표준 | 플랫폼 운영자만 | ❌ | ❌ | ✅ 반드시 | 고정 (ADVANCED_FIELDS) |
| L2 테넌트 확장 | 테넌트 총괄 / 예산 총괄담당자 | ⚠️ 옵션만 | ⚠️ 비활성화만 | ⚠️ 매핑 시 | DB (form_field_catalog) |
| L3 사용자 자유 | 🚫 허용하지 않음 | - | - | ❌ | - |

### 5.2 의존성 규칙 엔진

```
[추가 시] 후행 필드 추가 → predecessors 배열 조회 → 누락된 선행 필드 자동 추가 + 토스트 알림
[삭제 시] 선행 필드 삭제 → 후행 필드 존재 여부 확인 → 남아있으면 삭제 차단 (alert)
```

### 5.3 등록된 의존성 규칙

| 후행 필드 | 선행 필드 | 규칙 |
|---|---|---|
| 강사이력서 | 강사료 | auto_add |
| 영수증 | 예상비용 | auto_add |
| 대관확정서 | 대관비 | auto_add |
| 수료증 | 수강인원 | warn |

### 5.4 프론트오피스 저장 정책

| 동작 | 필수 미입력 | 처리 |
|---|---|---|
| 임시저장 | 허용 ✅ | 미입력 필드 표시만 |
| 최종 상신 | 차단 ❌ | 미입력 필드 하이라이트 + 스크롤 이동 |

## 6. 접근 권한

| 역할 | L1 필드 관리 | L2 필드 생성 | L2 옵션 추가 | 양식 필드 배치 | 필수/선택 설정 | 의존성 규칙 |
|---|---|---|---|---|---|---|
| 플랫폼 관리자 | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| 테넌트 총괄 | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ L2만 |
| 예산 총괄담당자 | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ L2만 |
| 일반 담당자 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 학습자 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|---|---|
| L2 필드 10개 초과 시도 | alert로 차단 + 안내 메시지 |
| 순환 의존성 | 저장 시 DFS 탐색으로 순환 감지 → 차단 |
| 사용 중인 L2 필드 삭제 | 삭제 불가, 비활성화만 허용 |
| DB 연결 실패 시 필드 로드 | L1 하드코딩 필드만으로 폴백 동작 |
| 기존 양식의 하위 호환성 | `fields[].required` 없는 기존 데이터는 `false` 기본값 |
| L1 필드의 canonical_key | 영문 snake_case 고정. key 변경 시 기존 양식 깨짐 방지 |

## 8. 기획자 검토 필요 항목

| 항목 | 상세 |
|---|---|
| L2 필드 관리 UI | 현재 DB 구조만 구축, 별도 관리 화면은 향후 개발 필요 |
| 필드 옵션 관리 모달 | 백오피스 내 옵션 CRUD UI 향후 개발 필요 |
| canonical_key 기반 통계 뷰 | BI 대시보드 연동 시 canonical_key 기준 집계 쿼리 설계 필요 |
| multi_select 타입 | 현재 select만 구현, multi_select는 향후 확장 가능 |

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|---|---|---|
| 2026-04-13 | 최초 작성. DB 4개 테이블 + L1 시드 데이터 + 코드 구현 완료 | AI |
