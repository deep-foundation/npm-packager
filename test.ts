import {describe, expect, test} from '@jest/globals';
import fetch from 'node-fetch';
import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import config from './config.json';
import { gql } from "@apollo/client";

describe('packager tests', () => {
  it('npm packages search', async () => {
    const searchPackages = async (query) => {
      const deepPackageKeyword = 'deep-package';
      const textParameter = encodeURIComponent(`${query} keywords:${deepPackageKeyword}`);
      const url = `https://registry.npmjs.com/-/v1/search?text=${textParameter}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    };

    const query1 = '123456789';
    const data1 = await searchPackages(query1) as any;
    console.log(JSON.stringify(data1, null, 2));
    expect(data1.objects.length).toBe(0);
    expect(data1.total).toBe(0);

    const query2 = '@deep-foundation/pow';
    const data2 = await searchPackages(query2) as any;
    console.log(JSON.stringify(data2, null, 2));
    expect(data2.objects.length).toBe(1);
    expect(data2.total).toBe(1);
  });

  it('package versions', async () => {
    const apollo = generateApolloClient(config.endpoint);
    const deep = new DeepClient({ apolloClient: apollo });

    const getPackageVersions = async (packageName) => {
      const { data: data } = await deep.apolloClient.query({
        query: gql`query GetPackageVersionsByName($packageTypeId: bigint, $packageVersionTypeId: bigint, $packageName: String) {
          package: links(where: {type_id: {_eq: $packageTypeId}, string: { value: {_eq: $packageName }}}) {
            id
            name: value
            versions: in(where: {type_id: {_eq: $packageVersionTypeId}, string: {value: {_is_null: false}}}) {
              id
              version: value
            }
          }
        }`,
        variables: {
          "packageTypeId": await deep.id('@deep-foundation/core', 'Package'),
          "packageVersionTypeId": await deep.id('@deep-foundation/core', 'PackageVersion'),
          "packageName": packageName
        },
      });
      
      return data;
    };
  
    const data = await getPackageVersions("@deep-foundation/core");
    const versions = data.package[0].versions;
    console.log(versions);
    expect(versions.length).toBe(1);
    const firstVersion = versions[0];
    expect(firstVersion.version.value).toBe("0.0.0");
  }); 
});