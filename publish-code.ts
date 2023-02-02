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
  const getPackage = (tempDirectory, packageName) => {
    const packageFile = [tempDirectory, 'node_modules', packageName, 'deep.json'].join('/');
    console.log(packageFile);
    const pkg = require(packageFile);
    console.log(pkg);
    return pkg;
  };

  const { data: [packageQuery] } = await deep.select({ id: newLink.to_id });
  const packageName = packageQuery?.value?.value;
  if (!packageName) {
    throw "Package query value is empty.";
  }
  const tempDirectory = makeTempDirectory();
  npmInstall(packageName, tempDirectory);
  const pkg = getPackage(tempDirectory, packageName);

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

  fs.rmSync(tempDirectory, { recursive: true, force: true });
  // const exported = await deepExport();
  // return exported;
}