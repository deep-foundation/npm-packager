async ({ deep, require, gql, data: { newLink } }) => { 
  const { data: [pq] } = await deep.select({ id: newLink.to_id });
  const packageName = pq?.value?.value;
  const requireResult = require('@deep-foundation/deeplinks/imports/packager');
  const packager = new requireResult.Packager(deep);
  return { 
    packageName,
    requireResult,
    requireResultType: typeof requireResult,
    // packager,
    packagerType: typeof packager,
    // packagerImport: packager?.import,
    packagerImportType: typeof packager?.import
  };
}