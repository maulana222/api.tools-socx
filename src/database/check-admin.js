const path = require('path');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  try {
    console.log('Checking admin user...\n');
    
    await database.connect();
    
    // Check if admin exists
    const users = await database.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      console.log('❌ Admin user not found in database');
      process.exit(1);
    }
    
    const admin = users[0];
    console.log('✅ Admin user found:');
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Is Active:', admin.is_active);
    console.log('   Is Locked:', admin.is_locked);
    console.log('   Password Hash:', admin.password ? 'Present (hashed)' : 'Missing');
    
    // Test password verification
    const testPassword = 'Admin123!';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    
    console.log('\n🔐 Password Test:');
    console.log('   Test password:', testPassword);
    console.log('   Password valid:', isValid ? '✅ YES' : '❌ NO');
    
    if (!isValid) {
      console.log('\n⚠️  Password verification failed!');
      console.log('   This might be due to password mismatch during creation.');
      
      // Let's recreate the admin user with correct password
      console.log('\n🔄 Recreating admin user...');
      const hashedPassword = await bcrypt.hash(testPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      await database.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      console.log('✅ Admin password updated successfully!');
      
      // Verify again
      const isValidAfterUpdate = await bcrypt.compare(testPassword, hashedPassword);
      console.log('   New password valid:', isValidAfterUpdate ? '✅ YES' : '❌ NO');
    }
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();