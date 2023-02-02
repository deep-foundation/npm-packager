import * as fs from 'fs';
import pkg from './deep.json';

// console.log(pkg.data[8]);

const encoding = 'utf8';

const [installCode] = pkg.data.filter(l => l.id === "installCode");
installCode.value.value = fs.readFileSync('install-code.ts', encoding);

const [publishCode] = pkg.data.filter(l => l.id === "publishCode");
publishCode.value.value = fs.readFileSync('publish-code.ts', encoding);

// console.log(pkg.data[8]);

fs.writeFileSync('deep.json', JSON.stringify(pkg, null, 2), encoding);

console.log('deep.json build complete');