#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ADVANCED_FIELDS 교체 스크립트 - field_catalog_v2.md v2.1 기준
원본 파일 인코딩(UTF-8 no BOM) 보존
"""
import re, sys, os

FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'js', 'bo_form_builder.js')

NEW_BLOCK = r"""// ── 필드 라이브러리 v2.1 (field_catalog_v2.md 기준) ─────────────────────────
// fieldType: text|textarea|daterange|number|boolean|select|user-search|
//            venue-selector|headcount-or-search|calc-grounds|file-multi|rating
// scope: front(FO 입력) | back(BO 전용) | provide(BO→FO 읽기전용)
// locked: true → ON/OFF 불가 (항상 켜짐)
// dependsOn: 이 필드가 활성화되려면 켜져있어야 하는 부모 canonicalKey
// order: 표시 순서 (그룹 내 고정)
var ADVANCED_FIELDS = [

  // ── 그룹 1: 기본정보 (필수 4 + 선택 1) ──────────────────────────────────
  { key:"과정명", icon:"📚", required:true, locked:true, scope:"front", category:"기본정보", order:1, fieldType:"text", hint:"교육과정 또는 행사명", canonicalKey:"course_name", layer:"L1" },
  { key:"교육장소", icon:"📍", required:true, locked:true, scope:"front", category:"기본정보", order:2, fieldType:"venue-selector", hint:"사내/사외 선택 → DB 교육장소 목록 조회 (없으면 직접입력)", canonicalKey:"edu_venue", layer:"L1", config:{ internalLabel:"사내교육장", externalLabel:"사외교육기관", allowFreeText:true } },
  { key:"교육기간", icon:"📅", required:true, locked:true, scope:"front", category:"기본정보", order:3, fieldType:"daterange", hint:"시작일 ~ 종료일", canonicalKey:"edu_period", layer:"L1" },
  { key:"교육목적", icon:"🎯", required:true, locked:true, scope:"front", category:"기본정보", order:4, fieldType:"textarea", hint:"교육목표 및 기대효과", canonicalKey:"learning_objective", layer:"L1" },
  { key:"교육내용", icon:"📝", required:false, locked:false, scope:"front", category:"기본정보", order:5, fieldType:"textarea", hint:"교육 세부 내용 및 커리큘럼", canonicalKey:"course_description", layer:"L1" },

  // ── 그룹 2: 교육 속성 ───────────────────────────────────────────────────
  { key:"교육형태", icon:"🖥️", required:false, locked:false, scope:"front", category:"교육속성", order:6, fieldType:"select", hint:"온라인 / 오프라인 구분", canonicalKey:"education_format", layer:"L1", options:[{ label:"온라인", value:"online" },{ label:"오프라인", value:"offline" }] },
  { key:"해외교육 여부", icon:"✈️", required:false, locked:false, scope:"front", category:"교육속성", order:7, fieldType:"boolean", hint:"해외 교육 여부 (true 시 국가 입력 + 출장비/항공료 calc_grounds 활성화)", canonicalKey:"is_overseas", layer:"L1" },
  { key:"해외교육 국가", icon:"🌐", required:false, locked:false, scope:"front", category:"교육속성", order:8, fieldType:"text", hint:"해외 교육 국가명 (is_overseas=true 시 자동 표시 + 필수)", canonicalKey:"overseas_country", layer:"L1", dependsOn:"is_overseas" },
  { key:"숙박 여부", icon:"🏨", required:false, locked:false, scope:"front", category:"교육속성", order:9, fieldType:"boolean", hint:"숙박/합숙 포함 여부 (true 시 숙박비 calc_grounds 활성화)", canonicalKey:"has_accommodation", layer:"L1" },
  { key:"고용보험 환급 여부", icon:"🏦", required:false, locked:false, scope:"front", category:"교육속성", order:10, fieldType:"boolean", hint:"고용보험 환급 대상 교육 여부", canonicalKey:"is_ei_eligible", layer:"L1" },
  { key:"고용보험 환급예상액", icon:"💵", required:false, locked:false, scope:"front", category:"교육속성", order:11, fieldType:"number", hint:"교육기관에서 돌려받을 예상 환급금액 (예산 지출 아님 — 별도 관리)", canonicalKey:"ei_refund_amount", layer:"L1", dependsOn:"is_ei_eligible" },

  // ── 그룹 3: 운영 규모 ───────────────────────────────────────────────────
  { key:"교육시간(H)", icon:"⏱️", required:false, locked:false, scope:"front", category:"운영규모", order:12, fieldType:"number", hint:"직접학습: 총 학습시간(H) / 운영형: 차수별 교육시간(H)", canonicalKey:"planned_hours", layer:"L1" },
  { key:"교육일수", icon:"📆", required:false, locked:false, scope:"front", category:"운영규모", order:13, fieldType:"text", hint:"예: 2박3일 또는 숫자 (일)", canonicalKey:"planned_days", layer:"L1" },
  { key:"교육차수", icon:"🔢", required:false, locked:false, scope:"front", category:"운영규모", order:14, fieldType:"number", hint:"교육 총 회차 수 (운영형 주 사용, 직접학습은 1)", canonicalKey:"planned_rounds", layer:"L1" },
  { key:"교육인원", icon:"👥", required:false, locked:false, scope:"front", category:"운영규모", order:15, fieldType:"headcount-or-search", hint:"예상인원 입력(숫자) 또는 대상자 직접 검색 선택", canonicalKey:"planned_headcount", layer:"L1", config:{ modes:["number","user-search"], defaultMode:"number" } },

  // ── 그룹 4: 참가자/담당자 ──────────────────────────────────────────────
  { key:"교육담당자", icon:"👤", required:false, locked:false, scope:"front", category:"참가자", order:16, fieldType:"user-search", hint:"기본=작성자. 담당자가 다를 경우 검색하여 변경 (created_by와 별도 관리)", canonicalKey:"person_in_charge", layer:"L1", config:{ defaultToCurrentUser:true, allowChange:true } },
  { key:"참여자명단", icon:"📋", required:false, locked:false, scope:"front", category:"참가자", order:17, fieldType:"user-search", hint:"교육 참여 대상자 검색 및 명단 구성", canonicalKey:"participant_list", layer:"L1", config:{ multiple:true } },
  { key:"강사정보", icon:"🎤", required:false, locked:false, scope:"front", category:"참가자", order:18, fieldType:"user-search", hint:"내부/외부 강사 정보", canonicalKey:"instructor_info", layer:"L1", config:{ multiple:true, allowExternal:true } },

  // ── 그룹 5: 비용 ────────────────────────────────────────────────────────
  { key:"세부산출근거", icon:"📐", required:false, locked:false, scope:"front", category:"비용", order:19, fieldType:"calc-grounds", hint:"항목별 단가×수량 입력 — 모든 비용의 SSOT (조건부 항목 자동 필터)", canonicalKey:"calc_grounds", layer:"L1" },

  // ── 그룹 6: 첨부 ────────────────────────────────────────────────────────
  { key:"첨부파일", icon:"📎", required:false, locked:false, scope:"front", category:"첨부", order:20, fieldType:"file-multi", hint:"관련 서류 다중 첨부 (안내문구는 양식 설정에서 입력)", canonicalKey:"attachment", layer:"L1", config:{ maxFiles:10, allowedTypes:["pdf","doc","docx","xlsx","jpg","png","zip"], guidanceText:"" } },

  // ── 그룹 7: 결과 (result 단계 FO 입력) ──────────────────────────────────
  { key:"수료여부", icon:"🎓", required:false, locked:false, scope:"front", category:"결과", order:21, fieldType:"boolean", hint:"교육 수료 여부", canonicalKey:"is_completed", layer:"L1" },
  { key:"실지출액", icon:"🧾", required:false, locked:false, scope:"front", category:"결과", order:22, fieldType:"number", hint:"교육 완료 후 실제 지출 금액 (FO 결과 단계 입력)", canonicalKey:"actual_cost", layer:"L1" },
  { key:"업무적용계획", icon:"💼", required:false, locked:false, scope:"front", category:"결과", order:23, fieldType:"textarea", hint:"교육 내용을 업무에 어떻게 적용할지", canonicalKey:"work_application_plan", layer:"L1" },
  { key:"교육소감", icon:"💬", required:false, locked:false, scope:"front", category:"결과", order:24, fieldType:"textarea", hint:"교육 후 소감 및 결과 요약", canonicalKey:"review_comment", layer:"L1" },

  // ── 그룹 8: BO 전용 ─────────────────────────────────────────────────────
  { key:"검토의견", icon:"💬", required:false, locked:false, scope:"back", category:"BO전용", order:25, fieldType:"textarea", hint:"승인자 검토 의견 및 관리자 피드백", canonicalKey:"admin_comment", layer:"L1" },
  { key:"안내사항", icon:"📢", required:false, locked:false, scope:"provide", category:"BO전용", order:26, fieldType:"textarea", hint:"교육 참가 전 공지/준비물/확정장소 안내 (FO 읽기전용 노출)", canonicalKey:"announcement", layer:"L1" },
  { key:"ERP코드", icon:"🔗", required:false, locked:false, scope:"back", category:"BO전용", order:27, fieldType:"text", hint:"ERP 연동 비용 코드 (SAP 전표처리용)", canonicalKey:"erp_code", layer:"L1" },
];"""

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 패턴: 기존 ADVANCED_FIELDS 주석+선언부터 닫는 ]; 까지
    pattern = r'// 확장된 필드 라이브러리.*?var ADVANCED_FIELDS\s*=\s*\[.*?\];'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print("ERROR: ADVANCED_FIELDS pattern not found!")
        sys.exit(1)

    new_content = content[:match.start()] + NEW_BLOCK + content[match.end():]

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"OK: Replaced {match.end()-match.start()} chars -> {len(NEW_BLOCK)} chars")
    print(f"File size: {os.path.getsize(FILE)} bytes")

if __name__ == '__main__':
    main()
