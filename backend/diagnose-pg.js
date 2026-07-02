const { Client } = require('pg');

const passwords = [
  '?Booker78!',
  'postgres',
  'admin',
  '',
  'password',
  'Booker78!',
  'test123'
];

async function testPasswords() {
  console.log('🔐 Testing different PostgreSQL passwords...\n');

  for (const password of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres'
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS! Password: "${password}"`);
      
      // Try to create profilepays database
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
      return password;
    } catch (error) {
      console.log(`❌ Failed with password: "${password}" - ${error.message}`);
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  return null;
}

testPasswords().then(password => {
  if (password) {
    console.log(`\n🎉 Use password: "${password}" for your .env file`);
  } else {
    console.log('\n💡 You may need to reset the PostgreSQL password using pgAdmin or command line tools');
  }
});
