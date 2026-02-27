const fs = require("fs");

async function userCommand(sock, chatId, message) {

    try {

        const OWNER_NUMBER = "254768161116";

        // ✅ Strict owner restriction
        if (!message.sender || !message.sender.includes(OWNER_NUMBER)) {
            return sock.sendMessage(chatId, {
                text: "❌ This command is owner only."
            });
        }

        const trackFile = "./data/paired_users.json";

        if (!fs.existsSync(trackFile)) {
            return sock.sendMessage(chatId, {
                text: "⚠ No paired users found."
            });
        }

        const users = JSON.parse(fs.readFileSync(trackFile));

        if (!users.length) {
            return sock.sendMessage(chatId, {
                text: "⚠ No active paired users."
            });
        }

        let text = "👑 *Active Paired Users*\n\n";

        users.forEach((u, i) => {
            text += `${i + 1}. +${u.number}\n`;
        });

        await sock.sendMessage(chatId, { text });

    } catch (err) {
        console.log("User Command Error:", err);
    }
}

module.exports = userCommand;
