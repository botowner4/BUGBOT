const axios = require('axios');

async function receiveCommand(sock, chatId, message, userMessage) {
    try {
        let args = userMessage.trim().split(" ");

        let amount = parseInt(args[1]);
        let number = args[2];

        // default amount = 100
        if (!number) {
            number = args[1];
            amount = 100;
        }

        if (!number) {
            await sock.sendMessage(chatId, {
                text: "❌ Usage:\n.receive 200 2547xxxxxx\nor\n.receive 2547xxxxxx"
            }, { quoted: message });
            return;
        }

        // ✅ format number
        number = number.replace(/\D/g, "");
        if (number.startsWith("0")) {
            number = "254" + number.slice(1);
        }

        // ✅ ensure amount
        if (isNaN(amount)) amount = 100;

        await sock.sendMessage(chatId, {
            text: `💳 Sending payment request...\n📞 ${number}\n💰 KES ${amount}`
        }, { quoted: message });

        // ✅ encoded URL
        const url = `https://bugbot-i3yc.onrender.com/receive?amount=${amount}&number=${number}`;

        const res = await axios.get(encodeURI(url));

        if (res.data.status) {
            await sock.sendMessage(chatId, {
                text: "✅ Payment prompt sent. Check phone 📲"
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${res.data.message || "Unknown error"}`
            }, { quoted: message });
        }

    } catch (err) {
        console.error("Command error:", err.response?.data || err.message);

        await sock.sendMessage(chatId, {
            text: "❌ Error sending payment request"
        }, { quoted: message });
    }
}

module.exports = receiveCommand;
