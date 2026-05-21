const fs = require('fs');
const path = require('path');

const srcDir = './components';
const destDir = './src/components';

if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        fs.renameSync(srcPath, destPath);
    });
}
