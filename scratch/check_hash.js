const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const localPath = path.join(__dirname, '..', 'public', 'js', 'fo_form_loader.js');
const localContent = fs.readFileSync(localPath, 'utf8');

https.get('https://haejbae87-ui.github.io/HMGNLP_Budget/js/fo_form_loader.js', (res) => {
  let remoteContent = '';
  res.on('data', d => remoteContent += d);
  res.on('end', () => {
    if (localContent === remoteContent) {
      console.log('MATCH: The local source and remote source are IDENTICAL.');
    } else {
      console.log('MISMATCH: The remote source is different from the local source.');
      // print differences in length
      console.log('Local length: ' + localContent.length);
      console.log('Remote length: ' + remoteContent.length);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
