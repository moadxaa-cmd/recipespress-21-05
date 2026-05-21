const fs = require('fs');
const path = require('path');

const files = [
    'src/dashboard/CreatePin.tsx',
    'src/dashboard/CreatePost.tsx',
    'src/dashboard/Dashboard.tsx',
    'src/dashboard/HistoryItemDetailsModal.tsx',
    'src/dashboard/PostHistory.tsx',
    'src/dashboard/Settings.tsx',
    'src/dashboard/UpdatePost.tsx',
    'src/landing/LandingPage.tsx',
    'src/auth/AuthPage.tsx',
    'src/public/PricingPage.tsx',
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    if (content.match(/from\s+['"]\.\/([A-Z][a-zA-Z0-9]+)['"]/g)) {
        content = content.replace(/from\s+['"]\.\/([A-Z][a-zA-Z0-9]+)['"]/g, "from '../components/$1'");
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated sibling components imports in ${file}`);
    }
});
