var Log = require('../app/models/log');
var Device = require('../app/models/device');
var User = require('../app/models/user');

module.exports = exports =  {
    findLog:function(token, device, app, level, callback) {
        if(device !== "all" && app !== "all"){
            findLogWithOptions({'local.token': token,'local.id': device, 'local.app': app, 'data.level': level },callback);
        }else if(device !== "all" && app === "all"){
            findLogWithOptions({ 'local.token': token,'local.id': device, 'data.level': level }, callback);
        }else if(device === "all" && app !== "all"){
            findLogWithOptions({ 'local.token': token,'local.app': app, 'data.level': level }, callback);
        }else if(device === "all" && app === "all"){
            findLogWithOptions({ 'local.token': token, 'data.level': level }, callback);
        }
    },
    findSortedLog:function (token, sortArray, numberOfLogs, callback) {
        Log.find({ 'local.token': token }).sort(sortArray[0]).sort(sortArray[1]).limit(numberOfLogs).exec(function(err, logs) {
            if (err) {
                throw new Error(err);
            } else {
                callback(logs);
            }
        });
    },
    findDevice:function (token, callback) {
        Device.find({ 'info.token': token }, function(err, devices) {
            if (err) {
                throw new Error(err);
            } else {
                callback(devices);
            }
        });
    },
    findDistinctDevices:function (token, distinct, callback) {
        Device.find({ 'info.token': token}).distinct(distinct).exec(function(err, result) {
            if (err) {
                throw new Error(err);
            } else {
                callback(result);
            }
        });
    },
    findDeviceLog:function (token, id, app, callback) {
        Log.find({ 'local.token': token, 'local.id': id, 'local.app': app }).sort('-data.date').sort('-data.time').exec(function(err, logs) {
            if (err) {
                throw new Error(err);
            } else {
                callback(logs);
            }
        });
    },
    removeDevice:function (token, id, app) {
        Device.find({ 'info.token':token,'info.id': id, 'info.app': app }).remove().exec();
    },
    //removes all log or by device
    removeLog:function (token, id, app) {
        if (id == null && app == null){
            Log.find({ 'local.token':token}).remove().exec();
        } else {
            Log.find({ 'local.token':token,'local.id': id, 'local.app': app }).remove().exec();
        }
    },
    //after removing a user all his logs and devices will be deleted too
    removeUser:function (id) {
        User.find({'_id':id}).remove().exec();
        Device.find({ 'info.token':id}).remove().exec();
        Log.find({ 'local.token':id}).remove().exec();
    },
    insertToken:function (token) {
        var thisUser = User.find({"_id":token});
        thisUser.find({"token": { "$exists": false } }).exec(function (err, result) {
            if (err){
                throw new Error(err);
            }
            //if token doesn't exists on database
            if(result.length > 0){
                //then update it with token value
                thisUser.update({'token':token}).exec(function (err) {
                    if (err){
                        throw new Error(err);
                    }
                });
            }
        });
    },
    addMember:function (token, emailColleague) {
        User.update({'_id':token}, {"$push": {"colleagues": {email: emailColleague}}}, {"safe": true, "upsert": true},
            function (err) {
                if(err){
                    throw  new Error(err);
                }
        });
    },
    findMembers:function (token, callback) {
        var Admin = User.find({'_id':token});
        Admin.exec(function (err, users) {
            if(err){
                throw  new Error(err);
            }else{
                var colleagues = [];
                users.forEach(function(user) {
                    if(user.local.email){
                        colleagues.push(users[0].local.email);
                    }
                    if(user.github.token){
                        var github = user.github.email ? user.github.email: users.name;
                        colleagues.push(github);
                    }
                    if(user.google.email){
                        colleagues.push(user.google.email);
                    }
                    if (user.colleagues.length){
                        for(var i = 0; i < user.colleagues.length; i++){
                            colleagues.push(user.colleagues[i].email);
                        }
                    }
                });
                callback(colleagues);
            }
        });
    },
    removeMember:function (token, emailOfMember) {
        //pull user from colleagues array
        User.findByIdAndUpdate(
            token,
            {"$pull": {"colleagues": {'email': emailOfMember}}},
            function(err) {
                if(err){
                    throw  new Error(err);
                }
            }
        );
        //removes user completely
        User.find({'token':token, 'local.email':emailOfMember}).remove().exec();
    }
};

var findLogWithOptions = function (options,callback) {
    Log.find(options).sort('-data.date').sort('-data.time').exec(function(err, logs) {
        if (err) {
            throw new Error(err);
        } else {
            callback(logs);
        }
    });
};
