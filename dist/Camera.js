"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
exports.ViscaCamera = void 0;
var buffer_1 = require("buffer");
var Command_1 = require("./Command");
var Constants_1 = require("./Constants");
var dgram = require('dgram');
var ViscaCamera = /** @class */ (function () {
    function ViscaCamera(ip, port) {
        var _this = this;
        this.ip = ip;
        this.port = port;
        this.inquiryCallback = {};
        this.inquiryQueue = [];
        this.sentCommands = [];
        this.commandQueue = [];
        this.events = {};
        this.reconnect();
        this.client.on('close', function () {
            _this.connected = false;
            if (_this.events.closed)
                _this.events.closed();
        });
        this.client.on('message', function (data) {
            _this.connected = false;
            var command = Command_1.ViscaCommand.fromPacket(__spreadArray([], __read(data)));
            _this.onData(command);
        });
        this.client.on('error', function (err) {
            _this.connected = false;
            console.log(err);
            if (_this.events.closed)
                _this.events.error(err);
        });
    }
    //==================== Connectivity & Events ====================
    ViscaCamera.prototype.on = function (eventType, handler) {
        if (eventType == 'connected' && this.events[eventType] == undefined && this.connected == true)
            handler();
        this.events[eventType] = handler;
    };
    ViscaCamera.prototype._handle = function (eventType) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        if (this.events[eventType] != undefined)
            this.events[eventType](data);
    };
    ViscaCamera.prototype.reconnect = function () {
        var _this = this;
        this.client = dgram.createSocket('udp4');
        this.client.connect(this.port, this.ip, function () {
            _this.connected = true;
            _this.inquiryReady = true;
            _this.commandReady = true;
            if (_this.events.connected)
                _this.events.connected();
        });
    };
    //==================== Commands ====================
    ViscaCamera.prototype.sendDirect = function (data) {
        var message = buffer_1.Buffer.from(data.toPacket());
        this.client.send(message);
    };
    ViscaCamera.prototype.sendCommand = function (command) {
        // this.sendRaw(command.toPacket());
        this._updateBooleans();
        command.addedAt = Date.now();
        var queued = false;
        // INTERFACE_DATA, ADDRESS_SET commands always get sent and aren't tracked.
        // For inquiry commands, we need to keep track of them locally, so we can match replies to commands
        if (command.messageType == Constants_1.Constants.MSGTYPE_INQUIRY) {
            // only allow one non-ack command at a time
            if (this.inquiryReady) {
                this.inquiryCallback['0'] = command; // no ACK, only complete / error
            }
            else {
                this.inquiryQueue.push(command);
                queued = true;
            }
        }
        else if (command.messageType == Constants_1.Constants.MSGTYPE_COMMAND) {
            if (this.commandReady) {
                this.sentCommands.push(command); // not in a buffer until we get ACK
            }
            else {
                this.commandQueue.push(command);
                queued = true;
            }
        }
        if (queued) {
            this._scheduleUpdate();
        }
        else {
            command.sentAt = Date.now();
            console.log("SENDING VISCA COMMAND: " + command.description);
            this.sendDirect(command);
        }
    };
    //==================== Callback Handlers ====================
    ViscaCamera.prototype.onData = function (viscaCommand) {
        switch (viscaCommand.messageType) {
            case Constants_1.Constants.MSGTYPE_IF_CLEAR:
                this._clear();
                break;
            // network change messages are unprompted
            case Constants_1.Constants.MSGTYPE_NETCHANGE:
                // a camera issues this when it detects a change on the serial line,
                // and if we get it, we should re-assign all serial port cameras.
                // this.enumerateSerial();
                break;
            // ack message, one of our commands was accepted and put in a buffer
            case Constants_1.Constants.MSGTYPE_ACK:
                this.ack(viscaCommand);
                return;
            // completion message
            case Constants_1.Constants.MSGTYPE_COMPLETE:
                this.complete(viscaCommand);
                break;
            // error messages
            case Constants_1.Constants.MSGTYPE_ERROR:
                this.error(viscaCommand);
                break;
            default:
                break;
        }
        // this.emit('update');
    };
    ViscaCamera.prototype.ack = function (viscaCommand) {
        // get the first viscaCommand that expects an ACK
        var _a = __read(this.sentCommands.splice(0, 1), 1), cmd = _a[0]; // gets the head
        if (cmd) {
            cmd._handle('ack'); // run the command ACK callback if it exists
            this.inquiryCallback[viscaCommand.socket] = cmd;
        }
        this._scheduleUpdate();
    };
    ViscaCamera.prototype.complete = function (viscaCommand) {
        var key = viscaCommand.socket.toString();
        if (this.inquiryCallback[key] != undefined) {
            this.inquiryCallback[key]._handle('complete', viscaCommand.data);
            delete this.inquiryCallback[key];
        }
        this._scheduleUpdate();
    };
    ViscaCamera.prototype.error = function (viscaCommand) {
        var message;
        var errorType = viscaCommand.data[0];
        var socketKey = viscaCommand.socket.toString();
        switch (errorType) {
            case Constants_1.Constants.ERROR_SYNTAX:
                message = "VISCA ERROR: syntax error, invalid command";
                break;
            case Constants_1.Constants.ERROR_BUFFER_FULL:
                message = "VISCA ERROR: command buffers full";
                break;
            case Constants_1.Constants.ERROR_CANCELLED:
                message = 'VISCA ERROR: command cancelled';
                break;
            case Constants_1.Constants.ERROR_INVALID_BUFFER:
                message = "VISCA ERROR: socket cannot be cancelled";
                break;
            case Constants_1.Constants.ERROR_COMMAND_FAILED:
                message = "VISCA ERROR: command failed";
                break;
        }
        // console.log(
        // 	`CAMERA ERROR: command socket: ${viscaCommand.socket}, message: ${message}\nRECEIVED: ${viscaCommand.toString()}`
        // );
        if (this.inquiryCallback[socketKey]) {
            this.inquiryCallback[socketKey]._handle('error', new Error(message));
        }
        else {
            this._handle('error', new Error(' Camera buffer missing'));
        }
        delete this.inquiryCallback[socketKey];
        this._update();
    };
    //==================== Private Functions ====================
    ViscaCamera.prototype._clear = function () {
        this.inquiryCallback = {};
        this.sentCommands = [];
    };
    ViscaCamera.prototype._updateBooleans = function () {
        this.commandReady = !('1' in this.inquiryCallback || '2' in this.inquiryCallback);
        this.inquiryReady = !('0' in this.inquiryCallback);
    };
    ViscaCamera.prototype._scheduleUpdate = function () {
        var _this = this;
        if (this.updateTimeout != null)
            return;
        if (this.inquiryQueue.length > 0 || this.commandQueue.length > 0) {
            this.updateTimeout = setTimeout(function () { return _this._update(); }, 25);
        }
    };
    ViscaCamera.prototype._update = function () {
        this.updateTimeout = null;
        this._expireOldCommands();
        this._processQueue();
        // this.emit('update');
    };
    ViscaCamera.prototype._processQueue = function () {
        this._updateBooleans();
        if (this.commandReady && this.commandQueue.length > 0) {
            var _a = __read(this.commandQueue.splice(0, 1), 1), cmd = _a[0];
            this.sendCommand(cmd);
        }
        if (this.inquiryReady && this.inquiryQueue.length > 0) {
            var _b = __read(this.inquiryQueue.splice(0, 1), 1), cmd = _b[0];
            this.sendCommand(cmd);
        }
        this._updateBooleans();
    };
    ViscaCamera.prototype._expireOldCommands = function () {
        var e_1, _a;
        var now = Date.now();
        // the first command is always the oldest
        while (this.sentCommands.length > 0) {
            if (now - this.sentCommands[0].sentAt < Constants_1.Constants.COMMAND_TIMEOUT)
                break;
            this.sentCommands.splice(0, 1);
        }
        try {
            // check all cameraBuffers
            for (var _b = __values(Object.keys(this.inquiryCallback)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var key = _c.value;
                if (now - this.inquiryCallback[key].sentAt > Constants_1.Constants.COMMAND_TIMEOUT)
                    delete this.inquiryCallback[key];
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    return ViscaCamera;
}());
exports.ViscaCamera = ViscaCamera;
//# sourceMappingURL=Camera.js.map