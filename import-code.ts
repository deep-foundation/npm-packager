async ({ deep, require, gql, data: { newLink } }) => { 
  const { data: [pq] } = await deep.select({ id: newLink.to_id });
  const packageName = pq?.value?.value;
  const requireResult = require('@deep-foundation/deeplinks/imports/packager');
  const packager = new requireResult.Packager(deep);
  // const imported = packager.import(package);
  // if (error) throw error;
  // if (imported?.errors?.length) throw imported.errors;
  // await deep.insert({
  //   type_id: await deep.id('@deep-foundation/core', 'Contain'),
  //   from_id: newLink.from_id,
  //   to_id: imported.packageId,
  // });
  // return imported;
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