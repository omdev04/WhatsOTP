const express = require('express');
const router = express.Router();
const OtpLog = require('../models/OtpLog');
const { ensureAuthApi } = require('../middleware/auth');

// All routes in this file require authentication
router.use(ensureAuthApi);

// @desc    Send OTP via WhatsApp
// @route   POST /api/otp/send
router.post('/send', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    const timestamp = new Date().toISOString();

    // Standard OTP message
    const message = `Your OTP is: ${otp}. Valid for 5 minutes.`;

    try {
        // Check if sock is initialized and ready
        if (!global.sock || !global.sock.user) {
            throw new Error('WhatsApp is not connected. Please scan the QR code to connect first.');
        }

        await global.sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message });

        // Save OTP log to database
        await OtpLog.create({
            phone,
            otp,
            expiry: new Date(expiry),
            sentBy: req.user._id
        });

        // Emit event to all connected clients
        req.app.get('io').emit('otp-sent', {
            phone,
            timestamp,
            success: true,
            user: {
                id: req.user._id,
                name: req.user.displayName
            }
        });

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Error sending OTP:', err);

        // Emit failure event
        req.app.get('io').emit('otp-sent', {
            phone,
            timestamp,
            success: false,
            error: err.message,
            user: {
                id: req.user._id,
                name: req.user.displayName
            }
        });

        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// @desc    Verify OTP
// @route   POST /api/otp/verify
router.post('/verify', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    try {
        const record = await OtpLog.findOne({
            phone,
            otp: parseInt(otp),
            verified: false,
            expiry: { $gt: new Date() }
        });

        const timestamp = new Date().toISOString();

        if (!record) {
            req.app.get('io').emit('otp-verified', {
                phone,
                timestamp,
                success: false,
                reason: 'invalid-or-expired',
                user: {
                    id: req.user._id,
                    name: req.user.displayName
                }
            });
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Mark OTP as verified
        record.verified = true;
        record.verifiedAt = new Date();
        await record.save();

        req.app.get('io').emit('otp-verified', {
            phone,
            timestamp,
            success: true,
            user: {
                id: req.user._id,
                name: req.user.displayName
            }
        });

        res.json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
});

// @desc    Get OTP logs for authenticated user
// @route   GET /api/otp/logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await OtpLog.find({ sentBy: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching OTP logs:', error);
        res.status(500).json({ success: false, message: 'Server error fetching logs' });
    }
});

module.exports = router;
