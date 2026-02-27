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
GLOBAL SOCKET REGISTRY
*/
const activeSockets = new Map();

/*
SESSION CONFIG
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

    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys)
    },

    browser: ["Ubuntu", "Chrome", "20.0.04"],

    keepAliveIntervalMs: 10000
});

/*
SAVE SOCKET INSTANCE
*/
activeSockets.set(sessionPath, sock);

/*
====================================================
COMMAND HANDLER LISTENER
====================================================
*/

sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {

        const { handleMessages } = require('./main');

        await handleMessages(sock, chatUpdate, true);

    } catch (err) {
        console.log("Runtime handler error:", err);
    }
});

/*
SAVE CREDENTIALS
*/
sock.ev.on("creds.update", saveCreds);

/*
====================================================
CONNECTION EVENTS
====================================================
*/

sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect } = update;

    if (connection === "open") {

        console.log("✅ Pair Socket Connected");

        try {

            await new Promise(r => setTimeout(r, 2500));

            if (!sock.user?.id) return;

            const cleanNumber =
                sock.user.id.split(":")[0];

            const userJid =
                cleanNumber + "@s.whatsapp.net";

/*
TRACK SESSION JSON
*/

const trackFile = "./data/paired_users.json";

if (!fs.existsSync("./data"))
    fs.mkdirSync("./data",{recursive:true});

let pairedList = [];

if (fs.existsSync(trackFile)) {
    try {
        pairedList = JSON.parse(fs.readFileSync(trackFile));
    } catch {}
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

/*
BRANDING MESSAGE
*/

const giftVideo =
"https://files.catbox.moe/rxvkde.mp4";

const caption = `
╔════════════════════════════╗
║ 🤖 BUGFIXED SULEXH BUGBOT XMD ║
╚════════════════════════════╝

🌟 SESSION CONNECTED SUCCESSFULLY 🌟

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Multi Device Connected ✔
┃ *BUGBOT ENGINE ACTIVE* ✔
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚀 BOT IS NOW READY TO USE

┏━━━ 🌍 HELP & SUPPORT ━━━┓
┃ 👑 Owner Help Center
┃ ➤ https://wa.me/message/O6KFV26U3MMGP1
┃
┃ 📢 Join Official Group
┃ ➤ https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

💡 Type *.menu* to view commands

✨ *BUGFIXED SULEXH ADVANCED BOT* ✨
`;

await sock.sendMessage(userJid,{
    video:{url:giftVideo},
    caption
});

console.log("✅ Branding startup message sent");

        } catch(e){
            console.log("Branding error:",e);
        }
    }

/*
AUTO RECONNECT WATCHDOG
*/

if (connection === "close") {

    const status =
        lastDisconnect?.error?.output?.statusCode;

    if (status !== DisconnectReason.loggedOut) {

        console.log("♻ Reconnecting socket...");

        setTimeout(() => {
            startSocket(sessionPath);
        },4000);

    } else {
        console.log("❌ Logged out");
    }
}

});

return sock;
}

/*
PAIR PAGE
*/

router.get('/', (req,res)=>{
res.sendFile(process.cwd()+"/pair.html");
});

/*
PAIR CODE API
*/

router.get('/code', async (req,res)=>{

try{

let number = req.query.number;

if(!number)
return res.json({code:"Number Required"});

number = number.replace(/[^0-9]/g,'');

const sessionPath =
path.join(SESSION_ROOT,number);

if(!fs.existsSync(sessionPath))
fs.mkdirSync(sessionPath,{recursive:true});

const sock = await startSocket(sessionPath);

await new Promise(r=>setTimeout(r,2000));

const code =
await sock.requestPairingCode(number);

return res.json({
code: code?.match(/.{1,4}/g)?.join("-") || code
});

}catch(err){

console.log("Pairing Error:",err);

return res.json({
code:"Service Unavailable"
});

}

});

module.exports = router;
