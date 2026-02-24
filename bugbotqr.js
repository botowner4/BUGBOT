const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');

const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require("pino");

let router = express.Router();

const {
    default: Wasi_Tech,
    useMultiFileAuthState,
    Browsers,
    delay
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;

    fs.rmSync(FilePath, {
        recursive: true,
        force: true
    });
}

router.get('/', async (req, res) => {

    const id = makeid();

    try {

        const sessionPath = './temp/' + id;

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        let socket = Wasi_Tech({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop")
        });

        socket.ev.on('creds.update', saveCreds);

        let qrSent = false;

        socket.ev.on("connection.update", async (update) => {

            const { connection, lastDisconnect, qr } = update;

            try {

                if (qr && !qrSent) {
                    qrSent = true;

                    const qrBuffer = await QRCode.toBuffer(qr);

                    if (!res.headersSent) {
                        res.end(qrBuffer);
                    }
                }

                if (connection === "open" && socket.user) {

                    try {

                        await saveCreds();

                        if (fs.existsSync(sessionPath + '/creds.json')) {

                            let data = fs.readFileSync(sessionPath + `/creds.json`);

                            let b64data = Buffer.from(data).toString('base64');

                            await socket.sendMessage(socket.user.id, {
                                text: b64data
                            });

                        }

                    } catch (e) {
                        console.log(e);
                    }

                    await delay(5000);
                    removeFile(sessionPath);
                }

                if (connection === "close") {

                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        setTimeout(() => router.handle, 10000);
                    }
                }

            } catch (e) {
                console.log(e);
            }

        });

    } catch (err) {

        console.log(err);

        if (!res.headersSent) {
            res.json({
                code: "Service is Currently Unavailable"
            });
        }
    }

});

module.exports = router;
