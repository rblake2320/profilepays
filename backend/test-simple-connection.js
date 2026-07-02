const { Client } = require('pg');

async function testConnection() {
  console.log('🔧 Testing simple PostgreSQL connection...');

  // Try different password formats
  const passwords = [
    '?Booker78!',
    'Booker78!',
    '\?Booker78!',
    encodeURIComponent('?Booker78!')
  ];

  for (const password of passwords) {
    console.log(`\nTrying password: "${password}"`);
    
    const client = new Client({
      host: 'localhost',
      port: 5433,
      user: 'postgres',
      password: password,
      database: 'profilepays'
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS with password: "${password}"`);
      await client.end();
      return password;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  return null;
}

testConnection().then(workingPassword => {
  if (workingPassword) {
    console.log(`\n🎉 Working password: "${workingPassword}"`);
  } else {
    console.log('\n❌ No password worked');
  }
});
