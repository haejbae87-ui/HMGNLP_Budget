# 양식 배포 분리 및 버전 관리 요구사항 정의서 (PRD)

> **도메인**: 교육신청양식 마법사 (Form Builder)
> **관련 파일**: `bo_form_builder.js`, `supabase_client.js`, `fo_form_loader.js`, `plans.js`, `apply.js`
> **최초 작성**: 2026-04-14
> **최종 갱신**: 2026-04-14
> **상태**: ✅ 완료

---

## 1. 기능 개요

교육신청양식 마법사에서 양식 저장 시 즉시 FO에 배포되던 구조를 **Draft → Preview → Deploy 3단계**로 분리하여,
미완성 양식이 FO 사용자에게 노출되는 것을 방지하고, 양식 변경 시 데이터 무결성을 보장한다.
또한 제출 데이터에 양식 스냅샷을 포함하여 향후 엑셀 추출 시 시점별 양식 구조를 역추적할 수 있게 한다.

## 2. 사용자 스토리

> "BO 관리자는 양식 에디터에서 양식을 수정한 후, **임시저장**으로 초안을 보관하고, **미리보기**로 확인한 뒤 **배포 버튼**을 눌러 FO에 공개할 수 있다."

> "BO 관리자는 이미 배포중인 양식을 수정할 때, 수정 중에도 FO 사용자에게는 기존 버전이 유지되어야 한다."

> "향후 데이터 관리자는 제출된 교육계획/신청 데이터를 엑셀로 추출할 때, 양식 버전별로 올바른 컬럼 헤더를 구성할 수 있어야 한다."

## 3. 상세 기능 요구사항

| 번호 | 기능 | 설명 | 우선순위 | 상태 |
|------|------|------|----------|------|
| F-001 | 임시저장 (Draft) | 양식 저장 시 기본적으로 `status='draft'`로 저장. FO 미노출 | 🔴 P0 | ✅ |
| F-002 | 배포 (Deploy) | 🚀 배포 버튼 클릭 시 `status='published'`, `version++`, FO 노출 | 🔴 P0 | ✅ |
| F-003 | 미리보기 | draft 상태에서도 미리보기 가능 (기구현) | 🔴 P0 | ✅ |
| F-004 | 상태 배지 | 목록에 📝초안/✅배포중 v{n}/📦보관 배지 표시 | 🔴 P0 | ✅ |
| F-005 | 보관하기 | published → archived 전환 (FO 미노출) | 🔴 P0 | ✅ |
| F-006 | 정책 연결 양식 보관 차단 | 보관 시 연결 정책 수 확인 + 경고 모달 | 🔴 P0 | ✅ |
| F-007 | FO 필터 변경 | FO 쿼리를 `status='published'` 기준으로 전환 | 🔴 P0 | ✅ |
| F-008 | 양식 참조 저장 (Plan) | 계획 제출 시 `form_template_id`, `form_version`, `_form_snapshot` 저장 | 🟡 P1 | ✅ |
| F-009 | 양식 참조 저장 (Apply) | 신청 제출 시 `form_template_id`, `form_version`, `_form_snapshot` 저장 | 🟡 P1 | ✅ |
| F-010 | 필드 삭제 경고 | 배포 시 이전 배포 대비 삭제된 필드 diff 분석 + 경고 | 🟡 P2 | ✅ |

## 4. DB/데이터 구조

### form_templates 테이블 확장

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `status` | TEXT | 'draft' | 양식 상태: draft / published / archived |
| `version` | INTEGER | 1 | 양식 배포 버전 (배포 시마다 +1) |
| `published_at` | TIMESTAMPTZ | null | 최종 배포 시각 |
| `published_by` | TEXT | null | 배포 실행자 ID |
| `published_fields` | JSONB | null | 배포 시점 필드 스냅샷 (diff 분석용) |

### plans / applications 테이블 확장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `form_template_id` | TEXT | 제출 시 사용된 양식 ID |
| `form_version` | INTEGER | 제출 시 양식 버전 |
| `detail._form_snapshot` | JSONB (내장) | 제출 시점 양식 필드 구조 사본 |

## 5. 비즈니스 로직

### 양식 상태 머신

```
[신규 생성] → draft
draft → (💾 임시저장) → draft
draft → (🚀 배포) → published (version=1)
published → (✏️ 수정 저장) → draft
published → (📦 보관) → archived
published → (🚀 재배포) → published (version++)
archived → (📝 복원) → draft
```

### 배포 프로세스

1. `fbSaveForm()`: 항상 `status='draft'`, `active=false`로 저장
2. `fbDeployForm()`: 정책 연결 확인 → 필드 삭제 경고 → `version++` → `status='published'` → `active=true`
3. `fbSaveAndDeploy()`: 에디터 배포 버튼 — 저장 후 즉시 배포

### FO 양식 로딩

- 기존: `.eq('active', true)` → 변경: `.eq('status', 'published')`
- `active` 컬럼은 배포 시 `true`로 동기화하여 하위호환 유지

## 6. 접근 권한

| 역할 | 권한 |
|------|------|
| BO 관리자 | 양식 생성, 수정, 임시저장, 배포, 보관 |
| FO 사용자 | published 양식만 조회 (쓰기 불가) |

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|--------|-----------|
| 정책 연결 양식 보관 시도 | 연결 정책 수 표시 + confirm 경고 |
| 필드 삭제 후 재배포 | 삭제 필드 목록 표시 + "기존 제출 데이터 영향" 경고 |
| draft 양식을 정책에 연결 | 정책 위저드에서 ⚠ 미배포 경고 표시 (향후 구현) |
| FO 사용자 작성 중 재배포 | form_version 비교로 안내 (향후 구현) |
| 양식 없이 정책 저장 | 기존 로직 유지 (fallback 매칭) |
| 복사 시 상태 | 복사본은 항상 draft, version=1로 생성 |
| 엑셀 추출 시 양식 변경 | _form_snapshot으로 컬럼 헤더 역추적 |

## 8. 기획자 검토 필요 항목

- [ ] `draft_pending` 상태 (배포중 양식 수정 시 구버전 유지 + 새 version 동시 관리) — 현재 미구현, 향후 필요시 추가
- [ ] 엑셀 추출 기능 실제 개발 시 `_form_snapshot` 기반 동적 컬럼 매핑 설계 확정 필요
- [ ] 양식 변경 이력(audit log) 테이블 분리 검토

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-14 | 최초 작성: 양식 배포 분리 + 버전 관리 + 엑셀 추출 대비 | AI |
