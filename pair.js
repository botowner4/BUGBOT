require('./settings');

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");
const chalk = require("chalk");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// ===============================
// CONFIG
// ===============================

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

// ===============================
// GLOBAL ENGINE STATE
// ===============================

let globalSocket = null;
let socketReady = false;
let pairingLock = false;

// ===============================
// ANTI SLEEP WATCHDOG
// ===============================

setInterval(() => {

    try {

        if (globalSocket?.ws) {

            globalSocket.ws.send(JSON.stringify({
                type: "ping",
                time: Date.now()
            }));

            console.log("Render heartbeat active");
        }

    } catch {}

}, 12000);

// ===============================
// SOCKET BOOTSTRAP
// ===============================

async function bootstrapSocket(sessionPath) {

    if (globalSocket) return globalSocket;

    try {

        let { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        globalSocket = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            keepAliveIntervalMs: 8000,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: "fatal" })
                )
            }
        });

        globalSocket.ev.on("creds.update", saveCreds);

        globalSocket.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                socketReady = true;
                console.log(chalk.green("PAIR SOCKET READY"));

            }

            if (connection === "close") {

                socketReady = false;
                globalSocket = null;

                const shouldReconnect =
                    (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    setTimeout(() => bootstrapSocket(sessionPath), 3000);
                }

            }

        });

        return globalSocket;

    } catch (e) {

        globalSocket = null;

        setTimeout(() => bootstrapSocket(sessionPath), 4000);
    }
}

// ===============================
// PAIR PAGE
// ===============================

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

// ===============================
// PAIR CODE API
// ===============================

router.get('/code', async (req, res) => {

    try {

        if (pairingLock) {
            return res.json({ code: "Please wait..." });
        }

        pairingLock = true;

        let number = req.query.number;

        if (!number) {
            pairingLock = false;
            return res.json({ code: "Number Required" });
        }

        number = number.replace(/[^0-9]/g, '');

        const sessionPath = path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        await bootstrapSocket(sessionPath);

        if (!globalSocket) {
            pairingLock = false;
            return res.json({ code: "Socket Init Failed" });
        }

        await new Promise(r => setTimeout(r, 700));

        let code = await globalSocket.requestPairingCode(number);

        pairingLock = false;

        return res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {

        pairingLock = false;

        return res.json({
            code: "Service Unavailable"
        });
    }
});

// ===============================
// STATUS API
// ===============================

router.get('/status/:number', (req, res) => {

    res.json({
        status: socketReady ? "connected" : "connecting"
    });

});

// ===============================
// EXPORT
// ===============================

module.exports = router;
