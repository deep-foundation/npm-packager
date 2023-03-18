import {describe, expect, test} from '@jest/globals';
import fetch from 'node-fetch';
import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import config from './config.json';
import { gql } from "@apollo/client";

const apollo = generateApolloClient(config.endpoint);
const deep = new DeepClient({ apolloClient: apollo });

const searchNpmPackages = async (query) => {
  const deepPackageKeyword = 'deep-package';
  const textParameter = encodeURIComponent(`${query} keywords:${deepPackageKeyword}`);
  const url = `https://registry.npmjs.com/-/v1/search?text=${textParameter}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

const getDeepPackagesVersions = async (packagesNames) => {
  const { data: data } = await deep.apolloClient.query({
    query: gql`query GetPackagesVersionsByName($packageVersionTypeId: bigint, $packageNamespaceTypeId: bigint, $packageActiveTypeId: bigint, $packagesNames: [String]) {
      namespaces: links(where: {type_id: {_eq: $packageNamespaceTypeId}, string: { value: {_in: $packagesNames }}}) {
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
      "packagesNames": packagesNames
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

const combinedPackagesSearch = async (query) => {
  const remotePackages = await searchNpmPackages(query);
  const packagesNames = remotePackages.objects.map(rp => rp.package.name);
  const localPackages = await await getDeepPackagesVersions(packagesNames);
  const localPackagesHash = {};
  for (const localPackage of localPackages) {
    localPackagesHash[localPackage.name] = localPackage;
  }
  const packages = remotePackages.objects.map(rp => {
    return {
      remotePackage: rp.package,
      localPackage: localPackagesHash[rp.package.name],
    }
  });
  return {
    installedPackages: packages.filter(p => !!p.localPackage),
    notInstalledPackages: packages.filter(p => !p.localPackage)
  };
};

const getPackageFromNpm = async (packageName) => {
  const url = `https://registry.npmjs.com/${packageName}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

describe('packager tests', () => {
  it('npm packages search', async () => {
    const query1 = '123456789';
    const data1 = await searchNpmPackages(query1) as any;
    console.log(JSON.stringify(data1, null, 2));
    expect(data1.objects.length).toBe(0);
    expect(data1.total).toBe(0);

    const query2 = '@deep-foundation/pow';
    const data2 = await searchNpmPackages(query2) as any;
    console.log(JSON.stringify(data2, null, 2));
    expect(data2.objects.length).toBe(1);
    expect(data2.total).toBe(1);
  });

  it('package versions', async () => {
    const namespaces = await getDeepPackagesVersions(["@deep-foundation/core"]);
    console.log(JSON.stringify(namespaces, null, 2));
    expect(namespaces.length).toBe(1);
    const firstNamespace = namespaces[0];
    expect(firstNamespace.versions[0].version).toBe("0.0.0");
  });

  it('combined packages search', async () => {
    const packages1 = await combinedPackagesSearch("@deep-foundation/pow");
    console.log(JSON.stringify(packages1, null, 2));
    expect(packages1.installedPackages.length).toBe(1);
    const localPackage1 = packages1.installedPackages[0].localPackage;
    expect(localPackage1.versions[0].version).toBe("0.0.7");

    const packages2 = await combinedPackagesSearch("");
    console.log(JSON.stringify(packages2, null, 2));
    expect(packages2.installedPackages.length).toBe(1);
    expect(packages2.notInstalledPackages.length).toBe(3);
    const localPackage2 = packages2.installedPackages[0].localPackage;
    expect(localPackage2.versions[0].version).toBe("0.0.7");
  });

  it('npm package', async () => {
    const packageName = '@deep-foundation/pow';
    const data = await getPackageFromNpm(packageName) as any;
    console.log(JSON.stringify(data, null, 2));
    expect(data.versions["0.0.0"].version).toBe("0.0.0");
  });
});