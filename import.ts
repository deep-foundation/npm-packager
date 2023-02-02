import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import { Packager } from '@deep-foundation/deeplinks/imports/packager';
import pkg from './deep.json';

const gql = generateApolloClient({
  path: '3006-deepfoundation-dev-h183uazebok.ws-eu85.gitpod.io/gql',
  ssl: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzYyIn0sImlhdCI6MTY3NTM0OTgxMX0.eJZLnHf61FNxUurw50T8uednPokDjBSchq9XznJ9U_4",
});

const deep = new DeepClient({
  apolloClient: gql,
});

const shareAdminPermissionsWithPackage = async (packageId) => {
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
  await shareAdminPermissionsWithPackage(imported.packageId);

  console.log('npm-packager package import complete')
}
run();
