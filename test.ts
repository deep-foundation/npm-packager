import {describe, expect, test} from '@jest/globals';
import fetch from 'node-fetch';

describe('packager tests', () => {
  it('package search request', async () => {
    const searchPackages = async (query) => {
      const deepPackageKeyword = 'deep-package';
      const textParameter = encodeURIComponent(`${query} keywords:${deepPackageKeyword}`);
      const url = `https://registry.npmjs.com/-/v1/search?text=${textParameter}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    };

    const query1 = 'test';
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
});