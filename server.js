// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var configDB = require('./config/database.js');
var server = require('http').Server(app);
var io = require('socket.io')(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
});

//browserify for bundling socketio client files
var browserify = require('browserify-middleware');
var shared = 'socket.io-client';

// configuration ===============================================================
mongoose.Promise = global.Promise;
var mongoose_options = {
    server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }
};

mongoose.connect(configDB.url, mongoose_options); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
    secret: 'thisissuchasecretpassword', // session secret
    saveUninitialized: true,
    resave: true,
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    })
}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

//load client-side javascript to public
app.get('/bundle.js', browserify(__dirname + '/public/socket.client.js'));
app.get('/analytics.js', browserify(__dirname + '/public/listeners.js'));
app.get('/copyToClipboard.js', browserify(__dirname + '/public/copyToClipboard.js'));

//load css to public
app.use("/main.css", express.static(__dirname + '/styles/main.css'));

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

require('./app/service.js')(io); // load socketio backend service

// launch ======================================================================
server.listen(port);
console.log('Started on: ' + port);