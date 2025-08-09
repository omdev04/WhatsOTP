const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        proxy: true, // Added to handle proxy issues if any
        passReqToCallback: true // Allow the request object to be passed to the callback
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Log the authentication attempt for debugging
          console.log(`Google Auth attempt for: ${profile.emails[0].value}`);
          console.log(`Current host: ${req.get('host')}`);
          
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });
          
          if (user) {
            console.log(`User found: ${user.email}`);
            return done(null, user);
          } else {
            // Create new user
            const newUser = {
              googleId: profile.id,
              displayName: profile.displayName,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              email: profile.emails[0].value,
              image: profile.photos[0].value
            };
            
            console.log(`Creating new user: ${newUser.email}`);
            user = await User.create(newUser);
            return done(null, user);
          }
        } catch (error) {
          console.error('Error in Google auth strategy:', error);
          console.error('Profile info:', JSON.stringify(profile, null, 2));
          console.error('Callback URL used:', process.env.GOOGLE_CALLBACK_URL);
          return done(error, null);
        }
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
