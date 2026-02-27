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
SOCKET STARTER
====================================================
*/

async function startSocket(sessionPath) {

const { version } = await fetchLatestBaileysVersion();

const { state, saveCreds } =
    await useMultiFileAuthState(sessionPath);

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

/*
====================================================
Runtime Message Handler
====================================================
*/

// Safe listener (avoid duplication risk)
if (!sock.messageListenerRegistered) {

sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
        const { handleMessages } = require('./main');
        await handleMessages(sock, chatUpdate, true);
    } catch (err) {
        console.log("Runtime handler error:", err);
    }
});

sock.messageListenerRegistered = true;

}

/*
====================================================
Creds Save
====================================================
*/

sock.ev.on("creds.update", saveCreds);

/*
====================================================
Connection Handler
====================================================
*/

sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect } = update;

    try {

        /*
        ============================
        CONNECTION OPEN
        ============================
        */

        if (connection === "open") {

            await new Promise(r => setTimeout(r, 2500));

            if (!state?.creds?.me?.id) return;

            const cleanNumber =
                state.creds.me.id.split(":")[0];

            const userJid =
                cleanNumber + "@s.whatsapp.net";
          // ===== SAVE PAIRED USER =====
const trackFile = "./data/paired_users.json";

// ensure data folder exists
if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
}

let pairedList = [];

if (fs.existsSync(trackFile)) {
    pairedList = JSON.parse(fs.readFileSync(trackFile));
}

if (!pairedList.find(u => u.number === cleanNumber)) {

    pairedList.push({
        number: cleanNumber,
        connectedAt: new Date().toISOString()
    });

    fs.writeFileSync(
        trackFile,
        JSON.stringify(pairedList, null, 2)
    );
}
// ===== END SAVE =====
            const giftVideo =
                "https://files.catbox.moe/rxvkde.mp4";

            const caption = `
*_Session Connected By BUGFIXED SULEXH TECH_*
*_Made With 🤍_*
______________________________________

╔════◇
║ *『AMAZING YOU'VE CHOSEN BUGBOT XMD』*
║ _You Have Completed the Last Step to Deploy a Whatsapp Bot._
╚══════╝

╔═════◇
║  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ Owner : https://wa.me/message/O6KFV26U3MMGP1
║❒ Repo : https://github.com/botowner4/BUGBOT
║❒ WaGroup : https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK
║❒ Channel : https://whatsapp.com/channel/0029VbAD3222f3EIZyXe6w16
║❒ Plugins : https://github.com/botowner4
╚══════════════╝

______________________________________
💡 Type .menu to see bot features
✨ BUGFIXED SULEXH HEAVY WHATSAPP BUGBOT ✨
`;

            await sock.sendMessage(userJid, {
                video: { url: giftVideo },
                caption: caption
            });

            console.log("✅ Branding startup message sent");

        }

        /*
        ============================
        AUTO RECONNECT
        ============================
        */

        if (connection === "close") {

            const status =
                lastDisconnect?.error?.output?.statusCode;

            console.log("⚠ Connection closed. Auto reconnecting...");

            if (status !== DisconnectReason.loggedOut) {

                setTimeout(() => {
                    startSocket(sessionPath);
                }, 4000);

            } else {
                console.log("❌ Logged out from WhatsApp.");
            }
        }

    } catch (err) {
        console.log("Connection handler error:", err);
    }

});

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

    let number = req.query.number;

    if (!number)
        return res.json({ code: "Number Required" });

    number = number.replace(/[^0-9]/g, '');

    const sessionPath =
        path.join(SESSION_ROOT, number);

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const sock = await startSocket(sessionPath);

    await new Promise(r => setTimeout(r, 2000));

    const code =
        await sock.requestPairingCode(number);

    return res.json({
        code: code?.match(/.{1,4}/g)?.join("-") || code
    });

} catch (err) {

    console.log("Pairing Error:", err);

    return res.json({
        code: "Service Unavailable"
    });
}

});

module.exports = router;
