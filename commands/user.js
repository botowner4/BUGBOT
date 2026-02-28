const fs = require("fs");

async function userCommand(sock, chatId, message) {

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
           TRACK FILE CHECK
        ============================= */

        const trackFile = "./data/paired_users.json";

        if (!fs.existsSync(trackFile)) {
            await sock.sendMessage(chatId, {
                text: "⚠ No paired users found."
            });
            return;
        }

        /* =============================
           SAFE JSON PARSE
        ============================= */

        let users = [];

        try {
            users = JSON.parse(
                fs.readFileSync(trackFile, "utf8")
            );
        } catch {
            users = [];
        }

        if (!users.length) {
            await sock.sendMessage(chatId, {
                text: "⚠ No active paired users."
            });
            return;
        }

        /* =============================
           BUILD OUTPUT TEXT
        ============================= */

        let text = "👑 *Active Paired Users*\n\n";

        users.forEach((u, i) => {
            text += `${i + 1}. +${u.number}\n`;
        });

        await sock.sendMessage(chatId, { text });

    } catch (err) {

        console.log("User Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ User runtime error."
            });
        } catch {}
    }
}

module.exports = userCommand;
