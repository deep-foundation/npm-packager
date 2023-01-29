import pkg_ from './deep.json';

const packageName = "@deep-foundation/pow";

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