const database = require('../config/database');

class BlacklistedToken {
  /**
   * Add a token to the blacklist
   * @param {string} token - The JWT token to blacklist
   * @param {Date} expiryDate - Token expiration date
   * @param {string} reason - Reason for blacklisting (logout, password_change, etc.)
   * @param {number} userId - User ID associated with the token
   * @returns {Promise<Object>}
   */
  static async add(token, expiryDate, reason = 'logout', userId = null) {
    try {
      const sql = `
        INSERT INTO blacklisted_tokens (token, expires_at, reason, user_id, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      await database.query(sql, [token, expiryDate, reason, userId]);
      return { success: true };
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - The JWT token to check
   * @returns {Promise<boolean>}
   */
  static async isBlacklisted(token) {
    try {
      const sql = `
        SELECT id FROM blacklisted_tokens
        WHERE token = ? AND expires_at > NOW()
        LIMIT 1
      `;
      
      const result = await database.query(sql, [token]);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking blacklisted token:', error);
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user (e.g., after password change)
   * @param {number} userId - User ID
   * @param {string} reason - Reason for blacklisting
   * @returns {Promise<Object>}
   */
  static async blacklistAllUserTokens(userId, reason = 'password_change') {
    try {
      const sql = `
        INSERT INTO blacklisted_tokens (token, expires_at, reason, user_id, created_at)
        SELECT
          token,
          expires_at,
          ? as reason,
          ? as user_id,
          NOW() as created_at
        FROM (
          -- Note: In a real implementation, you would need to track active tokens
          -- This is a placeholder that would need to be integrated with your token storage
          SELECT 'all' as token, NOW() as expires_at
        ) as placeholder
      `;
      
      await database.query(sql, [reason, userId]);
      return { success: true };
    } catch (error) {
      console.error('Error blacklisting all user tokens:', error);
      throw new Error('Failed to blacklist all user tokens');
    }
  }

  /**
   * Clean up expired blacklisted tokens (run periodically)
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  static async cleanupExpired() {
    try {
      const sql = `
        DELETE FROM blacklisted_tokens
        WHERE expires_at < NOW()
      `;
      
      const result = await database.query(sql);
      return result.affectedRows || 0;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}

module.exports = BlacklistedToken;