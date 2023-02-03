import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import { Packager } from '@deep-foundation/deeplinks/imports/packager';
import pkg from './deep.json';
import config from './config.json';

const gql = generateApolloClient(config.endpoint);
const deep = new DeepClient({ apolloClient: gql });

const shareUserPermissionsWithPackage = async (packageId) => {
  const joinTypeId = await deep.id('@deep-foundation/core', 'Join');
  const result = await deep.insert({
    type_id: joinTypeId,
    from_id: packageId,
    to_id: config.userId,
  });
  return result;
};

const packager = new Packager(deep);
const run = async () => {
  const imported = await packager.import(pkg);
  console.log(imported);
  await shareUserPermissionsWithPackage(imported.packageId);

  console.log('npm-packager package import complete')
}
run();
