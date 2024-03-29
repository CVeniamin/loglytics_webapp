// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GithubStrategy = require('passport-github').Strategy;
var configAuth = require('./auth');

// load up the user model
var User = require('../app/models/user');
var Query = require('../app/query');

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function(req, email, password, done) {
            if (email) {
                email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching
            }

            // asynchronous
            process.nextTick(function() {
                User.findOne({ 'local.email': email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // if no user is found, return the message
                    if (!user)
                        return done(null, false, req.flash('loginMessage', 'No user found.'));

                    if (!user.validPassword(password))
                        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

                    // all is well, return user
                    else
                        return done(null, user);
                });
            });

        }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function(req, email, password, done) {
            if (email)
                email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

            // asynchronous
            process.nextTick(function() {
                // if the user is not already logged in:
                if (!req.user) {
                    User.findOne({ 'local.email': email }, function(err, user) {
                        // if there are any errors, return the error
                        if (err){
                            return done(err);
                        }
                        // check to see if theres already a user with that email
                        if (user) {
                            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                        }
                        if(!req.body.name.length){
                            return done(null, false, req.flash('signupMessage', 'Please provide a name.'));
                        }
                        else {

                            // create the user
                            var newUser = new User();

                            newUser.local.email = email;
                            newUser.local.password = newUser.generateHash(password);
                            newUser.name = req.body.name;
                            if(req.body.token != null){
                                //set this user token to match user user that invited to team
                                newUser.token = req.body.token;
                                Query.addMember(req.body.token, email, req.body.name);
                            }

                            newUser.save(function(err, user) {
                                if (err){
                                    return done(err);
                                }else{
                                    Query.insertToken(user._id);
                                    setTimeout(function () {
                                        return done(null, user);
                                    },500);
                                }
                            });
                        }

                    });
                    // if the user is logged in but has no local account...
                } else if (!req.user.local.email) {
                    // ...presumably they're trying to connect a local account
                    // BUT let's check if the email used to connect a local account is being used by another user
                    User.findOne({ 'local.email': email }, function(err, user) {
                        if (err){
                            return done(err);
                        }

                        if (user) {
                            return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                            // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                        } else {
                            var user = req.user;
                            user.local.email = email;
                            user.local.password = user.generateHash(password);
                            user.save(function(err) {
                                if (err){
                                    return done(err);
                                }

                                return done(null, user);
                            });
                        }
                    });
                } else {
                    // A user has an local account but is trying to create new account
                    if(req.email != email){

                        User.findOne({ 'local.email': email }, function(err, user) {
                            if (err)
                                return done(err);

                            if (user) {
                                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                            }
                            if(!req.body.name.length){
                                return done(null, false, req.flash('signupMessage', 'Please provide a name.'));
                            }
                            else {
                                var newUser = new User();
                                newUser.local.email = email;
                                newUser.name = req.body.name;
                                newUser.local.password = newUser.generateHash(password);
                                if(req.body.token != null){
                                    //set this user token to match user user that invited to team
                                    newUser.token = req.body.token;
                                    Query.addMember(req.body.token, email, req.body.name);
                                }
                                newUser.save(function(err,user) {
                                    if (err){
                                        return done(err);
                                    }
                                    Query.insertToken(user._id);
                                    setTimeout(function () {
                                        return done(null, newUser);
                                    },500);
                                });
                            }
                        });
                    }else {
                        // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                        return done(null, req.user);
                    }
                }
            });
        }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

            clientID: configAuth.googleAuth.clientID,
            clientSecret: configAuth.googleAuth.clientSecret,
            callbackURL: configAuth.googleAuth.callbackURL,

        },
        function(token, refreshToken, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Google
            process.nextTick(function() {

                // try to find the user based on their google id
                User.findOne({ 'google.id': profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if a user is found, log them in
                        return done(null, user);
                    } else {
                        // if the user isnt in our database, create a new user
                        var newUser = new User();

                        // set all of the relevant information
                        newUser.google.id = profile.id;
                        newUser.google.token = token;
                        newUser.name = profile.displayName;
                        newUser.google.email = profile.emails[0].value; // pull the first email

                        // save the user
                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });
            });

        }));


    // =========================================================================
    // Github ==================================================================
    // =========================================================================
    passport.use(new GithubStrategy({
            clientID: configAuth.githubAuth.clientID,
            clientSecret: configAuth.githubAuth.clientSecret,
            callbackURL: configAuth.githubAuth.callbackURL,
        },
        function(token, refreshToken, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Google
            process.nextTick(function() {

                // try to find the user based on their google id
                User.findOne({ 'github.id': profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if a user is found, log them in
                        return done(null, user);
                    } else {
                        // if the user isnt in our database, create a new user
                        var newUser = new User();
                        // set all of the relevant information
                        newUser.github.id = profile.id;
                        newUser.github.token = token;
                        newUser.name = profile.displayName;
                        newUser.github.email = (profile.email != null) ? profile.email : "no access"; // pull the first email

                        // save the user
                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }
                });
            });

        }));

};