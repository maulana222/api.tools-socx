const { body, validationResult } = require('express-validator');
const SocxToken = require('../models/SocxToken');

class SocxTokenController {
  static saveValidation = [
    body('apiToken')
      .notEmpty()
      .withMessage('API token is required')
      .trim()
  ];

  static async save(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { apiToken } = req.body;
      const userId = req.user.id;

      const result = await SocxToken.save(userId, apiToken);

      res.json({
        success: true,
        message: 'Socx API token saved successfully',
        data: {
          expiresAt: result.expiresAt
        }
      });
    } catch (error) {
      console.error('Save Socx token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async get(req, res) {
    try {
      const userId = req.user.id;
      const token = await SocxToken.getActive(userId);

      if (!token) {
        return res.json({
          success: true,
          data: {
            hasToken: false,
            token: null
          }
        });
      }

      res.json({
        success: true,
        data: {
          hasToken: true,
          token: {
            isActive: token.isActive,
            expiresAt: token.expiresAt,
            isValid: token.isValid(),
            isExpiringSoon: token.isExpiringSoon(),
            createdAt: token.createdAt,
            updatedAt: token.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Get Socx token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async deactivate(req, res) {
    try {
      const userId = req.user.id;
      await SocxToken.deactivate(userId);

      res.json({
        success: true,
        message: 'Socx API token deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate Socx token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async delete(req, res) {
    try {
      const userId = req.user.id;
      await SocxToken.delete(userId);

      res.json({
        success: true,
        message: 'Socx API token deleted successfully'
      });
    } catch (error) {
      console.error('Delete Socx token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async history(req, res) {
    try {
      const userId = req.user.id;
      const tokens = await SocxToken.getAll(userId);

      res.json({
        success: true,
        data: {
          tokens: tokens.map(token => ({
            id: token.id,
            isActive: token.isActive,
            expiresAt: token.expiresAt,
            isValid: token.isValid(),
            isExpiringSoon: token.isExpiringSoon(),
            createdAt: token.createdAt,
            updatedAt: token.updatedAt
          }))
        }
      });
    } catch (error) {
      console.error('Get Socx token history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = SocxTokenController;