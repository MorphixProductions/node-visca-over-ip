const { ViscaCamera } = require('./dist/Camera');
const { ViscaCommand } = require('./dist/Command');

cam = new ViscaCamera('10.99.10.104', 5672);
cam.on('connected', () => {
	console.log('Camera connected');

	setTimeout(() => {
		command = ViscaCommand.cameraPanTiltReset();
		command.on('ack', () => {
			console.log('Command aangekomen!');
		});
		command.on('complete', () => {
			console.log('Command kompleet!');
		});

		cam.sendCommand(command);
	}, 1000);
});
cam.on('closed', () => {
	console.log('Camera connection closed');
});
cam.on('error', (err) => console.log('Camera error:', err));

// Command = ViscaCommand;

// handleListeners = (command) => {
// 	command.on('complete', () => {
// 		console.log('Command completed');
// 	});

// 	command.on('ack', () => {
// 		console.log('Command ack');
// 	});

// 	command.on('error', (error) => {
// 		console.log('Command error:', error);
// 	});

// 	return command;
// };
