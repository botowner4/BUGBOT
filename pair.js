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
GLOBAL SOCKET STATE
====================================
*/

let globalSocket = null;
let socketReady = false;

/*
====================================
KEEP ALIVE HEARTBEAT (Render Fix)
====================================
*/

setInterval(() => {

    try {

        if (globalSocket?.ws) {
            globalSocket.ws.send(JSON.stringify({
                type: "ping"
            }));
        }

    } catch {}

}, 10000);

/*
====================================
SOCKET STARTER
====================================
*/
async function startSocket(sessionPath) {

    try {

        let { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        // ✅ Always create fresh socket (Render safe)

        const sock = makeWASocket({

            version,

            logger: pino({ level: "silent" }),

            printQRInTerminal: false,

            keepAliveIntervalMs: 8000,

            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys)
            }
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                socketReady = true;

                console.log("✅ Pair Socket Connected");
            }

            if (connection === "close") {

                socketReady = false;

                const status =
                    lastDisconnect?.error?.output?.statusCode;

                if (status !== DisconnectReason.loggedOut) {

                    setTimeout(() => {
                        startSocket(sessionPath);
                    }, 3000);
                }
            }

        });

        globalSocket = sock;

        return sock;

    } catch (e) {

        console.log("Socket Start Error:", e);

        socketReady = false;
        globalSocket = null;

        setTimeout(() => startSocket(sessionPath), 4000);
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
=================================
/*
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

        // ✅ Start socket
        await startSocket(sessionPath);

        // ✅ Wait socket ready (CRITICAL FIX)
        let waitCounter = 0;

        while (!socketReady && waitCounter < 10) {
            await new Promise(r => setTimeout(r, 1000));
            waitCounter++;
        }

        if (!globalSocket || !socketReady) {
            return res.json({ code: "WhatsApp Not Connected Yet" });
        }

        // ✅ Small delay before pairing request
        await new Promise(r => setTimeout(r, 1200));

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

    res.json({
        status: socketReady ? "connected" : "connecting"
    });

});

/*
====================================
EXPORT
====================================
*/

module.exports = router;
