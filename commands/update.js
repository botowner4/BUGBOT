const axios = require("axios");
const isOwnerOrSudo = require("../lib/isOwner");
const settings = require("../settings");

let updating = false;

async function updateCommand(sock, chatId, message) {

    if (updating) return;
    updating = true;

    try {

        const senderId =
            message.key.participant ||
            message.key.remoteJid;

        const isOwner = await isOwnerOrSudo(senderId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
            updating = false;
            return;
        }

        await sock.sendMessage(chatId, {
            text: "🚀 Deploying latest version from GitHub..."
        });

        if (!settings.updateDeployHook) {
            await sock.sendMessage(chatId, {
                text: "❌ Deploy webhook not configured."
            });
            updating = false;
            return;
        }

        await axios.post(settings.updateDeployHook);

        await sock.sendMessage(chatId, {
            text: "✅ Update triggered. Bot restarting..."
        });

        // Exit cleanly
        process.exit(0);

    } catch (err) {

        console.log("Update error:", err);

        await sock.sendMessage(chatId, {
            text: "❌ Update failed:\n" + err
        });

    }

    updating = false;
}

module.exports = updateCommand;
