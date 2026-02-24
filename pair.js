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
// =========================

router.post('/generate', async (req, res) => {

    try {

        let { number } = req.body;

        if (!number)
            return res.json({ error: "Number required" });

        number = number.replace(/[^0-9]/g, '');

        global.sessionId = number;

        const sessionPath = path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const sock = await startSocket(sessionPath, number);

        activeSockets[number] = sock;

        if (!sock.authState?.creds?.registered) {
            const code = await sock.requestPairingCode(number);

            return res.json({
                status: "success",
                pairingCode: code?.match(/.{1,4}/g)?.join("-")
            });
        }

        res.json({ message: "Already registered" });

    } catch (err) {
        console.error(err);
        res.json({ error: "Pairing failed" });
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
