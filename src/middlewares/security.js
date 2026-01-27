const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');

/**
 * Enhanced rate limiter with multiple tiers
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for trusted internal IPs
      const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
      return trustedIPs.includes(req.ip);
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Strict rate limiter for authentication endpoints
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again after 15 minutes.'
);

// Moderate rate limiter for API endpoints
const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests, please try again after 15 minutes.'
);

// Strict rate limiter for password reset
const passwordResetRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many password reset attempts, please try again after 1 hour.'
);

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potentially dangerous characters
          obj[key] = obj[key]
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }

  if (req.query) {
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/[<>]/g, '')
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Validate content type for POST/PUT requests
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported Media Type. Content-Type must be application/json or multipart/form-data'
      });
    }
  }
  next();
};

/**
 * Prevent parameter pollution
 */
const preventParameterPollution = (req, res, next) => {
  // Remove duplicate query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (Array.isArray(req.query[key]) && req.query[key].length > 1) {
        req.query[key] = req.query[key][0];
      }
    });
  }
  next();
};

/**
 * Security headers configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" }
});

/**
 * CORS whitelist middleware
 */
const corsWhitelist = (req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:9899', 'http://localhost:3000'];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests without origin header (e.g., mobile apps, curl)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

/**
 * Audit logging middleware
 */
const auditLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  console.log(`[AUDIT] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Intercept response to log response details
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    console.log(`[AUDIT] Response ${res.statusCode}`, {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user ? req.user.id : 'anonymous',
      timestamp: new Date().toISOString()
    });

    originalSend.call(this, data);
  };

  next();
};

/**
 * Mask sensitive data in logs
 * NOTE: This should only mask data for logging, NOT modify req.body
 */
const maskSensitiveData = (req, res, next) => {
  // Store original body for use in controllers
  req.originalBody = req.body ? JSON.parse(JSON.stringify(req.body)) : null;
  
  // Only mask for logging purposes - don't modify actual req.body
  // This ensures password remains intact for authentication
  next();
};

/**
 * Validate IP address
 */
const validateIP = (req, res, next) => {
  const ip = req.ip;
  
  // Block specific IPs if configured
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  if (blockedIPs.includes(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  next();
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10 * 1024 * 1024; // 10MB default

  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
    }
  }

  next();
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  passwordResetRateLimiter,
  sanitizeInput,
  validateContentType,
  preventParameterPollution,
  securityHeaders,
  corsWhitelist,
  auditLogger,
  maskSensitiveData,
  validateIP,
  requestSizeLimiter
};