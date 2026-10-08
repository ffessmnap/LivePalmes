"use strict";

// ZIP sans compression : les PDF sont déjà compressés. Aucun fichier temporaire.
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function clubRecapZip(files, maximumBytes = 7000000) {
  if (!Array.isArray(files) || files.length > 500) throw new RangeError("Trop de PDF.");
  const parts = [], directory = [], names = new Set();
  let offset = 0, directorySize = 0;
  for (const file of files) {
    if (!Buffer.isBuffer(file.buffer) || !/^[A-Za-z0-9_.-]+\.pdf$/.test(file.name) || names.has(file.name)) throw new TypeError("PDF ZIP invalide.");
    names.add(file.name);
    const name = Buffer.from(file.name, "utf8"), crc = crc32(file.buffer);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6); local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(file.buffer.length, 18);
    local.writeUInt32LE(file.buffer.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(file.buffer.length, 20);
    central.writeUInt32LE(file.buffer.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    offset += local.length + name.length + file.buffer.length;
    directorySize += central.length + name.length;
    if (offset + directorySize + 22 > maximumBytes) throw new RangeError("ZIP trop volumineux : télécharger les PDF individuellement.");
    parts.push(local, name, file.buffer); directory.push(central, name);
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directorySize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}

module.exports = { clubRecapZip };
