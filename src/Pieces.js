'use strict';

const torrentParser = require('./torrent-parser');

module.exports = class {
	constructor(torrent) {
		function buildPiecesArray() {
			console.log(torrent.info);
			const nPieces = torrent.info.length / 20;
			const arr = new Array(nPieces).fill(null);
			return arr.map((_, i) => new Array(torrentParser.blocksPerPiece(torrent, i)).fill(false));
		}

		this._requested = buildPiecesArray();
		this._recieved = buildPiecesArray();
	}

	addRequested(pieceBlock) {
		const blockIndex = pieceBlock.begin / torrentParser.BLOCK_LEN;
		this._requested[pieceBlock.index][blockIndex] = true;
	}

	addRecieved(pieceBlock) {
		const blockIndex = pieceBlock.begin / torrentParser.BLOCK_LEN;
		this._recieved[pieceBlock.index][blockIndex] = true;
	}

	needed(pieceBlock) {
		if(this._requested.every(blocks => blocks.every(i => i))) {
			this._requested = this._recieved.map(blocks => blocks.slice());
		}

		const blockIndex = pieceBlock.begin / torrentParser.BLOCK_LEN;
		return !this._requested[pieceBlock.index][blockIndex];
	}

	isDone() {
		return this._recieved.every(blocks => blocks.every(i => i));
	}
};