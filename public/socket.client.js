var io = require('socket.io-client');
var config = require('../config/config.js');
var socket = io.connect(config.url);
var token = document.getElementById('token_id').innerText;
var message_color;

var app_options = document.getElementById('app_name');
var device_options = document.getElementById('device_id');
var scroll_log = document.getElementById('scroll_log');
var start_data = { 'token': token };

var deviceChanged = function() {
    var device = device_options.options[device_options.selectedIndex].value;
    start_data.device = device;
    // alert.style.display = (device !== "show all" && alert.style.display === "none") ? "block" : "none";
};

var appChanged = function() {
    var app = app_options.options[app_options.selectedIndex].value;
    start_data.app = app;
};

socket.on('connect', function() {
    deviceChanged();
    appChanged();
    socket.emit("start", start_data);
    device_options.addEventListener("change", deviceChanged);
    app_options.addEventListener("change", appChanged);
});

socket.connect();

socket.on(token, function(data) {
    var received_data = JSON.parse(data);
    var level = received_data.level;

    if ((start_data.device === received_data.id && start_data.app === received_data.app) ||
        (start_data.device === "show all" && start_data.app === received_data.app)) {
        //show log by app and device or by app
        printLog(received_data, level);
    }
});

var printLog = function(data, level) {
    var color;
    var table = document.getElementById('tbody_log');
    switch (level) {
        case "V":
            color = 'table-active';
            level = "Verbose";
            break;
        case "D":
            color = 'table-success';
            level = "Debug";
            break;
        case "I":
            color = 'table-info';
            level = "Info";
            break;
        case "W":
            color = 'table-warning';
            level = "Warning";
            break;
        case "E":
            color = 'table-danger';
            message_color = "bg-danger text-white";
            level = "Error";
            break;
    }
    table.appendChild(createRow(color, data,level));
    if(scroll_log.checked){
        table.scrollTop = table.scrollHeight;
    }
};

var createRow = function (color, data, level) {
    var tr = document.createElement('tr');
    tr.setAttribute('class', "row " + color );
    tr.appendChild(createCell("1", data.date));
    tr.appendChild(createCell("1", data.time));
    tr.appendChild(createCell("1", level));
    tr.appendChild(createCellMessage("9", data.message));
    return tr;
};


var createCell = function (col, data) {
    var th = document.createElement('th');
    th.setAttribute('class', 'col-' + col);
    th.innerText = data;
    return th;
};

var createCellMessage = function (col, message) {
    var th = document.createElement('th');
    th.setAttribute('class', 'col-' + col);
    th.innerHTML = message.replace(/\n/g, "<br />").replace(/\t/g, "&emsp;&emsp;");
    return th;
};