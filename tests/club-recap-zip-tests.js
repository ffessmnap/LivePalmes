"use strict";
const assert = require("node:assert/strict");
const { clubRecapZip } = require("../functions/club-recap-zip");
const files = [{ name: "club-106.pdf", buffer: Buffer.from("123456789") }, { name: "club-42.pdf", buffer: Buffer.from("%PDF-two") }];
const zip = clubRecapZip(files);
assert.equal(zip.readUInt32LE(0), 0x04034b50);
assert.equal(zip.readUInt32LE(14), 0xcbf43926, "Standard CRC32 reference");
const end = zip.length - 22, directory = zip.readUInt32LE(end + 16);
assert.equal(zip.readUInt32LE(end), 0x06054b50);
assert.equal(zip.readUInt16LE(end + 10), 2);
let cursor = directory;
for (const file of files) {
  assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
  const offset = zip.readUInt32LE(cursor + 42), nameLength = zip.readUInt16LE(cursor + 28);
  assert.equal(zip.subarray(cursor + 46, cursor + 46 + nameLength).toString(), file.name);
  assert.equal(zip.readUInt32LE(offset + 18), file.buffer.length);
  assert.deepEqual(zip.subarray(offset + 30 + nameLength, offset + 30 + nameLength + file.buffer.length), file.buffer);
  cursor += 46 + nameLength;
}
assert.equal(cursor, end);
assert.throws(() => clubRecapZip(files, 20), RangeError);
assert.throws(() => clubRecapZip([files[0], files[0]]), TypeError);
assert.throws(() => clubRecapZip([{ name: "../escape.pdf", buffer: Buffer.alloc(0) }]), TypeError);
console.log("Club PDF ZIP: headers, CRC, directory offsets, exact contents, bounds and safe names verified.");
