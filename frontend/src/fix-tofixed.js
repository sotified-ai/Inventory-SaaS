// Utility script to find and replace all .toFixed() calls with formatNumber()
// Run this in the frontend/src directory

const fs = require('fs');
const path = require('path');

const filesToFix = [
    'pages/SalesHistory.js',
    'pages/Products.js',
    'pages/Dashboard.js',
    'pages/MarketSupply.js',
    'pages/MarketSupplyHistory.js',
    'pages/RestockTransactions.js',
    'pages/RestockSlip.js'
];

function addFormatNumberImport(content, filePath) {
    // Check if formatNumber is already imported
    if (content.includes('formatNumber')) {
        return content;
    }

    // Find the utils import line
    const utilsImportRegex = /import\s+{\s*cn\s*}\s+from\s+"@\/lib\/utils";/;

    if (utilsImportRegex.test(content)) {
        // Add formatNumber to existing import
        return content.replace(utilsImportRegex, 'import { cn, formatNumber } from "@/lib/utils";');
    } else {
        // Add new import after other imports
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLine = content.indexOf('\n', lastImportIndex);
        return content.slice(0, endOfLine + 1) +
            'import { formatNumber } from "@/lib/utils";\n' +
            content.slice(endOfLine + 1);
    }
}

function replaceToFixed(content) {
    // Replace patterns like: (value).toFixed(2) with formatNumber(value)
    // Also handles: parseFloat(value).toFixed(2)

    // Pattern 1: (expression).toFixed(2)
    content = content.replace(/\(([^)]+)\)\.toFixed\(2\)/g, 'formatNumber($1)');

    // Pattern 2: parseFloat(expression).toFixed(2)
    content = content.replace(/parseFloat\(([^)]+)\)\.toFixed\(2\)/g, 'formatNumber($1)');

    // Pattern 3: variable.toFixed(2) - be careful with this one
    content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$.]*)\.toFixed\(2\)/g, 'formatNumber($1)');

    // Pattern 4: .toFixed(1) for percentages - use formatNumber with 1 decimal
    content = content.replace(/\(([^)]+)\)\.toFixed\(1\)/g, 'formatNumber($1, 1)');
    content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$.]*)\.toFixed\(1\)/g, 'formatNumber($1, 1)');

    return content;
}

console.log('Starting toFixed replacement...\n');

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, file);

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Add import
        content = addFormatNumberImport(content, filePath);

        // Replace toFixed calls
        content = replaceToFixed(content);

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${file}`);
        } else {
            console.log(`⏭️  Skipped (no changes): ${file}`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
    }
});

console.log('\n✨ Done!');
