const fs = require('fs');
const file = fs.readFileSync('public/js/supabase_client.js', 'utf8');
const matchUrl = file.match(/const SUPABASE_URL = "(.*?)"/);
const matchKey = file.match(/const SUPABASE_ANON = "(.*?)"/);

if(matchUrl && matchKey) {
  const url = matchUrl[1];
  const key = matchKey[1];
  fetch(url + '/rest/v1/plans?select=*', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  }).then(r=>r.json()).then(data=>{
    const plans = data.filter(p => p.edu_name && p.edu_name.includes('0428 1900'));
    console.log(JSON.stringify(plans.map(p => p.id), null, 2));
  }).catch(e => console.error(e));
}
