const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Admin module was moved from src/components/admin to src/admin (up one level)
    if (file.includes('/admin/') || file.includes('/dashboard/') || file.includes('/auth/') || file.includes('/landing/') || file.includes('/public/')) {
        if (content.includes('../../services')) {
            content = content.replace(/\.\.\/\.\.\/services/g, '../services');
            changed = true;
        }
        if (content.includes('../../types')) {
            content = content.replace(/\.\.\/\.\.\/types/g, '../types');
            changed = true;
        }
        if (content.includes('../../hooks')) {
            content = content.replace(/\.\.\/\.\.\/hooks/g, '../hooks');
            changed = true;
        }
        if (content.includes('../../constants')) {
            content = content.replace(/\.\.\/\.\.\/constants/g, '../constants');
            changed = true;
        }
        if (content.includes('../../utils')) {
            content = content.replace(/\.\.\/\.\.\/utils/g, '../utils');
            changed = true;
        }
    }
    
        if (content.includes('../components/')) {
            // Already correct or using explicit ../components/
        } else if (content.match(/from\s+['"]\.\.\/([A-Z][a-zA-Z0-9]+)['"]/g)) {
            content = content.replace(/from\s+['"]\.\.\/([A-Z][a-zA-Z0-9]+)['"]/g, "from '../components/$1'");
            changed = true;
        }
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated imports in ${file}`);
    }
});
