require('./settings');

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pino = require("pino");
const crypto = require("crypto");

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

        // ❗ Always create fresh socket (IMPORTANT FIX)
        if (globalSocket) {
    console.log("⚠ Existing socket detected, reusing...");
    return globalSocket;
        }

        const sock = makeWASocket({

            version,

            logger: pino({ level: "silent" }),

            printQRInTerminal: false,

            keepAliveIntervalMs: 5000,

            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys)
            },

            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect } = update;

    if (connection === "open") {

        socketReady = true;

        console.log("✅ Pair Socket Connected");

        try {

            // ========== SESSION ID ==========
            const sessionId = Buffer.from(state.creds.me.id).toString("base64");

            // ========== EXPORT CREDS ==========
            const credsPath = path.join(sessionPath, "creds.json");

            fs.writeFileSync(
                credsPath,
                JSON.stringify(state.creds, null, 2)
            );

            // ========== SEND SUCCESS MESSAGE ==========
            const successMessage = `
╔══════════════════════════════╗
   🤖  BUGBOT XMD CONNECTED
╚══════════════════════════════╝

👤 Owner : BUGFIXED SULEXH
⚡ Powered By : BUGFIXED SULEXH TECH

━━━━━━━━━━━━━━━━━━━━
🔐 SESSION ID:
${sessionId}
━━━━━━━━━━━━━━━━━━━━

📂 creds.json file has been generated.

📌 Use this creds.json to deploy on:
• Heroku
• Railway
• Render
• Replit
• VPS
• Panels

🚀BUGBOT Has Linked successful!

Stay Secure 🛡
Stay Connected 🌍
            `;

            await sock.sendMessage(
                state.creds.me.id,
                { text: successMessage }
            );

        } catch (err) {
            console.log("Post-Connect Error:", err);
        }
    }

    if (connection === "close") {

        socketReady = false;

        const status =
            lastDisconnect?.error?.output?.statusCode;

        if (status !== DisconnectReason.loggedOut) {

            setTimeout(() => {
                startSocket(sessionPath);
            }, 4000);
        }
    }

});
        

        globalSocket = sock;

        return sock;

    } catch (e) {

        console.log("Socket Start Error:", e);

        socketReady = false;
        globalSocket = null;

        setTimeout(() => startSocket(sessionPath), 5000);
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

        if (!number) {
            return res.json({ code: "Number Required" });
        }

        number = number.replace(/[^0-9]/g, '');

        const sessionPath = path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        await startSocket(sessionPath);

        if (!globalSocket) {
            return res.json({ code: "Socket Init Failed" });
        }

        await new Promise(r => setTimeout(r, 1000));

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
