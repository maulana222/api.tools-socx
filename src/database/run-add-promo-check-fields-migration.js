const sequelize = require('../config/database');
const path = require('path');

async function runMigration() {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../../migrations/add_promo_check_fields_to_isimple_phones.sql');
    const migration = require('fs').readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await sequelize.query(migration);
    
    console.log('✅ Migration completed successfully: add_promo_check_fields_to_isimple_phones');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();