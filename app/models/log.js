// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var logSchema = mongoose.Schema({

    local: {
        token: String,
        id: String,
        app: String

    },
    date: Date,

    data: {
        date: String,
        time: String,
        level: String,
        message: String,
    }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Log', logSchema);