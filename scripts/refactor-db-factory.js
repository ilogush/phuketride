const fs = require('fs');
const content = fs.readFileSync('app/lib/db-factory.server.ts', 'utf-8');

const regex = /^\s{8}([a-zA-Z]+):\s*\{([\s\S]*?)\n\s{8}\},/gm;

const replaced = content.replace(regex, (match, key, inner) => {
    return `        get ${key}() {\n            return {${inner}\n            };\n        },`;
});

fs.writeFileSync('app/lib/db-factory.server.ts', replaced);
console.log('Done refactoring db-factory.server.ts');
