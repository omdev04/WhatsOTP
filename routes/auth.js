const express = require('express');
const passport = require('passport');
const router = express.Router();
const { ensureGuest } = require('../middleware/auth');

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get(
    '/google/callback',
    (req, res, next) => {
        // Log information about the callback request
        console.log('OAuth callback received:');
        console.log(`- URL: ${req.originalUrl}`);
        console.log(`- Host: ${req.get('host')}`);
        console.log(`- Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log(`- Query params:`, req.query);

        // Check for error parameter from Google OAuth
        if (req.query.error) {
            console.error(`OAuth error: ${req.query.error}`);
            return res.redirect('/?error=oauth_failed');
        }

        next();
    },
    passport.authenticate('google', {
        failureRedirect: '/?error=oauth_failed',
    }),
    (req, res) => {
        console.log(`User authenticated successfully: ${req.user.email}`);
        res.redirect('/dashboard');
    }
);

// @desc    Login page
// @route   GET /auth/login
router.get('/login', ensureGuest, (req, res) => {
    res.sendFile('login.html', { root: './views' });
});

// OAuth errors are now redirected to the home page with an error parameter

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res, next) => {
    req.logout((error) => {
        if (error) {
            return next(error);
        }
        res.redirect('/');
    });
});

module.exports = router;
