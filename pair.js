require('./settings');

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

/*
====================================
CONFIG
====================================
*/

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/*
====================================
ENGINE STATE
====================================
*/

let globalSocket = null;
let socketBusy = false;

/*
====================================
WATCHDOG HEARTBEAT
====================================
*/

setInterval(() => {

    try {

        if (globalSocket?.ws?.readyState === 1) {

            globalSocket.ws.send(JSON.stringify({
                type: "ping"
            }));

        }

    } catch {}

}, 8000);

/*
====================================
SOCKET BOOTSTRAP
====================================
*/

async function bootstrapSocket(sessionPath) {

    try {

        if (socketBusy) return;

        socketBusy = true;

        let { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        if (globalSocket) {
            try {
                await globalSocket.logout?.();
            } catch {}
        }

        const sock = makeWASocket({

            version,

            logger: pino({ level: "silent" }),

            printQRInTerminal: false,

            keepAliveIntervalMs: 7000,

            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys)
            }
        });

        globalSocket = sock;

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                console.log("✅ Pair Socket Ready");

            }

            if (connection === "close") {

                globalSocket = null;

                const status =
                    lastDisconnect?.error?.output?.statusCode;

                if (status !== DisconnectReason.loggedOut) {

                    setTimeout(() => {
                        bootstrapSocket(sessionPath);
                    }, 3000);
                }

            }

        });

        socketBusy = false;

        return sock;

    } catch (e) {

        socketBusy = false;

        globalSocket = null;

        setTimeout(() => bootstrapSocket(sessionPath), 4000);
    }
}

/*
====================================
PAIR PAGE
====================================
*/

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

/*
====================================
PAIR CODE API
====================================
*/

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');

        const sessionPath =
            path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        await bootstrapSocket(sessionPath);

        if (!globalSocket)
            return res.json({ code: "Socket Init Failed" });

        await new Promise(r => setTimeout(r, 1500));

        let code = await globalSocket.requestPairingCode(number);

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

/*
====================================
STATUS API
====================================
*/

router.get('/status', (req, res) => {

    return res.json({
        status: globalSocket ? "connected" : "connecting"
    });

});

module.exports = router;
