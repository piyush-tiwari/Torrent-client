'use strict';

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker.js');

module.exports = torrent => {
	tracker.getPeers(torrent, peers => {
		peers.forEach(download);
	});
};

function download(peer) {
	const socket = net.socket();
	socket.on('error', console.log);
	socket.connect(peer.port, peer.ip, () => {

	});
	onWholeMsg(socket, data => {

	});
}

function onWholeMsg(socket, callback) {
	let savedBuf = Buffer.alloc(0);
	let handshake = true;

	socket.on('data', recvBuf => {
		//msgLen calculates length of whole message.

		const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readUInt32BE(0) + 4;

		savedBuf = Buffer.concat([savedBuf, recvBuf]);

		while(savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
			callback(savedBuf.slice(0, msgLen()));
			savedBuf = savedBuf.slice(msgLen());
			handshake = false;
		}
	});
}
