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
const settings = require('./settings');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// =========================
// MEMORY STORAGE
// =========================

const activeSockets = {};
const connectionStates = {};

// =========================
// SESSION ROOT
// =========================

const SESSION_ROOT = "./sessions";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT);
}

// =========================
// PAIRING API
// ==================
// ===== Pair Page Route =====

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

// ===== Pairing Code Generator =====

router.get('/code', async (req, res) => {
    try {

        let number = req.query.number;

        if (!number) {
            return res.json({ code: "Number Required" });
        }

        number = number.replace(/[^0-9]/g, '');

        global.phoneNumber = number;

        const { state, saveCreds } =
            await useMultiFileAuthState('./session');

        let sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" })
        });

        sock.ev.on('creds.update', saveCreds);

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
        status: connectionStates[number] || "not_found"
    });

});

// =========================
// SOCKET ENGINE
// =========================

async function startSocket(sessionPath, number) {

    let { version } = await fetchLatestBaileysVersion();

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath);

    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        msgRetryCounterCache
    });

    connectionStates[number] = "connecting";

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

        const { connection, lastDisconnect } = update;

        if (connection === "open") {

            console.log(chalk.green("Pairing Connected => " + number));

            connectionStates[number] = "connected";

            try {
                let botNumber =
                    sock.user.id.split(':')[0] + '@s.whatsapp.net';

                await sock.sendMessage(botNumber, {
                    text: "✅ Pairing Successful\nBot Linked and Online"
                });

            } catch (e) {}

        }

        if (connection === "close") {

            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            connectionStates[number] = "disconnected";

            if (shouldReconnect) {
                setTimeout(() => {
                    startSocket(sessionPath, number);
                }, 5000);
            }
        }

    });

    return sock;
}

// =========================
// EXPORT ROUTER
// =========================

module.exports = router;
