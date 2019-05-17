var Query = require('../app/query.js');

module.exports = function(app, passport) {

    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/',
        function(req, res) {
            res.render('index.ejs');
    });

    //TODO: refactor database queries to use async functions or promises instead of setTimeout functions

    // DASHBOARD SECTION =========================
    app.get('/dashboard', isLoggedIn, function(req, res) {
        var token = req.user.token;
        var devices = [];
        var apps = [];

        //query database to obtain distinct devices by id
        Query.findDistinctDevices(token , 'info.id', function (result) {
            devices = result;
        });

        //query database to obtain distinct devices by app
        Query.findDistinctDevices(token , 'info.app', function (result) {
            apps = result;
        });

        //execute some time after fetching devices
        setTimeout(function() {
            //get last 100 logs and send with response
            Query.findSortedLog(token,['-data.date', '-data.time'], 100, function (result) {
                res.render('dashboard.ejs', {
                    user: req.user,
                    token: token,
                    devices: devices,
                    apps: apps,
                    logs: result,
                    page: "dashboard"
                });
            });
        }, 200);

    });

    //clear all log from database
    app.get('/clear', isLoggedIn, function(req, res) {
        Query.removeLog(req.user.token, null, null);
        res.redirect('/dashboard');
    });

    // DEVICES SECTION =========================
    app.get('/devices', isLoggedIn, function(req, res) {
        var token = req.user.token;
        //get all devices for user
        Query.findDevice(token, function (devices) {
            var message = (devices.length == 0) ? "You don't have any device at the moment!" : "";
            var devices_array = (devices.length > 0) ? devices : [];
            res.render('devices.ejs', {
                user: req.user,
                token: token,
                devices: devices_array,
                logs: [],
                page: "devices",
                message:message
            });
        });
    });

    //clear log specific to one device from database
    app.get('/clearlog/:id/:app', isLoggedIn, function(req, res) {
        Query.removeLog(req.user.token, req.params.id, req.params.app);
        res.redirect('/devices');
    });

    //used to get log by device
    app.get('/showlog/:id/:app', isLoggedIn, function(req, res) {
        var devices;
        var token = req.user.token;
        var id = req.params.id;
        var app = req.params.app;

        //get all devices for user
        Query.findDevice(token, function (result) {
            devices = result;
        });

        //get log of a specific device
        Query.findDeviceLog(token,id, app, function (logs) {
            var message = (logs.length === 0) ? "This device doesn't have any logs!" : "";
            setTimeout(function() {
                res.render('devices.ejs', {
                    user: req.user,
                    token: token,
                    devices: devices,
                    logs: logs,
                    page: "devices",
                    message: message
                });
            }, 100);
        });
    });

    //used to remove a device and its logs
    app.get('/removedevice/:id/:app', isLoggedIn, function(req, res) {
        var token = req.user.token;
        var id = req.params.id;
        var app = req.params.app;

        Query.removeDevice(token, id, app);
        Query.removeLog(token, id, app);

        res.redirect('/devices');
    });

    // ANALYTICS SECTION =========================
    app.get('/analytics', isLoggedIn, function(req, res) {
        //used in database queries
        var token = req.user.token;

        //arrays to store different logs
        var warnings = [];
        var errors = [];

        //used to store logs that are used to create google charts
        var error_chart = [];
        var warning_chart = [];
        var devices = [];
        var apps = [];

        //get device/app from query or use default
        var device = (req.query.device) ? req.query.device : "all";
        var user_app = (req.query.app) ? req.query.app : "all";

        //query database to obtain distinct devices by id
        Query.findDistinctDevices(token , 'info.id', function (result) {
            devices = result;
        });

        //query database to obtain distinct devices by app
        Query.findDistinctDevices(token , 'info.app', function (result) {
            apps = result;
        });

        /**
         *Aggregates log for a specified level (Error/Warning)
         * returns number of logs per day in format [['2017-08-24', 2], ['2017-08-25', 3], ...]
         **/
        Query.findLog(token, device, user_app, "W", function (logs) {
            warnings = logs;
            warning_chart = transformArray(warnings);
        });

        Query.findLog(token, device, user_app, "E", function (logs) {
            errors = logs;
            error_chart = transformArray(errors);
        });

        //render analytics page
        setTimeout(function() {
            res.render('analytics.ejs', {
                user: req.user,
                warnings: warnings,
                errors: errors,
                error_rows: error_chart,
                warning_rows: warning_chart,
                devices: devices,
                apps: apps,
                page: "analytics",
                show: "analytics"
            });
        }, 2000);
    });

    //show filtered log for device or app on analytics
    app.post('/analytics', isLoggedIn, function(req, res) {
        var app = req.body.app;
        var device = req.body.device;
        res.redirect('/analytics?device=' + device + '&app=' + app);
    });

    // SETTINGS SECTION =========================
    app.get('/settings',isLoggedIn,function(req, res) {
        var token = req.user.token;
        var message = [];
        var colleagues = [];
        var email;

        Query.findMembers(token,function (result) {
            colleagues = result;
            console.log(result)
        });

        //only admin users can add other colleagues to team
        if(req.user._id == token){
            //checks if '/settings' has a token as a url query.
            if((req.query.email != null)){
                email = decodeURIComponent(req.query.email);
                var url = req.protocol + '://' + req.get('host') + '/acceptInvite/' + email + '?token=' + token;
                message = ["Team Member Added!","Share this URL with your team member:", url];
                //add this colleague to user that sent the invite
            }
        }
        //timeout to wait for DB query result
        setTimeout(function () {
            res.render('settings.ejs',{
                user: req.user,
                token: token,
                page:'settings',
                message : message,
                colleagues: colleagues
            });
        },200);

    });

    app.post('/settings', isLoggedIn,function(req, res) {
        if(req.user._id == req.user.token){
            var email = req.body.email;
            email = encodeURIComponent(email);
            res.redirect('/settings?email=' + email);
        }
    });

    app.get('/removeMember', isLoggedIn, function(req, res) {
        var token = req.user.token;
        if((req.query.member != null)){
            var member = decodeURIComponent(req.query.member);
            //remove member from team
            Query.removeMember(token, member);
        }

        res.redirect('/settings');
    });

    // LOGOUT ==============================
    app.get('/acceptInvite/:email', function(req, res) {
        //redirect to signup to create an account
        res.render('acceptinvite.ejs',{
            message: req.flash('signupMessage'),
            email: req.params.email,
            token:req.query.token
        });
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // =============================================================================
    // AUTHENTICATE (FIRST LOGIN) ==================================================
    // =============================================================================

    // locally --------------------------------
    // LOGIN ===============================
    // show the login form
    app.get('/login', function(req, res) {
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/dashboard', // redirect to the secure dashboard section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get('/signup', function(req, res) {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/dashboard', // redirect to the secure dashboard
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // =====================================
    // GOOGLE ROUTES =======================
    // =====================================
    // send to google to do the authentication
    // profile gets us their basic information including their name
    // email gets their emails
    app.get('/auth/google', passport.authenticate('google', {
        scope: ['profile', 'email']
    }));

    // the callback after google has authenticated the user
    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/dashboard',
        failureRedirect: '/'
    }));

    // =====================================
    // Github ROUTES =======================
    // =====================================
    // send to github to do the authentication
    // we obtain basic information including their name and email if allowed
    app.get('/auth/github', passport.authenticate('github', {
        scope: 'user:email'
    }));

    // the callback after github has authenticated the user
    app.get('/auth/github/callback', passport.authenticate('github', {
        successRedirect: '/dashboard',
        failureRedirect: '/'
    }));


    // =============================================================================
    // AUTHORIZE (ALREADY LOGGED IN ) =============
    // =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function(req, res) {
        res.render('connect-local.ejs', { message: req.flash('loginMessage') });
    });

    app.post('/connect/local', passport.authenticate('local-signup', {
        successRedirect: '/dashboard', // redirect to the secure dashboard
        failureRedirect: '/connect/local', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // google ---------------------------------
    // send to google to do the authentication
    app.get('/connect/google', passport.authorize('google', {
        scope: ['profile', 'email']
    }));

    // the callback after google has authorized the user
    app.get('/connect/google/callback', passport.authorize('google', {
        successRedirect: '/dashboard',
        failureRedirect: '/'
    }));

    // =============================================================================
    // DELETE ACCOUNTS =============================================================
    // =============================================================================
    // At deleting an account he will lose all his data including devices, logs, account itself.

    // local -----------------------------------
    deleteAccount(app, 'local');
    // google ---------------------------------
    deleteAccount(app, 'google');
    // github ---------------------------------
    deleteAccount(app, 'github');
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

function deleteAccount(app, unlink) {
    app.get('/unlink/' + unlink, isLoggedIn, function(req, res) {
        //if user is team admin
        var token = req.user.token;
        var id = req.user._id;
        if (unlink === "local" && token !== id) {
            //user isn't a admin for local accounts
            console.log('token '  + token);
            console.log('id '  + id);
            Query.findMembers(token, function (members) {
                //team has at least two members
                members.forEach(function (email) {
                    console.log('email '  + email);
                    if (email === req.user.local.email) {
                        Query.removeMember(token, email);
                        res.redirect('/');
                    }
                });
            });
        }else{
            Query.removeUser(id);
            res.redirect('/');
        }
    });
}

function transformArray(from) {
    var to = {};
    from.forEach(function(obj) {
        var key = obj.data.date;
        to[key] = (to[key] || 0) + 1;
    });
    return Object.keys(to).map(function (key) { return [key, to[key]];});
}
