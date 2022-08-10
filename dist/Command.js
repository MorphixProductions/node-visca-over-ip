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
exports.ViscaCommand = void 0;
var Constants_1 = require("./Constants");
var utils = require("./utils");
var ViscaCommand = /** @class */ (function () {
    function ViscaCommand(settings) {
        this.messageType = settings.messageType;
        this.dataType = settings.dataType;
        this.data = settings.data;
        this.description = settings.description;
        this.events = {};
    }
    ViscaCommand.prototype.on = function (eventType, handler) {
        this.events[eventType] = handler;
    };
    ViscaCommand.prototype.toPacket = function () {
        var header = 0x81;
        var qq = this.messageType;
        var rr = this.dataType;
        if (rr > 0)
            return __spreadArray(__spreadArray([
                header,
                qq,
                rr
            ], __read(this.data)), [
                0xff
            ]);
        else
            return __spreadArray(__spreadArray([
                header,
                qq
            ], __read(this.data)), [
                0xff
            ]);
    };
    ViscaCommand.prototype._handle = function (eventType) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        if (this.events[eventType] != undefined)
            this.events[eventType](data);
    };
    ViscaCommand.prototype._hexify = function (data) {
        var e_1, _a;
        var hex = [];
        try {
            for (var data_1 = __values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                var n = data_1_1.value;
                hex.push(n.toString(16));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (data_1_1 && !data_1_1.done && (_a = data_1["return"])) _a.call(data_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return hex.join(' ');
    };
    ViscaCommand.prototype._parsePacket = function (packet) {
        var packetHexString = this._hexify(packet);
        var header = packet[0];
        // this.source = ( header & C.HEADERMASK_SOURCE ) >> 4
        // this.recipient = header & C.HEADERMASK_RECIPIENT; // replies have recipient
        // this.broadcast = ( ( header & C.HEADERMASK_BROADCAST ) >> 3 ) == 1;
        switch (packet[1]) {
            case Constants_1.Constants.MSGTYPE_COMMAND:
            case Constants_1.Constants.MSGTYPE_INQUIRY:
            case Constants_1.Constants.MSGTYPE_ADDRESS_SET:
            case Constants_1.Constants.MSGTYPE_NETCHANGE:
                this.messageType = packet[1];
                this.socket = 0;
                break;
            default:
                this.socket = packet[1] & 15;
                this.messageType = packet[1] & 240;
        }
        this.data = packet.slice(2, packet.length - 1); // might be empty, ignore terminator
        // if data is more than one byte, the first byte determines the dataType
        this.dataType = this.data.length < 2 ? 0 : this.data.splice(0, 1)[0];
    };
    //==================== Command Class Initializers ====================
    ViscaCommand.command = function (dataType, data, description) {
        if (data === void 0) { data = []; }
        return new ViscaCommand({ messageType: Constants_1.Constants.MSGTYPE_COMMAND, dataType: dataType, data: data, description: description });
    };
    ViscaCommand.fromPacket = function (packet) {
        var v = new ViscaCommand({});
        v._parsePacket(packet);
        return v;
    };
    //==================== Data Type Command Wrapper ====================
    ViscaCommand.cameraCommand = function (data, description) {
        return ViscaCommand.command(Constants_1.Constants.DATATYPE_CAMERA, data, description);
    };
    ViscaCommand.operationCommand = function (data, description) {
        return ViscaCommand.command(Constants_1.Constants.DATATYPE_OPERATION, data, description);
    };
    //==================== Setter Commands ====================
    //------------------ POWER ------------------
    ViscaCommand.cameraPower = function (state) {
        var rawValue = state ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_POWER,
            rawValue
        ];
        var description = "camera power " + (state ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraPowerAutoOff = function (time) {
        if (time === void 0) { time = 0; }
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_SLEEP_TIME
        ], __read(utils.i2v(time)));
        var description = "camera power auto off after " + time + " minutes";
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    //------------------ PRESETS ------------------
    ViscaCommand.cameraPresetReset = function (preset) {
        if (preset === void 0) { preset = 0; }
        var subCommand = [
            Constants_1.Constants.CAM_MEMORY,
            Constants_1.Constants.DATA_MEMORY_RESET,
            preset
        ];
        var description = "camera preset " + preset + " reset";
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraPresetSet = function (preset) {
        if (preset === void 0) { preset = 0; }
        var subCommand = [
            Constants_1.Constants.CAM_MEMORY,
            Constants_1.Constants.DATA_MEMORY_SET,
            preset
        ];
        var description = "camera preset " + preset + " set";
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraPresetRecall = function (preset) {
        if (preset === void 0) { preset = 0; }
        var subCommand = [
            Constants_1.Constants.CAM_MEMORY,
            Constants_1.Constants.DATA_MEMORY_RECALL,
            preset
        ];
        var description = "camera preset " + preset + " recall";
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ PAN/TILT ------------------
    // 8x 01 06 01 VV WW XX YY FF
    // VV = x(pan) speed  1-18
    // WW = y(tilt) speed 1-17
    // XX = x mode 01 (dec), 02 (inc), 03 (stop)
    // YY = y mode 01 (dec), 02 (inc), 03 (stop)
    // x increases rightward
    // y increases downward!!
    ViscaCommand.cameraPanTilt = function (xSpeed, ySpeed, xMode, yMode) {
        if (xMode == undefined)
            xMode = xSpeed > 0 ? 0x02 : xSpeed < 0 ? 0x01 : 0x03;
        if (yMode == undefined)
            yMode = ySpeed > 0 ? 0x02 : ySpeed < 0 ? 0x01 : 0x03;
        if (xSpeed < 0)
            xSpeed = xSpeed * -1;
        if (ySpeed < 0)
            ySpeed = ySpeed * -1;
        var subCommand = [
            Constants_1.Constants.OP_PAN_DRIVE,
            xSpeed,
            ySpeed,
            xMode,
            yMode
        ];
        var description = 'camera pan/tilt';
        return ViscaCommand.operationCommand(subCommand, description);
    };
    // x and y are signed 16 bit integers, 0x0000 is center
    // range is -2^15 - 2^15 (32768)
    // relative defaults to false
    ViscaCommand.cameraPanTiltDirect = function (xSpeed, ySpeed, x, y, relative) {
        if (relative === void 0) { relative = false; }
        var xPos = utils.si2v(x);
        var yPos = utils.si2v(y);
        var absrel = relative ? Constants_1.Constants.OP_PAN_RELATIVE : Constants_1.Constants.OP_PAN_ABSOLUTE;
        var subCommand = __spreadArray(__spreadArray([
            absrel,
            xSpeed,
            ySpeed
        ], __read(xPos)), __read(yPos));
        var description = 'camera pan/tilt direct';
        return ViscaCommand.operationCommand(subCommand, description);
    };
    ViscaCommand.cameraPanTiltHome = function () {
        var subCommand = [
            Constants_1.Constants.OP_PAN_HOME
        ];
        var description = 'camera pan/tilt home';
        return ViscaCommand.operationCommand(subCommand, description);
    };
    ViscaCommand.cameraPanTiltReset = function () {
        var subCommand = [
            Constants_1.Constants.OP_PAN_RESET
        ];
        var description = 'camera pan/tilt reset';
        return ViscaCommand.operationCommand(subCommand, description);
    };
    // corner should be C.DATA_PANTILT_UR or C.DATA_PANTILT_BL
    ViscaCommand.cameraPanTiltLimitSet = function (corner, x, y) {
        var xv = utils.si2v(x);
        var yv = utils.si2v(y);
        var subCommand = __spreadArray(__spreadArray([
            Constants_1.Constants.OP_PAN_LIMIT,
            Constants_1.Constants.DATA_RESET,
            corner
        ], __read(xv)), __read(yv));
        var description = "camera pan/tilt limit corner " + corner + " set";
        return ViscaCommand.operationCommand(subCommand, description);
    };
    // ------------------ ZOOM ------------------
    /// offinout = 0x00, 0x02, 0x03
    /// speed = 0(low)..7(high) (-1 means default)
    ViscaCommand._cameraZoom = function (offinout, speed, description) {
        if (offinout === void 0) { offinout = Constants_1.Constants.DATA_RESET; }
        if (speed === void 0) { speed = -1; }
        var data = offinout;
        if (speed > -1 && offinout != Constants_1.Constants.DATA_RESET)
            data = (data << 8) + (speed & 7);
        var subCommand = [
            Constants_1.Constants.CAM_ZOOM,
            data
        ];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraZoomStop = function () {
        var description = 'camera zoom stop';
        return ViscaCommand._cameraZoom(Constants_1.Constants.DATA_RESET, null, description);
    };
    /// zoom in with speed = 0..7 (-1 means default)
    ViscaCommand.cameraZoomIn = function (speed) {
        if (speed === void 0) { speed = -1; }
        var description = 'camera zoom in';
        return ViscaCommand._cameraZoom(Constants_1.Constants.DATA_MORE, speed, description);
    };
    /// zoom out with speed = 0..7 (-1 means default)
    ViscaCommand.cameraZoomOut = function (speed) {
        if (speed === void 0) { speed = -1; }
        var description = 'camera zoom out';
        return ViscaCommand._cameraZoom(Constants_1.Constants.DATA_LESS, speed, description);
    };
    /// max zoom value is 0x4000 (16384) unless digital is enabled
    /// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
    ViscaCommand.cameraZoomDirect = function (zoomVal) {
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_ZOOM_DIRECT
        ], __read(utils.i2v(zoomVal)));
        var description = 'camera zoom direct';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // Digital Zoom enable/disable
    ViscaCommand.cameraDigitalZoom = function (enable) {
        if (enable === void 0) { enable = false; }
        var data = enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_DZOOM,
            data
        ];
        var description = 'camera zoom digital';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ FOCUS ------------------
    /// stopfarnear = 0x00, 0x02, 0x03
    /// speed = 0(low)..7(high) -1 means default
    ViscaCommand._cameraFocus = function (stopfarnear, speed, description) {
        if (stopfarnear === void 0) { stopfarnear = Constants_1.Constants.DATA_RESET; }
        if (speed === void 0) { speed = -1; }
        var data = stopfarnear;
        if (speed > -1 && stopfarnear != Constants_1.Constants.DATA_RESET)
            data = (data << 8) + (speed & 7);
        var subCommand = [
            Constants_1.Constants.CAM_ZOOM,
            data
        ];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusStop = function () {
        var description = 'camera focus stop';
        return ViscaCommand._cameraFocus(Constants_1.Constants.DATA_RESET, null, description);
    };
    /// zoom in with speed = 0..7 (-1 means default)
    ViscaCommand.cameraFocusFar = function (speed) {
        if (speed === void 0) { speed = -1; }
        var description = 'camera focus far';
        return ViscaCommand._cameraFocus(Constants_1.Constants.DATA_MORE, speed, description);
    };
    /// zoom out with speed = 0..7 (-1 means default)
    ViscaCommand.cameraFocusNear = function (speed) {
        if (speed === void 0) { speed = -1; }
        var description = 'camera focus near';
        return ViscaCommand._cameraFocus(Constants_1.Constants.DATA_LESS, speed, description);
    };
    /// max focus value is 0xF000
    /// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
    ViscaCommand.cameraFocusDirect = function (focusVal) {
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_FOCUS_DIRECT
        ], __read(utils.i2v(focusVal)));
        var description = 'camera focus direct';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusAuto = function (enable) {
        if (enable === void 0) { enable = true; }
        var data = enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_AUTO,
            data
        ];
        var description = "camera autofocus " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusAutoToggle = function () {
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_AUTO,
            Constants_1.Constants.DATA_TOGGLEVAL
        ];
        var description = 'camera autofocus toggle';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusTrigger = function () {
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_TRIGGER,
            Constants_1.Constants.CMD_CAM_FOCUS_TRIGGER_NOW
        ];
        var description = 'camera focus trigger';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusInfinity = function () {
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_TRIGGER,
            Constants_1.Constants.CMD_CAM_FOCUS_TRIGGER_INF
        ];
        var description = 'camera focus infinity';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusSetNearLimit = function (limit) {
        if (limit === void 0) { limit = 0xf000; }
        // limit must have low byte 0x00
        limit = limit & 0xff00;
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_FOCUS_NEAR_LIMIT_POS
        ], __read(utils.i2v(limit)));
        var description = 'camera focus set near limit';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusAutoSensitivity = function (high) {
        if (high === void 0) { high = true; }
        var data = high ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_SENSE_HIGH,
            data
        ];
        var description = "camera autosensitivity high mode " + (high ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    /// mode = 0 (on motion), 1 (on interval), 2 (on zoom)
    ViscaCommand.cameraFocusAutoMode = function (mode) {
        if (mode === void 0) { mode = 0; }
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_AF_MODE,
            mode
        ];
        var description = "camera autofocus mode " + [
            'on motion',
            'on interval',
            'on zoom'
        ][mode];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusAutoIntervalTime = function (movementTime, intervalTime) {
        if (movementTime === void 0) { movementTime = 0; }
        if (intervalTime === void 0) { intervalTime = 0; }
        var pqrs = (movementTime << 8) + intervalTime;
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_FOCUS_AF_INTERVAL
        ], __read(utils.i2v(pqrs)));
        var description = 'camera autofocus interval set';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraFocusIRCorrection = function (enable) {
        if (enable === void 0) { enable = false; }
        var data = enable ? 0x00 : 0x01;
        var subCommand = [
            Constants_1.Constants.CAM_FOCUS_IR_CORRECTION,
            data
        ];
        var description = "camera focus ir correction " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ FOCUS & ZOOM ------------------
    ViscaCommand.cameraZoomFocus = function (zoomVal, focusVal) {
        if (zoomVal === void 0) { zoomVal = 0; }
        if (focusVal === void 0) { focusVal = 0; }
        var z = utils.i2v(zoomVal);
        var f = utils.i2v(focusVal);
        var subCommand = __spreadArray(__spreadArray([
            Constants_1.Constants.CAM_ZOOM_DIRECT
        ], __read(z)), __read(f));
        var description = 'camera zoom + focus';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ WHITE BALANCE ------------------
    /// mode = 0(auto),1(indoor),2(outdoor),3(trigger),5(manual)
    ViscaCommand.cameraWBMode = function (mode) {
        if (mode === void 0) { mode = 0; }
        var subCommand = [
            Constants_1.Constants.CAM_WB_MODE,
            mode
        ];
        var description = "camera whitebalance mode set to " + [
            'auto',
            'indoor',
            'outdoor',
            'trigger',
            'manual'
        ][mode];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraWBTrigger = function () {
        var subCommand = [
            Constants_1.Constants.CAM_WB_TRIGGER,
            0x05
        ];
        var description = 'camera whitebalance trigger';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ GAIN ------------------
    /// mode should be 'r' for RGain, 'b' for BGain. defaults to Gain
    /// resetupdown = 0, 2, 3
    /// value must be less than 0xff;
    ViscaCommand._cameraGain = function (mode, resetupdown, directvalue, description) {
        if (mode === void 0) { mode = 'r'; }
        if (resetupdown === void 0) { resetupdown = 0; }
        if (directvalue === void 0) { directvalue = -1; }
        var subCommand;
        var gaintype;
        switch (mode) {
            case 'r':
                gaintype = Constants_1.Constants.CAM_RGAIN;
                break;
            case 'b':
                gaintype = Constants_1.Constants.CAM_BGAIN;
                break;
            default:
                gaintype = Constants_1.Constants.CAM_GAIN;
                break;
        }
        if (directvalue > 0) {
            gaintype += 0x40;
            subCommand = __spreadArray([
                gaintype
            ], __read(utils.i2v(directvalue)));
        }
        else {
            subCommand = [
                gaintype,
                resetupdown
            ];
        }
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraGainUp = function () {
        var mode = '';
        var description = 'camera gain up';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_ONVAL, null, description);
    };
    ViscaCommand.cameraGainDown = function () {
        var mode = '';
        var description = 'camera gain down';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_OFFVAL, null, description);
    };
    ViscaCommand.cameraGainReset = function () {
        var mode = '';
        var description = 'camera gain reset';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_RESET, null, description);
    };
    ViscaCommand.cameraGainDirect = function (value) {
        var mode = 'r';
        var description = 'camera gain direct';
        return ViscaCommand._cameraGain(mode, 0x00, value, description);
    };
    ViscaCommand.cameraGainRUp = function () {
        var mode = 'r';
        var description = 'camera gain R up';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_ONVAL, null, description);
    };
    ViscaCommand.cameraGainRDown = function () {
        var mode = 'r';
        var description = 'camera gain R down';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_OFFVAL, null, description);
    };
    ViscaCommand.cameraGainRReset = function () {
        var mode = 'r';
        var description = 'camera gain R reset';
        return ViscaCommand._cameraGain(mode, 0x00, null, description);
    };
    ViscaCommand.cameraGainRDirect = function (value) {
        var mode = 'r';
        var description = 'camera gain R direct';
        return ViscaCommand._cameraGain(mode, 0x00, value, description);
    };
    ViscaCommand.cameraGainBUp = function () {
        var mode = 'b';
        var description = 'camera gain B up';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_ONVAL, null, description);
    };
    ViscaCommand.cameraGainBDown = function () {
        var mode = 'b';
        var description = 'camera gain B down';
        return ViscaCommand._cameraGain(mode, Constants_1.Constants.DATA_OFFVAL, null, description);
    };
    ViscaCommand.cameraGainBReset = function () {
        var mode = 'b';
        var description = 'camera gain B reset';
        return ViscaCommand._cameraGain(mode, 0x00, null, description);
    };
    ViscaCommand.cameraGainBDirect = function (value) {
        var mode = 'b';
        var description = 'camera gain B direct';
        return ViscaCommand._cameraGain(mode, 0x00, value, description);
    };
    /// gain value is from 4-F
    ViscaCommand.cameraGainLimit = function (value) {
        var subCommand = [
            Constants_1.Constants.CAM_GAIN_LIMIT,
            value
        ];
        var description = 'camera gain limit';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ EXPOSURE ------------------
    /// mode = 0, 3, A, B, D
    /// auto, manual, shutter priority, iris priority, bright
    ViscaCommand.cameraExposureMode = function (mode) {
        if (mode === void 0) { mode = 0x00; }
        var subCommand = [
            Constants_1.Constants.CAM_EXPOSURE_MODE,
            mode
        ];
        var description = 'camera exposure compenstation up';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraExposureCompensationEnable = function (enable) {
        if (enable === void 0) { enable = true; }
        var subCommand = [
            Constants_1.Constants.CAM_EXP_COMP_ENABLE,
            enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL
        ];
        var description = "camera exposure compenstation " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand._cameraExposureCompensationAdjust = function (resetupdown, description) {
        var subCommand = [
            Constants_1.Constants.CAM_EXP_COMP,
            resetupdown
        ];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraExposureCompensationUp = function () {
        var description = 'camera exposure compenstation up';
        return ViscaCommand._cameraExposureCompensationAdjust(Constants_1.Constants.DATA_MORE, description);
    };
    ViscaCommand.cameraExposureCompensationDown = function () {
        var description = 'camera exposure compenstation down';
        return ViscaCommand._cameraExposureCompensationAdjust(Constants_1.Constants.DATA_LESS, description);
    };
    ViscaCommand.cameraExposureCompensationReset = function () {
        var description = 'camera exposure compenstation reset';
        return ViscaCommand._cameraExposureCompensationAdjust(Constants_1.Constants.DATA_RESET, description);
    };
    ViscaCommand.cameraExposureCompensationDirect = function (directval) {
        if (directval === void 0) { directval = 0; }
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_EXP_COMP_DIRECT
        ], __read(utils.i2v(directval)));
        var description = 'camera exposure compenstation direct';
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ BACKLIGHT ------------------
    ViscaCommand.cameraBacklightCompensation = function (enable) {
        if (enable === void 0) { enable = true; }
        var subCommand = [
            Constants_1.Constants.CAM_BACKLIGHT,
            enable ? 0x02 : 0x03
        ];
        var description = "camera backlight compensation " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ SHUTTER ------------------
    /// resetupdown = 0, 2, 3
    ViscaCommand._cameraShutter = function (resetupdown, directvalue, description) {
        if (directvalue === void 0) { directvalue = -1; }
        var subCommand = [
            Constants_1.Constants.CAM_SHUTTER,
            resetupdown
        ];
        if (directvalue > -1 && directvalue != null) {
            subCommand = __spreadArray([
                Constants_1.Constants.CAM_SHUTTER_DIRECT
            ], __read(utils.i2v(directvalue)));
        }
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraShutterUp = function () {
        var description = 'camera shutter up';
        return ViscaCommand._cameraShutter(Constants_1.Constants.DATA_MORE, null, description);
    };
    ViscaCommand.cameraShutterDown = function () {
        var description = 'camera shutter down';
        return ViscaCommand._cameraShutter(Constants_1.Constants.DATA_LESS, null, description);
    };
    ViscaCommand.cameraShutterReset = function () {
        var description = 'camera shutter reset';
        return ViscaCommand._cameraShutter(Constants_1.Constants.DATA_RESET, null, description);
    };
    ViscaCommand.cameraShutterDirect = function (value) {
        if (value === void 0) { value = 0; }
        var description = 'camera shutter direct';
        return ViscaCommand._cameraShutter(Constants_1.Constants.DATA_RESET, value, description);
    };
    ViscaCommand.cameraShutterSlow = function (auto) {
        if (auto === void 0) { auto = true; }
        var subCommand = [
            Constants_1.Constants.CAM_SHUTTER_SLOW_AUTO,
            auto ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL
        ];
        var description = "camera shutter slow mode " + (auto ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ IRIS ------------------
    /// resetupdown = 0, 2, 3
    ViscaCommand._cameraIris = function (resetupdown, directvalue, description) {
        if (directvalue === void 0) { directvalue = -1; }
        var subCommand = [
            Constants_1.Constants.CAM_IRIS,
            resetupdown
        ];
        if (directvalue > -1 && directvalue != null) {
            subCommand = __spreadArray([
                Constants_1.Constants.CAM_IRIS_DIRECT
            ], __read(utils.i2v(directvalue)));
        }
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraIrisUp = function () {
        var description = 'camera iris up';
        return ViscaCommand._cameraIris(Constants_1.Constants.DATA_MORE, null, description);
    };
    ViscaCommand.cameraIrisDown = function () {
        var description = 'camera iris down';
        return ViscaCommand._cameraIris(Constants_1.Constants.DATA_LESS, null, description);
    };
    ViscaCommand.cameraIrisReset = function () {
        var description = 'camera iris reset';
        return ViscaCommand._cameraIris(Constants_1.Constants.DATA_RESET, null, description);
    };
    ViscaCommand.cameraIrisDirect = function (value) {
        if (value === void 0) { value = 0; }
        var description = 'camera iris direct';
        return ViscaCommand._cameraIris(Constants_1.Constants.DATA_RESET, value, description);
    };
    // ------------------ APERTURE ------------------
    /// resetupdown = 0, 2, 3
    ViscaCommand._cameraAperture = function (resetupdown, directvalue, description) {
        if (directvalue === void 0) { directvalue = -1; }
        var subCommand = [
            Constants_1.Constants.CAM_APERTURE,
            resetupdown
        ];
        if (directvalue > -1 && directvalue != null) {
            subCommand = __spreadArray([
                Constants_1.Constants.CAM_APERTURE_DIRECT
            ], __read(utils.i2v(directvalue)));
        }
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraApertureUp = function () {
        var description = 'camera aperture up';
        return ViscaCommand._cameraAperture(Constants_1.Constants.DATA_MORE, null, description);
    };
    ViscaCommand.cameraApertureDown = function () {
        var description = 'camera aperture down';
        return ViscaCommand._cameraAperture(Constants_1.Constants.DATA_LESS, null, description);
    };
    ViscaCommand.cameraApertureReset = function () {
        var description = 'camera aperture reset';
        return ViscaCommand._cameraAperture(Constants_1.Constants.DATA_RESET, null, description);
    };
    ViscaCommand.cameraApertureDirect = function (value) {
        if (value === void 0) { value = 0; }
        var description = 'camera aperture direct';
        return ViscaCommand._cameraAperture(Constants_1.Constants.DATA_RESET, value, description);
    };
    // ------------------ QUALITY ------------------
    ViscaCommand.cameraHighResMode = function (enable) {
        if (enable === void 0) { enable = true; }
        var subCommand = [
            Constants_1.Constants.CAM_HIRES_ENABLE,
            enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL
        ];
        var description = "camera high res mode " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraHighSensitivityMode = function (enable) {
        if (enable === void 0) { enable = true; }
        var subCommand = [
            Constants_1.Constants.CAM_HIGH_SENSITIVITY,
            enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL
        ];
        var description = "camera high sensitivity mode " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    /// val = 0..5
    ViscaCommand.cameraNoiseReduction = function (val) {
        var subCommand = [
            Constants_1.Constants.CAM_NOISE_REDUCTION,
            val
        ];
        var description = "camera noise reduction to " + val;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    /// val = 0..4
    ViscaCommand.cameraGamma = function (val) {
        var subCommand = [
            Constants_1.Constants.CAM_GAMMA,
            val
        ];
        var description = "camera gamma to " + val;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ EFFECTS ------------------
    /// effect types are enumerated in the constants file
    ViscaCommand._cameraEffect = function (effectType, description) {
        var subCommand = [
            Constants_1.Constants.CAM_EFFECT,
            effectType
        ];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand._cameraEffectDigital = function (effectType, description) {
        var subCommand = [
            Constants_1.Constants.CAM_EFFECT_DIGITAL,
            effectType
        ];
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraEffectDigitalIntensity = function (level) {
        var subCommand = [
            Constants_1.Constants.CAM_EFFECT_LEVEL,
            level
        ];
        var description = "camera digital effect intensitity to " + level;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // basic effects
    ViscaCommand.cameraEffectOff = function () {
        var description = 'camera effect pff';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_OFF, description);
    };
    ViscaCommand.cameraEffectPastel = function () {
        var description = 'camera effect pastel';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_PASTEL, description);
    };
    ViscaCommand.cameraEffectNegative = function () {
        var description = 'camera effect negative';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_NEGATIVE, description);
    };
    ViscaCommand.cameraEffectSepia = function () {
        var description = 'camera effect sepia';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_SEPIA, description);
    };
    ViscaCommand.cameraEffectBW = function () {
        var description = 'camera effect blackwhite';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_BW, description);
    };
    ViscaCommand.cameraEffectSolar = function () {
        var description = 'camera effect solar';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_SOLAR, description);
    };
    ViscaCommand.cameraEffectMosaic = function () {
        var description = 'camera effect mosaic';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_MOSAIC, description);
    };
    ViscaCommand.cameraEffectSlim = function () {
        var description = 'camera effect slim';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_SLIM, description);
    };
    ViscaCommand.cameraEffectStretch = function () {
        var description = 'camera effect stretch';
        return ViscaCommand._cameraEffect(Constants_1.Constants.DATA_EFFECT_STRETCH, description);
    };
    // digital effects
    ViscaCommand.cameraEffectDigitalOff = function () {
        var description = 'camera digital effect off';
        return ViscaCommand._cameraEffectDigital(Constants_1.Constants.DATA_EFFECT_OFF, description);
    };
    ViscaCommand.cameraEffectDigitalStill = function () {
        var description = 'camera digital effect still';
        return ViscaCommand._cameraEffectDigital(Constants_1.Constants.DATA_EFFECT_STILL, description);
    };
    ViscaCommand.cameraEffectDigitalFlash = function () {
        var description = 'camera digital effect flash';
        return ViscaCommand._cameraEffectDigital(Constants_1.Constants.DATA_EFFECT_FLASH, description);
    };
    ViscaCommand.cameraEffectDigitalLumi = function () {
        var description = 'camera digital effect lumi';
        return ViscaCommand._cameraEffectDigital(Constants_1.Constants.DATA_EFFECT_LUMI, description);
    };
    ViscaCommand.cameraEffectDigitalTrail = function () {
        var description = 'camera digital effect trail';
        return ViscaCommand._cameraEffectDigital(Constants_1.Constants.DATA_EFFECT_TRAIL, description);
    };
    // ------------------ FREEZE ------------------
    ViscaCommand.cameraFreeze = function (enable) {
        if (enable === void 0) { enable = true; }
        var mode = enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_FREEZE,
            mode
        ];
        var description = "camera freeze " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ ICR ------------------
    ViscaCommand.cameraICR = function (enable) {
        if (enable === void 0) { enable = true; }
        var mode = enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_ICR,
            mode
        ];
        var description = "camera ICR " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraICRAuto = function (enable) {
        if (enable === void 0) { enable = true; }
        var mode = enable ? Constants_1.Constants.DATA_ONVAL : Constants_1.Constants.DATA_OFFVAL;
        var subCommand = [
            Constants_1.Constants.CAM_AUTO_ICR,
            mode
        ];
        var description = "camera auto ICR " + (enable ? 'on' : 'off');
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    ViscaCommand.cameraICRAutoThreshold = function (val) {
        if (val === void 0) { val = 0; }
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_AUTO_ICR_THRESHOLD
        ], __read(utils.i2v(val)));
        var description = "camera ICR threshold to " + val;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ ID ------------------
    ViscaCommand.cameraIDWrite = function (data) {
        var subCommand = __spreadArray([
            Constants_1.Constants.CAM_ID_WRITE
        ], __read(utils.i2v(data)));
        var description = "camera id set to " + data;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // ------------------ COLOR ADJUST ------------------
    // value = 0(off), 1-3
    ViscaCommand.cameraChromaSuppress = function (value) {
        var subCommand = [
            Constants_1.Constants.CAM_CHROMA_SUPPRESS,
            value
        ];
        var description = "camera chrome suppress to " + value;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // value = 0h - Eh
    ViscaCommand.cameraColorGain = function (value) {
        var subCommand = [
            Constants_1.Constants.CAM_COLOR_GAIN,
            value
        ];
        var description = "camera color gain to " + value;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    // value = 0h - Eh
    ViscaCommand.cameraColorHue = function (value) {
        var subCommand = [
            Constants_1.Constants.CAM_COLOR_HUE,
            value
        ];
        var description = "camera color hue to " + value;
        return ViscaCommand.cameraCommand(subCommand, description);
    };
    return ViscaCommand;
}());
exports.ViscaCommand = ViscaCommand;
//# sourceMappingURL=Command.js.map