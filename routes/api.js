const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Generate or retrieve API token
// @route   GET /api/token
router.get('/token', ensureAuth, async (req, res) => {
    try {
        console.log('API Token request:');
        console.log('User:', req.user._id);

        let user = req.user;
        let tokenGenerated = false;

        // Generate new token if one doesn't exist
        if (!user.apiToken) {
            // Create a more secure token with higher entropy
            const buffer = crypto.randomBytes(32);
            const timestamp = Date.now().toString();
            const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET);
            hmac.update(buffer);
            hmac.update(user._id.toString());
            hmac.update(timestamp);
            
            const token = hmac.digest('hex');
            
            user.apiToken = token;
            user.tokenCreatedAt = new Date();
            await user.save();
            
            console.log(`Token generated: ${token.substring(0, 8)}...`);
            tokenGenerated = true;
            
            // Clear token from any auth cache if it exists
            if (global.authCache) {
                Object.keys(global.authCache).forEach(key => {
                    if (global.authCache[key].user && 
                        global.authCache[key].user._id.toString() === user._id.toString()) {
                        delete global.authCache[key];
                    }
                });
            }
        }

        res.json({
            success: true,
            token: user.apiToken,
            created: tokenGenerated ? 'just now' : user.tokenCreatedAt,
            instructions: {
                usage: "Include this token in your API requests by adding the 'x-api-token' header.",
                example: {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-token": user.apiToken
                    }
                },
                security: "Keep this token secure. It provides full access to your WhatsOTP account."
            }
        });
    } catch (error) {
        console.error('Error generating API token:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating API token'
        });
    }
});

// @desc    Regenerate API token
// @route   POST /api/token/regenerate
router.post('/token/regenerate', ensureAuth, async (req, res) => {
    try {
        let user = req.user;

        // Create a more secure token with higher entropy
        const buffer = crypto.randomBytes(32);
        const timestamp = Date.now().toString();
        const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET);
        hmac.update(buffer);
        hmac.update(user._id.toString());
        hmac.update(timestamp);
        
        const token = hmac.digest('hex');
        
        // Store old token temporarily for logging
        const oldToken = user.apiToken ? user.apiToken.substring(0, 8) + '...' : 'none';
        
        // Update user
        user.apiToken = token;
        user.tokenCreatedAt = new Date();
        await user.save();
        
        console.log(`Token regenerated for user ${user._id}. Old token: ${oldToken}, New token: ${token.substring(0, 8)}...`);
        
        // Clear token from any auth cache
        if (global.authCache) {
            Object.keys(global.authCache).forEach(key => {
                if (global.authCache[key].user && 
                    global.authCache[key].user._id.toString() === user._id.toString()) {
                    delete global.authCache[key];
                }
            });
        }

        res.json({
            success: true,
            token: user.apiToken,
            created: 'just now',
            message: 'API token regenerated successfully. Previous token has been invalidated.'
        });
    } catch (error) {
        console.error('Error regenerating API token:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while regenerating API token'
        });
    }
});

// @desc    Revoke API token
// @route   POST /api/token/revoke
router.post('/token/revoke', ensureAuth, async (req, res) => {
    try {
        let user = req.user;

        user.apiToken = null;
        await user.save();

        res.json({
            success: true,
            message: 'API token revoked successfully'
        });
    } catch (error) {
        console.error('Error revoking API token:', error);
        res.status(500).json({
            success: false,
            message: 'Error revoking API token'
        });
    }
});

module.exports = router;
