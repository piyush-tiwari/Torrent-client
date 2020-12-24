'use strict';
const fs = require('fs');
const bencode = require('bencode');
const dgram = require('dgram');
const urlParse = require('url').parse;
const Buffer = require('buffer').Buffer;

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
const url = urlParse(torrent.announce.toString('utf8'));

const myMsg = Buffer.from('hiyo', 'utf8');
const socket = dgram.createSocket('udp4');

socket.send(myMsg, 0, myMsg.length, url.port, url.host, ()=>{});
socket.on('message', msg => {
	console.log('message is', msg);
});
