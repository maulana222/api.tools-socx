const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetting admin password...\n');
    
    await database.connect();
    
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    console.log('Password to set:', newPassword);
    console.log('Hashed password:', hashedPassword);
    
    // Update password
    await database.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log('\n✅ Admin password updated successfully!');
    
    // Verify by fetching and testing
    const users = await database.query('SELECT * FROM users WHERE username = ?', ['admin']);
    const admin = users[0];
    
    const isValid = await bcrypt.compare(newPassword, admin.password);
    console.log('Verification:', isValid ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();