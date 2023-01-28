async ({ deep, require, gql, data: { newLink } }) => { 
  const { data: [pq] } = await deep.select({ id: newLink.to_id });
  return {};
}