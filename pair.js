const express = require('express');
const fs = require('fs');

let router = express.Router();

const pino = require("pino");

const {
    fetchLatestBaileysVersion,
    makeWASocket,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys");

let sock = null;
let socketReady = false;

/* ================================
   SOCKET ENGINE
================================ */

async function startPairSocket() {

    if (sock) return;

    try {

        let { version } = await fetchLatestBaileysVersion();

        const { state, saveCreds } =
            await useMultiFileAuthState('./session_pair');

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            logger: pino({ level: "silent" }),
            keepAliveIntervalMs: 15000
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {

            const { connection } = update;

            if (connection === "open") {
                console.log("✅ Pair socket connected");
                socketReady = true;
            }

            if (connection === "close") {

                console.log("❌ Pair socket closed");

                socketReady = false;

                setTimeout(() => {
                    sock = null;
                    startPairSocket();
                }, 5000);
            }

        });

    } catch (err) {
        console.log("Socket start error", err);
        setTimeout(startPairSocket, 5000);
    }
}

/* ================================
   ROUTE ENGINE
================================ */

router.get('/', async (req, res) => {

    if (!req.query.number) {
        return res.send("Number required");
    }

    if (!sock) {
        return res.send("Socket initializing...");
    }

    if (!socketReady) {
        return res.send("WhatsApp not connected yet. Retry.");
    }

    try {

        let number = req.query.number.replace(/[^0-9]/g, '');

        const code = await sock.requestPairingCode(number);

        return res.json({
            status: "success",
            pairingCode: code
        });

    } catch (err) {
        console.log(err);
        return res.send("Pairing engine error");
    }

});

/* ================================
   START ENGINE
================================ */

startPairSocket();

module.exports = router;
