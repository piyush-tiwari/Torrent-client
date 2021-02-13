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

module.exports.BLOCK_LEN = Math.pow(2,14); //A typical block is 2^14 bytes long. Pieces can be made of several blocks.

module.exports.pieceLen = (torrent, pieceIndex) => {
	const totalLength = bignum.fromBuffer(this.size(torrent)).toNumber();
	const pieceLength = torrent.info['piece length'];

	const lastPieceLength = totalLength%pieceLength;
	const lastPieceIndex = Math.floor(totalLength/pieceLength);

	//If the piece is smaller than the piece length property, we send the lastPieceLength instead.
	return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

module.exports.blocksPerPiece = (torrent, pieceIndex) => {
	const pieceLength = this.pieceLen(torrent, pieceIndex);

	return Math.ceil(pieceLength/this.BLOCK_LEN); //Includes last incomplete block.
};

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
	const pieceLength = this.pieceLen(torrent, pieceIndex);

	const lastPieceLength = pieceLength%this.BLOCK_LEN;
	const lastPieceIndex = Math.floor(pieceLength/this.BLOCK_LEN);

	//Same methodology as pieceLen()
	return blockIndex === lastPieceIndex ? lastPieceLength : this.BLOCK_LEN;
};