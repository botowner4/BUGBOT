const axios = require("axios");

async function pairCommand(sock, chatId, message) {

    try {

        /* =============================
           OWNER AUTH FIX
        ============================= */

        const ownerNumber = "254768161116";

        const senderNumber =
            message?.sender?.split("@")[0] || "";

        if (senderNumber !== ownerNumber) {
            await sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
            return;
        }

        /* =============================
           MESSAGE PARSING SAFE MODE
        ============================= */

        const rawText =
            message?.text ||
            message?.conversation ||
            "";

        const parts =
            rawText.trim().split(/\s+/);

        if (!parts[1]) {
            await sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.pair 254768161116"
            });
            return;
        }

        let number =
            parts[1].replace(/[^0-9]/g, '');

        /* =============================
           API CALL SAFE MODE
        ============================= */

        const apiUrl =
            `https://bugbot-i3yc.onrender.com/pair/code?number=${number}`;

        const response =
            await axios.get(apiUrl, {
                timeout: 20000
            });

        if (response?.data?.code) {

            await sock.sendMessage(chatId, {
                text: `
🤖 Pairing Code Generated

📌 Number: ${number}
🔐 Code: ${response.data.code}

👉 Open WhatsApp
👉 Linked Devices → Link Device
`
            });

        } else {

            await sock.sendMessage(chatId, {
                text: "❌ Pairing service failed."
            });
        }

    } catch (err) {

        console.log("Pair Command Error:", err);

        try {
            await sock.sendMessage(chatId, {
                text: "⚠ Pairing runtime error."
            });
        } catch {}
    }
}

module.exports = pairCommand;
