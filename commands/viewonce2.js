const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

async function viewonce2(sock, chatId, message) {
    try {
        const quoted =
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            await sock.sendMessage(
                chatId,
                { text: "❌ Reply to a view-once image or video using .v" },
                { quoted: message }
            );
            return;
        }

        const inboxDir = path.join(__dirname, "../inbox");

        if (!fs.existsSync(inboxDir)) {
            fs.mkdirSync(inboxDir, { recursive: true });
        }

        /*
        =====================
        VIEWONCE IMAGE
        =====================
        */
        if (quoted.imageMessage?.viewOnce) {
            const stream = await downloadContentFromMessage(
                quoted.imageMessage,
                "image"
            );

            let buffer = Buffer.alloc(0);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const filePath = path.join(inboxDir, `${Date.now()}.jpg`);
            fs.writeFileSync(filePath, buffer);

            console.log("✅ Viewonce image saved:", filePath);
            return;
        }

        /*
        =====================
        VIEWONCE VIDEO
        =====================
        */
        if (quoted.videoMessage?.viewOnce) {
            const stream = await downloadContentFromMessage(
                quoted.videoMessage,
                "video"
            );

            let buffer = Buffer.alloc(0);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const filePath = path.join(inboxDir, `${Date.now()}.mp4`);
            fs.writeFileSync(filePath, buffer);

            console.log("✅ Viewonce video saved:", filePath);
            return;
        }

        await sock.sendMessage(
            chatId,
            { text: "❌ That is not a view-once media." },
            { quoted: message }
        );

    } catch (err) {
        console.log("Viewonce2 Error:", err);
    }
}

module.exports = viewonce2;
