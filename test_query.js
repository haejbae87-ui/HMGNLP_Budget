const https = require('https');

const options = {
  hostname: 'wihsojhucgmcdfpufonf.supabase.co',
  port: 443,
  path: '/rest/v1/budget_accounts?select=code,list_view_mode&limit=1',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE',
    'Authorization': 'Bearer sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", data);
  });
});
req.on('error', e => console.error(e));
req.end();
