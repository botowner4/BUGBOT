const fs = require("fs");
const path = require("path");

async function depairCommand(sock, chatId, message) {

    try {

        /* =============================
           OWNER AUTH SAFE MODE
        ============================= */

        const OWNER_NUMBER = "254768161116";

        const senderNumber =
            message?.sender?.split("@")[0] || "";

        if (senderNumber !== OWNER_NUMBER) {
            await sock.sendMessage(chatId, {
                text: "❌ This command is owner only."
            });
            return;
        }

        /* =============================
           PARSE NUMBER
        ============================= */

        const rawText =
            message?.text ||
            message?.conversation ||
            "";

        const parts =
            rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.depair 2547xxxxxxxx"
            });
            return;
        }

        let number =
            parts[1].replace(/[^0-9]/g, '');

        const SESSION_ROOT = "./session_pair";
        const sessionPath =
            path.join(SESSION_ROOT, number);

        const trackFile = "./data/paired_users.json";

        /* =============================
           CHECK SESSION EXISTS
        ============================= */

        if (!fs.existsSync(sessionPath)) {
            await sock.sendMessage(chatId, {
                text: "⚠ Session not found."
            });
            return;
        }

        /* =============================
           DELETE SESSION SAFE MODE
        ============================= */

        fs.rmSync(sessionPath, {
            recursive: true,
            force: true
        });

        /* =============================
           REMOVE TRACK RECORD SAFE MODE
        ============================= */

        if (fs.existsSync(trackFile)) {

            let users = [];

            try {
                users = JSON.parse(
                    fs.readFileSync(trackFile, "utf8")
                );
            } catch {
                users = [];
            }

            users = users.filter(
                u => u.number !== number
            );

            fs.writeFileSync(
                trackFile,
                JSON.stringify(users, null, 2)
            );
        }

        await sock.sendMessage(chatId, {
            text: `✅ +${number} depaired successfully.`
        });

    } catch (err) {
        console.log("Depair Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Depair runtime error."
            });
        } catch {}
    }
}

module.exports = depairCommand;
