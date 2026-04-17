---
name: bo_ui_standard
description: 백오피스의 조회(Search/Filter) 및 데이터 목록(List/Table) 화면을 개발하거나 디자인을 반영할 때 반드시 호출되는 UI 구조 표준화 스킬. CSS 클래스 및 마크업 구조 가이드.
---

# Back-Office UI Standard (Search & List)
백오피스의 모든 목록형 데이터 관리 페이지는 일관된 사용자 경험을 위해 이 **표준 템플릿 구조와 전용 CSS 클래스**를 사용하여 작성해야 합니다. (`bo_styles.css`에 관련된 공통 클래스가 추가되어 있습니다.)

## 1. 페이지 전체 레이아웃 (Layout Container)
상단에는 `bo-fade` 애니메이션 클래스를 래퍼로 둡니다.
```html
<div class="bo-fade">
  <!-- 1. 헤더 (타이틀 + 우측 버튼) -->
  <!-- 2. 필터 바 (bo-filter-bar) -->
  <!-- 3. 리스트 개수 (bo-list-count) -->
  <!-- 4. 리스트 테이블 (bo-table-container) -->
</div>
```

## 2. 상단 헤더 & 타이틀 (Page Header)
아이콘을 포함하여 `bo-page-title`을 사용하고, 우측 액션 버튼(예: 새로 만들기)을 배치합니다.
```html
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
  <div>
    <h1 class="bo-page-title">🏷️ 페이지 제목(아이콘 포함)</h1>
    <p class="bo-page-sub">페이지 기능에 대한 설명</p>
  </div>
  <div style="display:flex;gap:8px;align-items:center">
    <button onclick="openWizard()" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 데이터 만들기
    </button>
  </div>
</div>
```

## 3. 조회 및 필터 영역 (Filter Bar)
`bo-filter-bar` 내부에는 `flex`로 셀렉트, 버튼들을 나열합니다. 항목 이름(Label)은 `bo-filter-label`을, 항목 컨트롤(Select)은 `bo-filter-select`를 사용하세요.

- 각 컨트롤 블록과 블록 사이에는 `bo-filter-divider`로 구분선을 넣습니다.
- **조회 버튼**: `.bo-filter-btn-search`
- **초기화 버튼**: `.bo-filter-btn-reset` (선택 적용)

```html
<div class="bo-filter-bar">
  <!-- 필터 명칭 -->
  <span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">🔍 조회</span>
  
  <!-- 첫번째 필터 -->
  <div style="display:flex;align-items:center;gap:8px">
    <span class="bo-filter-label">회사</span>
    <select id="filter-tenant" class="bo-filter-select">
      <option value="">전체 회사</option>
    </select>
  </div>

  <div class="bo-filter-divider"></div>

  <!-- 두번째 필터 -->
  <div style="display:flex;align-items:center;gap:8px">
    <span class="bo-filter-label">조직</span>
    <select id="filter-vorg" class="bo-filter-select">
      <option value="">전체 조직</option>
    </select>
  </div>
  
  <!-- 조회 버튼 구역 -->
  <button onclick="loadData()" class="bo-filter-btn-search">
    ● 조회
  </button>
  <button onclick="resetData()" class="bo-filter-btn-reset">
    초기화
  </button>
</div>
```

## 4. 데이터 리스트 및 테이블 (List Table)
리스트 테이블의 래퍼 엘리먼트에는 `.bo-table-container`를 사용하여 그림자와 둥근 모서리를 적용하고, 상단에는 `.bo-list-count`를 넣어 리스트 타이틀과 총 개수를 명시합니다. 내부 `table` 태그에는 기존의 `bo-table` 등 적절한 테이블 클래스 혹은 인라인을 유지합니다. (보통 너비 100%, collapse 등)

```html
<div>
  <!-- 목록 개수 -->
  <div class="bo-list-count">목록 데이터명 (3개)</div>
  
  <!-- 목록 보더 컨테이너 -->
  <div class="bo-table-container">
    <table class="bo-table" style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">항목명 1</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">항목명 2</th>
        </tr>
      </thead>
      <tbody id="list-body">
        <!-- JS로 동적 생성되는 tr 목록: tr 태그에 아래 스타일 적용 권장 -->
        <!-- <tr style="border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .12s" onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''"> -->
      </tbody>
    </table>
  </div>
</div>
```

## 가이드 활용 규칙
모든 AI 에이전트는 백오피스의 조회(Search/Filter) + 목록(List) 페이지 개발 태스크가 할당되면 리팩토링이나 신규 생성 시 반드시 위 구조를 활용하여야 합니다.
1. `bo_styles.css`에 이미 필요한 컨테이너 클래스가 작성되어 있으므로 별도의 `<style>` 블록이나 지나친 인라인 스타일 코딩을 지양하세요. (특히 filter input 등의 요소).
2. 조회 버튼과 필터바, 서치 라벨, 입력필드는 완전히 표준화된 클래스를 사용합니다.
