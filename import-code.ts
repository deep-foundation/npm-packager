async ({ deep, require, gql, data: { newLink } }) => { 
  const { data: [pq] } = await deep.select({ id: newLink.to_id });
  const packageName = pq?.value?.value;
  
  const os = require('os');
  var fs = require('fs');
  const { v4: uuid } = require('uuid')
  
  const baseTempDirectory = os.tmpdir();
  const randomId = uuid();
  const tempDirectory = [baseTempDirectory,randomId].join('/');
  console.log(tempDirectory);
  fs.mkdirSync(tempDirectory);
  
  const execSync = require('child_process').execSync;
  const command = `npm i ${packageName}`;
  const output = execSync(command, { 
      encoding: 'utf-8',
      cwd: tempDirectory
  });
  console.log(`${command}\n`, output);
  
  const packageFile = [tempDirectory, 'node_modules', packageName, 'deep.json'].join('/');
  console.log(packageFile);
  
  const pkg = require(packageFile);
  console.log(pkg);
  
  fs.rmSync(tempDirectory, { recursive: true, force: true });

  const requireResult = require('@deep-foundation/deeplinks/imports/packager');
  const packager = new requireResult.Packager(deep);
  const imported = await packager.import(pkg);
  if (imported?.errors?.length) throw imported.errors;
  return imported;
}