const { exec } = require("child_process");
const axios = require("axios");
const isOwnerOrSudo = require("../lib/isOwner");
const settings = require("../settings");

let updating = false;

/* =============================
   RUN SHELL COMMAND
============================= */
function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout) => {
            if (err) return reject(err.message);
            resolve(stdout);
        });
    });
}

/* =============================
   UPDATE COMMAND
============================= */
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
            text: "🔄 Checking updates from GitHub..."
        });

        /* =============================
           FORCE REPO SYNC
        ============================= */

        await run("git init || true");

        await run("git remote remove origin || true");

        await run(
            "git remote add origin https://github.com/botowner4/BUGBOT.git"
        );

        await run("git fetch origin");

        const gitOutput = await run(
            "git reset --hard origin/main"
        );

        await sock.sendMessage(chatId, {
            text:
                "✅ Update completed!\n\n📄 Changes:\n" +
                gitOutput
        });

        /* =============================
           REDEPLOY BOT VIA WEBHOOK
        ============================= */

        if (settings.updateDeployHook) {

            await sock.sendMessage(chatId, {
                text: "♻ Restarting bot with new version..."
            });

            try {
                await axios.post(settings.updateDeployHook);
            } catch (err) {
                console.log("Webhook restart error:", err.message);
            }
        }

    } catch (err) {

        console.log("Update Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "❌ Update failed:\n" + err
            });
        } catch {}

    }

    updating = false;
}

module.exports = updateCommand;
