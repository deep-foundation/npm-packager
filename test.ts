import pkg_ from './deep.json';

const fs = require('fs');

const makeTempDirectory = () => {
  const os = require('os');
  const { v4: uuid } = require('uuid');
  
  const baseTempDirectory = os.tmpdir();
  const randomId = uuid();
  const tempDirectory = [baseTempDirectory,randomId].join('/');
  fs.mkdirSync(tempDirectory);
  console.log(tempDirectory);
  return tempDirectory;
};
const npmInstall = (packageName, tempDirectory) => {
  const execSync = require('child_process').execSync;

  const command = `npm --prefix "${tempDirectory}" i ${packageName}`;
  const output = execSync(command, { 
      encoding: 'utf-8',
      cwd: tempDirectory
  });
  console.log(`${command}\n`, output);
  return output;
};
const getPackage = (tempDirectory, packageName) => {
  const packageFile = [tempDirectory, 'node_modules', packageName, 'deep.json'].join('/');
  console.log(packageFile);
  const pkg = require(packageFile);
  console.log(pkg);
  return pkg;
};
// const deepImport = async (pkg) => {
//   const packager = new (require('@deep-foundation/deeplinks/imports/packager')).Packager(deep);
//   const imported = await packager.import(pkg);
//   console.log(imported);
//   if (imported?.errors?.length) throw imported.errors;
//   return imported;
// };

// const { data: [packageQuery] } = await deep.select({ id: newLink.to_id });
// const packageName = packageQuery?.value?.value;
const packageName = '@deep-foundation/pow';
if (!packageName) {
  throw "Package query value is empty.";
}
const tempDirectory = makeTempDirectory();
npmInstall(packageName, tempDirectory);
const pkg = getPackage(tempDirectory, packageName);
fs.rmSync(tempDirectory, { recursive: true, force: true });