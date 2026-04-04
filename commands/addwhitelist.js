// commands/addwhitelist.js
const fs = require("fs");
const path = require("path");
const settings = require("../settings");

const WHITELIST_FILE = path.join(__dirname, "../whitelisted.json");

async function addWhitelistCommand(sock, chatId, message) {
    try {
        // Extract the number from the user message
        // Expected format: ".addwhitelist 2547xxxxxxx"
        const parts = message.body.trim().split(" ");
        if (parts.length < 2) {
            await sock.sendMessage(
                chatId,
                { text: "❌ Please provide a number to whitelist.\nExample: `.addwhitelist 2547xxxxxxx`" },
                { quoted: message }
            );
            return;
        }

        let number = parts[1].replace(/\D/g, "");
        if (!number.startsWith("254")) {
            await sock.sendMessage(
                chatId,
                { text: "❌ Number must start with country code 254." },
                { quoted: message }
            );
            return;
        }

        // Read current whitelist
        let whitelist = {};
        if (fs.existsSync(WHITELIST_FILE)) {
            const data = fs.readFileSync(WHITELIST_FILE, "utf-8");
            whitelist = JSON.parse(data);
        }

        // Add number to whitelist
        whitelist[number] = true;

        // Save back
        fs.writeFileSync(WHITELIST_FILE, JSON.stringify(whitelist, null, 2));

        // Send confirmation
        await sock.sendMessage(
            chatId,
            { text: `✅ Number ${number} has been added to the whitelist.` },
            { quoted: message }
        );

    } catch (error) {
        console.error("Error in addwhitelist command:", error);

        await sock.sendMessage(
            chatId,
            { text: "❌ Failed to add number to whitelist. Try again later." },
            { quoted: message }
        );
    }
}

module.exports = addWhitelistCommand;
