const fs = require('fs');
const file = 'c:/Users/jbae/OneDrive/바탕 화면/HMGNLP_Budget/public/js/plans.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<button onclick="planState.confirmMode=false;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 수정하기</button>`;

const replacementStr = `<button onclick="closePlanWizard()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 목록으로</button>
        <button onclick="planState.confirmMode=false;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">수정하기</button>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content, 'utf8');
console.log("Button replaced.");
