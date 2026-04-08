# 뱃지 시스템 요구사항 정의서 (PRD)

> **작성 방식**: 코드 역추적 (Reverse PRD)  
> **도메인**: 뱃지 관리 (Badge Management)  
> **관련 파일**: `bo_badge_group.js`, `bo_badge_mgmt.js`, `bo_badge_operation.js`  
> **최초 작성**: 2026-04-08  
> **최종 갱신**: 2026-04-08  
> **상태**: 🟡 구현 갭 다수 (자동 평가 엔진 미구현)

---

## 1. 시스템 개요

뱃지 시스템은 **학습자의 역량 취득을 인증하는 디지털 배지 관리 플랫폼**입니다.  
회사(Tenant) → 가상조직(VOrg, `service_type='badge'`) → 뱃지 그룹 → 뱃지 순으로 계층 구조를 갖습니다.

```
Tenant (회사)
  └─ VOrg Template (service_type='badge')
        └─ Badge Group (역량 영역: 예. 개발기술, 리더십)
              └─ Badge (단계별 뱃지: Level 1, Level 2, ...)
                    └─ User Badge (개인별 취득 이력)
```

---

## 2. DB 테이블 구조

### `badge_groups`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | FK | 소속 회사 |
| `vorg_template_id` | FK | 연결된 가상조직 (badge 용도만) |
| `name` | string | 그룹명 (예: HMC 데이터 전문가 뱃지 그룹) |
| `description` | text | 설명 |
| `created_at` | timestamp | |

### `badges`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID PK | |
| `group_id` | FK → badge_groups | |
| `name` | string | 뱃지명 |
| `level` | string | 단계 (예: Level 1, Level 2) |
| `valid_months` | integer | 유효기간(개월). null = 영구 |
| `allow_manual_award` | boolean | 운영자 수동 발급 허용 여부 |
| `prerequisite_badge_id` | FK → badges | 선수 뱃지 |
| `equivalent_badge_ids` | UUID[] | 타사 상호 인정 뱃지 ID 배열 |
| `condition_rules` | jsonb | 최초 취득 조건 (룰 JSON) |
| `renewal_rules` | jsonb | 갱신 조건. `{}` = 취득 조건과 동일 |
| `updated_at` | timestamp | |

### `user_badges`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | string | 학습자 ID |
| `badge_id` | FK → badges | |
| `tenant_id` | FK | |
| `status` | enum | `IN_PROGRESS` / `COURSE_COMPLETED` / `ACTIVE` / `EXPIRED` |
| `acquired_at` | timestamp | |
| `expires_at` | timestamp | null = 영구 |
| `created_at` | timestamp | |

### `badge_award_requests` (수동 심사)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | string | |
| `badge_id` | FK → badges | |
| `status` | enum | `PENDING` / `APPROVED` / `REJECTED` |
| `proof_file_url` | string | 증빙 파일 |
| `admin_comment` | text | 반려 사유 |
| `requested_at` | timestamp | |
| `reviewed_at` | timestamp | |

---

## 3. condition_rules JSON 스펙

```json
{
  "operator": "AND",
  "nodes": [
    { "type": "course_group", "mode": "path", "items": ["course_id_1", "course_id_2"] },
    { "type": "course_group", "mode": "pool", "required_count": 2, "items": ["A", "B", "C"] },
    { "type": "exam", "exam_id": "exam_uuid", "pass_score": 80 }
  ]
}
```

| 유형 | mode | 의미 |
|---|---|---|
| course_group | path | items 순서대로 이수 강제 |
| course_group | pool | required_count개 이상 이수 |
| exam | - | 시험 pass_score% 이상 |

---

## 4. 화면별 기능 요구사항

### 4-1. 뱃지 그룹 관리

| 기능 | 구현 상태 |
|---|---|
| 회사/가상조직 필터 | ✅ 완료 |
| 그룹 생성 | ✅ 완료 |
| 그룹 삭제 | ✅ 완료 |
| **그룹 수정** | ❌ 미구현 |

### 4-2. 뱃지 기준 설정

| 기능 | 구현 상태 |
|---|---|
| 회사/가상조직/뱃지그룹 필터 | ✅ 완료 |
| 뱃지 목록 조회 | ✅ 완료 |
| 뱃지 생성/수정 (상세 페이지) | ✅ 완료 (2026-04-08 팝업→상세 전환) |
| 시각적 룰 빌더 | ✅ 완료 |
| 뱃지 삭제 | ✅ 완료 |

### 4-3. 뱃지 심사 및 현황

| 기능 | 구현 상태 |
|---|---|
| 수동 심사 요청 목록 | ✅ 완료 |
| 승인/반려 처리 | ✅ 완료 |
| 현황 트래커 | ✅ 완료 |
| **직권 임의 발급** | ❌ 미구현 (UI만 존재) |
| **시험 안내 메일** | ❌ 미구현 (UI만 존재) |
| **갱신 독려 메일** | ❌ 미구현 (UI만 존재) |

---

## 5. 상태 전이

```
(시작) → IN_PROGRESS → COURSE_COMPLETED → [시험 합격] → ACTIVE
                                                          ↓
                                          [유효기간 경과] → EXPIRED
                                          [갱신 완료]    → ACTIVE
```

---

## 6. 접근 권한

| 역할 | 그룹 관리 | 기준 설정 | 심사/현황 |
|---|---|---|---|
| platform_admin | 전체 | 전체 | 전체 |
| tenant_global_admin | 소속 | 소속 | 소속 |
| 그 외 | - | - | - |

---

## 7. 기획자 검토 필요 항목

> **🔴 CRITICAL: 자동 취득 평가 엔진 미구현**
>
> `condition_rules`를 저장하는 기능은 있으나, 학습 이수를 실시간 평가하여 뱃지를 자동 발급하는 백엔드 로직이 없음.
> - `IN_PROGRESS → COURSE_COMPLETED` 전이 트리거 필요
> - `COURSE_COMPLETED → ACTIVE` 시험 합격 판정 필요
> - `ACTIVE → EXPIRED` 만료 배치 처리 필요 (Supabase Edge Function 또는 pg_cron)

| 번호 | 항목 | 내용 |
|---|---|---|
| 1 | 직권 발급 | 사용자+뱃지 선택 모달 구현 필요 |
| 2 | 메일 발송 | 시험 안내, 갱신 독려 알림 연동 필요 |
| 3 | 수동 패스 | `testForceActivate` 데모 코드 → 실기능 구현 필요 |
| 4 | 그룹 수정 | 수정 기능 누락 |
| 5 | EXPIRED_SOON | 30일 하드코딩 → 설정 가능하도록 변경 필요 |
| 6 | 현황 트래커 | user_id만 표시 → 이름/부서 조인 필요 |
| 7 | exam_id | 시험 관리 테이블 연동 스펙 정의 필요 |
| 8 | cascade | 뱃지 삭제 시 user_badges cascade 정책 확인 필요 |

---

## 8. 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|---|---|---|
| 2026-04-08 | 최초 작성 (코드 역추적) | AI |
| 2026-04-08 | 뱃지 기준 설정 상세 페이지 전환 반영 | AI |
