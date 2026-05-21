const fs = require('fs');
const path = require('path');

function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist')) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            walk(p);
        } else if (st.size === 0) {
            console.log('Deleting empty file:', p);
            fs.unlinkSync(p);
        }
    }
}
walk('.');
