const fs = require('fs');
let content = fs.readFileSync('public/js/apply.js', 'utf8');
content = content.replace(/\\\`/g, '`');
fs.writeFileSync('public/js/apply.js', content, 'utf8');
console.log('Fixed backticks in apply.js');
