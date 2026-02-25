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
let activeSessionPath = null;
let activeNumber = null;

/*
====================================
KEEP ALIVE HEARTBEAT
====================================
*/

setInterval(() => {
    try {
        if (globalSocket?.ws?.readyState === 1) {
            globalSocket.ws.send(JSON.stringify({ type: "ping" }));
        }
    } catch {}
}, 10000);

/*
====================================
SOCKET STARTER
====================================
*/

async function startSocket(sessionPath, number) {

    try {

        activeSessionPath = sessionPath;
        activeNumber = number;

        let { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        if (globalSocket) {
            try { await globalSocket.logout(); } catch {}
            globalSocket = null;
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

            browser: ["BUGBOT XMD", "Chrome", "1.0.0"]
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {

            const { connection, lastDisconnect } = update;

            /*
            =====================================
            SUCCESS LOGIN
            =====================================
            */

            if (connection === "open") {

                socketReady = true;

                console.log("✅ Pairing Successful:", number);

                try {

                    await saveCreds();

                    const credsPath =
                        path.join(sessionPath, "creds.json");

                    if (!fs.existsSync(credsPath)) {
                        console.log("❌ creds.json not found");
                        return;
                    }

                    const botJid =
                        sock.user.id.split(":")[0] + "@s.whatsapp.net";

                    /*
                    GENERATE SESSION ID
                    */

                    const sessionId = crypto
                        .createHash("sha256")
                        .update(number + Date.now().toString())
                        .digest("hex")
                        .substring(0, 16)
                        .toUpperCase();

                    /*
                    CYBER HACKER SUCCESS MESSAGE
                    */

                    await sock.sendMessage(botJid, {
                        text:
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💻 𝐁𝐔𝐆𝐁𝐎𝐓 𝐗𝐌𝐃 :: SYSTEM CORE
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> Initializing secure link...
> Establishing encrypted tunnel...
> Authenticating device...
> Access Granted ✅

╔══════════════════════════════╗
      🟢 DEVICE LINK SUCCESS
╚══════════════════════════════╝

👑 OWNER      :: BUGFIXED SULEXH
⚡ POWER CORE :: BUGFIXED SULEXH TECH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 SESSION IDENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 SESSION ID:
${sessionId}

📂 NUMBER:
${number}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DEPLOYMENT FILE GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your secure deployment key (creds.json)
is attached below.

⚠️ WARNING:
Do NOT share this file.
It gives full control of your bot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 SUPPORTED DEPLOYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

➤ Heroku
➤ Render
➤ Railway
➤ VPS
➤ Replit
➤ Any Other Deployment platforms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> BUGBOT XMD STATUS: ONLINE
> Encryption Layer: ACTIVE
> System Mode: OPERATIONAL 🚀

[ SYSTEM SECURED ]`
                    });

                    /*
                    SEND CREDS FILE
                    */

                    await sock.sendMessage(botJid, {
                        document: fs.readFileSync(credsPath),
                        mimetype: "application/json",
                        fileName: "creds.json",
                        caption: `🔐 BUGBOT XMD SESSION FILE | ID: ${sessionId}`
                    });

                    console.log("✅ creds.json sent");

                } catch (err) {
                    console.log("Send error:", err);
                }
            }

            /*
            =====================================
            HANDLE DISCONNECT
            =====================================
            */

            if (connection === "close") {

                socketReady = false;

                const status =
                    lastDisconnect?.error?.output?.statusCode;

                globalSocket = null;

                if (status !== DisconnectReason.loggedOut) {
                    setTimeout(() => {
                        startSocket(activeSessionPath, activeNumber);
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

        setTimeout(() => startSocket(activeSessionPath, activeNumber), 5000);
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

        if (!fs.existsSync(sessionPath))
            fs.mkdirSync(sessionPath, { recursive: true });

        await startSocket(sessionPath, number);

        if (!globalSocket)
            return res.json({ code: "Socket Init Failed" });

        await new Promise(r => setTimeout(r, 1200));

        let code =
            await globalSocket.requestPairingCode(number);

        return res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {

        console.log(err);

        return res.json({ code: "Service Unavailable" });
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
