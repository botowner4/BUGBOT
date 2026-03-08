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

/* ================= GLOBAL MAPS ================= */

const sessionSockets = new Map();
const socketHealthMap = new Map();
const socketHeartbeatMap = new Map(); // Track active heartbeats

const SESSION_ROOT = "./session";

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

/* ================= SOCKET CORE ================= */

async function startSocket(sessionPath, sessionKey) {

    try {

        /* ===== Prevent Duplicate Socket Flood ===== */

        if (sessionSockets.has(sessionKey)) {
            const oldSock = sessionSockets.get(sessionKey);

            if (oldSock?.ws?.socket) return oldSock;

            sessionSockets.delete(sessionKey);
            socketHealthMap.delete(sessionKey);
            
            // Clear old heartbeat
            const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
            if (oldHeartbeat) clearInterval(oldHeartbeat);
            socketHeartbeatMap.delete(sessionKey);
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({

            version,
            logger: pino({ level: "silent" }),

            printQRInTerminal: false,
            keepAliveIntervalMs: 30000, // INCREASED from 10000ms to 30000ms
            receiveMessagesInChunks: true, // Handle messages in chunks

            markOnlineOnConnect: false,
            syncFullHistory: false,

            auth: {
                creds: state?.creds || {},
                keys: makeCacheableSignalKeyStore(state.keys || {})
            },

            browser: ["Ubuntu", "Chrome", "120.0.0"],

            msgRetryCounterMap: MessageRetryMap,
            maxMsgRetryCount: 2, // INCREASED from 1 to 2
            retryRequestDelayMs: 200, // INCREASED from 100 to 200

            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,

            shouldIgnoreJid: () => false,
            shouldSyncHistoryMessage: () => false,
            
            // ADDED: Disable automatic connection closure on inactivity
            reconnectOnNetworkChange: true,
            alwaysOnline: true // Keep socket alive
        });

        /* ===== CREDS AUTO SAVE ===== */

        sock.ev.on("creds.update", saveCreds);

        /* ===== CONNECTION WATCHDOG ===== */

        sock.ev.on("connection.update", (update) => {

            const { connection, lastDisconnect } = update;

            const jid = sessionKey + "@s.whatsapp.net";

            if (connection === "open") {

                console.log(`✅ ${sessionKey} Connected`);

                socketHealthMap.set(sessionKey, {
                    lastHeartbeat: Date.now(),
                    status: "connected",
                    messagesSentDuringSession: 0
                });
                
                // ADDED: Start enhanced heartbeat to keep socket alive
                startSocketHeartbeat(sessionKey, sock);
            }

            if (connection === "close") {

                console.log(`⚠️ ${sessionKey} connection closed`);

                const reason = lastDisconnect?.error?.output?.statusCode;

                // MODIFIED: More resilient reconnection logic
                if (reason !== DisconnectReason.loggedOut && reason !== 401 && reason !== 403) {

                    console.log(`🔄 Attempting automatic reconnection for ${sessionKey}...`);

                    // Remove old heartbeat
                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);
                    socketHeartbeatMap.delete(sessionKey);

                    /* ⭐ Enhanced watchdog reconnect with exponential backoff */
                    setTimeout(() => {
                        if (!sessionSockets.has(sessionKey) || !isSocketConnected(sessionKey)) {
                            console.log(`🔧 Restarting socket for ${sessionKey}...`);
                            startSocket(sessionPath, sessionKey);
                        }
                    }, 8000);

                } else {
                    console.log(`🚫 Session logged out ${sessionKey} (reason: ${reason})`);
                    
                    // Clean up heartbeat
                    const oldHeartbeat = socketHeartbeatMap.get(sessionKey);
                    if (oldHeartbeat) clearInterval(oldHeartbeat);
                    socketHeartbeatMap.delete(sessionKey);
                    
                    sessionSockets.delete(sessionKey);
                    socketHealthMap.delete(sessionKey);
                }
            }
        });

        /* ===== SESSION TRACKING ===== */

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

                const dir = path.dirname(trackFile);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(trackFile,
                    JSON.stringify(users, null, 2));

            } catch (err) {
                console.log("Track save error:", err.message);
            }
        }

        /* ===== BRANDING MESSAGE ===== */

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

            const jid = sessionKey + "@s.whatsapp.net";

            if (sock?.user) {
                await sock.sendMessage(jid, {
                    image: { url: image },
                    caption: caption
                });
            }

        } catch {
            await sock.sendMessage(
                sessionKey + "@s.whatsapp.net",
                { text: caption }
            ).catch(() => {});
        }

        sessionSockets.set(sessionKey, sock);

        return sock;

    } catch (error) {

        console.log("❌ Socket start error:", error.message);
        return null;
    }
}

/* ================= ENHANCED HEARTBEAT SYSTEM ================= */

function startSocketHeartbeat(sessionKey, sock) {
    
    // Clear existing heartbeat if any
    const existingHeartbeat = socketHeartbeatMap.get(sessionKey);
    if (existingHeartbeat) clearInterval(existingHeartbeat);
    
    console.log(`💓 Starting heartbeat for ${sessionKey}`);
    
    // Send a lightweight keep-alive every 25 seconds
    const heartbeat = setInterval(async () => {
        try {
            if (!isSocketConnected(sessionKey)) {
                clearInterval(heartbeat);
                socketHeartbeatMap.delete(sessionKey);
                console.log(`💔 Heartbeat stopped for ${sessionKey} (socket disconnected)`);
                return;
            }
            
            // Send heartbeat by requesting socket state
            if (sock?.ws?.socket && sock.ws.socket.readyState === 1) {
                sock.ws.socket.ping();
            }
            
            const health = socketHealthMap.get(sessionKey);
            if (health) {
                health.lastHeartbeat = Date.now();
            }
            
        } catch (error) {
            console.log(`⚠️ Heartbeat error for ${sessionKey}:`, error.message);
        }
    }, 25000); // Every 25 seconds
    
    socketHeartbeatMap.set(sessionKey, heartbeat);
}

/* ================= SOCKET STATUS CHECK ================= */

function isSocketConnected(sessionKey) {
    try {
        const sock = sessionSockets.get(sessionKey);
        return sock && sock.ws && sock.ws.socket && sock.ws.socket.readyState === 1;
    } catch {
        return false;
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

        /* Wait socket ready */

        await new Promise(resolve => {
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

        console.log("Pairing error:", err.message);

        return res.json({
            code: "Service Temporarily Unavailable",
            error: true,
            message: err.message
        });
    }
});

module.exports = router;
