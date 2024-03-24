import * as fs from 'fs/promises';
import pkg from '../deep.json' assert { type: 'json' };

const encoding = 'utf8';

async function handlers2deepJson() {
  const operations = [];
  const installCode = pkg.data.find(l => l.id === "installCode");
  if (installCode && installCode.value) {
    operations.push((async () => {
        installCode.value.value = await fs.readFile('handlers/install-code.ts', encoding);
    })());
  }
  const publishCode = pkg.data.find(l => l.id === "publishCode");
  if (publishCode && publishCode.value) {
    operations.push((async () => {
        publishCode.value.value = await fs.readFile('handlers/publish-code.ts', encoding);
    })());
  }
  await Promise.all(operations);

  await fs.writeFile('deep.json', JSON.stringify(pkg, null, 2), encoding);

  console.log('deep.json build complete (code of handlers from `./handlers` is embedded into deep.json)');
}

handlers2deepJson().catch(console.error);
