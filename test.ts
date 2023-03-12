import {describe, expect, test} from '@jest/globals';
import fetch from 'node-fetch';

describe('packager tests', () => {
  it('package search request', async () => {
    const searchPackages = async (query) => {
      const deepPackageKeyword = 'deep-package';
      const textParameter = encodeURIComponent(`${query} keywords:${deepPackageKeyword}`);
      const response = await fetch(`https://registry.npmjs.com/-/v1/search?text=${textParameter}`);
      const data = await response.json();
      return data;
    };

    const query = 'test';
    const data = await searchPackages(query) as any;
    console.log(data);
    expect(data.objects.length).toBe(0);
    expect(data.total).toBe(0);
  });
});