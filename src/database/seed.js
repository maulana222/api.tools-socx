const path = require('path');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const database = require('../config/database');
const User = require('../models/User');

class DatabaseSeeder {
  constructor() {
    this.seeders = [
      {
        name: 'create_admin_user',
        run: this.createAdminUser.bind(this)
      }
    ];
  }

  async runSeeds() {
    try {
      console.log('🌱 Starting database seeding...');

      // Connect to database
      await database.connect();

      // Create seeds table if it doesn't exist
      await this.createSeedsTable();

      // Run pending seeds
      for (const seeder of this.seeders) {
        const isSeeded = await this.isSeeded(seeder.name);

        if (!isSeeded) {
          console.log(`📋 Running seeder: ${seeder.name}`);
          await seeder.run();
          await this.recordSeed(seeder.name);
          console.log(`✅ Seeder completed: ${seeder.name}`);
        } else {
          console.log(`⏭️  Seeder already run: ${seeder.name}`);
        }
      }

      console.log('🎉 All seeding completed successfully!');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await database.close();
    }
  }

  async createSeedsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS seeds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await database.query(sql);
  }

  async isSeeded(name) {
    const sql = 'SELECT id FROM seeds WHERE name = ?';
    const result = await database.query(sql, [name]);
    return result.length > 0;
  }

  async recordSeed(name) {
    const sql = 'INSERT INTO seeds (name) VALUES (?)';
    await database.query(sql, [name]);
  }

  async createAdminUser() {
    const adminData = {
      username: 'admin',
      email: 'admin@socx.com',
      password: 'Admin123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin'
    };

    try {
      // Check if admin already exists
      const existingAdmin = await User.findByUsername(adminData.username);
      if (existingAdmin) {
        console.log('ℹ️  Admin user already exists, skipping...');
        return;
      }

      await User.create(adminData);
      console.log('👤 Admin user created successfully');
    } catch (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.runSeeds()
    .then(() => {
      console.log('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSeeder;