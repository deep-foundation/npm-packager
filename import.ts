import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import { Packager } from '@deep-foundation/deeplinks/imports/packager';
import * as fs from 'fs';
import pkg from './deep.json';
console.log(pkg.data[8]);

pkg.data[8].value.value = 
fs.readFileSync('import-code.ts','utf8');

console.log(pkg.data[8])

const rootClient = generateApolloClient({
  path: '3006-deepfoundation-dev-0yi8rt7ah16.ws-eu84.gitpod.io/gql',
  ssl: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzYyIn0sImlhdCI6MTY3MzA0MTM1OH0.sn3W9cbCDSuBxt3n4q8Hfxth1ZdPXcmFglQL8VEULeE",
});

const root = new DeepClient({
  apolloClient: rootClient,
});

const packager = new Packager(root);
const run = async () => {
  const { errors, packageId, namespaceId } = await packager.import(pkg);

  console.log(errors);
  console.log(packageId);
  console.log(namespaceId);
}
run();