const fs = require('fs');
let content = fs.readFileSync('public/js/fo_form_loader.js', 'utf8');

// Replace regex
content = content.replace(/const stateRef =\s*prefix === "planState"[^;]+;/gs, 'const stateRef = _resolveStateRef(prefix);');
content = content.replace(/const stateRef =\s*_csPrefix === "planState"[^;]+;/gs, 'const stateRef = _resolveStateRef(_csPrefix);');

if (!content.includes('function _resolveStateRef')) {
  content = content.replace('// ─── 키 매핑', `function _resolveStateRef(prefix) {
  if (!prefix) return null;
  if (prefix === "planState") return typeof planState !== "undefined" ? planState : null;
  if (prefix === "applyState") return typeof applyState !== "undefined" ? applyState : null;
  if (prefix === "_resultState") return typeof _resultState !== "undefined" ? _resultState : null;
  try { return eval(prefix); } catch(e) { return null; }
}

// ─── 키 매핑`);
}

if (!content.includes('function getLineItemFieldConfig')) {
  content = content + `\n// ─── Line Item 필드 설정 (Pattern A/D) ───────────────────────────
function getLineItemFieldConfig(eduType) {
  const fields = [];
  const etStr = eduType || "";
  if (etStr.includes("집합") || etStr.includes("이러닝") || ["group", "elearning"].includes(etStr)) {
    fields.push({ key: "과정-차수연결", field_type: "course-session", scope: "front" });
  }
  fields.push({ key: "세부산출근거", field_type: "calc-grounds", scope: "front" });
  return fields;
}
window.getLineItemFieldConfig = getLineItemFieldConfig;\n`;
}

fs.writeFileSync('public/js/fo_form_loader.js', content, 'utf8');
console.log('Updated fo_form_loader.js');
