import pg from 'pg'

const { Client } = pg
const client = new Client({
  connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
})

const tables = ['artists', 'plans', 'profiles', 'contracts', 'company_settings']

await client.connect()
for (const t of tables) {
  const { rows } = await client.query(
    `select column_name, data_type, is_nullable from information_schema.columns where table_name = $1 order by ordinal_position`,
    [t],
  )
  if (rows.length === 0) {
    console.log(`\n== ${t}: (não existe) ==`)
    continue
  }
  console.log(`\n== ${t} ==`)
  for (const r of rows) console.log(`  ${r.column_name} :: ${r.data_type} ${r.is_nullable === 'YES' ? 'null' : 'NOT NULL'}`)
}
await client.end()
