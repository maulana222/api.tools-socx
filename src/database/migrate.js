require('dotenv').config();
const database = require('../config/database');
const fs = require('fs');
const path = require('path');

class DatabaseMigration {
  constructor() {
    this.migrations = [
      {
        name: 'create_users_table',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(30) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_username (username),
            INDEX idx_email (email),
            INDEX idx_role (role),
            INDEX idx_is_active (is_active)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
      }
    ];
  }

  async runMigrations() {
    try {
      console.log('🔄 Starting database migration...');

      // Connect to database
      await database.connect();

      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Run pending migrations
      for (const migration of this.migrations) {
        const isMigrated = await this.isMigrationRun(migration.name);

        if (!isMigrated) {
          console.log(`📋 Running migration: ${migration.name}`);
          await database.query(migration.sql);
          await this.recordMigration(migration.name);
          console.log(`✅ Migration completed: ${migration.name}`);
        } else {
          console.log(`⏭️  Migration already run: ${migration.name}`);
        }
      }

      console.log('🎉 All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await database.close();
    }
  }

  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await database.query(sql);
  }

  async isMigrationRun(name) {
    const sql = 'SELECT id FROM migrations WHERE name = ?';
    const result = await database.query(sql, [name]);
    return result.length > 0;
  }

  async recordMigration(name) {
    const sql = 'INSERT INTO migrations (name) VALUES (?)';
    await database.query(sql, [name]);
  }

  async rollbackMigration(migrationName) {
    try {
      console.log(`🔄 Rolling back migration: ${migrationName}`);

      await database.connect();

      // Find the migration
      const migration = this.migrations.find(m => m.name === migrationName);
      if (!migration) {
        throw new Error(`Migration ${migrationName} not found`);
      }

      // Execute rollback if defined
      if (migration.rollback) {
        await database.query(migration.rollback);
      } else {
        console.log(`⚠️  No rollback defined for migration: ${migrationName}`);
      }

      // Remove from migrations table
      const sql = 'DELETE FROM migrations WHERE name = ?';
      await database.query(sql, [migrationName]);

      console.log(`✅ Migration rolled back: ${migrationName}`);
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      await database.close();
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const migration = new DatabaseMigration();
  migration.runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigration;