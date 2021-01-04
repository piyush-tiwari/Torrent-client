'use strict';

const fs = require('fs');
const bencode = require('bencode');
const crypto = require('crypto');
const bignum = require('bignum');

//Decode the torrent file.
module.exports.open = (filepath) => {
	return bencode.decode(fs.readFileSync(filepath));
};

//Two cases, single file and multiple files.
module.exports.size = torrent => {
	const size = torrent.info.files ? torrent.info.files.map(file => file.length).reduce((a,b) => a+b) : torrent.info.length;

	return bignum.toBuffer(size, {size: 8});
};

module.exports.infoHash = torrent => {
	const info = bencode.encode(torrent.info);
	return crypto.createHash('sha1').update(info).digest(); //Info hash is obtained by passing info property through a SHA1 hash.
};