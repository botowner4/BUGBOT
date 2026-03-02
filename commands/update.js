const { exec } = require("child_process");
const isOwnerOrSudo = require("../lib/isOwner");
const settings = require("../settings");

let updating = false;

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout) => {
            if (err) return reject(err.message);
            resolve(stdout);
        });
    });
}

async function updateCommand(sock, chatId, message) {

    if (updating) return;
    updating = true;

    try {

        const senderId =
            message.key.participant ||
            message.key.remoteJid;

        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
            updating = false;
            return;
        }

        await sock.sendMessage(chatId, {
            text: "🔄 Checking GitHub updates..."
        });

        // Git operations
        const gitOutput = await run("git pull origin main");

        await sock.sendMessage(chatId, {
            text: "✅ Update pulled successfully\n\n📄 Changes:\n" + gitOutput
        });

        // 🔥 Trigger Render redeploy (BEST PRACTICE)
        if (settings.updateDeployHook) {
            const axios = require("axios");
            await axios.post(settings.updateDeployHook);
        }

        await sock.sendMessage(chatId, {
            text: "♻ Bot restarting with latest features..."
        });

    } catch (err) {

        console.log(err);

        await sock.sendMessage(chatId, {
            text: "❌ Update error:\n" + err
        });

    }

    updating = false;
}

module.exports = updateCommand;
