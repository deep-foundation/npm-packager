import * as fs from 'fs';
import pkg from '../deep.json';

const encoding = 'utf8';

const [installCode] = pkg.data.filter(l => l.id === "installCode");
installCode.value.value = fs.readFileSync('handlers/install-code.ts', encoding);

const [publishCode] = pkg.data.filter(l => l.id === "publishCode");
publishCode.value.value = fs.readFileSync('handlers/publish-code.ts', encoding);

fs.writeFileSync('deep.json', JSON.stringify(pkg, null, 2), encoding);

console.log('deep.json build complete');
