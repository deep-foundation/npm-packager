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

    const query2 = '@deep-foundation/pow';
    const data2 = await searchNpmPackages(query2) as any;
    console.log(JSON.stringify(data2, null, 2));
    expect(data2.objects.length).toBe(1);

    const query3 = '';
    const data3 = await searchNpmPackages(query3) as any;
    console.log(JSON.stringify(data3, null, 2));
    
    const npmPackagerPackages = data3.objects.filter(p => p.package.name === '@deep-foundation/npm-packager')
    expect(npmPackagerPackages.length).toBe(1);
  });

  it.skip('package versions', async () => {
    const namespaces = await getDeepPackagesVersions(["@deep-foundation/core"]);
    console.log(JSON.stringify(namespaces, null, 2));
    expect(namespaces.length).toBe(1);
    const firstNamespace = namespaces[0];
    expect(firstNamespace.versions[0].version).toBe("0.0.0");
  });

  it.skip('combined packages search', async () => {
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

  it.skip('npm package', async () => {
    const packageName = '@deep-foundation/pow';
    const data = await getPackageFromNpm(packageName) as any;
    console.log(JSON.stringify(data, null, 2));
    const versions = Object.keys(data.versions);
    versions.sort();
    console.log(versions);
    expect(versions[0]).toBe("0.0.0");
  });

  it.skip('deep.linkId bug', async () => {
    expect(deep.linkId).toBe(config.userId);
  });

  it.skip('GPT prompt', async () => {
    const userId = config.userId;

    // Create a node-link type with name Example1.
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: {
        data: {
          from_id: userId,
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          string: { data: { value: 'Example1' } },
        }
      },
    });

    // Create a node-link type with name Example2.
    // It has attached value of String type.
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: {
        data: {
          from_id: userId,
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          string: { data: { value: 'Example2' } },
        }
      },
      out: {
        data: {
          type_id: await deep.id('@deep-foundation/core', 'Value'),
          to_id: await deep.id('@deep-foundation/core', 'String'),
        }
      }
    });

    // Create a node-link type with name Human.
    // It has attached properties such as age (Number type), gender (String type), and name (String type).
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: {
        data: [
          {
            from_id: userId,
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            string: { data: { value: 'Human' } },
          },
          {
            from_id: await deep.id('@deep-foundation/core', 'Any'),
            type_id: await deep.id('@deep-foundation/core', 'Type'),
            in: {
              data: {
                from_id: userId,
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                string: { data: { value: 'Age' } },
              }
            },
            out: {
              data: {
                type_id: await deep.id('@deep-foundation/core', 'Value'),
                to_id: await deep.id('@deep-foundation/core', 'Number'),
              }
            }
          },
          {
            from_id: await deep.id('@deep-foundation/core', 'Any'),
            type_id: await deep.id('@deep-foundation/core', 'Type'),
            in: {
              data: {
                from_id: userId,
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                string: { data: { value: 'Name' } },
              }
            },
            out: {
              data: {
                type_id: await deep.id('@deep-foundation/core', 'Value'),
                to_id: await deep.id('@deep-foundation/core', 'String'),
              }
            }
          },
          {
            from_id: await deep.id('@deep-foundation/core', 'Any'),
            type_id: await deep.id('@deep-foundation/core', 'Type'),
            in: {
              data: {
                from_id: userId,
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                string: { data: { value: 'Gender' } },
              }
            },
            out: {
              data: {
                type_id: await deep.id('@deep-foundation/core', 'Value'),
                to_id: await deep.id('@deep-foundation/core', 'String'),
              }
            }
          },
        ]
      }
    });

  });

  it.skip('GPT result 1', async () => {
    const userId = config.userId;

    // Create Vehicle type.
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: {
        data: {
          from_id: userId,
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          string: { data: { value: 'Vehicle' } },
        }
      },
    });
  });

  it.skip('GPT result 2', async () => {
    const userId = config.userId;

    // Create a node-link type with name Vehicle.
    // It has attached properties such as NumberOfWheels (Number type).
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: {
        data: [
          {
            from_id: userId,
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            string: { data: { value: 'Vehicle' } },
          },
          {
            from_id: await deep.id('@deep-foundation/core', 'Any'),
            type_id: await deep.id('@deep-foundation/core', 'Type'),
            in: {
              data: {
                from_id: userId,
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                string: { data: { value: 'NumberOfWheels' } },
              }
            },
            out: {
              data: {
                type_id: await deep.id('@deep-foundation/core', 'Value'),
                to_id: await deep.id('@deep-foundation/core', 'Number'),
              }
            }
          },
        ]
      }
    });
  });
});