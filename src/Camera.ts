import { Socket } from 'dgram';
import { Buffer } from 'buffer';
import { ViscaCommand } from './Command';
import { Constants as C } from './Constants';
const dgram = require('dgram');

export class ViscaCamera {
	client: Socket;

	connected: boolean;
	ip: string;
	port: number;

	events: { [key in ViscaCameraEventTypes]?: (...args: any[]) => void };

	inquiryReady: boolean;
	commandReady: boolean;

	inquiryCallback: { [index: string]: ViscaCommand };
	inquiryQueue: ViscaCommand[];
	sentCommands: ViscaCommand[];
	commandQueue: ViscaCommand[];

	updateTimeout: NodeJS.Timeout;

	constructor(ip: string, port: number) {
		this.ip = ip;
		this.port = port;

		this.inquiryCallback = {};
		this.inquiryQueue = [];

		this.sentCommands = [];
		this.commandQueue = [];

		this.events = {};

		this.reconnect();

		this.client.on('close', () => {
			this.connected = false;

			if (this.events.closed) this.events.closed();
		});

		this.client.on('message', (data: number[]) => {
			this.connected = false;

			var command = ViscaCommand.fromPacket([
				...data
			]);

			this.onData(command);
		});

		this.client.on('error', (err) => {
			this.connected = false;
			console.log(err);
			if (this.events.closed) this.events.error(err);
		});
	}

	//==================== Connectivity & Events ====================

	on(eventType: ViscaCameraEventTypes, handler: (...args: any[]) => void) {
		if (eventType == 'connected' && this.events[eventType] == undefined && this.connected == true) handler();
		this.events[eventType] = handler;
	}

	_handle(eventType: ViscaCameraEventTypes, ...data: any[]) {
		if (this.events[eventType] != undefined) this.events[eventType](data);
	}

	reconnect() {
		this.client = dgram.createSocket('udp4');
		this.client.connect(this.port, this.ip, () => {
			this.connected = true;

			this.inquiryReady = true;
			this.commandReady = true;
			if (this.events.connected) this.events.connected();
		});
	}

	//==================== Commands ====================

	private sendDirect(data: ViscaCommand) {
		let message = Buffer.from(data.toPacket());
		this.client.send(message);
	}

	sendCommand(command: ViscaCommand) {
		// this.sendRaw(command.toPacket());

		this._updateBooleans();

		command.addedAt = Date.now();

		let queued = false;

		// INTERFACE_DATA, ADDRESS_SET commands always get sent and aren't tracked.
		// For inquiry commands, we need to keep track of them locally, so we can match replies to commands
		if (command.messageType == C.MSGTYPE_INQUIRY) {
			// only allow one non-ack command at a time
			if (this.inquiryReady) {
				this.inquiryCallback['0'] = command; // no ACK, only complete / error
			} else {
				this.inquiryQueue.push(command);
				queued = true;
			}
		} else if (command.messageType == C.MSGTYPE_COMMAND) {
			if (this.commandReady) {
				this.sentCommands.push(command); // not in a buffer until we get ACK
			} else {
				this.commandQueue.push(command);
				queued = true;
			}
		}

		if (queued) {
			this._scheduleUpdate();
		} else {
			command.sentAt = Date.now();
			console.log(`SENDING VISCA COMMAND: ${command.description}`);
			this.sendDirect(command);
		}
	}

	//==================== Callback Handlers ====================

	onData(viscaCommand: ViscaCommand) {
		switch (viscaCommand.messageType) {
			case C.MSGTYPE_IF_CLEAR:
				this._clear();
				break;

			// network change messages are unprompted
			case C.MSGTYPE_NETCHANGE:
				// a camera issues this when it detects a change on the serial line,
				// and if we get it, we should re-assign all serial port cameras.
				// this.enumerateSerial();
				break;

			// ack message, one of our commands was accepted and put in a buffer
			case C.MSGTYPE_ACK:
				this.ack(viscaCommand);
				return;

			// completion message
			case C.MSGTYPE_COMPLETE:
				this.complete(viscaCommand);
				break;

			// error messages
			case C.MSGTYPE_ERROR:
				this.error(viscaCommand);
				break;

			default:
				break;
		}
		// this.emit('update');
	}

	ack(viscaCommand: ViscaCommand) {
		// get the first viscaCommand that expects an ACK
		let [
			cmd
		] = this.sentCommands.splice(0, 1); // gets the head
		if (cmd) {
			cmd._handle('ack'); // run the command ACK callback if it exists
			this.inquiryCallback[viscaCommand.socket] = cmd;
		}
		this._scheduleUpdate();
	}

	complete(viscaCommand: ViscaCommand) {
		let key = viscaCommand.socket.toString();
		if (this.inquiryCallback[key] != undefined) {
			this.inquiryCallback[key]._handle('complete', viscaCommand.data);
			delete this.inquiryCallback[key];
		}
		this._scheduleUpdate();
	}

	error(viscaCommand: ViscaCommand) {
		let message;
		let errorType = viscaCommand.data[0];
		let socketKey = viscaCommand.socket.toString();
		switch (errorType) {
			case C.ERROR_SYNTAX:
				message = `VISCA ERROR: syntax error, invalid command`;
				break;
			case C.ERROR_BUFFER_FULL:
				message = `VISCA ERROR: command buffers full`;
				break;
			case C.ERROR_CANCELLED:
				message = 'VISCA ERROR: command cancelled';
				break;
			case C.ERROR_INVALID_BUFFER:
				message = `VISCA ERROR: socket cannot be cancelled`;
				break;
			case C.ERROR_COMMAND_FAILED:
				message = `VISCA ERROR: command failed`;
				break;
		}
		// console.log(
		// 	`CAMERA ERROR: command socket: ${viscaCommand.socket}, message: ${message}\nRECEIVED: ${viscaCommand.toString()}`
		// );

		if (this.inquiryCallback[socketKey]) {
			this.inquiryCallback[socketKey]._handle('error', new Error(message));
		} else {
			this._handle('error', new Error(' Camera buffer missing'));
		}
		delete this.inquiryCallback[socketKey];
		this._update();
	}

	//==================== Private Functions ====================

	_clear() {
		this.inquiryCallback = {};
		this.sentCommands = [];
	}

	_updateBooleans() {
		this.commandReady = !('1' in this.inquiryCallback || '2' in this.inquiryCallback);
		this.inquiryReady = !('0' in this.inquiryCallback);
	}

	_scheduleUpdate() {
		if (this.updateTimeout != null) return;
		if (this.inquiryQueue.length > 0 || this.commandQueue.length > 0) {
			this.updateTimeout = setTimeout(() => this._update(), 25);
		}
	}

	_update() {
		this.updateTimeout = null;
		this._expireOldCommands();
		this._processQueue();
		// this.emit('update');
	}

	_processQueue() {
		this._updateBooleans();

		if (this.commandReady && this.commandQueue.length > 0) {
			let [
				cmd
			] = this.commandQueue.splice(0, 1);
			this.sendCommand(cmd);
		}

		if (this.inquiryReady && this.inquiryQueue.length > 0) {
			let [
				cmd
			] = this.inquiryQueue.splice(0, 1);
			this.sendCommand(cmd);
		}

		this._updateBooleans();
	}

	_expireOldCommands() {
		let now = Date.now();

		// the first command is always the oldest
		while (this.sentCommands.length > 0) {
			if (now - this.sentCommands[0].sentAt < C.COMMAND_TIMEOUT) break;
			this.sentCommands.splice(0, 1);
		}

		// check all cameraBuffers
		for (let key of Object.keys(this.inquiryCallback)) {
			if (now - this.inquiryCallback[key].sentAt > C.COMMAND_TIMEOUT) delete this.inquiryCallback[key];
		}
	}
}

type ViscaCameraEventTypes = 'connected' | 'closed' | 'error';
