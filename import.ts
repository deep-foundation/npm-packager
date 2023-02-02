import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import { Packager } from '@deep-foundation/deeplinks/imports/packager';
import * as fs from 'fs';
import pkg from './deep.json';

// console.log(pkg.data[8]);

const encoding = 'utf8';

pkg.data[8].value.value = fs.readFileSync('install-code.ts', encoding);

// console.log(pkg.data[8]);

fs.writeFileSync('deep.json', JSON.stringify(pkg, null, 2), encoding);

const gql = generateApolloClient({
  path: '3006-deepfoundation-dev-h183uazebok.ws-eu85.gitpod.io/gql',
  ssl: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzYyIn0sImlhdCI6MTY3MzA0MTM1OH0.sn3W9cbCDSuBxt3n4q8Hfxth1ZdPXcmFglQL8VEULeE",
});

const deep = new DeepClient({
  apolloClient: gql,
});

const shareAdminPermissionsWithAdmin = async (packageId) => {
  const adminId = 362;
  const joinTypeId = await deep.id('@deep-foundation/core', 'Join');
  const result = await deep.insert({
    type_id: joinTypeId,
    from_id: packageId,
    to_id: adminId,
  });
  return result;
};

const packager = new Packager(deep);
const run = async () => {
  const imported = await packager.import(pkg);
  console.log(imported);

  const packageTypeId = await deep.id('@deep-foundation/core', 'Package');
  const { data: [deepPackage] } = await deep.select({
    id: { _in: imported.ids },
  	type_id: { _eq: packageTypeId }
  });
  const result = await shareAdminPermissionsWithAdmin(deepPackage.id);
}
run();