const fs = require('fs');
const { execSync } = require('child_process');
const { Client } = require('pg');

async function setupDatabase() {
  console.log('🛠️ Setting up PostgreSQL database with trust authentication...\n');

  try {
    // Step 1: Backup current pg_hba.conf
    console.log('1. Backing up pg_hba.conf...');
    const pgHbaPath = 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf';
    const backupPath = 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup';
    
    // Read current config
    const currentConfig = fs.readFileSync(pgHbaPath, 'utf8');
    
    // Create trust config temporarily
    const trustConfig = currentConfig.replace(/scram-sha-256/g, 'trust');
    
    console.log('2. Creating temporary trust configuration...');
    
    // We'll need to do this manually as we need admin privileges
    console.log('❌ This requires administrator privileges.');
    console.log('💡 Manual steps needed:');
    console.log('   1. Run Command Prompt as Administrator');
    console.log('   2. Copy pg_hba.conf to backup:');
    console.log('      copy "C:\Program Files\PostgreSQL\16\data\pg_hba.conf" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup"');
    console.log('   3. Edit pg_hba.conf and change all "scram-sha-256" to "trust"');
    console.log('   4. Restart PostgreSQL service:');
    console.log('      net stop postgresql-x64-16');
    console.log('      net start postgresql-x64-16');
    console.log('   5. Run this command to set password:');
    console.log('      psql -U postgres -d postgres -c "ALTER USER postgres PASSWORD \'?Booker78!\';"');
    console.log('   6. Restore original pg_hba.conf:');
    console.log('      copy "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"');
    console.log('   7. Restart PostgreSQL service again');
    
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

setupDatabase();
