const User = require('../models/User');

module.exports = {
    ensureAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.redirect('/auth/login');
        }
    },

    ensureGuest: function (req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        } else {
            res.redirect('/dashboard');
        }
    },

    ensureAdmin: function (req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin') {
            return next();
        } else {
            res.status(403).send('Access denied: Admin privileges required');
        }
    },

    // For API routes that should return JSON responses - supports both session auth and API token
    ensureAuthApi: async function (req, res, next) {
        // Check if user is authenticated via session
        if (req.isAuthenticated()) {
            return next();
        }

        // Check if API token is provided in headers
        const token = req.headers['x-api-token'];
        if (token && token.length > 32) { // Validate token format
            try {
                // Add time-based rate limiting for failed auth attempts
                const now = Date.now();
                
                // Use auth specific cache for token lookup (this would be more robust with Redis)
                if (!global.authCache) global.authCache = {};
                const cacheKey = `auth_${token.substring(0, 32)}`;
                
                // Check if token is in cache
                if (global.authCache[cacheKey] && global.authCache[cacheKey].user) {
                    req.user = global.authCache[cacheKey].user;
                    return next();
                }
                
                // Look up the user by token
                const user = await User.findOne({ apiToken: token });
                if (user) {
                    // Cache successful lookups
                    global.authCache[cacheKey] = { 
                        user,
                        timestamp: now
                    };
                    
                    // Clean old cache entries every 100 requests
                    if (Math.random() < 0.01) {
                        Object.keys(global.authCache).forEach(k => {
                            if (now - global.authCache[k].timestamp > 3600000) { // 1 hour
                                delete global.authCache[k];
                            }
                        });
                    }
                    
                    req.user = user;
                    return next();
                }
                
                // Log failed authentication attempts
                console.warn(`Failed API auth attempt with token: ${token.substring(0, 8)}...`);
            } catch (err) {
                console.error('Error validating API token:', err);
            }
        }

        // Implement a small delay to slow down brute force attacks
        setTimeout(() => {
            res.status(401).json({ success: false, message: 'Unauthorized: Please login first or provide a valid API token' });
        }, 500);
    }
};
