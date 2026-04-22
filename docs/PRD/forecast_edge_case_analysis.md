# 당해 연도 수요예측 엣지 케이스 분석 및 방향성 제안 (PRD)

> **도메인**: 수요예측 관리 / 교육계획
> **관련 파일**: `public/js/plans.js`, `public/js/bo_forecast_period.js`, `public/js/bo_plan_mgmt.js`
> **최초 작성**: 2026-04-22
> **최종 갱신**: 2026-04-22
> **상태**: 🟡 구현 중

## 1. 기능 개요 및 문제 정의
현재 시스템은 **"올해 수요예측을 받아서 내년에 교육을 실행한다"**는 기본 프로세스를 전제로 하드코딩된 로직을 가지고 있습니다. 하지만 실제 비즈니스에서는 **당해 연도에 수요예측을 진행하고 당해 연도에 교육을 실행(예: 1~3월 수요예측, 4~12월 실행)**하는 엣지 케이스가 존재합니다. 

본 문서는 현재 시스템의 구조적 한계를 분석하고, 당해 연도 수요예측을 지원하기 위한 아키텍처 개선 방향을 제안합니다.

## 2. 기존 프로세스 분석 (문제점)

현재 프론트 오피스(`public/js/plans.js`)의 교육계획 수립 로직을 리버스 엔지니어링한 결과, 다음과 같은 하드코딩 제약이 발견되었습니다.

### 2.1 `plan_type`의 묵시적 결정 로직
```javascript
// plans.js (Line 753)
const curYear = new Date().getFullYear();
planState.plan_type = _planYear > curYear ? "forecast" : "ongoing";
```
- **문제점**: 교육 실행 연도(`_planYear`)가 현재 연도(`curYear`)보다 커야만 `forecast`(수요예측)로 판별됩니다. 당해 연도를 타겟으로 계획을 수립하면 무조건 `ongoing`(상시계획)으로 강제 변환됩니다.
- **결과**: 상시계획으로 분류되면 수요예측 접수 기간(`forecast_deadlines`)의 검증을 우회하게 되며, 팀 단위 취합(`team_forecast`) 프로세스를 타지 않고 개별 결재로 넘어가게 됩니다.

### 2.2 기간 검증 로직의 경직성
```javascript
// plans.js (Line 758)
_checkForecastDeadline(currentPersona.tenantId || "HMC", _planYear, vorgTplId)
```
- 사용자가 다음 연도를 선택해야만 `_checkForecastDeadline`이 활성화되어, 다음 연도(`_planYear`) 기준으로 열려있는 수요예측 기간이 있는지 DB를 조회합니다.

## 3. 개발 방향성 및 시스템 수정 제안

이러한 비즈니스 엣지 케이스를 수용하기 위해서는 **"실행 연도(Fiscal Year)"와 "계획 유형(Plan Type)"을 분리(Decoupling)** 해야 합니다.

### 3.1 FO 진입점 (UX/UI) 개편: "GNB 메뉴 분리 및 대시보드" 모델
사용자가 연도를 선택해서 시스템이 계획 유형을 유추하게 하는 것이 아니라, **GNB 레벨에서 메뉴를 물리적으로 분리**하여 명시적 진입을 유도합니다.

- **기존 UX**: `[+ 다음 연도 계획 수립]` 클릭 → `_planYear = curYear + 1` 할당 → 자동으로 `forecast` 부여
- **개선 UX**:
  GNB 메뉴 '성장' 탭에 `수요예측`과 `교육계획(상시)` 메뉴를 분리 배치합니다.
  - **수요예측**: 진입 시 `forecast_deadlines` 테이블을 우선 조회하여, 현재 `is_closed = false` 이고 기간 내(open)에 있는 수요예측 캠페인을 대시보드(카드 UI)로 노출합니다. 카드를 클릭하면 **해당 캠페인의 `fiscal_year`를 타겟으로 `plan_type = 'forecast'` 할당 후 위저드를 시작**합니다.
  - **교육계획(상시)**: 수요예측 기간과 무관하게 당해 연도 상시 계획(`plan_type = 'ongoing'`) 위저드를 즉시 시작하거나 상시계획 목록을 보여줍니다.
  - 이를 통해 1분기 등에 수요예측과 당해 연도 상시 교육계획이 동시에(투트랙으로) 진행될 수 있습니다.

### 3.2 BO 수요예측기간 관리 (`bo_forecast_period.js`)
백오피스의 수요예측 기간 설정 시, 달력 연도와 무관하게 **"대상 회계연도"**를 명확히 지정할 수 있도록 기존 로직을 유지하되 검증을 완화해야 합니다.
- 2026년에 2026년도 대상의 수요예측 기간을 생성하더라도 시스템이 경고하지 않고 정상적으로 열어둘 수 있어야 합니다.

### 3.3 백엔드 / 데이터 모델 무결성
- 기존 `forecast_deadlines` 테이블의 구조(`fiscal_year`, `vorg_template_id`, `recruit_start`, `recruit_end`)는 변경할 필요가 없습니다. 충분히 유연하게 설계되어 있습니다.
- 단, `plans` 테이블에 저장할 때 `plan_type = 'forecast'` 이고 `fiscal_year = 2026` 인 데이터가 정상적으로 팀 번들링(`team_forecast`) 쿼리에 잡히도록 취합 로직(`bo_plan_mgmt.js`)의 쿼리 조건을 점검해야 합니다.

## 4. 변경 예정 사항 (수정 대상 파일)

| 대상 파일 | 수정 방향 |
|---|---|
| `public/js/gnb.js` | 상단 네비게이션에 `수요예측` 메뉴 신설 및 `window.plansMode` 전역 변수 파라미터 전달 로직 추가. |
| `public/js/plans.js` | `_planYear > curYear` 조건문 제거 및 `_renderForecastDashboard` 신설. <br>진입 시 `plansMode` 파라미터에 따라 대시보드 노출 또는 `ongoing` 위저드로 분기하도록 개선. |
| `public/js/bo_plan_mgmt.js` | 1차 검토 및 취합 시 `fiscal_year`가 당해 연도인 `forecast` 플랜들도 정상 조회되도록 쿼리 검토. |

## 5. 핵심 비즈니스 로직 수정 (Pseudocode)

**[기존 로직]**
```javascript
planState.plan_type = _planYear > curYear ? "forecast" : "ongoing";
```

**[개선 로직]**
```javascript
// 대시보드에서 명시적으로 넘겨준 plan_type과 fiscal_year를 신뢰함
planState.plan_type = passedParams.plan_type || "ongoing";
planState.fiscal_year = passedParams.fiscal_year || curYear;

// 만약 forecast라면, 당해 연도인지 여부와 상관없이 무조건 마감일 검증 수행
if (planState.plan_type === "forecast") {
    const deadline = await _checkForecastDeadline(..., planState.fiscal_year, ...);
    if (!deadline || deadline.status !== 'open') {
         alert("현재 해당 연도의 수요예측 접수 기간이 아닙니다.");
         return;
    }
}
```

## 6. [기획자 검토 결과 및 반영 사항]
1. **투트랙 진행 허용**: 당해 연도 수요예측 기간(예: 1~3월) 중에도 "상시계획(ongoing)" 수립을 막지 않고, 사용자가 목적에 따라 `수요예측` 메뉴와 `교육계획` 메뉴를 선택하여 진입하도록 분리 개발 완료.
2. **UI 노출 방식**: 기존 GNB 메뉴를 물리적으로 쪼개고, 수요예측 진입 시에만 나타나는 전용 "수요예측 캠페인 대시보드" UI를 신설하여 직관성을 극대화함.
