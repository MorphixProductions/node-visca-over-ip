# Visca over IP

## Rationale
This is a almost complete visca-over-ip implementation that can be used to control pan/tilt/zoom cameras from various manufacturers. I created this because the other options were bloated, didn't function or lacked documentation. This project aims to be as simple a possible while still complying to all visca protocol specifications.

## Credit
This project is heavily inspired by [utopian's visca implementation](https://www.npmjs.com/package/@utopian/visca). A big part command handling was done by utopian.

## Roadmap

## Structere
This implementation consists of two classes, a `ViscaCamera` class and a `ViscaCommand` class. The `ViscaCamera` class handles 