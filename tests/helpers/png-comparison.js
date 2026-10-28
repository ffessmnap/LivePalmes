"use strict";
const zlib = require("node:zlib");

// Chromium's non-interlaced 8-bit RGB/RGBA screenshots, without an image library.
function decode(buffer) {
  let width, height, channels;
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const size = buffer.readUInt32BE(offset), name = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + size);
    if (name === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || ![2, 6].includes(data[9]) || data[12] !== 0) throw Error("Unsupported screenshot PNG");
      channels = data[9] === 2 ? 3 : 4;
    }
    if (name === "IDAT") chunks.push(data);
    offset += size + 12;
  }
  const stride = width * channels, raw = zlib.inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(height * stride);
  let position = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[position++];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const diagonal = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let prediction = 0;
      if (filter === 1) prediction = left;
      if (filter === 2) prediction = up;
      if (filter === 3) prediction = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - diagonal;
        const a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - diagonal);
        prediction = a <= b && a <= c ? left : b <= c ? up : diagonal;
      }
      pixels[y * stride + x] = (raw[position++] + prediction) & 255;
    }
  }
  return { width, height, channels, pixels };
}

function compare(before, after, tolerance = 1) {
  const a = decode(before), b = decode(after);
  if (a.width !== b.width || a.height !== b.height) return { equal: false, reason: "dimensions" };
  let changedPixels = 0, maxDifference = 0;
  for (let pixel = 0; pixel < a.width * a.height; pixel++) {
    let changed = false;
    for (let channel = 0; channel < 3; channel++) {
      const delta = Math.abs(a.pixels[pixel * a.channels + channel] - b.pixels[pixel * b.channels + channel]);
      maxDifference = Math.max(maxDifference, delta);
      if (delta > tolerance) changed = true;
    }
    if (changed) changedPixels++;
  }
  return { equal: changedPixels === 0, changedPixels, maxDifference, tolerance };
}
module.exports = { compare };
