const { Client } = require('pg');

async function testDatabase() {
  console.log('🗄️ Testing final Docker PostgreSQL connection...');

  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'Booker78',
    database: 'profilepays'
  });

  try {
    await client.connect();
    console.log('✅ Connected to Docker PostgreSQL');

    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('✅ Database version:', result.rows[0].version);

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
}

testDatabase();
