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
  const npmLogin = (tempDirectory) => {
    const execSync = require('child_process').execSync;

    const command = `npm set "//registry.npmjs.org/:_authToken" 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`;
    const output = execSync(command, { 
        encoding: 'utf-8',
        cwd: tempDirectory
    });
    console.log(`${command}\n`, output);
    return output;
  };
  const npmPublish = (tempDirectory) => {
    const execSync = require('child_process').execSync;

    const command = `npm publish --access public`;
    const output = execSync(command, { 
        encoding: 'utf-8',
        cwd: tempDirectory
    });
    console.log(`${command}\n`, output);
    return output;
  };
  const makeDeepPackagePath = (tempDirectory, packageName) => [tempDirectory, 'node_modules', packageName].join('/');
  const makeDeepJsonPath = (packagePath) => [packagePath, 'deep.json'].join('/');
  const deepExport = async (packageId) => {
    const packager = new (require('@deep-foundation/deeplinks/imports/packager')).Packager(deep);
    const exported = await packager.export({ packageLinkId: packageId });
    console.log(exported);
    if (exported?.errors?.length) throw exported.errors;
    return exported;
  };

  const { data: [packageQuery] } = await deep.select({ id: newLink.to_id });
  const packageName = packageQuery?.value?.value;
  if (!packageName) {
    throw "Package query value is empty.";
  }
  const tempDirectory = makeTempDirectory();
  npmInstall(packageName, tempDirectory);
  const deepPackagePath = makeDeepPackagePath(tempDirectory, packageName);
  const deepJsonPath = makeDeepJsonPath(deepPackagePath);
  // const pkg = require(deepJsonPath);

  // const npmPckgPath = [pckgDir,'package.json'].join('/');
  // const npmPckgJSON = fs.readFileSync(npmPckgPath, { encoding: 'utf-8' });
  // let npmPckg;
  // let nextVersion;
  // if (!npmPckgJSON) {
  //   errors.push('package.json not founded in installed package');
  //   return { errors };
  // } else {
  //   npmPckg = JSON.parse(npmPckgJSON);
  //   npmPckg.version = nextVersion = semver.inc(npmPckg?.version || '0.0.0', 'patch');
  // }
  // await deep.update({
  //   link: {
  //     type_id: { _eq: _ids?.['@deep-foundation/core']?.PackageVersion },
  //     to_id: { _eq: id },
  //   },
  // }, { value: nextVersion }, { table: 'strings' });
  // fs.writeFileSync(npmPckgPath, JSON.stringify(npmPckg), { encoding: 'utf-8' });
  // const deepPckgContent = await packager.export({ packageLinkId: id });
  // fs.writeFileSync([pckgDir,'deep.json'].join('/'), JSON.stringify(deepPckgContent), { encoding: 'utf-8' });
  // child_process.execSync(`cd ${pckgDir}; npm publish;`,{stdio:[0,1,2]});

  const pkg = await deepExport(newLink.from_id);

  console.log(pkg);

  const encoding = 'utf8';

  fs.writeFileSync(deepJsonPath, JSON.stringify(pkg, null, 2), encoding);

  npmLogin(deepPackagePath);
  npmPublish(deepPackagePath);

  fs.rmSync(tempDirectory, { recursive: true, force: true });
  // const exported = await deepExport();
  // return exported;
}