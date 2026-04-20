const fs = require('fs');
let css = fs.readFileSync('src/style.css', 'utf-8');

css = css.replace(/--headline: Impact.*/, "--headline: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;");
css = css.replace(/--body: "Avenir.*/, "--body: 'Avenir Next', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif;");

fs.writeFileSync('src/style.css', css, 'utf-8');
console.log('Patched style.css fonts again.');
