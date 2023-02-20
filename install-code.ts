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
      const dependencies = packageJson.dependencies ?? {};
      console.log('dependencies', dependencies);
      const packageName = pkg.at(-1);
      console.log('packageName', packageName);
      if (Array.isArray(dictionary[packageName])) {
        throw new Error('Multiple versions of the same package are not supported yet.');
      }
      dictionary[packageName] = dependencies;
    }
    for (const pkg in dictionary) {
      const sourceDependencies = dictionary[pkg];
      const targetDependencies = [];
      for (const dependency in sourceDependencies)
      {
        if (dictionary[dependency]) {
          targetDependencies.push(dependency);
        }
      }
      dictionary[pkg] = targetDependencies;
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
  const getExistingPackages = async (packageNames) => {
    const packageTypeId = await deep.id('@deep-foundation/core', 'Package');
    const packageVersionTypeId = await deep.id('@deep-foundation/core', 'PackageVersion');
    const { data: packages } = await deep.select({
      type_id: { _eq: packageTypeId },
      string: { value: { _in: packageNames } }
    }, {
      name: 'GET_EXISTING_PACKAGES_WITH_VERSIONS',
      returning: `
        id
        name: value
        versions: in(where: {type_id: {_eq: ${packageVersionTypeId}}, string: {value: {_is_null: false}}}) {
          id
          version: value
        }
      `
    })
    console.log('packages', packages);
    const existingPackages = packages.reduce(
      (accumulator, currentValue) => {
        const packageId = currentValue?.id;
        const packageName = currentValue?.name?.value;
        if (currentValue?.versions.length !== 1) {
          throw new Error(`'${packageName}' package must have exactly one version. Now it has ${currentValue?.versions.length} versions.`);
        }
        if (accumulator[packageName]) {
          throw new Error(`Multiple packages with name '${packageName}' exist.`)
        }
        const packageVersion = currentValue?.versions?.[0]?.version?.value;
        accumulator[packageName] = { id: packageId, version: packageVersion };
        return accumulator;
      },
      {}
    );
    console.log('existingPackages', existingPackages);
    return existingPackages;
  };

  const { data: [{ value: { value: packageName } }] } = await deep.select({ id: newLink.to_id });
  if (!packageName) {
    throw "Package query value is empty.";
  }
  const tempDirectory = makeTempDirectory();
  const nodeModulesPath = [tempDirectory, 'node_modules'].join('/');
  npmInstall(packageName, tempDirectory);
  const packagePath = makePackagePath(tempDirectory, packageName);
  const deepJsonPath = makeDeepJsonPath(packagePath);
  const packageJsonPath = makePackageJsonPath(packagePath);
  const deepJson = require(deepJsonPath);
  const packageJson = require(packageJsonPath);

  //

  const packages = getDeepPackagesList(nodeModulesPath)
  console.log('packages', packages);
  
  const deepPackagesDependencies = getDeepPackagesDependencies(nodeModulesPath, packages);
  delete deepPackagesDependencies[packageName];
  console.log('deepPackagesDependencies', deepPackagesDependencies);

  const installationQueue = [];
  const installationSet = {};
  
  buildInstallationQueue(deepPackagesDependencies, installationQueue, installationSet);
  
  console.log('installationQueue', installationQueue);
  console.log('installationSet', installationSet);
  
  const existingPackages = await getExistingPackages(installationQueue);
  console.log('existingPackages', existingPackages);

  for (const packageName of installationQueue) {
    const existingPackage = existingPackages[packageName];
    if (existingPackage) {
      await deep.insert({
        type_id: await deep.id('@deep-foundation/npm-packager', 'Used'),
        from_id: newLink.id,
        to_id: existingPackage.id,
      });
    } else {
      // Import package

      // Where to get the path of deep.json?

      // Insert Installed link
      
      // await deep.insert({
      //   type_id: await deep.id('@deep-foundation/npm-packager', 'Installed'),
      //   from_id: newLink.id,
      //   to_id: importedPackageId,
      // });
    }
  }

  //

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