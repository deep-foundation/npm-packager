import fs from 'fs';

const makeTempDirectory = () => {
  const os = require('os');
  const { v4: uuid } = require('uuid');
  
  const baseTempDirectory = os.tmpdir();
  const randomId = uuid();
  const tempDirectory = [baseTempDirectory,randomId].join('/');
  fs.mkdirSync(tempDirectory);
  console.log('tempDirectory', tempDirectory);
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
const makePackagePath = (tempDirectory, packageName) => [tempDirectory, 'node_modules', packageName].join('/');
const makeDeepJsonPath = (packagePath) => [packagePath, 'deep.json'].join('/');
const makePackageJsonPath = (packagePath) => [packagePath, 'package.json'].join('/');
const getPackage = (tempDirectory, packageName) => {
  const packageFile = [tempDirectory, 'node_modules', packageName, 'deep.json'].join('/');
  console.log('packageFile', packageFile);
  const pkg = require(packageFile);
  console.log('pkg', pkg);
  return pkg;
};
const getDeepPackagesList = (rootPath) => {
  const execSync = require('child_process').execSync;

  const deepFileName = 'deep.json';
  const deepFileNameLength = deepFileName.length;

  const command = `find . -name ${deepFileName}`;
  const output = execSync(command, { 
      encoding: 'utf-8',
      cwd: rootPath
  });
  console.log('', `${command}\n`, output);

  const packages = output
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => line.slice(2).slice(0, -deepFileNameLength - 1))
    .map(line => line.split('/node_modules/'));
  return packages;
};
const getDeepPackagesDependencies = (rootPath, packages) => {
  const dictionary = {};
  for (const pkg of packages) {
    const packagePath = [rootPath, pkg.join('/node_modules/')].join('/');
    console.log('packagePath', packagePath);
    const packageJsonPath = makePackageJsonPath(packagePath);
    console.log('packageJsonPath', packageJsonPath);
    const packageJson = require(packageJsonPath);
    console.log('packageJson', packageJson);
    const dependencies = packageJson.dependencies ?? [];
    console.log('dependencies', dependencies);
    const packageName = pkg.at(-1);
    console.log('packageName', packageName);
    if (Array.isArray(dictionary[packageName])) {
      throw new Error('Multiple versions of the same package are not supported yet');
    }
    dictionary[packageName] = dependencies;
  }
  return dictionary;
}
const buildInstallationQueueCore = (deepPackagesDependencies, queue, set, packageName) => {
  const dependencies = deepPackagesDependencies[packageName];
  for (const dependency of dependencies) {
    if (!set[dependency]) {
      buildInstallationQueueCore(deepPackagesDependencies, queue, set, dependency);
    }
  }
  if(!set[packageName]) {
    queue.push(packageName);
    set[packageName] = true;
  }
}
const buildInstallationQueue = (deepPackagesDependencies, queue, set) => {
  for (const packageName in deepPackagesDependencies) {
    buildInstallationQueueCore(deepPackagesDependencies, queue, set, packageName);
  }
}

// let packageName = '@deep-foundation/pow';
// if (!packageName) {
//   throw "Package query value is empty.";
// }
// let tempDirectory = makeTempDirectory();
// npmInstall(packageName, tempDirectory);

const packages = getDeepPackagesList('/workspace/npm-packager/node_modules')
console.log('packages', packages);

const deepPackagesDependencies = getDeepPackagesDependencies('/workspace/npm-packager/node_modules', packages);
console.log('deepPackagesDependencies', deepPackagesDependencies)

const installationQueue = [];
const installationSet = {};

buildInstallationQueue(deepPackagesDependencies, installationQueue, installationSet);

console.log('installationQueue', installationQueue);
console.log('installationSet', installationSet);

process.exit();


// const deepImport = async (pkg) => {
//   const packager = new (require('@deep-foundation/deeplinks/imports/packager')).Packager(deep);
//   const imported = await packager.import(pkg);
//   console.log('', imported);
//   if (imported?.errors?.length) throw imported.errors;
//   return imported;
// };

// const { data: [packageQuery] } = await deep.select({ id: newLink.to_id });
// const packageName = packageQuery?.value?.value;
let packageName = '@deep-foundation/pow';
if (!packageName) {
  throw "Package query value is empty.";
}
let tempDirectory = makeTempDirectory();
npmInstall(packageName, tempDirectory);
const pkg = getPackage(tempDirectory, packageName);
fs.rmSync(tempDirectory, { recursive: true, force: true });