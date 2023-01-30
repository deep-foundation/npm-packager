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
  path: '3006-deepfoundation-dev-h183uazebok.ws-eu84.gitpod.io/gql',
  ssl: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzYyIn0sImlhdCI6MTY3MzA0MTM1OH0.sn3W9cbCDSuBxt3n4q8Hfxth1ZdPXcmFglQL8VEULeE",
});

const deep = new DeepClient({
  apolloClient: gql,
});

// A temporary way to give package admin permissions
const containHandlerIntoAdmin = async (handlerId) => {
  const adminId = 362;
  const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
  const result = await deep.insert({
    type_id: containTypeId,
    from_id: adminId,
    to_id: handlerId,
  });
  return result;
};

const packager = new Packager(deep);
const run = async () => {
  const imported = await packager.import(pkg);
  console.log(imported);

  const handlerTypeId = await deep.id('@deep-foundation/core', 'Handler');
  const { data: [handler] } = await deep.select({
    id: { _in: imported.ids },
  	type_id: { _eq: handlerTypeId }
  });
  const result = await containHandlerIntoAdmin(handler.id);
}
run();