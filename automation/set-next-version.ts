import * as fs from 'fs';
import pkg from '../deep.json' assert { type: 'json' };
import npmPackage from '../package.json' assert { type: 'json' };
import semver from 'semver';

const encoding = 'utf8';

const nextVersion = npmPackage.version = semver.inc(npmPackage?.version || '0.0.0', 'patch');
pkg.package.version = nextVersion;

fs.writeFileSync('package.json', JSON.stringify(npmPackage, null, 2), encoding);
fs.writeFileSync('deep.json', JSON.stringify(pkg, null, 2), encoding);

console.log(nextVersion);
