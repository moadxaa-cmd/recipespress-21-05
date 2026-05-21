const fs = require('fs');
const path = require('path');

const map = {
    'CreatePin.tsx': '/app/applet/src/dashboard/CreatePin.tsx',
    'CreatePost.tsx': '/app/applet/src/dashboard/CreatePost.tsx',
    'Dashboard.tsx': '/app/applet/src/dashboard/Dashboard.tsx',
    'HistoryItemDetailsModal.tsx': '/app/applet/src/dashboard/HistoryItemDetailsModal.tsx',
    'PostHistory.tsx': '/app/applet/src/dashboard/PostHistory.tsx',
    'Settings.tsx': '/app/applet/src/dashboard/Settings.tsx',
    'UpdatePost.tsx': '/app/applet/src/dashboard/UpdatePost.tsx',
};

Object.entries(map).forEach(([filename, destPath]) => {
    const srcPath = path.join('/app/applet/src/components', filename);
    if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath) && fs.statSync(destPath).size === 0) {
            fs.unlinkSync(destPath);
        }
        if (!fs.existsSync(destPath)) {
            fs.renameSync(srcPath, destPath);
            console.log(`Moved ${filename} to ${destPath}`);
        }
    }
});
