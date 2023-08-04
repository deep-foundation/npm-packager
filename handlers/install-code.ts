async ({ deep, gql, data: { triggeredByLinkId, newLink } }) => {
  const deepFileName = 'deep.json';
  const fs = await deep.import('fs');

  const makeTempDirectory = async () => {
    const os = await deep.import('os');
    const { v4: uuid } = await deep.import('uuid');
    
    const baseTempDirectory = os.tmpdir();
    const randomId = uuid();
    const tempDirectory = [baseTempDirectory,randomId].join('/');
    fs.mkdirSync(tempDirectory);
    console.log(tempDirectory);
    return tempDirectory;
  };
  const npmInstall = async (packageName, tempDirectory) => {
    const execSync = (await deep.import('child_process')).execSync;

    const command = `npm --prefix "${tempDirectory}" i ${packageName}`;
    const output = execSync(command, { 
        encoding: 'utf-8',
        cwd: tempDirectory
    });
    console.log(`${command}\n`, output);
    return output;
  };
  const npmLogin = async (token, tempDirectory) => {
    const execSync = (await deep.import('child_process')).execSync;
  
    const command = `npm set "//registry.npmjs.org/:_authToken" ${token}`;
    const output = execSync(command, { 
        encoding: 'utf-8',
        cwd: tempDirectory
    });
    console.log(`${command}\n`, output);
    return output;
  };
  const makePackagePath = (tempDirectory, packageName) => [tempDirectory, 'node_modules', packageName].join('/');
  const makeDeepJsonPath = (packagePath) => [packagePath, deepFileName].join('/');
  const makePackageJsonPath = (packagePath) => [packagePath, 'package.json'].join('/');
  const loadNpmToken = async () => {
    const containTreeId = await deep.id('@deep-foundation/core', 'containTree');
    const tokenTypeId = await deep.id('@deep-foundation/npm-packager', 'Token');
    const { data: [{ value: { value: npmToken = undefined } = {}} = {}] = []} = await deep.select({
      up: {
        tree_id: { _eq: containTreeId },
        parent: { id: { _eq: triggeredByLinkId } },
        link: { type_id: { _eq: tokenTypeId } }
      }
    });
    return npmToken;
  };
  const deepImport = async (deepJson, packageJson) => {
    if (deepJson.package.name !== packageJson.name) {
      throw new Error(`Package name is not synchronized between ${deepFileName} and package.json files.
  ${deepFileName} package name: ${deepJson.package.name}.
  package.json package name: ${packageJson.name}.`);
    }
    if (deepJson.package.version !== packageJson.version) {
      throw new Error(`Package version is not synchronized between ${deepFileName} and package.json files.
  ${deepFileName} package version: ${deepJson.package.version}.
  package.json package version: ${packageJson.version}.`);
    }
    const packager = new (await deep.import('@deep-foundation/deeplinks/imports/packager.js')).Packager(deep);
    const imported = await packager.import(deepJson);
    console.log(imported);
    if (imported?.errors?.length) throw imported;
    return imported;
  };
  const getDeepPackagesDependencies = async (rootPath, packages, packageName) => {
    const dictionary = {};
    for (const pkg of packages) {
      const packagePath = [rootPath, pkg].join('/');
      console.log('packagePath', packagePath);
      const packageJsonPath = makePackageJsonPath(packagePath);
      console.log('packageJsonPath', packageJsonPath);
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json for dependency ${pkg} is not found at ${packageJsonPath}. Looks like ${packageName} does not contain ${pkg} dependency in package.json.`);
      }
      const packageJson = await deep.import(packageJsonPath);
      console.log('packageJson', packageJson);
      const deepJsonPath = makeDeepJsonPath(packagePath);
      console.log('deepJsonPath', deepJsonPath);
      if (!fs.existsSync(deepJsonPath)) {
        throw new Error(`deep.json for dependency ${pkg} is not found at ${deepJsonPath}. Looks like ${pkg} installed, but it does not contain deep.json. Make sure ${pkg} is a deep package.`);
      }
      const deepJson = await deep.import(deepJsonPath);
      console.log('deepJson', deepJson);
      const dependencies = packageJson.dependencies ?? {};
      console.log('dependencies', dependencies);
      const dependencyPackageName = pkg.at(-1);
      console.log('dependencyPackageName', dependencyPackageName);
      if (Array.isArray(dictionary[dependencyPackageName])) {
        throw new Error('Multiple versions of the same package are not supported yet.');
      }
      dictionary[dependencyPackageName] = { deepJson, packageJson, dependencies };
    }
    for (const pkg in dictionary) {
      const sourceDependencies = dictionary[pkg].dependencies;
      const targetDependencies = [];
      for (const dependency in sourceDependencies)
      {
        if (dictionary[dependency]) {
          targetDependencies.push(dependency);
        }
      }
      dictionary[pkg].dependencies = targetDependencies;
    }
    return dictionary;
  }
  const buildInstallationQueueCore = (deepPackagesDependencies, queue, set, packageName) => {
    const dependencies = deepPackagesDependencies[packageName].dependencies;
    for (const dependency of dependencies) {
      if (!set[dependency]) {
        buildInstallationQueueCore(deepPackagesDependencies, queue, set, dependency);
      }
    }
    if(!set[packageName]) {
      const deepJson = deepPackagesDependencies[packageName].deepJson;
      const packageJson = deepPackagesDependencies[packageName].packageJson;
      queue.push({ name: packageName, deepJson, packageJson });
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

  if (!triggeredByLinkId) {
    throw new Error('Install link should be inserted using JWT token (role link), it cannot be inserted using hasura secret (role admin).');
  }

  const { data: [{ value: { value: packageQuery } }] } = await deep.select({ id: newLink.to_id });
  const packageQueryParts = packageQuery.split('@');
  if (packageQueryParts.length === 3) {
    const packageVersion = packageQueryParts.pop();
  }
  const packageName = packageQueryParts.join('@');
  if (!packageName) {
    throw new Error('Package query value is empty.');
  }
  const tempDirectory = await makeTempDirectory();
  let deepJson;
  let packageJson;
  const installationQueue = [];
  const installationSet = {};
  try {
    const npmToken = await loadNpmToken();
    if (npmToken) {
      await npmLogin(npmToken, tempDirectory);
    }
    const nodeModulesPath = [tempDirectory, 'node_modules'].join('/');
    await npmInstall(packageQuery, tempDirectory);
    const packagePath = makePackagePath(tempDirectory, packageName);
    const deepJsonPath = makeDeepJsonPath(packagePath);
    const packageJsonPath = makePackageJsonPath(packagePath);
    deepJson = await deep.import(deepJsonPath);
    packageJson = await deep.import(packageJsonPath);

    const packages = deepJson.dependencies.map(d => d.name);
    console.log('packages', packages);
    
    const deepPackagesDependencies = await getDeepPackagesDependencies(nodeModulesPath, packages, packageName);
    delete deepPackagesDependencies[packageName];
    console.log('deepPackagesDependencies', deepPackagesDependencies);
    
    buildInstallationQueue(deepPackagesDependencies, installationQueue, installationSet);
    
    console.log('installationQueue', installationQueue);
    console.log('installationSet', installationSet);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
  
  const existingPackages = await getExistingPackages(installationQueue.map(e => e.name));
  console.log('existingPackages', existingPackages);

  for (const package of installationQueue) {
    const packageName = package.name;
    const existingPackage = existingPackages[packageName];
    if (existingPackage) {
      await deep.insert({
        type_id: await deep.id('@deep-foundation/npm-packager', 'Used'),
        from_id: newLink.id,
        to_id: existingPackage.id,
      });
    } else {
      const importedDependency = await deepImport(package.deepJson, package.packageJson);
      await deep.insert({
        type_id: await deep.id('@deep-foundation/npm-packager', 'Installed'),
        from_id: newLink.id,
        to_id: importedDependency.packageId,
      });
      // TODO: Should it be inserted?
      // await deep.insert({
      //   type_id: await deep.id('@deep-foundation/core', 'Contain'),
      //   from_id: newLink.from_id,
      //   to_id: importedDependency.packageId,
      // });
    }
  }

  const imported = await deepImport(deepJson, packageJson);
  await deep.insert({
    type_id: await deep.id('@deep-foundation/core', 'Contain'),
    from_id: newLink.from_id,
    to_id: imported.packageId,
  });
  return imported;
}