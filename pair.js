require('./settings');
require('./sessionCleaner');

const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require("pino");

const router = express.Router();

const handleMessage = require('./main'); // your command handler

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");

/* ================= GLOBAL MAPS ================= */

const sessionSockets = new Map();
const socketHealthMap = new Map();
const socketHeartbeatMap = new Map();
const pairingInProgress = new Map();

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= START SOCKET ================= */

async function startSocket(sessionPath, sessionKey, isPairing = false) {

    try {

        if (sessionSockets.has(sessionKey)) {

            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket) {
                if (!isPairing) return oldSock;
            }

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);

            const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
            if (oldHeartbeat) clearInterval(oldHeartbeat);

            socketHeartbeatMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,
            logger: pino({ level: "silent" }),

            printQRInTerminal: false,

            keepAliveIntervalMs: 60000,
            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },

            browser: Browsers.ubuntu('Chrome'),

            msgRetryCounterMap: new Map(),
            maxMsgRetryCount: 2,

            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        sock.ev.on("creds.update", saveCreds);

        /* ================= CONNECTION EVENTS ================= */

        sock.ev.on("connection.update", async (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected",
                    messagesSentDuringSession: 0
                });

                if (!isPairing) {
                    startSocketHeartbeat(sessionKey, sock);
                }

                /* SEND BRANDING IMAGE MESSAGE */

                try {

                    const caption = `
╔════════════════════════════╗
║ 🚀 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ Multi Device Connected
┃ ✅ V10 BUGBOT ENGINE ACTIVE
┃ ✅ Whatsapp Crasher ON
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 BOT IS READY

Type *.menu* to view commands
`;

                    const jid = sessionKey + "@s.whatsapp.net";

                    await sock.sendMessage(jid, {
                        image: { url: "https://files.catbox.moe/w79k9u.jpg" },
                        caption: caption
                    });

                } catch {}

            }

            if (connection === "close") {

                const reason = lastDisconnect?.error?.output?.statusCode;

                console.log(`connection closed - Reason: ${reason}`);

                if (pairingInProgress.get(sessionKey) === true) return;

                if (reason !== DisconnectReason.loggedOut) {

                    console.log(`🔄 Attempting automatic reconnection for ${sessionKey}`);

                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);

                    socketHeartbeatMap.delete(sessionKey);

                    setTimeout(() => {
                        startSocket(sessionPath, sessionKey, false);
                    }, 8000);

                } else {

                    console.log(`Session logged out ${sessionKey}`);

                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);

                    socketHeartbeatMap.delete(sessionKey);
                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);
                }
            }
        });

        /* ================= MESSAGE FORWARDING ================= */

        sock.ev.on("messages.upsert", async ({ messages }) => {

            try {

                const msg = messages[0];

                if (!msg.message) return;
                if (msg.key && msg.key.remoteJid === 'status@broadcast') return;

                console.log("📩 Message received");

                await handleMessage(sock, msg); // forward to main.js

            } catch (err) {

                console.log("Message handler error:", err.message);

            }

        });

        sessionSockets.set(sessionKey, sock);

        return sock;

    } catch (error) {

        console.log("Socket start error:", error.message);
        return null;
    }
}

/* ================= HEARTBEAT ================= */

function startSocketHeartbeat(sessionKey, sock) {

    const existingHeartbeat = socketHeartbeatMap.get(sessionKey);
    if (existingHeartbeat) clearInterval(existingHeartbeat);

    const heartbeat = setInterval(() => {

        try {

            if (!isSocketConnected(sessionKey)) {
                clearInterval(heartbeat);
                socketHeartbeatMap.delete(sessionKey);
                return;
            }

            if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                sock.ws.socket.ping();
            }

            const health = socketHealthMap.get(sessionKey);

            if (health) health.lastHeartbeat = Date.now();

        } catch {}

    }, 30000);

    socketHeartbeatMap.set(sessionKey, heartbeat);
}

function isSocketConnected(sessionKey) {

    try {

        const sock = sessionSockets.get(sessionKey);

        return sock && sock.ws && sock.ws.socket && sock.ws.socket.readyState === 1;

    } catch {
        return false;
    }
}

/* ================= ROUTES ================= */

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required", error: true });

        number = number.replace(/[^0-9]/g, '');

        const sessionPath = path.join(SESSION_ROOT, number);

        pairingInProgress.set(number, true);

        const sock = await startSocket(sessionPath, number, true);

        if (!sock) {
            pairingInProgress.delete(number);
            return res.json({ code: "Socket Error", error: true });
        }

        await new Promise(r => setTimeout(r, 2000));

        const code = await sock.requestPairingCode(number);

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        pairingInProgress.set(number, "waiting_for_auth");

        res.json({
            code: formattedCode,
            number,
            error: false
        });

    } catch (err) {

        console.log("Pairing error:", err.message);

        res.json({
            code: "Service Error",
            error: true
        });
    }
});

module.exports = router;
