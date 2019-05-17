// load the things we need
var mongoose = require('mongoose');

// define the schema for our device info
var deviceSchema = mongoose.Schema({
    info: {
        token: String,
        kernel: String,
        sdk: String,
        device: String,
        product: String,
        brand: String,
        id: String,
        app: String
    }
});

// create the model for devices and expose it to our app
module.exports = mongoose.model('Device', deviceSchema);