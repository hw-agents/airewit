require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const hash = await bcrypt.hash('Password123!', 12);

  let sql = fs.readFileSync(
    path.join(__dirname, '..', 'seeds', '001_seed_test_data.sql'),
    'utf8'
  );

  // Replace placeholder hash with real bcrypt hash
  sql = sql.replace(/\$2b\$10\$REPLACE_WITH_REAL_HASH/g, hash);

  try {
    await pool.query(sql);
    console.log('✅ Seed data inserted');
  } catch (err) {
    // Ignore duplicate key errors (idempotent re-run)
    if (err.code === '23505') {
      console.log('ℹ️  Seed data already present, skipping');
    } else {
      console.error('❌ Seed error:', err.message);
      process.exit(1);
    }
  }

  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
