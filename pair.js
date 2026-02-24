// ========================
// BUGFIXED XMD PAIR ENGINE
// ========================

require('./settings');

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");
const NodeCache = require("node-cache");
const chalk = require('chalk');

const store = require('./lib/lightweight_store');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// =========================
// CONFIG
// =========================

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

// Socket cache (important)
let globalSocket = null;
let socketReady = false;

// =========================
// PAIR PAGE
// =========================

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

// =========================
// SOCKET STARTER (CRITICAL FIX)
// =========================

async function initSocket(sessionPath) {

    if (globalSocket) return globalSocket;

    let { version } = await fetchLatestBaileysVersion();

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath);

    globalSocket = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        }
    });

    globalSocket.ev.on("creds.update", saveCreds);

    globalSocket.ev.on("connection.update", (update) => {

        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(chalk.green("Pair Socket Connected"));

            socketReady = true;
        }

        if (connection === "close") {

            socketReady = false;

            globalSocket = null;

            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                setTimeout(() => initSocket(sessionPath), 4000);
            }
        }
    });

    return globalSocket;
}

// =========================
// PAIR CODE API
// =========================

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number) {
            return res.json({ code: "Number Required" });
        }

        number = number.replace(/[^0-9]/g, '');

        const sessionPath = path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const sock = await initSocket(sessionPath);

        if (!sock) {
            return res.json({ code: "Socket Init Failed" });
        }

        await new Promise(r => setTimeout(r, 1500));

        let code = await sock.requestPairingCode(number);

        return res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {
        console.log(err);

        return res.json({
            code: "Service Unavailable"
        });
    }
});

// =========================
// STATUS API
// =========================

router.get('/status/:number', (req, res) => {

    const number = req.params.number.replace(/[^0-9]/g, '');

    res.json({
        status: socketReady ? "connected" : "connecting"
    });

});

// =========================
// EXPORT
// =========================

module.exports = router;
