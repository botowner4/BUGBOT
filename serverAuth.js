const { default: Gifted_Tech, useMultiFileAuthState, Browsers } = require("maher-zubair-baileys");
const pino = require("pino");
const fs = require("fs");

async function createServerSession() {
    const { state, saveCreds } = await useMultiFileAuthState("./serversession");

    const bot = Gifted_Tech({
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
        printQRInTerminal: true, // Only this first time to scan QR
        logger: pino({ level: "fatal" }),
        browser: ["Chrome (Server)", "", ""]
    });

    bot.ev.on("creds.update", saveCreds);
    bot.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if (connection === "open") {
            console.log("✅ Server session created successfully!");
            process.exit(0); // Exit after session is ready
        }
    });
}

createServerSession();
