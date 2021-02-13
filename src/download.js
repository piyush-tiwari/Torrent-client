'use strict';

const fs = require('fs');
const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');
const Pieces = require('./Pieces');
const Queue = require('./Queue');

module.exports = (torrent, path) => {
	tracker.getPeers(torrent, peers => {
		const pieces = new Pieces(torrent);
		const file = fs.openSync(path, 'w');
		peers.forEach(peer => download(peer, torrent, pieces, file));
	});
};

function download(peer, torrent, pieces, file) {
	const socket = net.socket();
	socket.on('error', console.log);
	socket.connect(peer.port, peer.ip, () => {
		socket.write(message.buildHandshake(torrent));
	});

	const queue = new Queue(torrent);
	onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue, torrent, file));
}

function msgHandler(msg, socket, pieces, queue, torrent, file) {
	if(isHandshake(msg)) {
		socket.write(message.buildInterested());
	} else {
		const m = message.parse(msg);

		if(m.id === 0) chokeHandler(socket);
		if(m.id === 1) unchokeHandler(socket, pieces, queue);
		if(m.id === 4) haveHandler(socket, pieces, queue, m.payload);
		if(m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
		if(m.id === 7) pieceHandler(socket, pieces, queue, torrent, file, m.payload);
	}
}

function isHandshake(msg) {
	return msg.length == msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
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

function chokeHandler(socket) {
	socket.end(); //Choked, drop connection.
}

function unchokeHandler(socket, pieces, queue) {
	queue.choked = false;

	//Unchoked, request a needed piece.
	requestPiece(socket, pieces, queue);
}

function haveHandler(socket, pieces, queue, payload) {
	const pieceIndex = payload.readUInt32BE(0);
	const queueEmpty = queue.length === 0;
	queue.queue(pieceIndex);
	if (queueEmpty) requestPiece(socket, pieces, queue);
}

function bitfieldHandler(socket, pieces, queue, payload) {
	const queueEmpty = queue.length === 0;
	payload.forEach((byte, i) => {
		for(let j = 0; j < 8; j++) {
			if(byte%2) queue.queue(i*8 + 7 - j);
			byte = Math.floor(byte/2);
		}
	});
	if(queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
	console.log(pieceResp)
	pieces.addRecieved(pieceResp); //Add recieved Piece.

	//Write contents.
	const offset = pieceResp.index * torrent.info['piece length'] + pieceResp.begin;
	fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});

	if(pieces.isDone()) {
		console.log('Download Completed!');
		socket.end();

		try { fs.closeSync(file); } catch(e) {}
	} else {
		requestPiece(socket, pieces, queue);
	}
}

function requestPiece(socket, pieces, queue) {
	if(queue.choked) return null;

	while(queue.length()) {
		const pieceBlock = queue.deque();
		if(pieces.needed(pieceBlock)) {
			socket.write(message.buildRequest(pieceBlock));
			pieces.addRequested(pieceBlock);
			break;
		}
	}
}