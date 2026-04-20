#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 2: 폼 빌더 UI를 DnD → ON/OFF 토글 방식으로 전환"""
import re, os

FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'js', 'bo_form_builder.js')

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # ── 1. 헤더 안내 문구 변경 ─────────────────────────────────────────────
    content = content.replace(
        '📋 입력 필드 구성 <span style="font-size:10px;color:#9CA3AF;font-weight:500">(클릭으로 추가, 드래그로 순서 변경)</span>',
        '📋 입력 필드 구성 <span style="font-size:10px;color:#9CA3AF;font-weight:500">— 카테고리 순서 고정 | ON/OFF 및 필수 토글로 설정</span>'
    )

    # ── 2. 우측 패널 헤더 (드래그 안내 제거) ──────────────────────────────
    content = content.replace(
        '선택된 필드 (${_fbTempFields.length}개) <span style="font-size:9px;font-weight:400;color:#9CA3AF">⠿ 드래그하여 순서 변경 | 필수/선택 토글</span>',
        '선택된 필드 (${_fbTempFields.length}개) <span style="font-size:9px;font-weight:400;color:#9CA3AF">순서 고정 | 필수/선택 토글로 설정</span>'
    )

    # ── 3. 좌측 팔레트: 칩(chip) → ON/OFF 토글 행 ────────────────────────
    OLD_CHIP = """                return `<span onclick="fbToggleField('${f.key}')" id="fbf-${f.key}"
                title="${f.hint || ""} ${f.budget ? "💰예산연동" : ""} ${f.fieldType === "select" ? "(셀렉트)" : ""} ${f.predecessors?.length ? "⚡선행:" + f.predecessors.join(",") : ""}"
                class="fb-field-chip ${isSelected ? "selected" : ""}"
                style="${scopeStyle};${isSelected ? "opacity:.45;text-decoration:line-through;" : ""}">
                ${f.icon} ${f.key}${f.required ? "<sup style=color:#EF4444>*</sup>" : ""}${layerBadge}${selectBadge}
                ${f.budget ? '<span style="font-size:7px;vertical-align:super;color:#D97706">💰</span>' : ""}
              </span>`;"""

    NEW_ROW = r"""                // 잠금 필드(locked): 항상 ON, 토글 불가
                // 종속 필드(dependsOn): 부모 필드에 종속 — 독립 ON/OFF 없음
                const isLocked = !!f.locked;
                const hasDep = !!f.dependsOn;
                const isDepActive = hasDep
                  ? _fbTempFields.some(tf => (typeof tf === "object" ? tf.key : tf) === f.dependsOn)
                  : true;
                const canToggle = !isLocked && !hasDep;
                const toggleLabel = isLocked ? "🔒" : hasDep ? "↳" : isSelected ? "ON" : "OFF";
                const toggleBg = isSelected ? "#059669" : isLocked ? "#6B7280" : "#E5E7EB";
                const toggleColor = isSelected || isLocked ? "white" : "#6B7280";
                const depNote = hasDep ? `<span style="font-size:9px;color:#9CA3AF;margin-left:4px">${f.dependsOn} 켜면 자동</span>` : "";
                return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:4px;
                            background:${isSelected ? "#F0FDF4" : hasDep && !isDepActive ? "#F9FAFB" : "white"};
                            border:1.5px solid ${isSelected ? "#6EE7B7" : "#E5E7EB"};
                            opacity:${hasDep && !isDepActive ? "0.45" : "1"}"
                     id="fbf-${f.key}" title="${f.hint || ""}">
                  <span style="font-size:13px">${f.icon}</span>
                  <span style="flex:1;font-size:12px;font-weight:${isLocked ? "900" : "700"};color:${isLocked ? "#374151" : "#111827"}">
                    ${f.key}${isLocked ? " 🔒" : ""}${f.required && isSelected ? "<sup style='color:#EF4444'>*</sup>" : ""}
                    ${depNote}
                  </span>
                  <button onclick="event.stopPropagation();${canToggle ? `fbToggleField('${f.key}')` : ""}"
                    style="min-width:38px;padding:3px 8px;border-radius:6px;border:none;font-size:10px;font-weight:800;
                           background:${toggleBg};color:${toggleColor};cursor:${canToggle ? "pointer" : "default"}"
                    ${!canToggle ? "disabled" : ""}>${toggleLabel}</button>
                </div>`;"""

    if OLD_CHIP in content:
        content = content.replace(OLD_CHIP, NEW_ROW)
        print("OK: chip → toggle row 교체 완료")
    else:
        print("WARN: chip 패턴을 찾지 못했습니다 — 수동 확인 필요")

    # ── 4. _fbPreviewHTML: draggable 제거, 순서 번호 고정 표시 ─────────────
    OLD_PREVIEW_DIV = '''      return `<div draggable="true"
      ondragstart="_fbDragStart(${i},event)" ondragover="_fbDragOver(${i},event)" ondrop="_fbDrop(${i},event)" ondragend="_fbDragEnd()"
      style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid #E5E7EB;cursor:grab;transition:all .15s;user-select:none"
      onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='#E5E7EB'">
      <span style="color:#9CA3AF;font-size:14px;cursor:grab;line-height:1" title="드래그하여 순서 변경">⠿</span>
      <span style="color:#9CA3AF;font-weight:700;font-size:11px;min-width:18px">${i + 1}</span>
      <span style="font-size:13px;font-weight:700;flex:1;color:#111827">${meta.icon} ${key}${typeTag}${layerTag}${depTag}</span>
      <span onclick="event.stopPropagation();fbToggleRequired(${i})" style="font-size:9px;font-weight:800;color:${reqColor};background:${reqBg};padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap;border:1px solid ${reqColor}30" title="클릭하여 필수/선택 전환">${reqLabel}</span>
      <span style="font-size:9px;font-weight:700;color:${scopeColor};background:${scopeColor}15;padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap"
        onclick="event.stopPropagation();fbCycleScope(${i})" title="클릭하여 입력 주체 변경">${scopeLabel}</span>
      <span onclick="event.stopPropagation();fbRemoveField('${key}')" style="cursor:pointer;color:#EF4444;font-size:16px;line-height:1;font-weight:700" title="삭제">×</span>
    </div>`;'''

    NEW_PREVIEW_DIV = '''      // locked 필드: 잠금 배지 + 삭제 불가, dependsOn 필드: 종속 표시
      const metaLocked = meta.locked === true;
      const metaDep = meta.dependsOn || null;
      return `<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid ${metaLocked ? "#6EE7B7" : "#E5E7EB"};transition:border-color .15s"
              onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='${metaLocked ? "#6EE7B7" : "#E5E7EB"}'">
        <span style="color:#9CA3AF;font-weight:700;font-size:11px;min-width:22px;text-align:center">${meta.order || (i + 1)}</span>
        <span style="font-size:13px;font-weight:700;flex:1;color:#111827">${meta.icon} ${key}${typeTag}${layerTag}${depTag}
          ${metaDep ? `<span style="font-size:9px;color:#9CA3AF;margin-left:4px">← ${metaDep}</span>` : ""}
        </span>
        <span onclick="event.stopPropagation();${metaLocked ? "" : `fbToggleRequired(${i})`}"
          style="font-size:9px;font-weight:800;color:${metaLocked ? "#6B7280" : reqColor};background:${metaLocked ? "#F3F4F6" : reqBg};padding:2px 8px;border-radius:5px;cursor:${metaLocked ? "default" : "pointer"};white-space:nowrap;border:1px solid ${metaLocked ? "#E5E7EB" : reqColor + "30"}"
          title="${metaLocked ? "잠금 필드 — 항상 필수" : "클릭하여 필수/선택 전환"}">${metaLocked ? "🔒 필수" : reqLabel}</span>
        <span style="font-size:9px;font-weight:700;color:${scopeColor};background:${scopeColor}15;padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap"
          onclick="event.stopPropagation();fbCycleScope(${i})" title="클릭하여 입력 주체 변경">${scopeLabel}</span>
        ${metaLocked ? `<span style="color:#D1D5DB;font-size:14px;cursor:not-allowed" title="잠금 필드는 제거할 수 없습니다">🔒</span>`
          : `<span onclick="event.stopPropagation();fbRemoveField('${key}')" style="cursor:pointer;color:#EF4444;font-size:16px;line-height:1;font-weight:700" title="삭제">×</span>`}
      </div>`;'''

    if OLD_PREVIEW_DIV in content:
        content = content.replace(OLD_PREVIEW_DIV, NEW_PREVIEW_DIV)
        print("OK: preview div (draggable 제거, locked/dep 표시) 교체 완료")
    else:
        print("WARN: preview div 패턴 미발견")

    # ── 5. fbRemoveField / fbToggleField: locked 필드 보호 ─────────────────
    OLD_TOGGLE = '''function fbToggleField(key) {
  const idx = _fbTempFields.findIndex(
    (f) => (typeof f === "object" ? f.key : f) === key,
  );
  if (idx > -1) {
    // 삭제 시: 이 필드를 선행 조건으로 가지는 후행 필드가 남아 있으면 차단
    const blocked = _fbCheckDeleteBlocked(key);
    if (blocked) {
      alert(
        `[의존성 규칙] "${key}" 필드는 삭제할 수 없습니다.\\n다음 필드가 선행 조건으로 의존하고 있습니다:\\n${blocked.join(", ")}\\n\\n먼저 해당 필드를 제거해 주세요.`,
      );
      return;
    }
    _fbTempFields.splice(idx, 1);
  } else {
    const allFields = _fbAllFields();
    const meta = allFields.find((a) => a.key === key);
    _fbTempFields.push({
      key,
      scope: meta?.scope || "front",
      required: meta?.required || false,
    });
    // 의존성 규칙: 선행 필드 자동 추가
    _fbAutoAddPredecessors(key);
  }
  _fbRefreshPreview();
}'''

    NEW_TOGGLE = '''function fbToggleField(key) {
  const allFields = _fbAllFields();
  const meta = allFields.find((a) => a.key === key);
  // 잠금 필드: ON/OFF 불가
  if (meta?.locked) return;
  // 종속 필드: 부모가 OFF면 ON 불가
  if (meta?.dependsOn) {
    const parentOn = _fbTempFields.some(
      (tf) => (typeof tf === "object" ? tf.key : tf) === meta.dependsOn
    );
    if (!parentOn) {
      _fbShowToast(`"${key}" 필드는 "${meta.dependsOn}"이 켜져 있어야 사용할 수 있습니다.`);
      return;
    }
  }
  const idx = _fbTempFields.findIndex(
    (f) => (typeof f === "object" ? f.key : f) === key,
  );
  if (idx > -1) {
    // OFF: 이 필드를 선행 조건으로 가지는 후행 필드가 남아 있으면 차단
    const blocked = _fbCheckDeleteBlocked(key);
    if (blocked) {
      alert(
        `[의존성 규칙] "${key}" 필드를 끌 수 없습니다.\\n다음 필드가 의존하고 있습니다:\\n${blocked.join(", ")}\\n\\n먼저 해당 필드를 OFF로 설정해 주세요.`,
      );
      return;
    }
    _fbTempFields.splice(idx, 1);
  } else {
    _fbTempFields.push({
      key,
      scope: meta?.scope || "front",
      required: meta?.required || false,
    });
  }
  _fbRefreshPreview();
}'''

    if OLD_TOGGLE in content:
        content = content.replace(OLD_TOGGLE, NEW_TOGGLE)
        print("OK: fbToggleField locked/dependsOn 보호 추가 완료")
    else:
        print("WARN: fbToggleField 패턴 미발견")

    # ── 6. fbRemoveField: locked 보호 추가 ────────────────────────────────
    OLD_REMOVE = '''function fbRemoveField(key) {
  // 삭제 차단 검사
  const blocked = _fbCheckDeleteBlocked(key);
  if (blocked) {
    alert(
      `[의존성 규칙] "${key}" 필드는 삭제할 수 없습니다.\\n다음 필드가 선행 조건으로 의존하고 있습니다:\\n${blocked.join(", ")}\\n\\n먼저 해당 필드를 제거해 주세요.`,
    );
    return;
  }'''

    NEW_REMOVE = '''function fbRemoveField(key) {
  // 잠금 필드 보호
  const allFields = _fbAllFields();
  const meta = allFields.find((a) => a.key === key);
  if (meta?.locked) {
    _fbShowToast(`"${key}"은 잠금 필드입니다 — 제거할 수 없습니다.`);
    return;
  }
  // 의존성 차단 검사
  const blocked = _fbCheckDeleteBlocked(key);
  if (blocked) {
    alert(
      `[의존성 규칙] "${key}" 필드를 끌 수 없습니다.\\n다음 필드가 의존하고 있습니다:\\n${blocked.join(", ")}\\n\\n먼저 해당 필드를 OFF로 설정해 주세요.`,
    );
    return;
  }'''

    if OLD_REMOVE in content:
        content = content.replace(OLD_REMOVE, NEW_REMOVE)
        print("OK: fbRemoveField locked 보호 추가 완료")
    else:
        print("WARN: fbRemoveField 패턴 미발견")

    # ── 7. _fbEditorPage 초기화: locked 필드 자동 ON 추가 ─────────────────
    # fbOpenBuilderModal에서 _fbTempFields 초기화 후 locked 필드 자동 추가
    OLD_INIT = "  _fbTempFields = (form?.fields || []).map((f) =>"
    NEW_INIT = """  // locked 필드가 _fbTempFields에 없으면 자동 추가
  const _fbLockedFields = _fbAllFields().filter((f) => f.locked);
  _fbTempFields = (form?.fields || []).map((f) =>"""

    if OLD_INIT in content:
        content = content.replace(OLD_INIT, NEW_INIT, 1)
        # locked 필드 자동 삽입 — 초기화 블록 뒤에 추가
        OLD_AFTER = "  _fbRefreshPreview();\n}"
        LOCKED_INJECT = """  // locked 필드 자동 보장 (목록에 없으면 맨 앞에 삽입)
  _fbLockedFields.forEach((lf) => {
    const exists = _fbTempFields.some((tf) => (typeof tf === "object" ? tf.key : tf) === lf.key);
    if (!exists) {
      _fbTempFields.unshift({ key: lf.key, scope: lf.scope, required: true });
    }
  });
  _fbRefreshPreview();
}"""
        # fbOpenBuilderModal 내의 첫 번째 _fbRefreshPreview();} 를 교체
        content = content.replace(
            "  _fbRefreshPreview();\n}\n\nfunction _fbEditorPage",
            LOCKED_INJECT + "\n\nfunction _fbEditorPage",
            1
        )
        print("OK: locked 필드 자동 삽입 로직 추가 완료")
    else:
        print("WARN: _fbTempFields 초기화 패턴 미발견")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"완료. 파일 크기: {os.path.getsize(FILE)} bytes")

if __name__ == '__main__':
    main()
