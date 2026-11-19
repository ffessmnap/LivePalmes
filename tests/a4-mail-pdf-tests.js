"use strict";

const assert = require("node:assert/strict");
const net = require("node:net");
const { Duplex } = require("node:stream");
const mailer = require("../functions/node_modules/nodemailer");
const PDFDocument = require("../functions/node_modules/pdfkit");
const { summary, pdf } = require("../functions/organizer-fee-report");

function fakeSmtp() {
  let message = "";
  let receivingBody = false;
  const recipients = [];
  const reply = line => setImmediate(() => socket.push(line + "\r\n"));
  const socket = new Duplex({
    read() {},
    write(chunk, encoding, done) {
      const command = chunk.toString("ascii");
      if (receivingBody) {
        message += command;
        if (message.endsWith("\r\n.\r\n")) {
          receivingBody = false;
          reply("250 stored in memory");
        }
      } else if (/^EHLO /.test(command)) {
        reply("250 fixture.invalid");
      } else if (/^MAIL FROM:/i.test(command)) {
        reply("250 sender");
      } else if (/^RCPT TO:/i.test(command)) {
        recipients.push(command.trim());
        reply("250 recipient");
      } else if (command.startsWith("DATA")) {
        receivingBody = true;
        reply("354 send message");
      } else if (command.startsWith("QUIT")) {
        reply("221 bye");
      } else {
        done(new Error("Unexpected fixture command"));
        return;
      }
      done();
    }
  });
  socket.setTimeout = socket.setKeepAlive = socket.setNoDelay = () => socket;
  const transport = mailer.createTransport({
    pool: true, maxConnections: 1, maxMessages: 1, host: "127.0.0.1", port: 2525,
    ignoreTLS: true, greetingTimeout: 4000, socketTimeout: 4000,
    getSocket(options, done) {
      done(null, { connection: socket });
      reply("220 fixture.invalid");
    }
  });
  return { transport, recipients, message: () => message };
}

async function test() {
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = () => { throw new Error("Real connections are forbidden"); };
  const smtp = fakeSmtp();
  try {
    const { report } = summary({
      id: "42", name: "Meeting fictif", competitionType: "pool", date: "2026-12-01",
      source: "nap", napSource: true, fees: { enabled: true, swimmerFee: 2, individualEventFee: 1 }
    }, [{ clubId: "1", clubName: "Club fictif", swimmers: [{ individualEntries: [{}] }] }]);
    const file = await pdf(PDFDocument, report);
    const result = await smtp.transport.sendMail({
      from: "bureau@example.invalid", to: "club@example.invalid", bcc: "prive@example.invalid",
      replyTo: "retour@example.invalid", subject: "Essai A4", text: "Fixture",
      attachments: [{ filename: file.fileName, content: file.buffer }]
    });
    assert.deepEqual(new Set(result.envelope.to), new Set(["club@example.invalid", "prive@example.invalid"]));
    assert.deepEqual(new Set(smtp.recipients), new Set(["RCPT TO:<club@example.invalid>", "RCPT TO:<prive@example.invalid>"]));
    const raw = smtp.message();
    assert.doesNotMatch(raw, /^bcc:/im);
    assert(!raw.includes("prive@example.invalid"));
    assert.match(raw, /^Reply-To: retour@example.invalid/im);
    const part = raw.split(/^--[^\r\n]+\r?$/m).find(value => /Content-Type: application\/pdf/i.test(value));
    assert(part && part.includes(file.fileName));
    const encoded = part.trim().split(/\r?\n\r?\n/)[1];
    assert.deepEqual(Buffer.from(encoded.replace(/\s/g, ""), "base64"), file.buffer);
  } finally {
    smtp.transport.close();
    net.Socket.prototype.connect = connect;
  }
}

test().then(() => console.log("SMTP simulé : enveloppe privée et PDF métier relu octet pour octet."))
  .catch(error => { console.error(error); process.exitCode = 1; });
