# Torrent Client

A simple BitTorrent client which downloads single-file torrents, made under the guidance of [**Coding Club, IIT Guwahati**](https://codingiitg.github.io/).

## Why this?

Torrents have been a part of my childhood, and this was a great opportunity to learn how they actually work.

## Setup

Clone the Repository on your system

```sh
git clone https://github.com/piyush-tiwari/Torrent-client
```

Install the dependencies

```sh
npm install
```

To run a single-file download

```sh
nodejs index.js /path/to/torrent
```

## Dependencies used

1. [bencode](https://www.npmjs.com/package/bencode) to decode the meta-info torrent file.
2. [bignum](https://www.npmjs.com/package/bignum) to work with 64-bit integers.

## References
- [(Unofficial, but very useful) BitTorrent Protocol Specifications](https://wiki.theory.org/BitTorrentSpecification)
