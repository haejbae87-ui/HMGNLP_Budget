const fs = require('fs');
let content = fs.readFileSync('public/js/bo_approval.js', 'utf8');

const regex = /let history = \[\];\n  if \(sb\) \{\n    const \{ data \} = await sb\.from\("approval_history"\)\n      \.select\("\*"\)\.eq\("submission_id", docId\)\.order\("action_at"\);\n    history = data \|\| \[\];\n  \}/;

const replacement = `let history = [];
  let appItems = [];
  if (sb) {
    const { data } = await sb.from("approval_history")
      .select("*").eq("submission_id", docId).order("action_at");
    history = data || [];
    
    if (doc.submission_items && doc.submission_items.some(it => it.item_type === 'application')) {
      const appIds = doc.submission_items.filter(it => it.item_type === 'application').map(it => it.item_id);
      if (appIds.length > 0) {
        try {
          const { data: apiData } = await sb.from('application_plan_items').select('*').in('application_id', appIds);
          if (apiData) appItems = apiData;
        } catch(e) { console.warn("Failed to fetch application_plan_items"); }
      }
    }
  }`;

content = content.replace(regex, replacement);

const trRegex = /<tr style="border-bottom:1px solid #F3F4F6">\n\s*<td style="padding:8px 12px;font-size:12px;color:#374151">\$\{it\.item_title\|\|"제목없음"\}<\/td>\n\s*<td style="padding:8px 12px;font-size:12px;text-align:right;color:#374151">\$\{amtHtml\}<\/td>\n\s*<td style="padding:8px 12px;font-size:12px;text-align:center">/;

const trReplacement = `<tr style="border-bottom:1px solid #F3F4F6">
          <td style="padding:8px 12px;font-size:12px;color:#374151;vertical-align:top">
             <div style="font-weight:700">\${it.item_title||"제목없음"}</div>
             \${appItems.filter(api => api.application_id === it.item_id).length > 0 ? \`
               <div style="margin-top:8px;padding:8px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px">
                 <div style="font-size:10px;font-weight:900;color:#6B7280;margin-bottom:4px">연동된 교육계획 (Line Items)</div>
                 \${appItems.filter(api => api.application_id === it.item_id).map((api, idx) => \`
                   <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;border-top:\${idx>0?'1px dashed #E5E7EB':'none'}">
                     <span>└ \${api.course_name} (\${api.edu_type||'-'})</span>
                     <span style="font-weight:700">\${Number(api.subtotal||0).toLocaleString()}원</span>
                   </div>
                 \`).join('')}
               </div>
             \` : ''}
          </td>
          <td style="padding:8px 12px;font-size:12px;text-align:right;color:#374151;vertical-align:top">\${amtHtml}</td>
          <td style="padding:8px 12px;font-size:12px;text-align:center;vertical-align:top">`;

content = content.replace(trRegex, trReplacement);

fs.writeFileSync('public/js/bo_approval.js', content, 'utf8');
console.log('Updated bo_approval.js with application_plan_items rendering');
