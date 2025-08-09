const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');

// Require auth for all dashboard routes
router.use(ensureAuth);

// @desc    Dashboard main page
// @route   GET /dashboard
router.get('/', (req, res) => {
    res.sendFile('modern-dashboard.html', { root: './views' });
});

// @desc    User profile info
// @route   GET /dashboard/profile
router.get('/profile', (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.displayName,
            email: req.user.email,
            image: req.user.image,
            role: req.user.role
        }
    });
});

module.exports = router;
