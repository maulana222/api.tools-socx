require('dotenv').config();
const express = require('express');
const compression = require('compression');

// Import routes
const authRoutes = require('./routes/auth');
const socxRoutes = require('./routes/socx');
const isimpleNumbersRoutes = require('./routes/isimpleNumbers');
const isimplePhonesRoutes = require('./routes/isimplePhones');
const projectsRoutes = require('./routes/projects');
const promoProductsRoutes = require('./routes/promoProducts');
const isimplePromoCheckRoutes = require('./routes/isimplePromoCheck');
const isimpleProductsRoutes = require('./routes/isimpleProducts');
const DashboardController = require('./controllers/dashboardController');
const TransactionController = require('./controllers/transactionController');
const { authenticateToken } = require('./middlewares/auth');

// Import database connection
const database = require('./config/database');

// Import utilities
const logger = require('./utils/logger');

// Import security middleware
const {
  securityHeaders,
  corsWhitelist,
  authRateLimiter,
  apiRateLimiter,
  sanitizeInput,
  validateContentType,
  preventParameterPollution,
  auditLogger,
  maskSensitiveData,
  validateIP,
  requestSizeLimiter
} = require('./middlewares/security');

// Import BlacklistedToken model for cleanup
const BlacklistedToken = require('./models/BlacklistedToken');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  // Initialize middleware
  initializeMiddlewares() {
    // Trust proxy for correct IP detection behind load balancers
    this.app.set('trust proxy', 1);

    // Security headers
    this.app.use(securityHeaders);

    // CORS whitelist
    this.app.use(corsWhitelist);

    // Request size limit
    this.app.use(requestSizeLimiter);

    // Body parsing middleware (before sanitization)
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security middleware
    this.app.use(validateIP);
    this.app.use(sanitizeInput);
    this.app.use(validateContentType);
    this.app.use(preventParameterPollution);
    this.app.use(maskSensitiveData);

    // Audit logging
    this.app.use(auditLogger);

    // Compression middleware
    this.app.use(compression());

    // Rate limiting: /api/auth = 5 req/15 min (login brute-force); /api/* = 600 req/15 min (semua endpoint lain)
    this.app.use('/api/auth', authRateLimiter);
    this.app.use('/api', apiRateLimiter);
  }

  // Initialize routes
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    
    // Debug: Log before registering socx routes
    this.app.use('/api/socx', (req, res, next) => {
      console.log(`[Server] ${req.method} ${req.originalUrl} - Before socxRoutes`);
      next();
    });
    this.app.use('/api/socx', socxRoutes);

    // Dashboard route
    this.app.get('/api/dashboard/stats', authenticateToken, DashboardController.getDashboardStats);

    // Transaction routes
    this.app.get('/api/transactions', authenticateToken, TransactionController.getTransactions);
    this.app.get('/api/transactions/stats', authenticateToken, TransactionController.getTransactionStats);
    this.app.get('/api/suppliers', authenticateToken, TransactionController.getSuppliers);

    // Isimple Numbers routes
    this.app.use('/api/isimple-numbers', isimpleNumbersRoutes);

    // Isimple Phones routes
    this.app.use('/api/isimple-phones', isimplePhonesRoutes);

    // Projects routes
    this.app.use('/api/projects', projectsRoutes);

    // Promo Products routes
    this.app.use('/api/promo-products', promoProductsRoutes);

    // Isimple Promo Products routes (alias for promo-products)
    this.app.use('/api/isimple-promo', promoProductsRoutes);

    // Isimple Promo Check routes
    this.app.use('/api/isimple-promo-check', isimplePromoCheckRoutes);

    // Isimple Products (harga pasaran referensi)
    this.app.use('/api/isimple-products', isimpleProductsRoutes);

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
      });
    });
  }

  // Initialize error handling
  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
      });
    });
  }

  // Start server
  async start() {
    try {
      // Connect to database
      await database.connect();

      // Start scheduled tasks
      this.startScheduledTasks();

      // Start HTTP server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`, {
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  // Start scheduled tasks
  startScheduledTasks() {
    // Clean up expired blacklisted tokens every hour
    setInterval(async () => {
      try {
        const cleaned = await BlacklistedToken.cleanupExpired();
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} expired blacklisted tokens`);
        }
      } catch (error) {
        logger.error('Error cleaning up expired blacklisted tokens:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    logger.info('Scheduled tasks started');
  }

  // Graceful shutdown
  async gracefulShutdown() {
    logger.info('Received shutdown signal, closing server gracefully...');

    if (this.server) {
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await database.close();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close server after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    }
  }
}

// Create and start server
const server = new Server();
server.start().catch(console.error);

module.exports = server;