const fs = require("fs");
const path = require("path");

async function depairCommand(sock, chatId, message) {

    try {

        const OWNER_NUMBER = "254768161116";

        // ✅ Owner restriction
        if (!message.sender || !message.sender.includes(OWNER_NUMBER)) {
            return sock.sendMessage(chatId, {
                text: "❌ This command is owner only."
            });
        }

        const text = message.text || "";
        const parts = text.split(" ");

        if (!parts[1]) {
            return sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.depair 2547xxxxxxxx"
            });
        }

        let number = parts[1].replace(/[^0-9]/g, '');

        const SESSION_ROOT = "./session_pair";
        const sessionPath = path.join(SESSION_ROOT, number);

        const trackFile = "./data/paired_users.json";

        /*
        ============================
        DELETE SESSION FOLDER
        ============================
        */

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, {
                recursive: true,
                force: true
            });
        } else {
            return sock.sendMessage(chatId, {
                text: "⚠ Session not found."
            });
        }

        /*
        ============================
        REMOVE FROM TRACK FILE
        ============================
        */

        if (fs.existsSync(trackFile)) {

            let users = [];

            try {
                users = JSON.parse(fs.readFileSync(trackFile));
            } catch {
                users = [];
            }

            users = users.filter(u => u.number !== number);

            fs.writeFileSync(
                trackFile,
                JSON.stringify(users, null, 2)
            );
        }

        await sock.sendMessage(chatId, {
            text: `✅ +${number} has been depaired successfully.`
        });

    } catch (err) {
        console.log("Depair Command Error:", err);
    }
}

module.exports = depairCommand;
