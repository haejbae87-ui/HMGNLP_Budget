const fs = require('fs');
const file = fs.readFileSync('public/js/supabase_client.js', 'utf8');
const matchUrl = file.match(/const SUPABASE_URL = "(.*?)"/);
const matchKey = file.match(/const SUPABASE_ANON = "(.*?)"/);

async function run() {
  if(matchUrl && matchKey) {
    const url = matchUrl[1];
    const key = matchKey[1];
    const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

    // 1. Fetch operation plan
    let res = await fetch(url + '/rest/v1/plans?id=eq.PLAN-1778494372405', { headers });
    let data = await res.json();
    if(data && data.length) {
      let opPlan = data[0];
      let newDetail = opPlan.detail || {};
      newDetail.source_forecast_amount = 350000;
      let res2 = await fetch(url + '/rest/v1/plans?id=eq.PLAN-1778494372405', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ amount: 300000, allocated_amount: 300000, detail: newDetail })
      });
      console.log('Updated Operation Plan', await res2.json());
    }

    // 2. Fetch forecast plan
    res = await fetch(url + '/rest/v1/plans?id=eq.PLAN-1777370533134', { headers });
    data = await res.json();
    if(data && data.length) {
      let res3 = await fetch(url + '/rest/v1/plans?id=eq.PLAN-1777370533134', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'approved', bo_status: 'final_approved', allocated_amount: 300000, final_confirmed_amount: 300000 })
      });
      console.log('Updated Forecast Plan', await res3.json());
    }
  }
}

run().catch(console.error);
