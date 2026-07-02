const { Client } = require('pg');

async function testDatabase() {
  console.log('🗄️ Testing database connection...');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '?Booker78!',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if profilepays database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'profilepays'"
    );

    if (result.rows.length === 0) {
      console.log('📦 Creating profilepays database...');
      await client.query('CREATE DATABASE profilepays');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ profilepays database already exists');
    }

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
}

testDatabase();