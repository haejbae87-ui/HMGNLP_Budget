# 교육장소 관리 (edu_venues) 요구사항 정의서 (PRD)

> **도메인**: 양식 빌더 / 교육장소 마스터
> **관련 파일**: `public/js/bo_form_builder.js`, `public/js/bo_venue_manager.js`, `public/js/fo_form_loader.js`
> **최초 작성**: 2026-04-20
> **최종 갱신**: 2026-04-20
> **상태**: 🟡 구현 중

---

## 1. 기능 개요

교육장소를 사내/사외로 구분하여 DB에서 관리하는 마스터 테이블과 BO 관리 UI.
FO 양식의 `edu_venue` 필드(venue-selector 타입)에 드롭다운 옵션을 제공하고,
사내 장소의 경우 대관비 단가를 세부산출근거(calc_grounds)에 자동 연동한다.

---

## 2. 사용자 스토리

> "BO 관리자는 교육장소 관리 탭에서 사내/사외 교육장소를 등록·수정·삭제하고, FO 신청서의 교육장소 드롭다운에 반영할 수 있다."
> "FO 신청자는 사내/사외를 선택한 후 DB에 등록된 교육장소를 선택하거나, 없을 경우 직접 입력할 수 있다."

---

## 3. DB 테이블 구조

```sql
TABLE public.edu_venues (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  TEXT NOT NULL,           -- 테넌트 격리
  venue_type TEXT NOT NULL            -- 'internal' | 'external'
             CHECK (venue_type IN ('internal','external')),
  name       TEXT NOT NULL,           -- 장소명
  address    TEXT,                    -- 주소 (선택)
  capacity   INTEGER,                 -- 수용인원 (선택)
  daily_rate NUMERIC(15,2) DEFAULT 0, -- 사내 대관비 단가/일 (calc_grounds 연동)
  active     BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS 정책:**
- `SELECT`: 동일 tenant_id 또는 platform_admin
- `INSERT/UPDATE/DELETE`: 동일 tenant_id의 ops_manager 이상

---

## 4. 화면별 기능 요구사항

### BO 교육장소 관리 UI (🏢 교육장소 관리 탭)

| 번호 | 기능 | 상태 |
|------|------|------|
| F-001 | 사내/사외 서브탭 전환 | ✅ 구현 |
| F-002 | 교육장소 목록 테이블 (이름, 주소, 수용인원, 대관비, 상태) | ✅ 구현 |
| F-003 | 신규 교육장소 추가 (모달) | ✅ 구현 |
| F-004 | 교육장소 수정 | ✅ 구현 |
| F-005 | 사내 장소: 대관비 단가 설정 (사외 선택 시 숨김) | ✅ 구현 |
| F-006 | 활성/비활성 토글 | ✅ 구현 |
| F-007 | 삭제 (confirm 후) | ✅ 구현 |
| F-008 | sort_order 드래그 정렬 | ❌ 미구현 (숫자 자동 증가로 대체) |

### FO venue-selector 컴포넌트

| 번호 | 기능 | 상태 |
|------|------|------|
| F-010 | 사내/사외 라디오 선택 | ❌ 미구현 (Phase 4) |
| F-011 | 선택에 따른 DB 장소 드롭다운 | ❌ 미구현 (Phase 4) |
| F-012 | 사외: "목록에 없음" → 직접 입력(key-in) | ❌ 미구현 (Phase 4) |
| F-013 | 선택된 장소 값 저장 (id + name + type) | ❌ 미구현 (Phase 4) |
| F-014 | 사내 장소 선택 시 calc_grounds 대관비 자동 연동 | ❌ 미구현 (Phase 4) |

---

## 5. 핵심 비즈니스 로직

```
[FO venue-selector 동작 — Phase 4 구현 예정]
사내 선택 → edu_venues WHERE venue_type='internal' AND tenant_id=현재테넌트 AND active=true
사외 선택 → edu_venues WHERE venue_type='external' AND tenant_id=현재테넌트 AND active=true
            → "목록에 없음" 선택 시 text input 노출

[calc_grounds 연동 — Phase 4 구현 예정]
사내 장소 선택 → daily_rate > 0인 경우 → 대관비 항목에 단가 자동 설정
```

---

## 6. 접근 권한

| 역할 | BO 관리 UI | FO 조회 |
|------|-----------|---------|
| platform_admin | ✅ 전체 테넌트 | — |
| tenant_global_admin | ✅ 자사 테넌트 | — |
| ops_manager | ✅ 자사 테넌트 | ✅ |
| learner | ❌ | ✅ |

---

## 7. 예외 처리 및 엣지 케이스

| 케이스 | 처리 방식 |
|--------|----------|
| 등록된 장소 0건 | "직접 입력" 모드 자동 전환 (Phase 4) |
| 비활성 장소가 기존 데이터에 저장된 경우 | 장소명 표시 + "(비활성)" 표기 (Phase 4) |
| 사외 직접 입력 후 저장 | `venue_name_manual` 필드에 별도 저장 (Phase 4) |
| daily_rate = 0 인 사내 장소 | calc_grounds 대관비 항목 비노출 (Phase 4) |
| 테넌트 간 장소 노출 | RLS로 완전 차단 ✅ |

---

## 8. [기획자 검토 필요 항목]

- **미구현**: sort_order 드래그 정렬 — 현재 자동 순번으로 대체
- **미구현**: FO venue-selector 렌더링 — Phase 4에서 `fo_form_loader.js` 수정 필요
- **미구현**: calc_grounds 대관비 자동 연동 — Phase 4에서 처리
- **확인 필요**: 그룹사 테넌트별 별도 장소 vs 공유 장소 허용 여부

---

## 9. 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-04-20 | 최초 작성 — DB 스키마(ALTER), BO 관리 UI(bo_venue_manager.js), 탭 연결(bo_form_builder.js) 구현 완료 | AI |
