var Device = require('../app/models/device');
var Log = require('../app/models/log');

module.exports = function(io) {
    // socketio service
    io.on('connection', function(socket) {
        //connection successfully established from android
        //device will join a room
        //then will create a database containing device information
        socket.on('startAndroid', function(data) {
            socket.join(data.token);

            Device.findOne({ 'info.id': data.id, 'info.token': data.token, 'info.app': { $eq: data.app } }, function(err, device) {
                // if there are any errors, return the error
                if (err) {
                    console.log(err);
                }
                // if no device is found, save new device
                if (!device) {
                    var newDevice = new Device();
                    newDevice.info.token = data.token;
                    newDevice.info.kernel = data.kernel;
                    newDevice.info.sdk = data.sdk;
                    newDevice.info.device = data.device;
                    newDevice.info.product = data.product;
                    newDevice.info.brand = data.brand;
                    newDevice.info.id = data.id;
                    newDevice.info.app = data.app;
                    newDevice.save(function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                // all is well, return device
                else {
                    console.log("device exists");
                }
            });
        });

        //browser client connected and joins a room
        socket.on('start', function(data) {
            socket.join(data.token);
        });

        // waits for "log" event from android
        //upon received emits data to frontend
        //and creates new log on database
        socket.on('log', function(data) {
            var room = data.token;
            io.to(room).emit(room, JSON.stringify(data));
            var newLog = new Log();
            newLog.local.token = data.token;
            newLog.local.id = data.id;
            newLog.local.app = data.app;
            newLog.date = new Date(data.date +  "T" + data.time + "Z");
            newLog.data.date = data.date;
            newLog.data.time = data.time;
            newLog.data.level = data.level;
            newLog.data.message = data.message.replace(/\n/g, "<br />").replace(/\t/g, "&emsp;&emsp;");
            newLog.save(function(err) {
                if (err) {
                    console.log(err);
                }
            });
        });

        socket.on('reconnect', function(numberAttempts) {
            console.log(numberAttempts);
        });

        socket.on('disconnect', function(reason) {
            console.log(reason);
            console.log("disconnected socket");
        });
    });
};