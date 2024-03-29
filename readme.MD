# Visca over IP

## Rationale
This is an almost complete visca-over-ip implementation that can be used to control pan/tilt/zoom cameras from various manufacturers. I created this because the other options were bloated, didn't function, were complex or lacked documentation. This project aims to be as simple as possible while still complying to all visca protocol specifications.

## Credit
This project is heavily inspired by [Utoputopiantools visca implementation](https://github.com/utopiantools/node-visca). A part of the command handling was originally created by utopian and restructured/rewrited by me. Thanks!

## Roadmap
The inquire commands and add complete documentation are in the pipeline but I'm just really busy. Feel free to create a pull request!

## Structure
This implementation consists of two classes, a `ViscaCamera` class and a `ViscaCommand` class. The `ViscaCamera` class does the communication with the camera and handles the packets/commands, and `ViscaCommand` is a wrapper around a visca command on which you can tie events. 

## Example

```javascript
const { ViscaCamera, ViscaCommand } = require('visca-over-ip');
var camera = new ViscaCamera('10.99.10.104', 5672);

var command = ViscaCommand.cameraPanTiltHome()
command.on('ack', () => {
    console.log('Command acknowledged')
})

camera.on('connected', () => {
    console.log('Camera connected')
    
    camera.sendCommand(command)
})
```
