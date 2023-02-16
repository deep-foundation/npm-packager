async ({ deep, require, gql, data: { newLink } }) => {
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
  const makePackagePath = (tempDirectory, packageName) => [tempDirectory, 'node_modules', packageName].join('/');
  const makeDeepJsonPath = (packagePath) => [packagePath, 'deep.json'].join('/');
  const makePackageJsonPath = (packagePath) => [packagePath, 'package.json'].join('/');
  const deepImport = async (pkg) => {
    const packager = new (require('@deep-foundation/deeplinks/imports/packager')).Packager(deep);
    const imported = await packager.import(pkg);
    console.log(imported);
    if (imported?.errors?.length) throw imported.errors;
    return imported;
  };

  const { data: [{ value: { value: packageName } }] } = await deep.select({ id: newLink.to_id });
  if (!packageName) {
    throw "Package query value is empty.";
  }
  const tempDirectory = makeTempDirectory();
  npmInstall(packageName, tempDirectory);
  const packagePath = makePackagePath(tempDirectory, packageName);
  const deepJsonPath = makeDeepJsonPath(packagePath);
  const packageJsonPath = makePackageJsonPath(packagePath);
  const deepJson = require(deepJsonPath);
  const packageJson = require(packageJsonPath);
  fs.rmSync(tempDirectory, { recursive: true, force: true });
  if (deepJson.package.name !== packageJson.name) {
    throw new Error(`Package name is not synchronized between deep.json and package.json files.
deep.json package name: ${deepJson.package.name}.
package.json package name: ${packageJson.name}.`);
  }
  if (deepJson.package.version !== packageJson.version) {
    throw new Error(`Package version is not synchronized between deep.json and package.json files.
deep.json package version: ${deepJson.package.name}.
package.json package version: ${packageJson.name}.`);
  }
  const imported = await deepImport(deepJson);
  await deep.insert({
    type_id: await deep.id('@deep-foundation/core', 'Contain'),
    from_id: newLink.from_id,
    to_id: imported.packageId,
  });
  return imported;
}