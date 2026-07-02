const { Client } = require('pg');

async function testDatabase() {
  console.log('🗄️ Testing Docker PostgreSQL connection...');

  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '?Booker78!',
    database: 'profilepays'
  });

  try {
    await client.connect();
    console.log('✅ Connected to Docker PostgreSQL');

    // List databases
    const result = await client.query('\l');
    console.log('✅ Connection successful, database accessible');

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
}

testDatabase();
