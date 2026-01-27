const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }

  // Transaction support
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection) {
    await connection.commit();
    connection.release();
  }

  async rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
  }
}

module.exports = new Database();