import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import { corePckg } from '@deep-foundation/deeplinks/imports/core';
import config from './config.json';
import * as fs from 'fs';

fs.writeFileSync('core.json', JSON.stringify(corePckg, null, 2), 'utf-8');

process.exit();

const gql = generateApolloClient(config.endpoint);
const deep = new DeepClient({ apolloClient: gql });

const run = async () => {
  // const { data: [{ value: packageName }]} = await deep.select(
  //   { link_id: { _eq: 837 } },
  //   {
  //     table: 'strings',
  //     returning: 'value'
  //   }
  // );
  // console.log(packageName);

  const packageNames = ["@deep-foundation/core"];
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
  console.log(packages);
  const existingPackages = packages.reduce(
    (accumulator, currentValue) => {
      const packageName = currentValue?.name?.value;
      if (currentValue?.versions.length !== 1) {
        throw new Error(`'${packageName}' package must have exactly one version. Now it has ${currentValue?.versions.length} versions.`);
      }
      if (accumulator[packageName]) {
        throw new Error(`Multiple packages with name '${packageName}' exist.`)
      }
      accumulator[packageName] = currentValue?.versions?.[0]?.version?.value;
      return accumulator;
    },
    {}
  );
  console.log(existingPackages);
}
run();