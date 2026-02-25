require("./settings");

const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const pino = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const SESSION_ROOT = "./session_pair";

if (!fs.existsSync(SESSION_ROOT))
    fs.mkdirSync(SESSION_ROOT, { recursive: true });

/*
==============================
SOCKET CREATOR
==============================
*/

async function createSocket(sessionPath) {

    let { version } = await fetchLatestBaileysVersion();

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({

        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,

        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys)
        },

        browser: ["BUGBOT XMD", "Chrome", "1.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

        if (update.connection === "open") {

            console.log("✅ WhatsApp Pair Connected");

            try {

                await new Promise(r => setTimeout(r, 2500));

                if (!state?.creds?.me?.id) return;

                const cleanNumber =
                    state.creds.me.id.split(":")[0];

                const userJid =
                    cleanNumber + "@s.whatsapp.net";

                /*
                SESSION ID (Easy Copy Format)
                */
                const sessionId = Buffer.from(
                    JSON.stringify(state.creds)
                ).toString("base64");

                /*
                SAVE CREDS FILE
                */
                fs.writeFileSync(
                    path.join(sessionPath, "creds.json"),
                    JSON.stringify(state.creds, null, 2)
                );

                /*
                SUCCESS MESSAGE
                */
                const message = `
🤖 BUGBOT XMD CONNECTED SUCCESSFULLY

👤 Owner : BUGFIXED SULEXH
⚡ Powered By : BUGFIXED SULEXH TECH

━━━━━━━━━━━━━━━━━━
🔐 SESSION ID (COPY BELOW)
━━━━━━━━━━━━━━━━━━

${sessionId}

📌 Long press to copy session ID.

📂 creds.json generated.

Deploy on:
• Render
• Railway
• Heroku
• Replit
• VPS
• Panels

Stay Secure 🛡
Stay Connected 🌍
`;

                await sock.sendMessage(userJid, {
                    text: message
                });

            } catch (e) {
                console.log("Post connect send error", e);
            }
        }

        if (update.connection === "close") {

            const status =
                update.lastDisconnect?.error?.output?.statusCode;

            if (status !== DisconnectReason.loggedOut) {

                setTimeout(() => createSocket(sessionPath), 4000);
            }
        }

    });

    return sock;
}

/*
==============================
PAIR PAGE
==============================
*/

router.get("/", (req, res) => {
    res.sendFile(process.cwd() + "/pair.html");
});

/*
==============================
PAIR CODE API
==============================
*/

router.get("/code", async (req, res) => {

    try {

        let number = req.query.number;

        if (!number)
            return res.json({ code: "Number Required" });

        number = number.replace(/[^0-9]/g, '');

        const sessionPath =
            path.join(SESSION_ROOT, number);

        if (!fs.existsSync(sessionPath))
            fs.mkdirSync(sessionPath, { recursive: true });

        const sock =
            await createSocket(sessionPath);

        await new Promise(r => setTimeout(r, 1500));

        const code =
            await sock.requestPairingCode(number);

        res.json({
            code: code?.match(/.{1,4}/g)?.join("-") || code
        });

    } catch (err) {

        console.log(err);

        res.json({
            code: "Service Unavailable"
        });
    }
});

module.exports = router;
