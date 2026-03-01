const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(stderr || err.message);
            resolve(stdout);
        });
    });
}

function clearModuleCache(folder) {
    const fullPath = path.join(process.cwd(), folder);

    if (!fs.existsSync(fullPath)) return 0;

    let count = 0;

    fs.readdirSync(fullPath).forEach(file => {
        const filePath = path.join(fullPath, file);

        if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(filePath)];
                require(filePath);
                count++;
            } catch (e) {
                console.log("Reload error:", e);
            }
        }
    });

    return count;
}

let updating = false;

async function updateCommand(sock, chatId, message) {

    if (updating) return;
    updating = true;

    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: "Only owner can use .update" }, { quoted: message });
        updating = false;
        return;
    }

    try {

        await sock.sendMessage(chatId, { text: "🔄 Pulling latest update..." }, { quoted: message });

        await run("git fetch --all");
        await run("git reset --hard origin/main");

        await sock.sendMessage(chatId, { text: "♻ Reloading commands..." }, { quoted: message });

        const reloaded = clearModuleCache("commands");

        await sock.sendMessage(chatId, {
            text: `✅ Update complete!\n\nReloaded files: ${reloaded}\nNo restart needed.`
        }, { quoted: message });

    } catch (err) {

        console.error(err);

        await sock.sendMessage(chatId, {
            text: "❌ Update failed:\n" + String(err)
        }, { quoted: message });

    }

    updating = false;
}

module.exports = updateCommand;
