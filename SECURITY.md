# WhatsOTP Security Guide

This document outlines the security features implemented in WhatsOTP and provides guidance for maintaining a secure deployment.

## Security Features

### Authentication Security

1. **Google OAuth Integration**
   - Secure user authentication using Google's OAuth 2.0
   - No passwords stored in the system

2. **API Token Authentication**
   - Secure token generation with high entropy (SHA-256 HMAC)
   - Tokens tied to specific user accounts
   - Token revocation capability
   - Rate limiting on failed authentication attempts

3. **Session Security**
   - Secure, HttpOnly cookies
   - Session data encrypted in MongoDB store
   - Configurable session timeouts
   - Strict same-site cookie policy

### Network Security

1. **HTTPS Support**
   - Configured for secure cookies in production
   - Forces HTTPS in production environments

2. **Helmet Security Headers**
   - Content Security Policy (CSP) to prevent XSS attacks
   - HSTS to enforce HTTPS
   - X-Frame-Options to prevent clickjacking
   - X-XSS-Protection to enable browser XSS filters
   - X-Content-Type-Options to prevent MIME sniffing

3. **CORS Protection**
   - Restricts API access to specified origins
   - Prevents cross-domain attacks

### Input Validation & Data Protection

1. **Request Validation**
   - Input validation for API requests
   - JSON request size limits (1MB)
   - Parameter pollution protection (HPP)

2. **Rate Limiting**
   - API rate limiting to prevent abuse
   - Configurable window and max request settings
   - Helps prevent brute force attacks

3. **Error Handling**
   - Sanitized error messages in production
   - No sensitive data in error responses
   - Different error handling for API vs. web requests

## Security Best Practices for Administrators

### Environment Management

1. **Secure Environment Variables**
   - Use a strong, unique SESSION_SECRET
   - Never commit .env files to version control
   - Rotate secrets periodically

2. **MongoDB Security**
   - Use strong, unique passwords for database access
   - Restrict database user permissions
   - Enable IP whitelisting in MongoDB Atlas

### Deployment Considerations

1. **Server Hardening**
   - Use a firewall (e.g., UFW)
   - Keep server software updated
   - Use SSH keys instead of passwords
   - Consider fail2ban for brute force protection

2. **Regular Updates**
   - Keep dependencies updated
   - Run regular security audits (`npm audit`)
   - Apply security patches promptly

### Monitoring and Response

1. **Security Monitoring**
   - Monitor application logs for suspicious activity
   - Set up alerts for unusual behavior
   - Track failed authentication attempts

2. **Incident Response**
   - Create a plan for security incidents
   - Know how to revoke compromised tokens
   - Backup and restore procedures

## For Developers

1. **Code Security**
   - Follow secure coding practices
   - Validate all inputs
   - Use parameterized queries for MongoDB
   - Never trust client-side data

2. **API Security**
   - Always authenticate API requests
   - Validate request parameters
   - Implement proper error handling
   - Use HTTPS for all API calls

3. **Frontend Security**
   - Implement CSP properly
   - Sanitize any user-generated content
   - Use secure cookie attributes
   - Protect against XSS attacks

## WhatsApp Integration Security

1. **Session Management**
   - WhatsApp sessions are stored securely in the `auth` directory
   - Implement proper logout procedures
   - Only one active WhatsApp session per instance

2. **Message Security**
   - OTP messages are sent directly via WhatsApp's encrypted channel
   - No message content is logged or stored permanently
   - OTPs expire after a configurable period (default: 5 minutes)
