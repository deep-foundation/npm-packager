import * as fs from 'fs';
import pkg from './deep.json';

// console.log(pkg.data[8]);

const encoding = 'utf8';

pkg.data[8].value.value = fs.readFileSync('install-code.ts', encoding);

// console.log(pkg.data[8]);

fs.writeFileSync('deep.json', JSON.stringify(pkg, null, 2), encoding);

console.log('deep.json build complete');