import * as fs from 'fs/promises';
import pkg from '../deep.json' assert { type: 'json' };

const encoding = 'utf8';

async function deepJson2handlers() {
  const operations = [];
  const installCode = pkg.data.find(l => l.id === "installCode");
  if (installCode && installCode.value) {
    operations.push(fs.writeFile('handlers/install-code.ts', installCode.value.value, encoding));
  }
  const publishCode = pkg.data.find(l => l.id === "publishCode");
  if (publishCode && publishCode.value) {
    operations.push(fs.writeFile('handlers/publish-code.ts', publishCode.value.value, encoding));
  }
  await Promise.all(operations);

  console.log('`deep.json` unbuild complete (handlers are extracted from `deep.json` to `./handlers`)');
}

deepJson2handlers().catch(console.error);