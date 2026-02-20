// serverAuth.js
const fs = require("fs");
const pino = require("pino");
const path = require("path");
const { default: Gifted_Tech, useMultiFileAuthState, delay, Browsers } = require("maher-zubair-baileys");

// Folder to store your first session
const SESSION_FOLDER = path.join(__dirname, "project/serversession");

// Make sure the folder exists
if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER, { recursive: true });

async function createFirstSession() {
    console.log("[INFO] Initializing bot...");

    // Load auth state (creates folder if not exist)
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    // Start the bot
    const bot = Gifted_Tech({
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
        printQRInTerminal: true, // prints QR code in terminal
        logger: pino({ level: "fatal" }),
        browser: ["Chrome", "Desktop", "1.0.0"], // avoid Browsers.chrome() issues
    });

    // Save credentials on update
    bot.ev.on("creds.update", saveCreds);

    // Listen for connection updates
    bot.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("[INFO] First session created successfully!");
            console.log(`[INFO] Session stored in: ${SESSION_FOLDER}`);
            console.log("[INFO] You can now run your pairing website (botowner4.js) using this session.");
            process.exit(0);
        } else if (connection === "close") {
            if (lastDisconnect && lastDisconnect.error) {
                console.log("[ERROR] Connection closed unexpectedly:", lastDisconnect.error);
            } else {
                console.log("[INFO] Connection closed. Retrying...");
                await delay(5000);
                createFirstSession();
            }
        }
    });
}

// Run
createFirstSession().catch((err) => {
    console.error("[ERROR] Failed to generate session:", err);
});
