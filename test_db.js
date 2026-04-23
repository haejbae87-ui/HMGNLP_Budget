const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const {data: tpl} = await sb.from('form_templates').select('id, name, type, virtual_org_template_id, account_code, edu_type, status');
  console.log("Form Templates:", tpl.filter(t => t.name.includes('R&D') || t.name.includes('학회')));
  
  const {data: pol} = await sb.from('service_policies').select('id, name, purpose, account_codes, vorg_template_id, stage_form_fields, stage_form_ids, edu_types, selected_edu_item').ilike('name', '%R&D%');
  console.log("Policies:", JSON.stringify(pol, null, 2));
}
run();
