import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size, isMaskable = false) {
  const width = size;
  const height = size;

  // Render pixels
  // Background: #d97706 (217, 119, 6), Inner circle: #b45309 (180, 83, 9), Accent yellow: #fbbf24 (251, 191, 36), White: #ffffff
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.38 : width * 0.45;
  const innerRadius = radius * 0.85;

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background color: #d97706 (amber-600)
      let r = 217, g = 119, b = 6, a = 255;

      // Inner circular emblem
      if (dist <= innerRadius) {
        r = 180; g = 83; b = 9; // #b45309 (amber-700)
      }

      // Draw Top Store "T" & Cart motif in the center
      const relX = (x - cx) / width;
      const relY = (y - cy) / height;

      // T horizontal bar
      if (relY >= -0.18 && relY <= -0.10 && relX >= -0.22 && relX <= 0.22) {
        r = 255; g = 255; b = 255; // White
      }
      // T vertical bar
      if (relY >= -0.10 && relY <= 0.22 && relX >= -0.04 && relX <= 0.04) {
        r = 255; g = 255; b = 255; // White
      }
      // Base bar
      if (relY >= 0.18 && relY <= 0.24 && relX >= -0.12 && relX <= 0.12) {
        r = 255; g = 255; b = 255; // White
      }
      // Golden dot badge
      const dotDx = x - (cx + width * 0.20);
      const dotDy = y - (cy - height * 0.15);
      if (Math.sqrt(dotDx * dotDx + dotDy * dotDy) <= width * 0.05) {
        r = 251; g = 191; b = 36; // #fbbf24
      }

      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pubDir = path.resolve('public');
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPng(192, false));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPng(512, false));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPng(180, false));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPng(512, true));

console.log('✅ Generated PWA PNG icons successfully!');
