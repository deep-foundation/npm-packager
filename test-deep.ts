import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import config from './config.json';

const gql = generateApolloClient(config.endpoint);
const deep = new DeepClient({ apolloClient: gql });

const run = async () => {
  const { data: [{ value: packageName }]} = await deep.select(
    { link_id: { _eq: 837 } },
    {
      table: 'strings',
      returning: 'value'
    }
  );
  console.log(packageName);
}
run();