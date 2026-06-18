const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../db/models/User');

passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  `${process.env.APP_URL}/auth/github/callback`,
  scope: ['user:email', 'repo']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    if (user) {
      user.accessToken = accessToken;
      user.avatarUrl = profile.photos?.[0]?.value;
      await user.save();
    } else {
      user = await User.create({
        githubId:    profile.id,
        username:    profile.username,
        email:       profile.emails?.[0]?.value,
        avatarUrl:   profile.photos?.[0]?.value,
        accessToken
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;