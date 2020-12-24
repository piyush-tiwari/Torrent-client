'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

module.exports.getPeers = (torrent, callback) => {
	const socket = dgram.createSocket('udp4');
	const url = urlParse(torrent.announce.toString('utf8'));

	//1. Send a connection Request.
	udpSend(socket, buildConnReq(), url);

	socket.on('message', response => {
		if(respType(response) === 'connect') {
			//2. Recieve and check the response.
			const connResp = parseConnResp(response);

			//3. Send announce request.
			const announceReq = buildAnnounceReq(connResp.connectionId);
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
	socket.send(message, 0, message.length, url.port, url.host, callback);
}

function respType(resp) {

}

function buildConnReq(){

}

function parseConnResp(resp) {

}

function buildAnnounceReq(connId) {

}

function parseAnnounceResp(resp) {
	
}