const bcrypt = require('bcryptjs');
const database = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.role = data.role || 'user';
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, firstName, lastName, role = 'user' } = userData;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const sql = `
      INSERT INTO users (username, email, password, first_name, last_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [username, email, hashedPassword, firstName, lastName, role];

    try {
      const result = await database.query(sql, params);
      return { id: result.insertId, ...userData };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        } else if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const sql = `
      SELECT id, username, email, password, first_name, last_name, role, is_active, is_locked, locked_until,
             login_attempts, last_login_attempt, last_login_at, last_login_ip, created_at, updated_at
      FROM users
      WHERE id = ? AND is_active = true
    `;

    const users = await database.query(sql, [id]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Find user by username (including locked users for security tracking)
  static async findByUsername(username, includeInactive = false) {
    const activeCondition = includeInactive ? '' : 'AND is_active = true';
    const sql = `
      SELECT id, username, email, password, first_name, last_name, role, is_active, is_locked, locked_until,
             login_attempts, last_login_attempt, last_login_at, last_login_ip, created_at, updated_at
      FROM users
      WHERE username = ? ${activeCondition}
    `;

    const users = await database.query(sql, [username]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = `
      SELECT id, username, email, password, first_name, last_name, role, is_active, is_locked, locked_until,
             login_attempts, last_login_attempt, last_login_at, last_login_ip, created_at, updated_at
      FROM users
      WHERE email = ? AND is_active = true
    `;

    const users = await database.query(sql, [email]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Verify password
  async verifyPassword(password) {
    console.log('🔍 Verifying password...');
    console.log('   Input password length:', password?.length);
    console.log('   Stored password exists:', !!this.password);
    console.log('   Stored password length:', this.password?.length);
    
    if (!password || !this.password) {
      console.log('❌ Missing password or stored password');
      return false;
    }
    
    const result = await bcrypt.compare(password, this.password);
    console.log('   Bcrypt compare result:', result);
    return result;
  }

  // Update user
  async update(updateData) {
    const fields = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined) {
        const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
        fields.push(`${dbKey} = ?`);
        params.push(updateData[key]);
      }
    });

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    params.push(this.id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await database.query(sql, params);

    // Refresh the object with updated data
    Object.assign(this, updateData);
    return true;
  }

  // Soft delete user
  async deactivate() {
    const sql = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?';
    await database.query(sql, [this.id]);
    this.isActive = false;
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get all users (admin only)
  static async findAll(limit = 10, offset = 0) {
    const sql = `
      SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await database.query(sql, [limit, offset]);
    return users.map(user => new User(user));
  }
}

module.exports = User;