require('./settings');
require('./sessionCleaner');

const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require("pino");

const router = express.Router();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    MessageRetryMap,
    DisconnectReason
} = require("@whiskeysockets/baileys");

/* Stability Maps */
const sessionSockets = new Map();
const socketHealthMap = new Map();

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET STARTER ================= */

async function startSocket(sessionPath, sessionKey) {

    try {

        if (sessionSockets.has(sessionKey)) {
            const existingSock = sessionSockets.get(sessionKey);

            if (existingSock?.ws?.socket) return existingSock;

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,

            logger: pino({ level: "silent" }),

            printQRInTerminal: false,
            keepAliveIntervalMs: 10000,
            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state?.creds || {},
                keys: makeCacheableSignalKeyStore(state.keys || {})
            },

            browser: ["Ubuntu", "Chrome", "120.0.0"],

            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 1,
            retryRequestDelayMs: 100,

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,

            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false
        });

        /* SAVE CREDS */
        sock.ev.on("creds.update", saveCreds);

        /* CONNECTION EVENTS */
        sock.ev.on("connection.update", async (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: 'connected'
                });

            }

            if (connection === "close") {

                const reason = lastDisconnect?.error?.output?.statusCode;

                console.log(`⚠️ ${sessionKey} connection closed`);

                if (reason !== DisconnectReason.loggedOut) {

                    console.log(`🔄 Reconnecting ${sessionKey}...`);

                    setTimeout(() => {
                        startSocket(sessionPath, sessionKey);
                    }, 5000);

                } else {

                    console.log(`🚫 Session logged out ${sessionKey}`);
                }
            }

        });

        /* SOCKET HEALTH MONITOR */
        setInterval(() => {

            const health = socketHealthMap.get(sessionKey);

            if (!sock?.ws || sock.ws.readyState !== 1) {

                console.log(`⚠️ Socket unhealthy for ${sessionKey}`);
                startSocket(sessionPath, sessionKey);

            }

            if (health) {
                health.lastHeartbeat = Date.now();
            }

        }, 30000);

        const userJid = sessionKey + "@s.whatsapp.net";

        /* ===== TRACK PAIRED USERS ===== */

        const trackFile = "./data/paired_users.json";

        let users = [];

        try {
            if (fs.existsSync(trackFile)) {
                const raw = fs.readFileSync(trackFile, "utf8").trim();
                if (raw) users = JSON.parse(raw);
            }
        } catch {
            users = [];
        }

        if (!users.some(u => u.number === sessionKey)) {

            users.push({
                number: sessionKey,
                pairedAt: new Date().toISOString()
            });

            try {

                const dataDir = path.dirname(trackFile);

                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                fs.writeFileSync(trackFile, JSON.stringify(users, null, 2));

            } catch (err) {
                console.log("Error saving paired users file:", err.message);
            }
        }

        const image = "https://files.catbox.moe/ip70j9.jpg";

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

🚀 *BOT IS NOW READY FOR OPERATIONS*

💡 Type *.menu* to view commands
`;

        try {

            if (sock?.user) {
                await sock.sendMessage(userJid, {
                    image: { url: image },
                    caption: caption
                });
            }

        } catch {
            await sock.sendMessage(userJid, { text: caption }).catch(() => {});
        }

        sessionSockets.set(sessionKey, sock);

        return sock;

    } catch (error) {
        console.log("❌ Failed to start socket:", error.message);
        return null;
    }
}

/* ================= PAIR API ================= */

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

router.get('/code', async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required", error: true });

        number = number.replace(/[^0-9]/g, '');

        if (number.length < 10)
            return res.json({ code: "Invalid Number Format", error: true });

        const sessionPath = path.join(SESSION_ROOT, number);

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        fs.mkdirSync(sessionPath, { recursive: true });

        const sock = await startSocket(sessionPath, number);

        if (!sock)
            return res.json({
                code: "Service Temporarily Unavailable",
                error: true
            });

        /* WAIT UNTIL SOCKET IS READY */

        await new Promise((resolve) => {

            const check = setInterval(() => {

                if (sock?.ws?.readyState === 1) {
                    clearInterval(check);
                    resolve();
                }

            }, 1000);

        });

        const code = await sock.requestPairingCode(number);

        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        return res.json({
            code: formattedCode,
            number,
            timestamp: new Date().toISOString(),
            error: false
        });

    } catch (err) {

        console.log("❌ Pairing Error:", err.message);

        return res.json({
            code: "Service Temporarily Unavailable",
            error: true,
            message: err.message
        });
    }
});

module.exports = router;
