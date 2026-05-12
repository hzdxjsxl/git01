const fs = require('fs');
const path = require('path');

function fixImportsInDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImportsInDirectory(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      content = content.replace(
        /from ['"](\.\/|\.\.\/)([^'"]+)['"];?/g,
        (match, prefix, modulePath) => {
          if (modulePath.endsWith('.js')) {
            return match;
          }
          changed = true;
          return `from '${prefix}${modulePath}.js'`;
        }
      );
      
      if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  }
}

const distDir = path.join(__dirname, '../dist');
fixImportsInDirectory(distDir);
console.log('Import paths fixed successfully!');
