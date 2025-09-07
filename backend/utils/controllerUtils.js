import logger from './logger.js';
import cacheService from '../services/cacheService.js';

/**
 * Enhanced controller wrapper with caching and logging
 * @param {Function} controllerFunction - The controller function to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.operation - Operation name for logging
 * @param {number} options.cacheTTL - Cache TTL in seconds (0 = no cache)
 * @param {Function} options.cacheKeyGenerator - Function to generate cache key
 * @param {boolean} options.requireAuth - Whether authentication is required
 * @param {Array} options.logFields - Fields to include in logs
 * @returns {Function} Wrapped controller function
 */
export const withCachingAndLogging = (controllerFunction, options = {}) => {
  const {
    operation = 'unknown',
    cacheTTL = 0,
    cacheKeyGenerator = null,
    requireAuth = false,
    logFields = []
  } = options;

  return async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract common request data for logging
    const requestData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      userRole: req.user?.role
    };

    // Add custom fields to request data
    logFields.forEach(field => {
      if (req[field] !== undefined) {
        requestData[field] = req[field];
      }
    });

    try {
      logger.info(`${operation} started`, requestData);

      // Check authentication if required
      if (requireAuth && !req.user) {
        logger.warn(`${operation} failed: Authentication required`, requestData);
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Check cache if TTL is set
      let cacheKey = null;
      let cachedData = null;
      
      if (cacheTTL > 0) {
        cacheKey = cacheKeyGenerator ? 
          cacheKeyGenerator(req) : 
          `api:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
        
        cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
          const duration = Date.now() - startTime;
          logger.cache('CONTROLLER_HIT', cacheKey, true, { 
            operation, 
            duration: `${duration}ms`,
            requestId 
          });
          
          // Handle arrays properly - don't spread arrays as objects
          if (Array.isArray(cachedData)) {
            return res.json(cachedData);
          } else {
            return res.json({
              ...cachedData,
              _cached: true,
              _cacheKey: cacheKey,
              _requestId: requestId
            });
          }
        }
      }

      // Store original res.json to capture response
      const originalJson = res.json.bind(res);
      let responseData = null;

      // Override res.json to capture response for caching
      res.json = (data) => {
        responseData = data;
        return originalJson(data);
      };

      // Execute the controller function
      await controllerFunction(req, res);

      // Cache the response if successful and TTL is set
      if (cacheTTL > 0 && responseData && res.statusCode >= 200 && res.statusCode < 300) {
        await cacheService.set(cacheKey, responseData, cacheTTL);
        logger.cache('CONTROLLER_SET', cacheKey, true, { 
          operation, 
          ttl: cacheTTL,
          requestId 
        });
      }

      const duration = Date.now() - startTime;
      
      // Log performance
      logger.performance(`${operation} completed`, duration, {
        ...requestData,
        statusCode: res.statusCode,
        cached: !!cachedData
      });

      // Log success
      logger.info(`${operation} successful`, {
        ...requestData,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        cached: !!cachedData
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`${operation} failed`, error, {
        ...requestData,
        duration: `${duration}ms`,
        statusCode: res.statusCode || 500
      });

      // Don't send response if already sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal Server Error',
          requestId
        });
      }
    }
  };
};

/**
 * Cache key generators for common patterns
 */
export const cacheKeyGenerators = {
  // For user-specific data
  userSpecific: (req) => `user:${req.user?.id}:${req.method}:${req.originalUrl}`,
  
  // For role-based data
  roleBased: (req) => `role:${req.user?.role}:${req.method}:${req.originalUrl}`,
  
  // For query-based data
  queryBased: (req) => {
    const queryString = req.query ? JSON.stringify(req.query) : '';
    return `query:${req.method}:${req.originalUrl}:${queryString}`;
  },
  
  // For parameter-based data
  paramBased: (req) => {
    const params = req.params ? JSON.stringify(req.params) : '';
    return `param:${req.method}:${req.originalUrl}:${params}`;
  },
  
  // For analytics data
  analytics: (req) => {
    const { timeRange = 'week', userId } = req.params;
    return `analytics:${timeRange}:${userId || req.user?.id}`;
  }
};

/**
 * Common log fields for different controller types
 */
export const logFields = {
  user: ['body.name', 'body.email'],
  quiz: ['body.title', 'body.category', 'params.quizId'],
  analytics: ['params.userId', 'query.timeRange'],
  dashboard: ['params.userId', 'query.timeRange'],
  report: ['body.quizId', 'body.score', 'body.timeSpent']
};

/**
 * Predefined controller configurations
 */
export const controllerConfigs = {
  // User operations (public - login, register)
  user: {
    operation: 'User Operation',
    requireAuth: false,
    logFields: logFields.user
  },
  
  // User operations (authenticated - profile, settings)
  userAuth: {
    operation: 'User Operation',
    requireAuth: true,
    logFields: logFields.user
  },
  
  // Quiz operations
  quiz: {
    operation: 'Quiz Operation',
    requireAuth: true,
    logFields: logFields.quiz
  },
  
  // Analytics operations
  analytics: {
    operation: 'Analytics Operation',
    requireAuth: true,
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: cacheKeyGenerators.analytics,
    logFields: logFields.analytics
  },
  
  // Dashboard operations
  dashboard: {
    operation: 'Dashboard Operation',
    requireAuth: true,
    cacheTTL: 180, // 3 minutes
    cacheKeyGenerator: cacheKeyGenerators.analytics,
    logFields: logFields.dashboard
  },
  
  // Report operations
  report: {
    operation: 'Report Operation',
    requireAuth: true,
    logFields: logFields.report
  },
  
  // Gamification operations
  gamification: {
    operation: 'Gamification Operation',
    requireAuth: true,
    cacheTTL: 60, // 1 minute
    logFields: ['params.userId', 'body.challengeId', 'body.tournamentId']
  },
  
  // Social operations
  social: {
    operation: 'Social Operation',
    requireAuth: true,
    cacheTTL: 120, // 2 minutes
    logFields: ['params.userId', 'body.recipientId', 'body.friendId']
  },
  
  // Study group operations
  studyGroup: {
    operation: 'Study Group Operation',
    requireAuth: true,
    cacheTTL: 180, // 3 minutes
    logFields: ['params.groupId', 'body.groupName', 'body.description']
  },
  
  // Learning path operations
  learningPath: {
    operation: 'Learning Path Operation',
    requireAuth: true,
    cacheTTL: 300, // 5 minutes
    logFields: ['params.pathId', 'body.title', 'body.description']
  },
  
  // Intelligence operations
  intelligence: {
    operation: 'Intelligence Operation',
    requireAuth: true,
    cacheTTL: 60, // 1 minute
    logFields: ['params.userId', 'body.query', 'body.context']
  },
  
  // Real-time quiz operations
  realTimeQuiz: {
    operation: 'Real-time Quiz Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for real-time
    logFields: ['params.roomId', 'body.quizId', 'body.answer']
  },
  
  // Written test operations
  writtenTest: {
    operation: 'Written Test Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for tests
    logFields: ['params.testId', 'body.title', 'body.questions']
  },
  
  // Written test report operations
  writtenTestReport: {
    operation: 'Written Test Report Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for reports
    logFields: ['params.reportId', 'body.username', 'body.testName']
  },
  
  // Migration operations
  migration: {
    operation: 'Migration Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for migrations
    logFields: ['body.operation', 'body.data']
  },
  
  // Debug operations
  debug: {
    operation: 'Debug Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for debug
    logFields: ['body.operation', 'body.data']
  },
  
  // AI question operations
  aiQuestion: {
    operation: 'AI Question Operation',
    requireAuth: true,
    cacheTTL: 0, // No caching for AI generation
    logFields: ['body.topic', 'body.numQuestions', 'body.difficulty']
  },
  
  // Leaderboard operations
  leaderboard: {
    operation: 'Leaderboard Operation',
    requireAuth: true,
    cacheTTL: 300, // 5 minutes
    logFields: ['query.timeRange', 'query.category', 'query.limit']
  },
  
  // Public operations (no auth required)
  public: {
    operation: 'Public Operation',
    requireAuth: false
  }
};
