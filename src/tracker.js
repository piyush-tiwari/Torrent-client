'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');
const torrentParser = require('./torrent-parser');
const util = require('./util');

module.exports.getPeers = (torrent, callback) => {
	const socket = dgram.createSocket('udp4');
	const url = torrent.announce.toString('utf8');

	//1. Send a connection Request.
	udpSend(socket, buildConnReq(), url);

	socket.on('message', response => {
		if(respType(response) === 'connect') {
			//2. Recieve and check the response.
			const connResp = parseConnResp(response);
			//3. Send announce request.
			const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
			udpSend(socket, announceReq, url);
		} else if(respType(response) === 'announce') {
			//4. Check announce response.
			const announceResp = parseAnnounceResp(response);
			//5. Pass the parsed peers to callback.
			callback(announceResp.peers);
		}
	});
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
	const url = urlParse(rawUrl);
	socket.send(message, 0, message.length, url.port, url.hostname, callback);
}

function respType(resp) {
	const action = resp.readUInt32BE(0);
	if(action === 0) return 'connect';
	if(action === 1) return 'announce';
}

function buildConnReq(){
	const buf = Buffer.alloc(16); //Allocating a 16 byte buffer for connection req.

	//Connection id. First 8 bytes consist of 0x41727101980
	buf.writeUInt32BE(0x417, 0);
	buf.writeUInt32BE(0x27101980, 4);

	//action, 4 bytes 0 for 'connection'.
	buf.writeUInt32BE(0, 8);

	//Random 4 byte transaction id
	crypto.randomBytes(4).copy(buf, 12);

	return buf;
}

function parseConnResp(resp) {
	return {
		action: resp.readUInt32BE(0),
		transactionId: resp.readUInt32BE(4),
		connectionId: resp.slice(8) //connectionId is left as a buffer.
	}
}

function buildAnnounceReq(connId, torrent, port=6881) { //6881 is one of the ports for bitTorrent.
	const buf = Buffer.allocUnsafe(98);

	//connection id, was still a buffer.
	connId.copy(buf, 0);
	//action
	buf.writeUInt32BE(1, 8); //1 for announce.
	//transaction id
	crypto.randomBytes(4).copy(buf, 12); //4 random bytes.
	//info hash
	torrentParser.infoHash(torrent).copy(buf, 16);
	//peer id
	util.genId().copy(buf, 36);
	//downloaded
	Buffer.alloc(8).copy(buf, 56); //default 0
	//left
	torrentParser.size(torrent).copy(buf, 64);
	//uploaded
	Buffer.alloc(8).copy(buf, 72);
	//event
	buf.writeUInt32BE(0, 80); //No event.
	//ip address
	buf.writeUInt32BE(0, 84);
	//key
	crypto.randomBytes(4).copy(buf, 88);
	//num want
	buf.writeInt32BE(-1, 92); //Note the writeInt32BE instead of writeUInt32BE
	//port
	buf.writeUInt16BE(port, 96);

	return buf;
}

function parseAnnounceResp(resp) {
	function group(iterable, groupSize) {
		let groups = [];
		for(let i = 0; i < iterable.length; i += groupSize) {
			groups.push(iterable.slice(i, i+groupSize));
		}
		return groups;
	}

	return {
		action: resp.readUInt32BE(0),
		transactionId: resp.readUInt32BE(4),
		interval: resp.readUInt32BE(8),
		leechers: resp.readUInt32BE(12),
		seeders: resp.readUInt32BE(16),
		peers: group(resp.slice(20), 6).map(address => {
			return {
				ip: address.slice(0,4).join('.'),
				port: address.readUInt16BE(4)
			}
		})

	}
}