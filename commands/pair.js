const axios = require("axios");

async function pairCommand(sock, chatId, message) {

    try {

        const ownerNumber = "254768161116";

        if (!message.sender.includes(ownerNumber)) {
            return sock.sendMessage(chatId, {
                text: "❌ Owner only command."
            });
        }

        const text = message.text || "";

        const parts = text.split(" ");

        if (!parts[1]) {
            return sock.sendMessage(chatId, {
                text: "⚠ Usage:\n.pair 254768161116"
            });
        }

        let number = parts[1].replace(/[^0-9]/g, '');

        const apiUrl =
            `https://bugbot-i3yc.onrender.com/pair/code?number=${number}`;

        const response = await axios.get(apiUrl);

        if (response.data?.code) {

            await sock.sendMessage(chatId, {
                text: `
🤖 Pairing Code Generated

📌 Number: ${number}
🔐 Code: ${response.data.code}

👉 Go to WhatsApp
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
    }
}

module.exports = pairCommand;
