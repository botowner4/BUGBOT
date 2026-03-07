require('./settings');
require('./sessionCleaner');

const { handleMessages } = require('./main');

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");
const PQueue = require("p-queue");

const sessionSockets = new Map();

process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);

const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
makeCacheableSignalKeyStore,
DisconnectReason
} = require("@whiskeysockets/baileys");

/* CONFIG */

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ====================================================
   SAFE MESSAGE QUEUE ENGINE
==================================================== */

const sendQueue = new PQueue({
    concurrency: 2,
    interval: 800,
    intervalCap: 5
});

async function safeSend(sock, jid, msg, options = {}) {
    return sendQueue.add(async () => {
        try {

            if (!sock?.ws?.socket) return false;

            if (sock.ws.socket.readyState !== 1) return false;

            return await sock.sendMessage(jid, msg, options);

        } catch (err) {

            if (
                err?.output?.statusCode === 428 ||
                err?.message?.includes("Connection Closed")
            ) {
                return false;
            }

            console.log("Send error:", err.message);
            return false;
        }
    });
}

/* ====================================================
 SOCKET STARTER
==================================================== */

async function startSocket(sessionPath, sessionKey) {

if (sessionSockets.has(sessionKey)) {
    return sessionSockets.get(sessionKey);
}

const { version } = await fetchLatestBaileysVersion();

const { state, saveCreds } =
    await useMultiFileAuthState(sessionPath);

const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    keepAliveIntervalMs: 15000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys)
    },
    browser: ["Ubuntu", "Chrome", "120.0.0"]
});

/* WATCHDOG HEARTBEAT */

sock.heartbeat = setInterval(async () => {
    try {

        if (!sock?.ws?.socket) return;

        if (sock.ws.socket.readyState !== 1) return;

        await sock.sendPresenceUpdate("available");

    } catch {}
}, 18000);

/* STORE SOCKET */

sessionSockets.set(sessionKey, sock);

/* MESSAGE HANDLER */

sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {

        if (!chatUpdate?.messages) return;

        await handleMessages(sock, chatUpdate, true);

    } catch (err) {
        console.log("Runtime handler error:", err.message);
    }
});

/* SAVE CREDENTIALS */

sock.ev.on("creds.update", saveCreds);

/* CONNECTION HANDLER */

sock.ev.on("connection.update", async (update) => {

const { connection, lastDisconnect } = update;

try {

if (connection === "open") {

await new Promise(r => setTimeout(r, 2500));

if (!state?.creds?.me?.id) return;

const cleanNumber =
state.creds.me.id.split(":")[0];

const userJid =
cleanNumber + "@s.whatsapp.net";

/* BRANDING MESSAGE */

const brandImage =
"https://files.catbox.moe/ip70j9.jpg";

const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Multi Device Connected ✔
┃ BUGBOT ENGINE ACTIVE ✔
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 BOT IS NOW READY TO USE

💡 Type *.menu*

✨ BUGFIXED SULEXH TECH ✨
`;

await safeSend(sock, userJid, {
image: { url: brandImage },
caption: caption
});

console.log("✅ Branding startup message sent");
}

/* AUTO RECONNECT */

if (connection === "close") {

const status =
lastDisconnect?.error?.output?.statusCode;

if (sock.heartbeat) {
clearInterval(sock.heartbeat);
sock.heartbeat = null;
}

try {
if (sock?.ws) sock.ws.close();
} catch {}

sessionSockets.delete(sessionKey);

if (status !== DisconnectReason.loggedOut) {

const delay =
Math.floor(Math.random() * 8000) + 4000;

setTimeout(() => {
startSocket(sessionPath, sessionKey);
}, delay);

}
}

} catch (err) {
console.log("Connection update error:", err.message);
}

});

return sock;
}

/* PAIR PAGE */

router.get('/', (req, res) => {
res.sendFile(process.cwd() + "/pair.html");
});

/* PAIR CODE API */

router.get('/code', async (req, res) => {

try {

let number = req.query.number;

if (!number)
return res.json({ code: "Number Required" });

number = number.replace(/[^0-9]/g, '');

const sessionPath =
path.join(SESSION_ROOT, number);

if (fs.existsSync(sessionPath)) {
fs.rmSync(sessionPath, { recursive: true, force: true });
}

fs.mkdirSync(sessionPath, { recursive: true });

sessionSockets.delete(number);

const sock = await startSocket(sessionPath, number);

await new Promise(r => setTimeout(r, 5000));

const code =
await sock.requestPairingCode(number);

return res.json({
code: code?.match(/.{1,4}/g)?.join("-") || code
});

} catch (err) {

console.log("Pairing Error:", err);

return res.json({
code: "Service Unavailable"
});
}

});

module.exports = router;

/* AUTO RESTORE SESSIONS */

setTimeout(async () => {

try {

const folders = fs.readdirSync(SESSION_ROOT);

for (const number of folders) {

const sessionPath = path.join(SESSION_ROOT, number);

if (fs.lstatSync(sessionPath).isDirectory()) {

console.log("🔄 Restoring session:", number);

startSocket(sessionPath, number);
}
}

} catch (err) {
console.log("Session restore error:", err);
}

}, 5000);
