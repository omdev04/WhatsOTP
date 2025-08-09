/**
 * Modern WhatsApp OTP Dashboard
 */
class ModernWhatsAppOTP {
    constructor() {
        // Initialize Socket.io connection
        this.socket = io();
        
        // Debug socket connection
        this.socket.on('connect', () => {
            console.log('Socket connected with ID:', this.socket.id);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        // Initialize theme based on user preference or stored setting
        this.initTheme();
        
        this.initElements();
        this.setupEventListeners();
        this.setupSocketEvents();
        this.logs = [];
        this.addLog('System initialized', 'info');
        
        // Try to fetch QR code on initialization
        this.qrCodeText.textContent = 'Fetching QR code...';
        this.qrCodeImage.style.display = 'none';
        this.qrCodeText.style.display = 'block';
        
        // Fetch QR code from API after a short delay
        setTimeout(() => {
            this.fetchQrCodeFromApi();
        }, 1000);
        
        // Add some animation to the navbar on scroll
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 10) {
                navbar.style.boxShadow = '0 10px 30px var(--shadow-color)';
                navbar.style.background = 'var(--card-bg)';
            } else {
                navbar.style.boxShadow = '0 4px 30px var(--shadow-color)';
                navbar.style.background = 'var(--glass-bg)';
            }
        });
    }
    
    /**
     * Initialize theme based on user preference or stored setting
     */
    initTheme() {
        // Check if user has a stored preference
        const storedTheme = localStorage.getItem('theme');
        
        if (storedTheme) {
            // Apply stored theme
            document.documentElement.setAttribute('data-theme', storedTheme);
        } else {
            // Check if user prefers dark mode
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (prefersDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
        }
    }

    /**
     * Initialize DOM elements
     */
    initElements() {
        // Theme toggle element
        this.themeToggle = document.getElementById('themeToggle');
        
        // Connection elements
        this.statusDot = document.getElementById('statusDot');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.qrCodeImage = document.getElementById('qrCodeImage');
        this.qrImg = document.getElementById('qrImg');
        this.qrCodeText = document.getElementById('qrCodeText');
        
        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Form elements
        this.sendOtpForm = document.getElementById('sendOtpForm');
        this.phoneNumberInput = document.getElementById('phoneNumber');

        this.verifyOtpForm = document.getElementById('verifyOtpForm');
        this.verifyPhoneInput = document.getElementById('verifyPhone');
        this.otpCodeInput = document.getElementById('otpCode');
        
        // Log elements
        this.logsContainer = document.getElementById('logsContainer');
        this.clearLogsButton = document.getElementById('clearLogs');
        
        // Alert container
        this.alertContainer = document.getElementById('alertContainer');
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Theme toggle handling
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        // Form submissions
        this.sendOtpForm.addEventListener('submit', (e) => this.handleSendOtp(e));
        this.verifyOtpForm.addEventListener('submit', (e) => this.handleVerifyOtp(e));
        

        
        // Clear logs
        this.clearLogsButton.addEventListener('click', () => this.clearLogs());
        
        // Add phone number sync between tabs
        this.phoneNumberInput.addEventListener('input', () => {
            this.verifyPhoneInput.value = this.phoneNumberInput.value;
        });
        
        this.verifyPhoneInput.addEventListener('input', () => {
            this.phoneNumberInput.value = this.verifyPhoneInput.value;
        });
        
        // Initialize copy buttons for API endpoints
        this.setupCopyButtons();
        
        // Initialize API token functionality
        this.setupApiTokenHandlers();
    }
    
    /**
     * Set up API token functionality
     */
    setupApiTokenHandlers() {
        // Original API token tab elements
        this.apiTokenDisplay = document.getElementById('apiTokenDisplay');
        this.tokenExample = document.getElementById('tokenExample');
        this.copyToken = document.getElementById('copyToken');
        this.generateToken = document.getElementById('generateToken');
        this.revokeToken = document.getElementById('revokeToken');
        this.copyHeaderExample = document.getElementById('copyHeaderExample');
        
        // New integrated token elements
        this.apiTokenValueSend = document.getElementById('apiTokenValueSend');
        this.apiTokenValueVerify = document.getElementById('apiTokenValueVerify');
        this.copyTokenSendBtn = document.getElementById('copyTokenSendBtn');
        this.copyTokenVerifyBtn = document.getElementById('copyTokenVerifyBtn');
        this.refreshTokenSendBtn = document.getElementById('refreshTokenSendBtn');
        this.refreshTokenVerifyBtn = document.getElementById('refreshTokenVerifyBtn');
        
        // Fetch token immediately on page load for integrated displays
        this.fetchApiToken(true);
        
        // Fetch token when clicking the API token tab
        const apiTokenTabButton = document.querySelector('.tab-btn[data-tab="apiToken"]');
        if (apiTokenTabButton) {
            apiTokenTabButton.addEventListener('click', () => {
                this.fetchApiToken();
            });
        }
        
        // Original API token tab functionality
        if (this.copyToken) {
            this.copyToken.addEventListener('click', () => {
                navigator.clipboard.writeText(this.apiTokenDisplay.value)
                    .then(() => this.showToast('Token copied to clipboard', 'success'));
            });
        }
        
        if (this.generateToken) {
            this.generateToken.addEventListener('click', () => {
                this.regenerateApiToken();
            });
        }
        
        if (this.revokeToken) {
            this.revokeToken.addEventListener('click', () => {
                if (confirm('Are you sure you want to revoke this token? Any applications using it will stop working.')) {
                    this.revokeApiToken();
                }
            });
        }
        
        if (this.copyHeaderExample) {
            this.copyHeaderExample.addEventListener('click', () => {
                const headers = {
                    "Content-Type": "application/json",
                    "x-api-token": this.apiTokenDisplay.value
                };
                navigator.clipboard.writeText(JSON.stringify(headers, null, 2))
                    .then(() => this.showToast('Header example copied to clipboard', 'success'));
            });
        }
        
        // New integrated token handlers
        if (this.copyTokenSendBtn) {
            this.copyTokenSendBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.apiTokenValueSend.textContent)
                    .then(() => this.showToast('Token copied to clipboard', 'success'));
            });
        }
        
        if (this.copyTokenVerifyBtn) {
            this.copyTokenVerifyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.apiTokenValueVerify.textContent)
                    .then(() => this.showToast('Token copied to clipboard', 'success'));
            });
        }
        
        if (this.refreshTokenSendBtn) {
            this.refreshTokenSendBtn.addEventListener('click', () => {
                this.regenerateApiToken(true);
            });
        }
        
        if (this.refreshTokenVerifyBtn) {
            this.refreshTokenVerifyBtn.addEventListener('click', () => {
                this.regenerateApiToken(true);
            });
        }
    }
    
    /**
     * Fetch API token from server
     */
    async fetchApiToken() {
        try {
            console.log('Fetching API token...');
            this.apiTokenDisplay.value = 'Loading...';
            this.tokenExample.textContent = 'Loading...';
            
            const response = await fetch('/api/token');
            console.log('API token fetch response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API token data received:', data.success ? 'Success' : 'Failed');
            
            if (data.success && data.token) {
                console.log('Token received successfully');
                this.apiTokenDisplay.value = data.token;
                this.tokenExample.textContent = data.token;
                this.showToast('API token loaded', 'success');
            } else {
                console.log('No token in response', data);
                this.apiTokenDisplay.value = 'No token available';
                this.tokenExample.textContent = 'your-token-here';
                this.showToast('No API token available', 'warning');
            }
        } catch (error) {
            console.error('Error fetching API token:', error);
            this.apiTokenDisplay.value = 'Error loading token';
            this.tokenExample.textContent = 'error';
            this.showToast('Failed to load API token: ' + error.message, 'error');
        }
    }
    
    /**
     * Regenerate API token
     */
    async regenerateApiToken() {
        try {
            this.apiTokenDisplay.value = 'Generating...';
            
            const response = await fetch('/api/token/regenerate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.token) {
                this.apiTokenDisplay.value = data.token;
                this.tokenExample.textContent = data.token;
                this.showToast('New API token generated', 'success');
            } else {
                this.apiTokenDisplay.value = 'Failed to generate token';
                this.showToast('Failed to generate new token', 'error');
            }
        } catch (error) {
            console.error('Error regenerating API token:', error);
            this.apiTokenDisplay.value = 'Error';
            this.showToast('Failed to generate new token', 'error');
        }
    }
    
    /**
     * Revoke API token
     */
    async revokeApiToken() {
        try {
            this.apiTokenDisplay.value = 'Revoking...';
            
            const response = await fetch('/api/token/revoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.apiTokenDisplay.value = 'Token revoked';
                this.tokenExample.textContent = 'token-revoked';
                this.showToast('API token revoked', 'success');
            } else {
                this.apiTokenDisplay.value = 'Failed to revoke token';
                this.showToast('Failed to revoke token', 'error');
            }
        } catch (error) {
            console.error('Error revoking API token:', error);
            this.apiTokenDisplay.value = 'Error';
            this.showToast('Failed to revoke token', 'error');
        }
    }
    
    /**
     * Set up copy functionality for API endpoints
     */
    setupCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', () => {
                const container = button.closest('.endpoint-container, .endpoint-example');
                const textToCopy = container.querySelector('code, pre').textContent;
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Show success message
                    const successEl = document.createElement('div');
                    successEl.className = 'copy-success';
                    successEl.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    container.appendChild(successEl);
                    
                    // Animate success message
                    setTimeout(() => {
                        successEl.style.transform = 'translateY(0)';
                        setTimeout(() => {
                            successEl.style.transform = 'translateY(100%)';
                            setTimeout(() => {
                                successEl.remove();
                            }, 300);
                        }, 1000);
                    }, 10);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    this.addLog('Failed to copy to clipboard', 'error');
                });
            });
        });
    }

    /**
     * Set up Socket.io event listeners
     */
    setupSocketEvents() {
        // Track connection state
        this.isConnected = false;
        
        // Initial connection - check status before requesting QR code
        this.socket.on('connect', () => {
            console.log('Socket.io connected to server');
            
            // Request connection status from server
            // Only fetch QR code if not already connected
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    console.log('Health check:', data);
                    
                    if (data.whatsapp === 'initialized' && !this.isConnected) {
                        // Only show "Connected" message without QR
                        this.showConnectedUI();
                    } else {
                        // Otherwise fetch QR code
                        setTimeout(() => {
                            this.fetchQrCodeFromApi();
                        }, 1000);
                    }
                })
                .catch(err => {
                    console.error('Error checking health:', err);
                    // Fallback to fetching QR
                    setTimeout(() => {
                        this.fetchQrCodeFromApi();
                    }, 1000);
                });
        });
        
        // QR code event
        this.socket.on('qr', (data) => {
            console.log('Received QR code event from server');
            
            // Only process QR if not connected
            if (this.isConnected) {
                console.log('Already connected - ignoring QR code');
                return;
            }
            
            if (data && data.qr) {
                console.log('QR data received, length:', data.qr.length);
                this.displayQRCode(data.qr);
            } else {
                console.error('QR data missing or malformed', data);
                this.qrCodeText.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error: Missing QR code data</p>
                        <button class="btn primary-btn" id="retryQrBtn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
                this.qrCodeImage.style.display = 'none';
                this.qrCodeText.style.display = 'block';
                
                // Add retry button functionality
                setTimeout(() => {
                    const retryBtn = document.getElementById('retryQrBtn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => {
                            this.fetchQrCodeFromApi();
                        });
                    }
                }, 100);
            }
        });
        
        // Connection status updates
        this.socket.on('connection-status', (data) => {
            console.log('Connection status update:', data);
            this.updateConnectionStatus(data.status);
            
            // Update connected state
            if (data.status === 'connected') {
                this.isConnected = true;
                this.showConnectedUI();
            } else if (data.status === 'disconnected' || data.status === 'logged-out') {
                this.isConnected = false;
            }
            
            // If status is qr-ready and we're not connected, fetch QR code
            if (data.status === 'qr-ready' && !this.isConnected) {
                this.fetchQrCodeFromApi();
            }
        });
        
        // OTP sent event
        this.socket.on('otp-sent', (data) => {
            const message = data.success 
                ? `OTP sent to ${data.phone}` 
                : `Failed to send OTP to ${data.phone}`;
            const type = data.success ? 'success' : 'error';
            this.addLog(message, type);
            this.showAlert(type.charAt(0).toUpperCase() + type.slice(1), message);
        });
        
        // OTP verified event
        this.socket.on('otp-verified', (data) => {
            let message;
            let type;
            
            if (data.success) {
                message = `OTP verified for ${data.phone}`;
                type = 'success';
            } else {
                switch(data.reason) {
                    case 'no-record':
                        message = `No OTP sent to ${data.phone}`;
                        break;
                    case 'expired':
                        message = `OTP expired for ${data.phone}`;
                        break;
                    case 'invalid':
                        message = `Invalid OTP for ${data.phone}`;
                        break;
                    default:
                        message = `OTP verification failed for ${data.phone}`;
                }
                type = 'error';
            }
            
            this.addLog(message, type);
            this.showAlert(type.charAt(0).toUpperCase() + type.slice(1), message);
            
            // Clear OTP field on successful verification or if it's invalid
            if (data.success || data.reason === 'invalid') {
                this.otpCodeInput.value = '';
            }
        });
    }

    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Add animation to the toggle button
        this.themeToggle.classList.add('rotate-animation');
        setTimeout(() => {
            this.themeToggle.classList.remove('rotate-animation');
        }, 500);
    }

    /**
     * Switch between tabs
     * @param {string} tabId - The ID of the tab to switch to
     */
    switchTab(tabId) {
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });
        
        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    /**
     * Handle send OTP form submission
     * @param {Event} e - Form submit event
     */
    async handleSendOtp(e) {
        e.preventDefault();
        const phone = this.phoneNumberInput.value.trim();
        
        if (!phone) {
            this.showAlert('Error', 'Please enter a phone number');
            return;
        }
        
        // Add loading state
        const submitButton = this.sendOtpForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitButton.disabled = true;
        
        try {
            const response = await fetch('/api/otp/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // If successful, automatically switch to verify tab
                this.switchTab('verifyOtp');
                
                // Focus on OTP input field
                setTimeout(() => {
                    this.otpCodeInput.focus();
                }, 300);
                
                // Add success log
                this.addLog(`OTP sent to ${phone}`, 'success');
            } else {
                // If there's an error message from the server
                const errorMessage = data.message || 'Failed to send OTP';
                this.showAlert('Error', errorMessage);
                this.addLog(`Error: ${errorMessage}`, 'error');
                
                // If the error is related to WhatsApp connection
                if (errorMessage.includes('WhatsApp is not connected')) {
                    // Highlight the QR code section to guide the user
                    const qrSection = document.querySelector('.qr-section');
                    if (qrSection) {
                        qrSection.classList.add('highlight-section');
                        setTimeout(() => {
                            qrSection.classList.remove('highlight-section');
                        }, 3000);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            this.showAlert('Error', 'Failed to send OTP. Check your network connection.');
            this.addLog('Network error while sending OTP', 'error');
        } finally {
            // Remove loading state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle verify OTP form submission
     * @param {Event} e - Form submit event
     */
    async handleVerifyOtp(e) {
        e.preventDefault();
        const phone = this.verifyPhoneInput.value.trim();
        const otp = this.otpCodeInput.value.trim();
        
        if (!phone || !otp) {
            this.showAlert('Error', 'Please enter both phone number and OTP');
            return;
        }
        
        // Add loading state
        const submitButton = this.verifyOtpForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        submitButton.disabled = true;
        
        try {
            const response = await fetch('/api/otp/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone, otp })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success animation
                this.showSuccessAnimation();
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            this.showAlert('Error', 'Failed to verify OTP');
        } finally {
            // Remove loading state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    }
    
    /**
     * Show a success animation
     */
    showSuccessAnimation() {
        const successOverlay = document.createElement('div');
        successOverlay.className = 'success-overlay';
        successOverlay.innerHTML = `
            <div class="success-animation">
                <i class="fas fa-check-circle"></i>
                <p>Verified Successfully!</p>
            </div>
        `;
        
        document.body.appendChild(successOverlay);
        
        // Remove after animation
        setTimeout(() => {
            successOverlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(successOverlay);
            }, 500);
        }, 2000);
    }
    
    /**
     * Reconnect to WhatsApp
     */
    reconnectWhatsApp() {
        // Reset connection status
        this.isConnected = false;
        
        // Show reconnecting UI immediately
        this.qrCodeText.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-sync-alt fa-spin fa-2x"></i>
                <p>Reconnecting to WhatsApp...</p>
            </div>
        `;
        this.qrCodeImage.style.display = 'none';
        this.qrCodeText.style.display = 'block';
        
        // Emit reconnect event to server
        this.socket.emit('reconnect');
        this.updateConnectionStatus('reconnecting');
        this.addLog('Reconnecting to WhatsApp...', 'info');
        
        // After a short delay, try to fetch QR code directly from API
        // This delay gives the server time to reset the connection and generate a new QR
        setTimeout(() => {
            this.fetchQrCodeFromApi();
        }, 3000);
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, info, warning)
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}-toast`;
        
        // Set icon based on type
        let icon;
        switch (type) {
            case 'success':
                icon = 'check-circle';
                break;
            case 'error':
                icon = 'times-circle';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                break;
            default:
                icon = 'info-circle';
        }
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to document
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto hide after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Fetch QR code directly from API
     * This is a fallback method if socket events don't deliver the QR code
     */
    fetchQrCodeFromApi() {
        // If we're already connected, no need to fetch QR code
        if (this.isConnected) {
            console.log('Already connected, no need to fetch QR code');
            this.showConnectedUI();
            return;
        }
        
        // Check connection status first
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                // If WhatsApp is already initialized, show connected UI
                if (data.whatsapp === 'initialized' && data.qr !== 'available') {
                    console.log('WhatsApp is initialized, showing connected UI');
                    this.isConnected = true;
                    this.showConnectedUI();
                    return;
                }
                
                // Otherwise, continue with QR code fetching
                this.fetchQRCodeAfterCheck();
            })
            .catch(error => {
                console.log('Error checking WhatsApp status:', error);
                // Fallback to directly fetching QR code
                this.fetchQRCodeAfterCheck();
            });
    }
    
    /**
     * Actual QR code fetching after connection check
     * Private helper method
     */
    fetchQRCodeAfterCheck() {
        // Show loading state
        this.qrCodeText.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
                <p>Loading QR code...</p>
            </div>
        `;
        this.qrCodeImage.style.display = 'none';
        this.qrCodeText.style.display = 'block';
        
        console.log('Fetching QR code from API...');
        
        fetch('/api/qr-code')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.qr) {
                    console.log('Successfully fetched QR code from API');
                    this.displayQRCode(data.qr);
                    this.addLog('WhatsApp QR code loaded successfully', 'success');
                } else {
                    throw new Error('QR code data not available');
                }
            })
            .catch(error => {
                console.log('Failed to fetch QR code from API:', error.message);
                
                // Show retry button
                this.qrCodeText.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load QR code</p>
                        <button class="btn primary-btn" id="retryQrBtn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
                
                // Add retry button functionality
                setTimeout(() => {
                    const retryBtn = document.getElementById('retryQrBtn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => {
                            this.fetchQrCodeFromApi();
                        });
                    }
                }, 100);
                
                // Will try again later automatically, but only if not connected
                if (!this.isConnected) {
                    setTimeout(() => this.fetchQrCodeFromApi(), 5000);
                }
            });
    }

    /**
     * Update connection status UI
     * @param {string} status - Connection status
     */
    updateConnectionStatus(status) {
        this.statusDot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                this.statusDot.classList.add('connected');
                this.connectionStatus.textContent = 'Connected';
                break;
            case 'disconnected':
                this.statusDot.classList.add('disconnected');
                this.connectionStatus.textContent = 'Disconnected';
                break;
            case 'qr-ready':
                this.connectionStatus.textContent = 'QR Ready';
                break;
            case 'reconnecting':
                this.connectionStatus.textContent = 'Reconnecting...';
                break;
            default:
                this.connectionStatus.textContent = status || 'Unknown';
        }
    }

    /**
     * Display QR code
     * @param {string} qrData - QR code data
     */
    displayQRCode(qrData) {
        if (!qrData) return;
        
        // Log QR data for debugging
        console.log('Received QR code data');
        
        try {
            // Clear existing QR code container
            this.qrCodeImage.innerHTML = '';
            
            // Use QRCode library directly - simpler approach from simple-dashboard.js
            if (typeof QRCode !== 'undefined') {
                // Create container for QR
                const qrContainer = document.createElement('div');
                this.qrCodeImage.appendChild(qrContainer);
                
                // Generate new QR code
                new QRCode(qrContainer, {
                    text: qrData,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                // Fallback to external API if QRCode library not loaded
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=200x200`;
                this.qrCodeImage.appendChild(img);
            }
            
            // Show QR container
            this.qrCodeImage.style.display = 'block';
            this.qrCodeText.style.display = 'none';
            
            // Add log for successful QR code generation
            this.addLog('WhatsApp QR code generated. Please scan to connect.', 'info');
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.qrCodeText.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error generating QR code. Please try reconnecting.</p>
                </div>
            `;
            this.qrCodeImage.style.display = 'none';
            this.qrCodeText.style.display = 'block';
        }
    }
    
    /**
     * Apply animation to QR code
     * This simplified helper just handles the animation effect
     */
    animateQRCode() {
        // Add animation
        this.qrCodeImage.classList.add('pulse-animation');
        setTimeout(() => {
            this.qrCodeImage.classList.remove('pulse-animation');
        }, 1000);
    }
    
    /**
     * Show connected UI instead of QR code
     * This displays a success message when already connected
     */
    showConnectedUI() {
        // Clear QR code container and show connected message
        this.qrCodeImage.innerHTML = '';
        this.qrCodeImage.style.display = 'none';
        
        // Show connected message
        this.qrCodeText.innerHTML = `
            <div class="connected-message">
                <i class="fas fa-check-circle fa-3x"></i>
                <p>WhatsApp is connected!</p>
                <p class="connected-subtitle">You can now send and verify OTPs</p>
                <button class="btn outline-btn" id="disconnectBtn">
                    <i class="fas fa-sign-out-alt"></i> Disconnect
                </button>
            </div>
        `;
        this.qrCodeText.style.display = 'block';
        
        // Add disconnect button functionality
        setTimeout(() => {
            const disconnectBtn = document.getElementById('disconnectBtn');
            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', () => {
                    this.reconnectWhatsApp();
                });
            }
        }, 100);
        
        // Log connection
        this.addLog('WhatsApp is successfully connected', 'success');
    }

    /**
     * Save the custom message template to the server
     */

    
    /**
     * Add log entry
     * @param {string} message - Log message
     * @param {string} type - Log type (info, success, error, warning)
     */
    addLog(message, type = 'info') {
        if (!message) return;
        
        // Create log entry
        const timestamp = new Date();
        const log = {
            message,
            type,
            timestamp
        };
        
        // Add to logs array
        this.logs.unshift(log);
        
        // Update UI
        this.updateLogUI();
    }

    /**
     * Update log UI
     */
    updateLogUI() {
        // Clear logs container
        this.logsContainer.innerHTML = '';
        
        // Add log entries to container
        this.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            
            // Format time
            const timeString = this.formatTime(log.timestamp);
            
            // Icon based on log type
            let icon;
            switch (log.type) {
                case 'success':
                    icon = '<i class="fas fa-check-circle"></i>';
                    break;
                case 'error':
                    icon = '<i class="fas fa-exclamation-circle"></i>';
                    break;
                case 'warning':
                    icon = '<i class="fas fa-exclamation-triangle"></i>';
                    break;
                default:
                    icon = '<i class="fas fa-info-circle"></i>';
            }
            
            logEntry.innerHTML = `
                <div class="log-icon">${icon}</div>
                <div class="log-content">
                    <p class="log-message">${log.message}</p>
                    <span class="log-time">${timeString}</span>
                </div>
            `;
            
            // Add to logs container with animation
            logEntry.style.opacity = '0';
            logEntry.style.transform = 'translateY(-10px)';
            this.logsContainer.appendChild(logEntry);
            
            // Trigger animation
            setTimeout(() => {
                logEntry.style.opacity = '1';
                logEntry.style.transform = 'translateY(0)';
            }, 10);
        });
    }

    /**
     * Format timestamp
     * @param {Date} date - Date object
     * @returns {string} - Formatted time string
     */
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        // If less than a minute ago
        if (diff < 60000) {
            return 'Just now';
        }
        
        // If less than an hour ago
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
        
        // If today
        if (date.toDateString() === now.toDateString()) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Otherwise show full date/time
        return date.toLocaleString();
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.updateLogUI();
        this.addLog('Logs cleared', 'info');
    }

    /**
     * Show alert notification
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, error, warning, info)
     */
    showAlert(title, message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type.toLowerCase()}`;
        
        // Icon based on alert type
        let icon;
        switch (type.toLowerCase()) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
        }
        
        alertDiv.innerHTML = `
            <div class="alert-icon">${icon}</div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to alert container
        this.alertContainer.appendChild(alertDiv);
        
        // Add click event to close button
        const closeButton = alertDiv.querySelector('.alert-close');
        closeButton.addEventListener('click', () => {
            alertDiv.classList.add('fade-out');
            setTimeout(() => {
                alertDiv.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.add('fade-out');
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing WhatsApp OTP Dashboard...');
    
    // Simple initialization - using the libraries already loaded in HTML
    console.log('Initializing app with QR libraries from HTML');
    window.whatsAppOTP = new ModernWhatsAppOTP();
        
        // Add CSS animation classes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rotate-animation {
                0% { transform: rotate(0); }
                100% { transform: rotate(360deg); }
            }
            
            .rotate-animation {
                animation: rotate-animation 0.5s ease;
            }
            
            .pulse-animation {
                animation: pulse 0.5s ease;
            }
            
            @keyframes pulse {
                0% { transform: scale(0.95); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .fade-out {
                opacity: 0;
                transform: translateY(-10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .success-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 1;
                transition: opacity 0.5s ease;
            }
            
            .success-animation {
                background: var(--card-bg);
                padding: 30px;
                border-radius: var(--radius-lg);
                text-align: center;
                backdrop-filter: var(--backdrop-blur);
                -webkit-backdrop-filter: var(--backdrop-blur);
                border: 1px solid var(--border-color);
                animation: zoomIn 0.5s ease;
            }
            
            @keyframes zoomIn {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .success-animation i {
                font-size: 60px;
                color: var(--success);
                margin-bottom: 20px;
            }
            
            .success-animation p {
                font-size: 24px;
                font-weight: 600;
                color: var(--text-color);
            }
            
            /* Connected UI styles */
            .connected-message {
                text-align: center;
                padding: 20px;
                animation: fadeIn 0.5s ease;
            }
            
            .connected-message i {
                color: var(--success);
                margin-bottom: 15px;
            }
            
            .connected-message p {
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 10px;
                color: var(--text-color);
            }
            
            .connected-message .connected-subtitle {
                font-size: 16px;
                font-weight: normal;
                color: var(--text-muted);
                margin-bottom: 20px;
            }
            
            @keyframes fadeIn {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            .outline-btn {
                background: transparent;
                border: 1px solid var(--border-color);
                color: var(--text-color);
                padding: 8px 16px;
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .outline-btn:hover {
                background: var(--bg-hover);
                border-color: var(--primary);
                color: var(--primary);
            }
            
            /* API Endpoint section styles */
            .api-endpoint-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px dashed var(--border-color);
            }
            
            .api-endpoint-section h3 {
                font-size: 14px;
                color: var(--text-muted);
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .endpoint-container, .endpoint-example {
                background: var(--bg-code);
                border-radius: var(--radius);
                padding: 10px 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                overflow: hidden;
            }
            
            .endpoint-container code {
                font-family: monospace;
                font-size: 14px;
                color: var(--code-color);
            }
            
            .endpoint-example pre {
                font-family: monospace;
                font-size: 13px;
                color: var(--code-color);
                margin: 0;
                width: 90%;
                white-space: pre-wrap;
            }
            
            .copy-btn {
                background: transparent;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 5px;
                transition: color 0.2s;
            }
            
            .copy-btn:hover {
                color: var(--primary);
            }
            
            .copy-success {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--success);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: translateY(100%);
                transition: transform 0.3s;
            }
            
            /* Footer styles */
            .footer {
                margin-top: 40px;
                padding: 15px 0;
                text-align: center;
                font-size: 14px;
                color: var(--text-muted);
                border-top: 1px solid var(--border-color);
            }
            
            .footer p {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .github-link {
                color: var(--text-color);
                transition: color 0.2s;
                font-size: 18px;
                display: inline-flex;
            }
            
            .github-link:hover {
                color: var(--primary);
            }
        `;
        document.head.appendChild(style);
        
    // Initialize the dashboard when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Create and initialize the dashboard
        window.whatsappOTP = new ModernWhatsAppOTP();
    });
});
