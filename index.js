const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
// Security packages
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

// Load config
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

// Passport config
require('./config/passport')();

// Security middleware
// Set security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "wss:", "ws:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS with proper settings
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.PRODUCTION_URL] 
        : ['http://whatsotp-bcav.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Prevent parameter pollution
app.use(hpp());

// Basic middleware
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Session middleware with enhanced security
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        crypto: {
            secret: process.env.SESSION_SECRET
        }
    }),
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.COOKIE_DOMAIN || undefined
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Host: ${req.get('host')}`);
  next();
});

// Make io accessible to routes
app.set('io', io);

// Make OtpLog model available
const OtpLog = require('./models/OtpLog');

// Global variables for WhatsApp client
global.sock = null;
global.lastQR = null;
global.isConnecting = false;
global.connectionRetryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

// ✅ Start WhatsApp Socket
async function startSocket() {
    // Prevent multiple simultaneous connection attempts
    if (global.isConnecting) {
        console.log('⚠️ Connection attempt already in progress, skipping');
        return;
    }

    try {
        global.isConnecting = true;
        console.log(`Connection attempt #${global.connectionRetryCount + 1}`);

        // Clear existing socket if it exists
        if (global.sock) {
            try {
                global.sock.ev.removeAllListeners();
                global.sock.ws.close();
                global.sock = null;
            } catch (err) {
                console.log('Error cleaning up previous connection:', err.message);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth');
        const { version } = await fetchLatestBaileysVersion();

        global.sock = makeWASocket({
            version,
            auth: state,
            browser: ["Windows", "Chrome", "10"],
            // Remove printQRInTerminal to get rid of the warning
            connectTimeoutMs: 60000, // 60 seconds timeout
            keepAliveIntervalMs: 25000, // 25 seconds keep-alive
            markOnlineOnConnect: false, // Don't immediately mark as online
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
            getMessage: async () => { return { conversation: 'hello' }; }, // Prevent unnecessary message fetching
        });
        
        // Register event listeners inside try block where saveCreds is defined
        global.sock.ev.on('creds.update', saveCreds);
        
        // Register connection update event inside try block as well
        global.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr, isOnline } = update;
            console.log('Connection Update:', update);

            if (qr) {
                console.log('📲 Scan this QR code to log in:');
                qrcode.generate(qr, { small: true });
                
                // Store the QR code for later use
                lastQR = qr;
                
                // Reset retry counter when QR is received
                connectionRetryCount = 0;
                
                // Emit to all clients with the QR code
                io.emit('qr', { qr: qr });
                console.log('QR code emitted to clients');
                
                io.emit('connection-status', { status: 'qr-ready' });
            }

            if (connection === 'close') {
                global.isConnecting = false;
                
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || 'Unknown';
                
                console.log(`Connection closed with status: ${statusCode}, reason: ${reason}`);
                
                // Handle conflict error specially
                if (statusCode === 409 || reason.includes('conflict')) {
                    console.log('🔄 Session conflict detected. There might be another connection active.');
                    global.connectionRetryCount++;
                    
                    if (global.connectionRetryCount > MAX_RETRIES) {
                        console.log(`⚠️ Too many retries (${global.connectionRetryCount}). Removing auth and requesting new scan.`);
                        try {
                            fs.rmSync('auth', { recursive: true, force: true });
                        } catch (err) {
                            console.log('Error removing auth folder:', err.message);
                        }
                        io.emit('connection-status', { status: 'logged-out', message: 'Session conflict. Please scan QR again.' });
                        
                        // Reset counter and delay next attempt
                        global.connectionRetryCount = 0;
                        setTimeout(() => {
                            startSocket();
                        }, RETRY_INTERVAL);
                    } else {
                        io.emit('connection-status', { status: 'reconnecting', reason: 'conflict' });
                        
                        // Add increasing delay between retries
                        setTimeout(() => {
                            startSocket();
                        }, RETRY_INTERVAL * Math.pow(1.5, global.connectionRetryCount));
                    }
                    return;
                } 
                else if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log('🔴 Session invalid. Deleting auth folder...');
                    try {
                        fs.rmSync('auth', { recursive: true, force: true });
                    } catch (err) {
                        console.log('Error removing auth folder:', err.message);
                    }
                    io.emit('connection-status', { status: 'logged-out' });
                    
                    setTimeout(() => {
                        startSocket();
                    }, RETRY_INTERVAL);
                } 
                else if (statusCode === 408 || reason.includes('timed out')) {
                    console.log('⌛ Connection timeout. Retrying...');
                    io.emit('connection-status', { status: 'reconnecting', reason: 'timeout' });
                    
                    setTimeout(() => {
                        startSocket();
                    }, RETRY_INTERVAL);
                }
                else {
                    console.log('🔄 Reconnecting...');
                    io.emit('connection-status', { status: 'reconnecting', reason });
                    
                    setTimeout(() => {
                        startSocket();
                    }, RETRY_INTERVAL);
                }
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');
                io.emit('connection-status', { status: 'connected' });
                
                // Reset connection state
                global.isConnecting = false;
                global.connectionRetryCount = 0;
            }
        });
    } catch (error) {
        console.error('Error starting WhatsApp socket:', error);
        io.emit('connection-status', { status: 'error', message: 'Failed to initialize WhatsApp' });
        
        // Reset connection state
        global.isConnecting = false;
        
        // Implement exponential backoff for retries
        global.connectionRetryCount++;
        const delay = Math.min(RETRY_INTERVAL * Math.pow(2, global.connectionRetryCount - 1), 60000);
        console.log(`Will retry in ${delay / 1000} seconds (attempt ${global.connectionRetryCount})`);
        
        if (global.connectionRetryCount <= MAX_RETRIES) {
            setTimeout(() => {
                startSocket();
            }, delay);
        } else {
            console.log(`Exceeded maximum retry attempts (${MAX_RETRIES}). Please restart the service.`);
        }
    }
}

// Add API endpoint to get QR code
app.get('/api/qr-code', (req, res) => {
    if (!global.lastQR) {
        return res.status(404).json({ error: 'No QR code available yet' });
    }
    
    res.json({ qr: global.lastQR });
});

// Main landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API Documentation page
app.get('/api-docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'api-docs.html'));
});

// Handle direct dashboard.html requests to go through auth middleware
app.get('/modern-dashboard.html', (req, res) => {
    res.redirect('/dashboard');
});

// Debug route to check OAuth configuration
app.get('/debug/oauth', (req, res) => {
    res.json({
        google_client_id_set: Boolean(process.env.GOOGLE_CLIENT_ID),
        google_client_secret_set: Boolean(process.env.GOOGLE_CLIENT_SECRET),
        callback_url: process.env.GOOGLE_CALLBACK_URL,
        node_env: process.env.NODE_ENV,
        host: req.get('host'),
        protocol: req.protocol,
        full_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        expected_callback_full_url: `${req.protocol}://${req.get('host')}/auth/google/callback`
    });
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api', require('./routes/api'));

startSocket();

// These routes are already defined above, so they're not needed here
// The current routes already handle '/' and '/dashboard'


// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send initial connection status
    if (global.sock) {
        socket.emit('connection-status', { 
            status: global.sock.user ? 'connected' : 'disconnected' 
        });
        
        // If we have a QR code, send it immediately
        if (global.lastQR) {
            socket.emit('qr', { qr: global.lastQR });
            socket.emit('connection-status', { status: 'qr-ready' });
        }
    }
    
    // Handle manual reconnection requests
    socket.on('reconnect', () => {
        console.log('Manual reconnection requested');
        
        // Reset connection state
        global.isConnecting = false;
        global.connectionRetryCount = 0;
        global.lastQR = null;
        
        try {
            if (global.sock) {
                global.sock.ev.removeAllListeners();
                global.sock.ws.close();
                global.sock = null;
            }
            fs.rmSync('auth', { recursive: true, force: true });
        } catch (error) {
            console.log('Error during manual reconnection:', error.message);
        }
        
        // Slight delay before reconnecting
        setTimeout(() => {
            startSocket();
        }, 1000);
    });
    
    // Handle logout requests
    socket.on('logout', () => {
        console.log('Logout requested');
        
        if (global.sock) {
            try {
                global.sock.ev.removeAllListeners();
                global.sock.logout();
                global.sock.ws.close();
                global.sock = null;
            } catch (err) {
                console.log('Error during logout:', err.message);
            }
        }
        
        try {
            fs.rmSync('auth', { recursive: true, force: true });
        } catch (error) {
            console.log('Error removing auth folder:', error.message);
        }
        
        global.lastQR = null;
        io.emit('connection-status', { status: 'logged-out' });
        
        // Restart after logout
        setTimeout(() => {
            startSocket();
        }, 1000);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp: global.sock ? 'initialized' : 'not initialized',
        qr: global.lastQR ? 'available' : 'not available',
        user: req.user ? {
            id: req.user._id,
            name: req.user.displayName,
            role: req.user.role
        } : null
    });
});

// Handle 404 errors
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }
    res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Handle server errors - avoid leaking error details in production
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Log the error stack in development only
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }
    
    // Return JSON for API requests
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message
        });
    }
    
    // Return HTML for browser requests
    res.status(500).send(
        process.env.NODE_ENV === 'production'
            ? 'Something went wrong. Please try again later.'
            : `Error: ${err.message}`
    );
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 OTP API running on port ${PORT}`));

