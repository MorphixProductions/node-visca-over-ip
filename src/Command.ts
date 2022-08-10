import { Constants as C } from './Constants';
import * as utils from './utils';

export class ViscaCommand {
	x;
	messageType: number;
	dataType: number;

	socket: number;

	data: number[];

	description: string;
	addedAt: number;

	events: { [key in ViscaCommandEventTypes]?: (...args: any[]) => void };
	sentAt: number;

	constructor(settings: ViscaCommandSettings) {
		this.messageType = settings.messageType;
		this.dataType = settings.dataType;

		this.data = settings.data;

		this.description = settings.description;

		this.events = {};
	}

	on(eventType: ViscaCommandEventTypes, handler: (...args: any[]) => void) {
		this.events[eventType] = handler;
	}

	toPacket(): number[] {
		let header = 0x81;
		let qq = this.messageType;
		let rr = this.dataType;

		if (rr > 0)
			return [
				header,
				qq,
				rr,
				...this.data,
				0xff
			];
		else
			return [
				header,
				qq,
				...this.data,
				0xff
			];
	}

	_handle(eventType: ViscaCommandEventTypes, ...data: any[]) {
		if (this.events[eventType] != undefined) this.events[eventType](data);
	}

	_hexify(data: number[]): string {
		let hex = [];
		for (let n of data) hex.push(n.toString(16));
		return hex.join(' ');
	}

	_parsePacket(packet: number[]) {
		let packetHexString = this._hexify(packet);

		let header = packet[0];
		// this.source = ( header & C.HEADERMASK_SOURCE ) >> 4
		// this.recipient = header & C.HEADERMASK_RECIPIENT; // replies have recipient
		// this.broadcast = ( ( header & C.HEADERMASK_BROADCAST ) >> 3 ) == 1;
		switch (packet[1]) {
			case C.MSGTYPE_COMMAND:
			case C.MSGTYPE_INQUIRY:
			case C.MSGTYPE_ADDRESS_SET:
			case C.MSGTYPE_NETCHANGE:
				this.messageType = packet[1];
				this.socket = 0;
				break;
			default:
				this.socket = packet[1] & 0b00001111;
				this.messageType = packet[1] & 0b11110000;
		}
		this.data = packet.slice(2, packet.length - 1); // might be empty, ignore terminator

		// if data is more than one byte, the first byte determines the dataType
		this.dataType = this.data.length < 2 ? 0 : this.data.splice(0, 1)[0];
	}

	//==================== Command Class Initializers ====================
	static command(dataType: number, data: number[] = [], description: string) {
		return new ViscaCommand({ messageType: C.MSGTYPE_COMMAND, dataType, data, description });
	}
	static fromPacket(packet: number[]) {
		let v = new ViscaCommand({});
		v._parsePacket(packet);
		return v;
	}

	//==================== Data Type Command Wrapper ====================
	static cameraCommand(data: number[], description: string) {
		return ViscaCommand.command(C.DATATYPE_CAMERA, data, description);
	}
	static operationCommand(data: number[], description: string) {
		return ViscaCommand.command(C.DATATYPE_OPERATION, data, description);
	}

	//==================== Setter Commands ====================

	//------------------ POWER ------------------
	static cameraPower(state: boolean) {
		let rawValue = state ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_POWER,
			rawValue
		];

		let description = `camera power ${state ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraPowerAutoOff(time = 0) {
		let subCommand = [
			C.CAM_SLEEP_TIME,
			...utils.i2v(time)
		];

		let description = `camera power auto off after ${time} minutes`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	//------------------ PRESETS ------------------

	static cameraPresetReset(preset = 0) {
		let subCommand = [
			C.CAM_MEMORY,
			C.DATA_MEMORY_RESET,
			preset
		];

		let description = `camera preset ${preset} reset`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	static cameraPresetSet(preset = 0) {
		let subCommand = [
			C.CAM_MEMORY,
			C.DATA_MEMORY_SET,
			preset
		];

		let description = `camera preset ${preset} set`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	static cameraPresetRecall(preset = 0) {
		let subCommand = [
			C.CAM_MEMORY,
			C.DATA_MEMORY_RECALL,
			preset
		];

		let description = `camera preset ${preset} recall`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ PAN/TILT ------------------
	// 8x 01 06 01 VV WW XX YY FF
	// VV = x(pan) speed  1-18
	// WW = y(tilt) speed 1-17
	// XX = x mode 01 (dec), 02 (inc), 03 (stop)
	// YY = y mode 01 (dec), 02 (inc), 03 (stop)
	// x increases rightward
	// y increases downward!!
	static cameraPanTilt(xSpeed: number, ySpeed: number, xMode?: number, yMode?: number) {
		if (xMode == undefined) xMode = xSpeed > 0 ? 0x02 : xSpeed < 0 ? 0x01 : 0x03;
		if (yMode == undefined) yMode = ySpeed > 0 ? 0x02 : ySpeed < 0 ? 0x01 : 0x03;

		if (xSpeed < 0) xSpeed = xSpeed * -1;
		if (ySpeed < 0) ySpeed = ySpeed * -1;

		let subCommand = [
			C.OP_PAN_DRIVE,
			xSpeed,
			ySpeed,
			xMode,
			yMode
		];

		let description = 'camera pan/tilt';
		return ViscaCommand.operationCommand(subCommand, description);
	}
	// x and y are signed 16 bit integers, 0x0000 is center
	// range is -2^15 - 2^15 (32768)
	// relative defaults to false
	static cameraPanTiltDirect(xSpeed: number, ySpeed: number, x: number, y: number, relative = false) {
		let xPos = utils.si2v(x);
		let yPos = utils.si2v(y);
		let absrel = relative ? C.OP_PAN_RELATIVE : C.OP_PAN_ABSOLUTE;
		let subCommand = [
			absrel,
			xSpeed,
			ySpeed,
			...xPos,
			...yPos
		];

		let description = 'camera pan/tilt direct';
		return ViscaCommand.operationCommand(subCommand, description);
	}

	static cameraPanTiltHome() {
		let subCommand = [
			C.OP_PAN_HOME
		];

		let description = 'camera pan/tilt home';
		return ViscaCommand.operationCommand(subCommand, description);
	}
	static cameraPanTiltReset() {
		let subCommand = [
			C.OP_PAN_RESET
		];

		let description = 'camera pan/tilt reset';
		return ViscaCommand.operationCommand(subCommand, description);
	}

	// corner should be C.DATA_PANTILT_UR or C.DATA_PANTILT_BL
	static cameraPanTiltLimitSet(corner: number, x: number, y: number) {
		let xv = utils.si2v(x);
		let yv = utils.si2v(y);
		let subCommand = [
			C.OP_PAN_LIMIT,
			C.DATA_RESET,
			corner,
			...xv,
			...yv
		];

		let description = `camera pan/tilt limit corner ${corner} set`;

		return ViscaCommand.operationCommand(subCommand, description);
	}

	// ------------------ ZOOM ------------------
	/// offinout = 0x00, 0x02, 0x03
	/// speed = 0(low)..7(high) (-1 means default)
	static _cameraZoom(offinout = C.DATA_RESET, speed = -1, description: string) {
		let data = offinout;
		if (speed > -1 && offinout != C.DATA_RESET) data = (data << 8) + (speed & 0b111);
		let subCommand = [
			C.CAM_ZOOM,
			data
		];

		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraZoomStop() {
		let description = 'camera zoom stop';
		return ViscaCommand._cameraZoom(C.DATA_RESET, null, description);
	}
	/// zoom in with speed = 0..7 (-1 means default)
	static cameraZoomIn(speed = -1) {
		let description = 'camera zoom in';
		return ViscaCommand._cameraZoom(C.DATA_MORE, speed, description);
	}
	/// zoom out with speed = 0..7 (-1 means default)
	static cameraZoomOut(speed = -1) {
		let description = 'camera zoom out';
		return ViscaCommand._cameraZoom(C.DATA_LESS, speed, description);
	}

	/// max zoom value is 0x4000 (16384) unless digital is enabled
	/// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
	static cameraZoomDirect(zoomVal: number) {
		let subCommand = [
			C.CAM_ZOOM_DIRECT,
			...utils.i2v(zoomVal)
		];

		let description = 'camera zoom direct';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// Digital Zoom enable/disable
	static cameraDigitalZoom(enable = false) {
		let data = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_DZOOM,
			data
		];

		let description = 'camera zoom digital';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ FOCUS ------------------
	/// stopfarnear = 0x00, 0x02, 0x03
	/// speed = 0(low)..7(high) -1 means default
	static _cameraFocus(stopfarnear = C.DATA_RESET, speed = -1, description: string) {
		let data = stopfarnear;
		if (speed > -1 && stopfarnear != C.DATA_RESET) data = (data << 8) + (speed & 0b111);
		let subCommand = [
			C.CAM_ZOOM,
			data
		];

		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusStop() {
		let description = 'camera focus stop';
		return ViscaCommand._cameraFocus(C.DATA_RESET, null, description);
	}
	/// zoom in with speed = 0..7 (-1 means default)
	static cameraFocusFar(speed = -1) {
		let description = 'camera focus far';
		return ViscaCommand._cameraFocus(C.DATA_MORE, speed, description);
	}
	/// zoom out with speed = 0..7 (-1 means default)
	static cameraFocusNear(speed = -1) {
		let description = 'camera focus near';
		return ViscaCommand._cameraFocus(C.DATA_LESS, speed, description);
	}
	/// max focus value is 0xF000
	/// 0xpqrs -> 0x0p 0x0q 0x0r 0x0s
	static cameraFocusDirect(focusVal: number) {
		let subCommand = [
			C.CAM_FOCUS_DIRECT,
			...utils.i2v(focusVal)
		];

		let description = 'camera focus direct';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusAuto(enable = true) {
		let data = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_FOCUS_AUTO,
			data
		];

		let description = `camera autofocus ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusAutoToggle() {
		let subCommand = [
			C.CAM_FOCUS_AUTO,
			C.DATA_TOGGLEVAL
		];

		let description = 'camera autofocus toggle';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusTrigger() {
		let subCommand = [
			C.CAM_FOCUS_TRIGGER,
			C.CMD_CAM_FOCUS_TRIGGER_NOW
		];

		let description = 'camera focus trigger';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusInfinity() {
		let subCommand = [
			C.CAM_FOCUS_TRIGGER,
			C.CMD_CAM_FOCUS_TRIGGER_INF
		];

		let description = 'camera focus infinity';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusSetNearLimit(limit = 0xf000) {
		// limit must have low byte 0x00
		limit = limit & 0xff00;
		let subCommand = [
			C.CAM_FOCUS_NEAR_LIMIT_POS,
			...utils.i2v(limit)
		];

		let description = 'camera focus set near limit';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusAutoSensitivity(high = true) {
		let data = high ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_FOCUS_SENSE_HIGH,
			data
		];

		let description = `camera autosensitivity high mode ${high ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	/// mode = 0 (on motion), 1 (on interval), 2 (on zoom)
	static cameraFocusAutoMode(mode = 0) {
		let subCommand = [
			C.CAM_FOCUS_AF_MODE,
			mode
		];

		let description = `camera autofocus mode ${[
			'on motion',
			'on interval',
			'on zoom'
		][mode]}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusAutoIntervalTime(movementTime = 0, intervalTime = 0) {
		let pqrs = (movementTime << 8) + intervalTime;
		let subCommand = [
			C.CAM_FOCUS_AF_INTERVAL,
			...utils.i2v(pqrs)
		];

		let description = 'camera autofocus interval set';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraFocusIRCorrection(enable = false) {
		let data = enable ? 0x00 : 0x01;
		let subCommand = [
			C.CAM_FOCUS_IR_CORRECTION,
			data
		];

		let description = `camera focus ir correction ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ FOCUS & ZOOM ------------------
	static cameraZoomFocus(zoomVal = 0, focusVal = 0) {
		let z = utils.i2v(zoomVal);
		let f = utils.i2v(focusVal);
		let subCommand = [
			C.CAM_ZOOM_DIRECT,
			...z,
			...f
		];

		let description = 'camera zoom + focus';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ WHITE BALANCE ------------------
	/// mode = 0(auto),1(indoor),2(outdoor),3(trigger),5(manual)
	static cameraWBMode(mode = 0) {
		let subCommand = [
			C.CAM_WB_MODE,
			mode
		];

		let description = `camera whitebalance mode set to ${[
			'auto',
			'indoor',
			'outdoor',
			'trigger',
			'manual'
		][mode]}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraWBTrigger() {
		let subCommand = [
			C.CAM_WB_TRIGGER,
			0x05
		];

		let description = 'camera whitebalance trigger';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ GAIN ------------------
	/// mode should be 'r' for RGain, 'b' for BGain. defaults to Gain
	/// resetupdown = 0, 2, 3
	/// value must be less than 0xff;
	static _cameraGain(mode = 'r', resetupdown = 0, directvalue = -1, description: string) {
		let subCommand: number[];
		let gaintype;
		switch (mode) {
			case 'r':
				gaintype = C.CAM_RGAIN;
				break;
			case 'b':
				gaintype = C.CAM_BGAIN;
				break;
			default:
				gaintype = C.CAM_GAIN;
				break;
		}
		if (directvalue > 0) {
			gaintype += 0x40;
			subCommand = [
				gaintype,
				...utils.i2v(directvalue)
			];
		} else {
			subCommand = [
				gaintype,
				resetupdown
			];
		}
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraGainUp() {
		let mode = '';

		let description = 'camera gain up';
		return ViscaCommand._cameraGain(mode, C.DATA_ONVAL, null, description);
	}
	static cameraGainDown() {
		let mode = '';

		let description = 'camera gain down';
		return ViscaCommand._cameraGain(mode, C.DATA_OFFVAL, null, description);
	}
	static cameraGainReset() {
		let mode = '';

		let description = 'camera gain reset';
		return ViscaCommand._cameraGain(mode, C.DATA_RESET, null, description);
	}
	static cameraGainDirect(value: number) {
		let mode = 'r';

		let description = 'camera gain direct';
		return ViscaCommand._cameraGain(mode, 0x00, value, description);
	}
	static cameraGainRUp() {
		let mode = 'r';

		let description = 'camera gain R up';
		return ViscaCommand._cameraGain(mode, C.DATA_ONVAL, null, description);
	}
	static cameraGainRDown() {
		let mode = 'r';

		let description = 'camera gain R down';
		return ViscaCommand._cameraGain(mode, C.DATA_OFFVAL, null, description);
	}
	static cameraGainRReset() {
		let mode = 'r';

		let description = 'camera gain R reset';
		return ViscaCommand._cameraGain(mode, 0x00, null, description);
	}
	static cameraGainRDirect(value: number) {
		let mode = 'r';

		let description = 'camera gain R direct';
		return ViscaCommand._cameraGain(mode, 0x00, value, description);
	}
	static cameraGainBUp() {
		let mode = 'b';

		let description = 'camera gain B up';
		return ViscaCommand._cameraGain(mode, C.DATA_ONVAL, null, description);
	}
	static cameraGainBDown() {
		let mode = 'b';

		let description = 'camera gain B down';
		return ViscaCommand._cameraGain(mode, C.DATA_OFFVAL, null, description);
	}
	static cameraGainBReset() {
		let mode = 'b';

		let description = 'camera gain B reset';
		return ViscaCommand._cameraGain(mode, 0x00, null, description);
	}
	static cameraGainBDirect(value: number) {
		let mode = 'b';

		let description = 'camera gain B direct';
		return ViscaCommand._cameraGain(mode, 0x00, value, description);
	}
	/// gain value is from 4-F
	static cameraGainLimit(value: number) {
		let subCommand = [
			C.CAM_GAIN_LIMIT,
			value
		];

		let description = 'camera gain limit';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ EXPOSURE ------------------
	/// mode = 0, 3, A, B, D
	/// auto, manual, shutter priority, iris priority, bright
	static cameraExposureMode(mode = 0x00) {
		let subCommand = [
			C.CAM_EXPOSURE_MODE,
			mode
		];

		let description = 'camera exposure compenstation up';
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraExposureCompensationEnable(enable = true) {
		let subCommand = [
			C.CAM_EXP_COMP_ENABLE,
			enable ? C.DATA_ONVAL : C.DATA_OFFVAL
		];

		let description = `camera exposure compenstation ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static _cameraExposureCompensationAdjust(resetupdown: number, description: string) {
		let subCommand = [
			C.CAM_EXP_COMP,
			resetupdown
		];

		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraExposureCompensationUp() {
		let description = 'camera exposure compenstation up';
		return ViscaCommand._cameraExposureCompensationAdjust(C.DATA_MORE, description);
	}
	static cameraExposureCompensationDown() {
		let description = 'camera exposure compenstation down';
		return ViscaCommand._cameraExposureCompensationAdjust(C.DATA_LESS, description);
	}
	static cameraExposureCompensationReset() {
		let description = 'camera exposure compenstation reset';
		return ViscaCommand._cameraExposureCompensationAdjust(C.DATA_RESET, description);
	}
	static cameraExposureCompensationDirect(directval = 0) {
		let subCommand = [
			C.CAM_EXP_COMP_DIRECT,
			...utils.i2v(directval)
		];

		let description = 'camera exposure compenstation direct';
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ BACKLIGHT ------------------

	static cameraBacklightCompensation(enable = true) {
		let subCommand = [
			C.CAM_BACKLIGHT,
			enable ? 0x02 : 0x03
		];

		let description = `camera backlight compensation ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ SHUTTER ------------------
	/// resetupdown = 0, 2, 3
	static _cameraShutter(resetupdown: number, directvalue = -1, description: string) {
		let subCommand = [
			C.CAM_SHUTTER,
			resetupdown
		];
		if (directvalue > -1 && directvalue != null) {
			subCommand = [
				C.CAM_SHUTTER_DIRECT,
				...utils.i2v(directvalue)
			];
		}
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraShutterUp() {
		let description = 'camera shutter up';
		return ViscaCommand._cameraShutter(C.DATA_MORE, null, description);
	}
	static cameraShutterDown() {
		let description = 'camera shutter down';
		return ViscaCommand._cameraShutter(C.DATA_LESS, null, description);
	}
	static cameraShutterReset() {
		let description = 'camera shutter reset';
		return ViscaCommand._cameraShutter(C.DATA_RESET, null, description);
	}
	static cameraShutterDirect(value = 0) {
		let description = 'camera shutter direct';
		return ViscaCommand._cameraShutter(C.DATA_RESET, value, description);
	}
	static cameraShutterSlow(auto = true) {
		let subCommand = [
			C.CAM_SHUTTER_SLOW_AUTO,
			auto ? C.DATA_ONVAL : C.DATA_OFFVAL
		];

		let description = `camera shutter slow mode ${auto ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ IRIS ------------------
	/// resetupdown = 0, 2, 3
	static _cameraIris(resetupdown: number, directvalue = -1, description: string) {
		let subCommand = [
			C.CAM_IRIS,
			resetupdown
		];
		if (directvalue > -1 && directvalue != null) {
			subCommand = [
				C.CAM_IRIS_DIRECT,
				...utils.i2v(directvalue)
			];
		}
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraIrisUp() {
		let description = 'camera iris up';
		return ViscaCommand._cameraIris(C.DATA_MORE, null, description);
	}
	static cameraIrisDown() {
		let description = 'camera iris down';
		return ViscaCommand._cameraIris(C.DATA_LESS, null, description);
	}
	static cameraIrisReset() {
		let description = 'camera iris reset';
		return ViscaCommand._cameraIris(C.DATA_RESET, null, description);
	}
	static cameraIrisDirect(value = 0) {
		let description = 'camera iris direct';
		return ViscaCommand._cameraIris(C.DATA_RESET, value, description);
	}

	// ------------------ APERTURE ------------------
	/// resetupdown = 0, 2, 3
	static _cameraAperture(resetupdown: number, directvalue = -1, description: string) {
		let subCommand = [
			C.CAM_APERTURE,
			resetupdown
		];
		if (directvalue > -1 && directvalue != null) {
			subCommand = [
				C.CAM_APERTURE_DIRECT,
				...utils.i2v(directvalue)
			];
		}
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraApertureUp() {
		let description = 'camera aperture up';
		return ViscaCommand._cameraAperture(C.DATA_MORE, null, description);
	}
	static cameraApertureDown() {
		let description = 'camera aperture down';
		return ViscaCommand._cameraAperture(C.DATA_LESS, null, description);
	}
	static cameraApertureReset() {
		let description = 'camera aperture reset';
		return ViscaCommand._cameraAperture(C.DATA_RESET, null, description);
	}
	static cameraApertureDirect(value = 0) {
		let description = 'camera aperture direct';
		return ViscaCommand._cameraAperture(C.DATA_RESET, value, description);
	}

	// ------------------ QUALITY ------------------
	static cameraHighResMode(enable = true) {
		let subCommand = [
			C.CAM_HIRES_ENABLE,
			enable ? C.DATA_ONVAL : C.DATA_OFFVAL
		];

		let description = `camera high res mode ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraHighSensitivityMode(enable = true) {
		let subCommand = [
			C.CAM_HIGH_SENSITIVITY,
			enable ? C.DATA_ONVAL : C.DATA_OFFVAL
		];

		let description = `camera high sensitivity mode ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	/// val = 0..5
	static cameraNoiseReduction(val: number) {
		let subCommand = [
			C.CAM_NOISE_REDUCTION,
			val
		];

		let description = `camera noise reduction to ${val}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	/// val = 0..4
	static cameraGamma(val: number) {
		let subCommand = [
			C.CAM_GAMMA,
			val
		];

		let description = `camera gamma to ${val}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ EFFECTS ------------------
	/// effect types are enumerated in the constants file
	static _cameraEffect(effectType: number, description: string) {
		let subCommand = [
			C.CAM_EFFECT,
			effectType
		];

		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static _cameraEffectDigital(effectType: number, description: string) {
		let subCommand = [
			C.CAM_EFFECT_DIGITAL,
			effectType
		];

		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraEffectDigitalIntensity(level: number) {
		let subCommand = [
			C.CAM_EFFECT_LEVEL,
			level
		];

		let description = `camera digital effect intensitity to ${level}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// basic effects
	static cameraEffectOff() {
		let description = 'camera effect pff';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_OFF, description);
	}
	static cameraEffectPastel() {
		let description = 'camera effect pastel';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_PASTEL, description);
	}
	static cameraEffectNegative() {
		let description = 'camera effect negative';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_NEGATIVE, description);
	}
	static cameraEffectSepia() {
		let description = 'camera effect sepia';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_SEPIA, description);
	}
	static cameraEffectBW() {
		let description = 'camera effect blackwhite';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_BW, description);
	}
	static cameraEffectSolar() {
		let description = 'camera effect solar';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_SOLAR, description);
	}
	static cameraEffectMosaic() {
		let description = 'camera effect mosaic';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_MOSAIC, description);
	}
	static cameraEffectSlim() {
		let description = 'camera effect slim';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_SLIM, description);
	}
	static cameraEffectStretch() {
		let description = 'camera effect stretch';
		return ViscaCommand._cameraEffect(C.DATA_EFFECT_STRETCH, description);
	}

	// digital effects
	static cameraEffectDigitalOff() {
		let description = 'camera digital effect off';
		return ViscaCommand._cameraEffectDigital(C.DATA_EFFECT_OFF, description);
	}
	static cameraEffectDigitalStill() {
		let description = 'camera digital effect still';
		return ViscaCommand._cameraEffectDigital(C.DATA_EFFECT_STILL, description);
	}
	static cameraEffectDigitalFlash() {
		let description = 'camera digital effect flash';
		return ViscaCommand._cameraEffectDigital(C.DATA_EFFECT_FLASH, description);
	}
	static cameraEffectDigitalLumi() {
		let description = 'camera digital effect lumi';
		return ViscaCommand._cameraEffectDigital(C.DATA_EFFECT_LUMI, description);
	}
	static cameraEffectDigitalTrail() {
		let description = 'camera digital effect trail';
		return ViscaCommand._cameraEffectDigital(C.DATA_EFFECT_TRAIL, description);
	}

	// ------------------ FREEZE ------------------
	static cameraFreeze(enable = true) {
		let mode = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_FREEZE,
			mode
		];

		let description = `camera freeze ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ ICR ------------------
	static cameraICR(enable = true) {
		let mode = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_ICR,
			mode
		];

		let description = `camera ICR ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraICRAuto(enable = true) {
		let mode = enable ? C.DATA_ONVAL : C.DATA_OFFVAL;
		let subCommand = [
			C.CAM_AUTO_ICR,
			mode
		];

		let description = `camera auto ICR ${enable ? 'on' : 'off'}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	static cameraICRAutoThreshold(val = 0) {
		let subCommand = [
			C.CAM_AUTO_ICR_THRESHOLD,
			...utils.i2v(val)
		];

		let description = `camera ICR threshold to ${val}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ ID ------------------
	static cameraIDWrite(data: number) {
		let subCommand = [
			C.CAM_ID_WRITE,
			...utils.i2v(data)
		];

		let description = `camera id set to ${data}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}

	// ------------------ COLOR ADJUST ------------------
	// value = 0(off), 1-3
	static cameraChromaSuppress(value: number) {
		let subCommand = [
			C.CAM_CHROMA_SUPPRESS,
			value
		];

		let description = `camera chrome suppress to ${value}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	// value = 0h - Eh
	static cameraColorGain(value: number) {
		let subCommand = [
			C.CAM_COLOR_GAIN,
			value
		];

		let description = `camera color gain to ${value}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
	// value = 0h - Eh
	static cameraColorHue(value: number) {
		let subCommand = [
			C.CAM_COLOR_HUE,
			value
		];

		let description = `camera color hue to ${value}`;
		return ViscaCommand.cameraCommand(subCommand, description);
	}
}

type ViscaCommandEventTypes = 'error' | 'complete' | 'ack';

export interface ViscaCommandSettings {
	messageType?: number;
	dataType?: number;

	data?: number[];

	description?: string;

	onComplete?: () => void;
}
