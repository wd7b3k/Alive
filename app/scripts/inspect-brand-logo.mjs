import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const path = resolve(process.cwd(), 'src/assets/brand-logo-full.png');
const png = readFileSync(path);
const signature = png.subarray(0, 8).toString('hex');
if (signature !== '89504e470d0a1a0a') throw new Error('Not a PNG');

let offset = 8;
let width = 0;
let height = 0;
let bitDepth = 0;
let colorType = 0;
const idat = [];
while (offset < png.length) {
  const length = png.readUInt32BE(offset); offset += 4;
  const type = png.subarray(offset, offset + 4).toString('ascii'); offset += 4;
  const data = png.subarray(offset, offset + length); offset += length;
  offset += 4; // crc
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  } else if (type === 'IDAT') idat.push(data);
  else if (type === 'IEND') break;
}

if (bitDepth !== 8 || colorType !== 6) {
  throw new Error(`Expected 8-bit RGBA PNG, got bitDepth=${bitDepth}, colorType=${colorType}`);
}

const bpp = 4;
const rowBytes = width * bpp;
const raw = inflateSync(Buffer.concat(idat));
const rows = [];
let p = 0;
let previous = Buffer.alloc(rowBytes);

function paeth(a, b, c) {
  const q = a + b - c;
  const pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

for (let y = 0; y < height; y++) {
  const filter = raw[p++];
  const scan = raw.subarray(p, p + rowBytes); p += rowBytes;
  const row = Buffer.alloc(rowBytes);
  for (let x = 0; x < rowBytes; x++) {
    const left = x >= bpp ? row[x - bpp] : 0;
    const up = previous[x];
    const upLeft = x >= bpp ? previous[x - bpp] : 0;
    let value;
    if (filter === 0) value = scan[x];
    else if (filter === 1) value = (scan[x] + left) & 255;
    else if (filter === 2) value = (scan[x] + up) & 255;
    else if (filter === 3) value = (scan[x] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) value = (scan[x] + paeth(left, up, upLeft)) & 255;
    else throw new Error(`Unsupported PNG filter ${filter}`);
    row[x] = value;
  }
  rows.push(row);
  previous = row;
}

let minX = width, minY = height, maxX = -1, maxY = -1, pixels = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const alpha = rows[y][x * 4 + 3];
    if (alpha > 8) {
      pixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < minX) throw new Error('Logo has no visible pixels');
const visibleWidth = maxX - minX + 1;
const visibleHeight = maxY - minY + 1;
console.log(JSON.stringify({
  canvas: { width, height },
  visibleBounds: { minX, minY, maxX, maxY, width: visibleWidth, height: visibleHeight },
  canvasUsage: { widthPct: +(visibleWidth / width * 100).toFixed(1), heightPct: +(visibleHeight / height * 100).toFixed(1) },
  opaquePixels: pixels,
}, null, 2));
