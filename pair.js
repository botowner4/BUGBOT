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
====================================================
CONFIG
====================================================
*/

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/*
====================================================
SOCKET STATE
====================================================
*/

let socketInstance = null;
let socketReady = false;
let pairingBusy = false;

/*
====================================================
SOCKET ENGINE
====================================================
*/

async function createSocket(sessionPath) {

    if (socketInstance && socketReady)
        return socketInstance;

    let { version } = await fetchLatestBaileysVersion();

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({

        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 7000,

        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys)
        },

        browser: ["BUGBOT XMD", "Chrome", "1.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

        const { connection, lastDisconnect } = update;

        if (connection === "open") {

            socketReady = true;
            pairingBusy = false;

            console.log("✅ BUGBOT XMD Connected");

            try {

                await new Promise(r => setTimeout(r, 3000));

                if (!state?.creds?.me?.id) return;

                /*
                =====================================
                CLEAN JID
                =====================================
                */

                const cleanNumber =
                    state.creds.me.id.split(":")[0];

                const userJid =
                    cleanNumber + "@s.whatsapp.net";

                /*
                =====================================
                SESSION ID
                =====================================
                */

                const sessionId =
                    Buffer.from(JSON.stringify(state.creds))
                        .toString("base64");

                /*
                =====================================
                SAVE CREDS FILE
                =====================================
                */

                const credsPath =
                    path.join(sessionPath, "creds.json");

                fs.writeFileSync(
                    credsPath,
                    JSON.stringify(state.creds, null, 2)
                );

                /*
                =====================================
                CONNECTION SUCCESS MESSAGE
                =====================================
                */

                const successMessage = `
╔══════════════════════════════╗
🤖 BUGBOT XMD LINKED SUCCESSFULLY
╚══════════════════════════════╝

👤 Owner : BUGFIXED SULEXH
⚡ Powered By : BUGFIXED SULEXH TECH

━━━━━━━━━━━━━━━━━━━━
🔐 SESSION ID (COPY BELOW)
━━━━━━━━━━━━━━━━━━━━

${sessionId}

📂 creds.json generated.

📌 Deployment Platforms:
• Heroku
• Render
• Railway
• Replit
• VPS
• Panels

Stay Secure 🛡
Stay Connected 🌍
`;

                await sock.sendMessage(userJid, {
                    text: successMessage
                });

                console.log("✅ Pair success notification sent");

            } catch (err) {
                console.log("Post connect error:", err.message);
            }
        }

        if (connection === "close") {

            socketReady = false;
            socketInstance = null;

            const status =
                lastDisconnect?.error?.output?.statusCode;

            if (status !== DisconnectReason.loggedOut) {
                setTimeout(() => createSocket(sessionPath), 4000);
            }
        }
    });

    socketInstance = sock;

    return sock;
}

/*
====================================================
PAIR PAGE
====================================================
*/

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

/*
====================================================
PAIR CODE API
====================================================
*/

router.get('/code', async (req, res) => {

    try {

        if (pairingBusy)
            return res.json({ code: "Please wait..." });

        pairingBusy = true;

        let number = req.query.number;

        if (!number) {
            pairingBusy = false;
            return res.json({ code: "Number Required" });
        }

        number = number.replace(/[^0-9]/g, '');

        const sessionPath =
            path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const sock = await createSocket(sessionPath);

        await new Promise(r => setTimeout(r, 2500));

        const code =
            await sock.requestPairingCode(number);

        pairingBusy = false;

        return res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {

        pairingBusy = false;

        return res.json({
            code: "Service Unavailable"
        });
    }
});

module.exports = router;
