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
        query: gql`query GetPackageVersionsByName($packageVersionTypeId: bigint, $packageNamespaceTypeId: bigint, $packageActiveTypeId: bigint, $packageName: String) {
          namespaces: links(where: {type_id: {_eq: $packageNamespaceTypeId}, string: { value: {_eq: $packageName }}}) {
            id
            name: value
            versions: out(where: {type_id: {_eq: $packageVersionTypeId}, string: {value: {_is_null: false}}}) {
              id
              version: value
              packageId: to_id
            }
            active: out(where: {type_id: {_eq: $packageVersionTypeId}, string: {value: {_is_null: false}}}) {
              id
              version: value
              packageId: to_id
            }
          }
        }`,
        variables: {
          "packageVersionTypeId": await deep.id('@deep-foundation/core', 'PackageVersion'),
          "packageNamespaceTypeId": await deep.id('@deep-foundation/core', 'PackageNamespace'),
          "packageActiveTypeId": await deep.id('@deep-foundation/core', 'PackageNamespace'),
          "packageName": packageName
        },
      });

      console.log(JSON.stringify(data, null, 2));
      
      return data.namespaces.map(namespace => {
        const activeVersion = namespace.active.map(version => {
          return {
            packageId: version?.packageId,
            version: version?.version?.value
          }
        })[0];
        return {
          namespaceId: namespace.id,
          name: namespace.name.value,
          activeVersion: activeVersion,
          versions: namespace.versions.map(version => {
            return {
              packageId: version?.packageId,
              version: version?.version?.value,
              isActive: version?.packageId === activeVersion?.packageId
            }
          })
        }
      })
    };
  
    const packages = await getPackageVersions("@deep-foundation/core");
    console.log(JSON.stringify(packages, null, 2));
    expect(packages.length).toBe(1);
    const firstPackage = packages[0];
    expect(firstPackage.versions[0].version).toBe("0.0.0");
  });
});