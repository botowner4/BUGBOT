const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pino = require("pino");
const axios = require('axios');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const SESSION_ROOT = path.join(process.cwd(), 'session_pair');
if (!fs.existsSync(SESSION_ROOT)) fs.mkdirSync(SESSION_ROOT, { recursive: true });

const sessionSockets = new Map();

// Self-ping to prevent sleeping
const APP_URL = process.env.APP_URL || "https://bugbot-i3yc.onrender.com";
setInterval(async () => {
    try { await axios.get(APP_URL); console.log("🔄 Self-ping sent"); } 
    catch { console.log("❌ Self-ping failed"); }
}, 4 * 60 * 1000);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanSession(sessionPath) { if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true }); }

// ==============================
// Start WhatsApp socket per number (for pairing)
async function startSocket(sessionKey, userNumber) {
    const sessionPath = path.join(SESSION_ROOT, sessionKey);
    const tempStatePath = path.join(sessionPath, "_temp");
    if (!fs.existsSync(tempStatePath)) fs.mkdirSync(tempStatePath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempStatePath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys) },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sessionSockets.set(sessionKey, sock);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open" && state.creds.me) {
            // ✅ Login successful → save session permanently
            if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
            fs.readdirSync(tempStatePath).forEach(file => {
                fs.copyFileSync(path.join(tempStatePath, file), path.join(sessionPath, file));
            });

            const cleanNumber = state.creds.me.id.split(":")[0];
            const userJid = `${cleanNumber}@s.whatsapp.net`;
            const giftVideo = "https://files.catbox.moe/rxvkde.mp4";
            const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟
🚀 BOT IS NOW READY TO USE
💡 Type .menu to view commands
📢 Join WhatsApp Group: https://chat.whatsapp.com/DG9XlePCVTEJclSejnZwN5?mode=gi_t
📞 Contact BUGBOT Owner: +254768161116
`;

            await sock.sendMessage(userJid, { video: { url: giftVideo }, caption, gifPlayback: true });
            console.log(`✅ Startup gift sent to ${userNumber}`);
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                console.log(`❌ Logged out: Cleaning session for ${sessionKey}`);
                sessionSockets.delete(sessionKey);
                cleanSession(sessionPath);
                cleanSession(tempStatePath);
            } else {
                setTimeout(() => startSocket(sessionKey, userNumber), 4000);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
    return sock;
}

// ==============================
// Serve pair.html in browser
router.get('/page', (req, res) => res.sendFile(path.join(process.cwd(), 'pair.html')));

// ==============================
// Pairing API
router.get('/', async (req, res) => {
    if (req.headers.accept && req.headers.accept.includes("text/html")) return res.redirect('/pair/page');

    try {
        let number = req.query.number;
        if (!number) return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');
        if (!number.startsWith("254")) return res.json({ code: "Invalid number format" });

        // Reuse socket if already exists
        let sock = sessionSockets.get(number);
        if (!sock) sock = await startSocket(number, number);

        await sleep(1000);

        // Already logged in?
        if (sock.authState?.creds?.me) return res.json({ code: "Already paired ✅" });

        // Request pairing code safely
        const code = await sock.requestPairingCode(number, { timeout: 90000 }).catch(() => null);
        if (!code) return res.json({ code: "Pairing failed or timeout. Try again." });

        return res.json({ code: code?.match(/.{1,4}/g)?.join("-") || code });
    } catch (err) {
        console.log("Pairing Error:", err);
        return res.json({ code: "Service Unavailable" });
    }
});

module.exports = router;
