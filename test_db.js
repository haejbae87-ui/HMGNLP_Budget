const fs = require('fs');
const client = fs.readFileSync('public/js/supabase_client.js', 'utf8');
const match = client.match(/SUPABASE_URL\s*=\s*['"`]?([^'"`\s]+)['"`]?/);
const key = client.match(/SUPABASE_ANON\s*=\s*['"`]?([^'"`\s]+)['"`]?/);
if(match && key) {
  fetch(match[1]+'/rest/v1/org_budget_bankbooks?select=*&limit=1', {headers:{apikey:key[1]}})
    .then(r=>r.json())
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(console.error);
}
