const fs = require('fs');
const https = require('https');
const js = fs.readFileSync('public/js/supabase_client.js', 'utf8');
const urlMatch = js.match(/const\s+SUPABASE_URL\s*=\s*['"`]?([^'"`\s]+)/);
const keyMatch = js.match(/const\s+SUPABASE_ANON_KEY\s*=\s*['"`]?([^'"`\s]+)/);

const options = {
  hostname: urlMatch[1].replace('https://', ''),
  port: 443,
  path: '/rest/v1/budget_accounts?limit=1',
  method: 'GET',
  headers: {
    'apikey': keyMatch[1],
    'Authorization': 'Bearer ' + keyMatch[1]
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => {
    console.log(data);
  });
});
req.on('error', e => console.error(e));
req.end();
