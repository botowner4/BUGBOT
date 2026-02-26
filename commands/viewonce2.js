const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

async function viewonce2(sock, chatId, message) {

    try {

        const quoted =

            message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) return;

        // ✅ Your bot WhatsApp inbox JID

        const ownerJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        /*

        ========================

        VIEWONCE IMAGE

        ========================

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

            // 🔥 Silent forward (no public reply)

            await sock.sendMessage(ownerJid, {

                image: buffer,

                caption: "🔐 ViewOnce Saved"

            });

            return;

        }

        /*

        ========================

        VIEWONCE VIDEO

        ========================

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

            await sock.sendMessage(ownerJid, {

                video: buffer,

                caption: "🔐 ViewOnce Saved"

            });

            return;

        }

    } catch (err) {

        console.log("Viewonce2 Error:", err);

    }

}

module.exports = viewonce2;