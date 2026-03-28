const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pino = require("pino");
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanSession(sessionPath) { if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true }); }

// ==============================
// Send startup gift
async function sendStartupGift(sock, userNumber) {
    try {
        const giftVideo = "https://files.catbox.moe/rxvkde.mp4";
        const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟
🚀 BOT IS NOW READY TO USE

💡 Type .menu to view commands

📢 Join our WhatsApp Group:
https://chat.whatsapp.com/DG9XlePCVTEJclSejnZwN5?mode=gi_t

📞 Contact BUGBOT Owner: +254768161116
`;

        const userJid = userNumber.includes("@s.whatsapp.net") ? userNumber : `${userNumber}@s.whatsapp.net`;

        await sock.sendMessage(userJid, {
            video: { url: giftVideo },
            caption,
            gifPlayback: true,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363416402842348@newsletter",
                    newsletterName: "BUGFIXED SULEXH TECH",
                    serverMessageId: 1
                }
            }
        });

        console.log(`✅ Startup gift sent to ${userNumber}`);
    } catch (err) {
        console.log("❌ Failed to send startup gift:", err);
    }
}

// ==============================
// Start WhatsApp socket
async function startSocket(sessionPath, sessionKey, userNumber) {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys) },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (sessionKey) sessionSockets.set(sessionKey, sock);
    let giftSent = false;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open" && !giftSent) {
            giftSent = true;
            await sendStartupGift(sock, userNumber);
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            console.log("⚠ Connection closed:", status);
            if ([DisconnectReason.loggedOut, 515].includes(status)) {
                sessionSockets.delete(sessionKey);
                cleanSession(sessionPath);
                return;
            }
            console.log("🔄 Reconnecting:", sessionKey);
            if (!sessionSockets.has(sessionKey)) setTimeout(() => startSocket(sessionPath, sessionKey, userNumber), 5000);
        }
    });

    sock.ws.on("close", () => {
        console.log("⚠ WS closed, cleaning:", sessionKey);
        sessionSockets.delete(sessionKey);
    });

    sock.ev.on("creds.update", saveCreds);
    return sock;
}

// ==============================
// Serve pair.html when opened in browser
router.get('/page', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pair.html'));
});

// ==============================
// Pairing API
router.get('/', async (req, res) => {
    // If browser wants HTML, redirect to pair.html
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
        return res.redirect('/pair/page');
    }

    try {
        let number = req.query.number;
        if (!number) return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');
        if (!number.startsWith("254")) return res.json({ code: "Invalid number format" });

        const sessionPath = path.join(SESSION_ROOT, number);
        const oldSock = sessionSockets.get(number);
        if (oldSock) { try { oldSock.ws?.close(); } catch {} sessionSockets.delete(number); }

        if (fs.existsSync(sessionPath)) {
            const files = fs.readdirSync(sessionPath);
            if (!files.includes("creds.json")) cleanSession(sessionPath);
        }

        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const sock = await startSocket(sessionPath, number, number);
        await sleep(3000);

        const code = await sock.requestPairingCode(number, { timeout: 90000 }).catch(() => {
            cleanSession(sessionPath);
            return null;
        });

        if (!code) return res.json({ code: "Pairing timeout. Try again" });
        return res.json({ code: code?.match(/.{1,4}/g)?.join("-") || code });

    } catch (err) {
        console.log("Pairing Error:", err);
        return res.json({ code: "Service Unavailable" });
    }
});

module.exports = router;
