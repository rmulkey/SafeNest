import { createClient } from '@sanity/client';
const client = createClient({ projectId: 'ofvgjgsi', dataset: 'production', apiVersion: '2024-01-01', useCdn: false });
const rows = await client.fetch('*[_type=="toyReview"]|order(_id){_id,productName,brand}');
for (const r of rows) console.log(`${r._id} | ${r.brand} | ${r.productName}`);
console.log(`\nTotal: ${rows.length}`);
