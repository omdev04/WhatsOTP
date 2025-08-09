# WhatsOTP Production Deployment Checklist

## Before Deployment

- [ ] Update `.env` file with production values:
  - [ ] Set `NODE_ENV=production`
  - [ ] Generate a new strong `SESSION_SECRET` (don't use the one in the repo)
  - [ ] Set `COOKIE_SECURE=true`
  - [ ] Set `COOKIE_DOMAIN` to your production domain
  - [ ] Update `GOOGLE_CALLBACK_URL` to your production URL
  - [ ] Set `PRODUCTION_URL` to your full production domain (https://yourdomain.com)
  - [ ] Adjust rate limiting if needed (RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)

- [ ] MongoDB Security:
  - [ ] Create a dedicated MongoDB user with restricted permissions
  - [ ] Update MongoDB connection string with new credentials
  - [ ] Enable IP whitelist in MongoDB Atlas for your server IP

- [ ] SSL/HTTPS:
  - [ ] Obtain an SSL certificate (Let's Encrypt or paid)
  - [ ] Configure your reverse proxy (Nginx, Apache, etc.) to handle HTTPS
  - [ ] Set up HTTPS redirection

- [ ] Server Hardening:
  - [ ] Set up a firewall (UFW on Ubuntu)
  - [ ] Configure only necessary ports (80, 443, SSH)
  - [ ] Set up SSH key authentication and disable password login

## Deployment Process

- [ ] Run security audit: `npm audit --audit-level=moderate`
- [ ] Update dependencies: `npm update`
- [ ] Create a production build if needed
- [ ] Set up a process manager like PM2:
  ```
  npm install pm2 -g
  pm2 start index.js --name "whatsotp"
  pm2 save
  pm2 startup
  ```
- [ ] Set up monitoring (PM2 monitoring, UptimeRobot, etc.)
- [ ] Set up logging (PM2 logs or dedicated logging service)

## Post-Deployment

- [ ] Test all functionality on production environment
- [ ] Verify SSL/HTTPS is working correctly
- [ ] Check mobile responsiveness
- [ ] Test API authentication
- [ ] Test OTP sending and verification
- [ ] Monitor error logs for issues
- [ ] Set up regular backups for MongoDB data
- [ ] Create a maintenance plan (updates, patches, etc.)

## Security Best Practices

1. **Keep Secrets Secret**
   - NEVER commit `.env` files to GitHub
   - Use environment variables for all sensitive information
   - Rotate API keys and secrets regularly

2. **Regular Updates**
   - Set up a schedule to update dependencies
   - Keep your server OS and software updated

3. **Monitoring and Logging**
   - Monitor for suspicious activities
   - Set up alerts for high error rates or unusual traffic

4. **Rate Limiting and Brute Force Protection**
   - The app now has rate limiting, but consider additional protection at server level
   - Set up fail2ban for SSH and other services

5. **Regular Backups**
   - Set up automated backups for your MongoDB data
   - Test restoration process regularly

6. **CORS Configuration**
   - The app is set to only allow your production domain for CORS
   - Adjust if you need to allow additional domains

## Additional Considerations

- **Custom Domain**: Set up a professional domain name
- **CDN**: Consider using a CDN for static assets
- **Analytics**: Set up analytics to monitor user behavior
- **Performance Monitoring**: Tools like New Relic or Datadog
- **Error Tracking**: Consider Sentry or similar error tracking service
